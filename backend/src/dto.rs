use crate::state::ServerStatsSnapshot;
use serde::{Deserialize, Serialize};

#[derive(Serialize, Deserialize)]
pub struct ServerStatsMessage {
    pub kind: String,
    pub stats: ServerStatsSnapshot,
}

impl ServerStatsMessage {
    pub fn new(server_stats: ServerStatsSnapshot) -> Self {
        Self {
            kind: "stats".to_string(),
            stats: server_stats,
        }
    }
}
