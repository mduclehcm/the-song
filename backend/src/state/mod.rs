use axum::extract::ws::Message;
use serde::{Deserialize, Serialize};
use std::borrow::Cow;
use std::collections::HashMap;
use std::sync::{
    atomic::{AtomicU64, Ordering},
    Arc,
};
use tokio::sync::{mpsc::UnboundedSender, RwLock};
use uuid::Uuid;

pub struct ServerStats {
    online_users: AtomicU64,
}

#[derive(Serialize, Deserialize, Clone, Debug)]
pub struct MousePosition {
    pub x: f32,
    pub y: f32,
    pub dirty: bool,
}

pub struct MouseTracker {
    positions: RwLock<HashMap<Uuid, MousePosition>>,
}

pub struct ConnectionRegistry {
    connections: RwLock<HashMap<Uuid, UnboundedSender<Message>>>,
}

#[derive(Serialize, Deserialize, PartialEq, Clone)]
pub struct ServerStatsSnapshot {
    online_users: u64,
}

impl ServerStats {
    pub fn new() -> Self {
        Self {
            online_users: AtomicU64::new(0),
        }
    }

    pub fn get_snapshot(&self) -> ServerStatsSnapshot {
        ServerStatsSnapshot {
            online_users: self.online_users.load(Ordering::SeqCst),
        }
    }
}

#[derive(Clone)]
pub struct AppState {
    stats: Arc<ServerStats>,
    mouse_tracker: Arc<MouseTracker>,
    synthesizer: Arc<SynthesizerState>,
    connections: Arc<ConnectionRegistry>,
}

impl MouseTracker {
    pub fn new() -> Self {
        Self {
            positions: RwLock::new(HashMap::new()),
        }
    }

    pub async fn update_position(&self, user_id: Uuid, x: f32, y: f32, vx: f32, vy: f32) {
        // Clamp values to safe ranges
        let x = x.clamp(0.0, 10000.0);
        let y = y.clamp(0.0, 10000.0);
        let _vx = vx.clamp(-1000.0, 1000.0);
        let _vy = vy.clamp(-1000.0, 1000.0);

        let mut positions = self.positions.write().await;
        positions.insert(user_id, MousePosition { x, y, dirty: true });
    }

    pub async fn remove_user(&self, user_id: &Uuid) {
        let mut positions = self.positions.write().await;
        positions.remove(user_id);
    }

    pub async fn get_dirty_positions(&self) -> HashMap<Uuid, MousePosition> {
        let mut positions = self.positions.write().await;
        let dirty: HashMap<Uuid, MousePosition> = positions
            .iter()
            .filter(|(_, pos)| pos.dirty)
            .map(|(id, pos)| (*id, pos.clone()))
            .collect();

        // Clear dirty flags
        for pos in positions.values_mut() {
            pos.dirty = false;
        }

        dirty
    }
}

impl ConnectionRegistry {
    pub fn new() -> Self {
        Self {
            connections: RwLock::new(HashMap::new()),
        }
    }

    pub async fn register(&self, user_id: Uuid, sender: UnboundedSender<Message>) {
        let mut connections = self.connections.write().await;
        connections.insert(user_id, sender);
        tracing::debug!(
            "Registered connection {}, total: {}",
            user_id,
            connections.len()
        );
    }

    pub async fn unregister(&self, user_id: &Uuid) {
        let mut connections = self.connections.write().await;
        connections.remove(user_id);
        tracing::debug!(
            "Unregistered connection {}, total: {}",
            user_id,
            connections.len()
        );
    }

    pub async fn broadcast(&self, message: Message) {
        let mut dead_connections = Vec::new();

        // Scope the read lock
        {
            let connections = self.connections.read().await;
            for (user_id, sender) in connections.iter() {
                if sender.send(message.clone()).is_err() {
                    dead_connections.push(*user_id);
                }
            }
        } // Read lock is dropped here

        // Clean up dead connections if any were found
        if !dead_connections.is_empty() {
            let mut connections = self.connections.write().await;
            for user_id in dead_connections {
                connections.remove(&user_id);
                tracing::debug!("Removed dead connection {} during broadcast", user_id);
            }
        }
    }

    pub async fn connection_count(&self) -> usize {
        let connections = self.connections.read().await;
        connections.len()
    }
}

impl AppState {
    pub fn new() -> Self {
        Self {
            stats: Arc::new(ServerStats::new()),
            mouse_tracker: Arc::new(MouseTracker::new()),
            synthesizer: Arc::new(SynthesizerState::new()),
            connections: Arc::new(ConnectionRegistry::new()),
        }
    }

    pub fn increment_users(&self) {
        self.stats.online_users.fetch_add(1, Ordering::SeqCst);
    }

    pub fn decrement_users(&self) {
        self.stats.online_users.fetch_sub(1, Ordering::SeqCst);
    }

    pub fn get_server_stats(&self) -> ServerStatsSnapshot {
        self.stats.get_snapshot()
    }

    pub async fn get_synthesizer_snapshot(&self) -> Result<Vec<u8>, loro::LoroEncodeError> {
        self.synthesizer.get_snapshot().await
    }

    pub async fn apply_synthesizer_update(&self, update: Vec<u8>) {
        if let Err(e) = self.synthesizer.apply_update(update.clone()).await {
            tracing::error!("Failed to apply synthesizer update: {}", e);
            return;
        }

        // Broadcast update to all connected clients
        let msg = crate::dto::ServerMessage::SynthesizerUpdate(
            crate::dto::ServerSynthesizerUpdateMessage { data: update },
        );
        if let Ok(json) = serde_json::to_string(&msg) {
            self.broadcast(Message::Text(json.into())).await;
        }
    }

    pub async fn update_mouse(&self, user_id: Uuid, x: f32, y: f32, vx: f32, vy: f32) {
        self.mouse_tracker
            .update_position(user_id, x, y, vx, vy)
            .await;
    }

    pub async fn remove_mouse(&self, user_id: &Uuid) {
        self.mouse_tracker.remove_user(user_id).await;
    }

    pub async fn get_dirty_mouse_positions(&self) -> HashMap<Uuid, MousePosition> {
        self.mouse_tracker.get_dirty_positions().await
    }

    pub async fn register_connection(&self, user_id: Uuid, sender: UnboundedSender<Message>) {
        self.connections.register(user_id, sender).await;
    }

    pub async fn unregister_connection(&self, user_id: &Uuid) {
        self.connections.unregister(user_id).await;
    }

    pub async fn broadcast(&self, message: Message) {
        self.connections.broadcast(message).await;
    }

    pub async fn connection_count(&self) -> usize {
        self.connections.connection_count().await
    }
}

pub struct SynthesizerState {
    docs: RwLock<loro::LoroDoc>,
}

impl SynthesizerState {
    pub fn new() -> Self {
        let docs = loro::LoroDoc::new();
        let counter = docs.get_counter("bpm");
        counter
            .increment(120.0)
            .expect("Failed to increment counter");
        Self {
            docs: RwLock::new(docs),
        }
    }

    pub async fn get_snapshot(&self) -> Result<Vec<u8>, loro::LoroEncodeError> {
        let docs = self.docs.read().await;
        let frontiers = docs.state_frontiers();
        docs.export(loro::ExportMode::ShallowSnapshot(Cow::Borrowed(&frontiers)))
    }

    pub async fn apply_update(
        &self,
        update: Vec<u8>,
    ) -> Result<loro::ImportStatus, loro::LoroError> {
        let docs = self.docs.write().await;
        docs.import(update.as_slice())
    }
}
