use axum::extract::ws::Message;
use tokio::time::{interval, Duration};

use crate::{
    dto::{ServerMessage, ServerMousePositionsMessage, ServerStatsMessage},
    state::AppState,
};

/// Global task that broadcasts server stats to all connected clients
pub async fn global_stats_broadcast_task(state: AppState) {
    let mut interval = interval(Duration::from_millis(1000));

    loop {
        interval.tick().await;

        // Check if there are any connections before broadcasting
        let connection_count = state.connection_count().await;
        if connection_count == 0 {
            continue;
        }

        let server_stats = state.get_server_stats();
        let response = ServerMessage::Stats(ServerStatsMessage {
            stats: server_stats,
        });

        match serde_json::to_string(&response) {
            Ok(json) => {
                state.broadcast(Message::Text(json.into())).await;
                tracing::trace!("Broadcasted stats to {} connections", connection_count);
            }
            Err(e) => {
                tracing::error!("Failed to serialize stats: {}", e);
            }
        }
    }
}

/// Global task that broadcasts mouse positions to all connected clients
pub async fn global_mouse_broadcast_task(state: AppState) {
    let mut interval = interval(Duration::from_millis(100));

    loop {
        interval.tick().await;

        let positions = state.get_dirty_mouse_positions().await;
        if positions.is_empty() {
            continue;
        }

        let positions_count = positions.keys().len();

        let response = ServerMessage::MousePositions(ServerMousePositionsMessage { positions });

        match serde_json::to_string(&response) {
            Ok(json) => {
                state.broadcast(Message::Text(json.into())).await;
                tracing::trace!(
                    "Broadcasted {} mouse positions to all connections",
                    positions_count
                );
            }
            Err(e) => {
                tracing::error!("Failed to serialize mouse positions: {}", e);
            }
        }
    }
}
