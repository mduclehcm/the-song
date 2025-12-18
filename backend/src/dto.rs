use crate::state::{MousePosition, ServerStatsSnapshot};
use serde::{Deserialize, Serialize};
use std::collections::HashMap;
use uuid::Uuid;

#[derive(Serialize, Deserialize)]
pub struct ServerStatsMessage {
    pub stats: ServerStatsSnapshot,
}

#[derive(Serialize, Deserialize)]
pub struct ServerMouseUpdateMessage {
    pub kind: String,
    pub x: f32,
    pub y: f32,
    pub vx: f32,
    pub vy: f32,
}

#[derive(Serialize, Deserialize)]
pub struct ServerMousePositionsMessage {
    pub positions: HashMap<Uuid, MousePosition>,
}

#[derive(Serialize, Deserialize)]
pub struct ServerWelcomeMessage {
    pub user_id: Uuid,
    pub synthesizer_snapshot: Vec<u8>,
}

impl ServerWelcomeMessage {
    pub fn new(user_id: Uuid, synthesizer_snapshot: Vec<u8>) -> Self {
        Self {
            user_id,
            synthesizer_snapshot,
        }
    }
}

#[derive(Serialize, Deserialize)]
pub struct ClientSynthesizerUpdateMessage {
    pub data: Vec<u8>,
}

#[derive(Serialize, Deserialize)]
pub struct ServerSynthesizerUpdateMessage {
    pub data: Vec<u8>,
}

#[derive(Serialize, Deserialize)]
#[serde(tag = "kind", content = "data")]
pub enum ClientMessage {
    MouseUpdate(ServerMouseUpdateMessage),
    SynthesizerUpdate(ClientSynthesizerUpdateMessage),
}

#[derive(Serialize, Deserialize)]
#[serde(tag = "kind", content = "data")]
pub enum ServerMessage {
    Stats(ServerStatsMessage),
    Welcome(ServerWelcomeMessage),
    MousePositions(ServerMousePositionsMessage),
    SynthesizerUpdate(ServerSynthesizerUpdateMessage),
}
