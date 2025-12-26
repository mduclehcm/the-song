//! Protocol buffer definitions for THE SONG WebSocket messages.
//!
//! This crate provides serialization and deserialization for binary messages
//! transported over WebSocket connections.
//!
//! # Example
//!
//! ```rust
//! use the_song_protocol::{ClientMessage, ServerMessage, client_message, server_message};
//! use prost::Message;
//!
//! // Encode a client message
//! let msg = ClientMessage {
//!     payload: Some(client_message::Payload::MouseUpdate(
//!         the_song_protocol::ClientMouseUpdate {
//!             x: 100.0,
//!             y: 200.0,
//!             vx: 1.0,
//!             vy: -1.0,
//!         }
//!     )),
//! };
//! let bytes = msg.encode_to_vec();
//!
//! // Decode a client message
//! let decoded = ClientMessage::decode(bytes.as_slice()).unwrap();
//! ```

// Include the generated protobuf code
pub mod thesong {
    include!(concat!(env!("OUT_DIR"), "/thesong.rs"));
}

pub use thesong::*;
pub use prost::Message;

#[cfg(test)]
mod tests {
    use super::*;

    #[test]
    fn test_client_mouse_update_roundtrip() {
        let msg = ClientMessage {
            payload: Some(client_message::Payload::MouseUpdate(ClientMouseUpdate {
                x: 100.0,
                y: 200.0,
                vx: 1.5,
                vy: -0.5,
            })),
        };

        let bytes = msg.encode_to_vec();
        let decoded = ClientMessage::decode(bytes.as_slice()).unwrap();

        match decoded.payload {
            Some(client_message::Payload::MouseUpdate(update)) => {
                assert_eq!(update.x, 100.0);
                assert_eq!(update.y, 200.0);
                assert_eq!(update.vx, 1.5);
                assert_eq!(update.vy, -0.5);
            }
            _ => panic!("Expected MouseUpdate payload"),
        }
    }

    #[test]
    fn test_server_welcome_roundtrip() {
        let msg = ServerMessage {
            payload: Some(server_message::Payload::Welcome(ServerWelcome {
                user_id: "test-user-123".to_string(),
                synthesizer_snapshot: vec![1, 2, 3, 4],
            })),
        };

        let bytes = msg.encode_to_vec();
        let decoded = ServerMessage::decode(bytes.as_slice()).unwrap();

        match decoded.payload {
            Some(server_message::Payload::Welcome(welcome)) => {
                assert_eq!(welcome.user_id, "test-user-123");
                assert_eq!(welcome.synthesizer_snapshot, vec![1, 2, 3, 4]);
            }
            _ => panic!("Expected Welcome payload"),
        }
    }

    #[test]
    fn test_server_mouse_positions_roundtrip() {
        use std::collections::HashMap;

        let mut positions = HashMap::new();
        positions.insert(
            "user-1".to_string(),
            MousePosition {
                x: 10.0,
                y: 20.0,
                dirty: true,
            },
        );

        let msg = ServerMessage {
            payload: Some(server_message::Payload::MousePositions(
                ServerMousePositions { positions },
            )),
        };

        let bytes = msg.encode_to_vec();
        let decoded = ServerMessage::decode(bytes.as_slice()).unwrap();

        match decoded.payload {
            Some(server_message::Payload::MousePositions(mp)) => {
                assert!(mp.positions.contains_key("user-1"));
                let pos = mp.positions.get("user-1").unwrap();
                assert_eq!(pos.x, 10.0);
                assert_eq!(pos.y, 20.0);
                assert!(pos.dirty);
            }
            _ => panic!("Expected MousePositions payload"),
        }
    }
}

