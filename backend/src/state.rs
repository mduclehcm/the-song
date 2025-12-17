use serde::{Deserialize, Serialize};
use std::sync::{
    atomic::{AtomicU64, Ordering},
    Arc,
};

pub struct ServerStats {
    online_users: AtomicU64,
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
}

impl AppState {
    pub fn new() -> Self {
        Self {
            stats: Arc::new(ServerStats::new()),
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
}
