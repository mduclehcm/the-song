//! Data transfer objects for WebSocket communication.
//!
//! This module re-exports protobuf types and provides helper functions
//! for encoding/decoding binary messages.

use prost::Message;
use std::collections::HashMap;
use uuid::Uuid;

// Re-export all protobuf types
pub use the_song_protocol::{
    client_message, server_message, ClientMessage, MousePosition, ServerMessage,
    ServerMousePositions, ServerStats, ServerStatsUpdate, ServerSynthesizerUpdate, ServerWelcome,
};

/// Encode a server message to binary format
pub fn encode_server_message(msg: &ServerMessage) -> Vec<u8> {
    msg.encode_to_vec()
}

/// Decode a client message from binary format
pub fn decode_client_message(data: &[u8]) -> Result<ClientMessage, prost::DecodeError> {
    ClientMessage::decode(data)
}

/// Helper to create a Welcome message
pub fn create_welcome_message(
    user_id: Uuid,
    stats: ServerStats,
    synthesizer_snapshot: Vec<u8>,
) -> ServerMessage {
    ServerMessage {
        payload: Some(server_message::Payload::Welcome(ServerWelcome {
            user_id: user_id.to_string(),
            synthesizer_snapshot,
            stats: Some(stats),
        })),
    }
}

/// Helper to create a Stats message
pub fn create_stats_message(online_users: u32) -> ServerMessage {
    ServerMessage {
        payload: Some(server_message::Payload::Stats(ServerStatsUpdate {
            stats: Some(ServerStats { online_users }),
        })),
    }
}

/// Helper to create a MousePositions message
pub fn create_mouse_positions_message(
    positions: HashMap<Uuid, crate::state::MousePosition>,
) -> ServerMessage {
    let proto_positions: HashMap<String, MousePosition> = positions
        .into_iter()
        .map(|(id, pos)| {
            (
                id.to_string(),
                MousePosition {
                    x: pos.x,
                    y: pos.y,
                    dirty: pos.dirty,
                },
            )
        })
        .collect();

    ServerMessage {
        payload: Some(server_message::Payload::MousePositions(
            ServerMousePositions {
                positions: proto_positions,
            },
        )),
    }
}

/// Helper to create a SynthesizerUpdate message
pub fn create_synthesizer_update_message(data: Vec<u8>) -> ServerMessage {
    ServerMessage {
        payload: Some(server_message::Payload::SynthesizerUpdate(
            ServerSynthesizerUpdate { data },
        )),
    }
}
