use axum::{
    extract::{
        ws::{Message, WebSocket, WebSocketUpgrade},
        State,
    },
    response::IntoResponse,
};
use futures::{SinkExt, StreamExt};
use uuid::Uuid;

use crate::{
    dto::{client_message, create_welcome_message, decode_client_message, encode_server_message},
    state::AppState,
};

pub async fn ws_handler(ws: WebSocketUpgrade, State(state): State<AppState>) -> impl IntoResponse {
    ws.on_upgrade(move |socket| handle_socket(socket, state))
}

async fn handle_socket(socket: WebSocket, state: AppState) {
    // Generate a unique user ID for this connection
    let user_id = Uuid::now_v7();
    tracing::info!("New WebSocket connection from user {}", user_id);

    // Increment online users count
    state.increment_users();

    // Split the socket into sender and receiver
    let (mut sender, mut receiver) = socket.split();

    let synthesizer_snapshot = if let Ok(snapshot) = state.get_synthesizer_snapshot().await {
        snapshot
    } else {
        tracing::error!("Failed to get synthesizer snapshot");
        return;
    };

    // Send welcome message with user ID (binary format)
    let welcome_msg =
        create_welcome_message(user_id, state.get_server_stats(), synthesizer_snapshot);
    let welcome_bytes = encode_server_message(&welcome_msg);

    if sender
        .send(Message::Binary(welcome_bytes.into()))
        .await
        .is_err()
    {
        tracing::error!("Failed to send welcome message to {}", user_id);
        state.decrement_users();
        return;
    }

    // Create a channel for this connection
    let (tx, mut rx) = tokio::sync::mpsc::unbounded_channel();

    // Register this connection in the global registry
    state.register_connection(user_id, tx).await;
    tracing::info!(
        "User {} connected, total connections: {}",
        user_id,
        state.connection_count().await
    );

    // Spawn a task to forward messages from the channel to the WebSocket
    let sender_task = tokio::spawn(async move {
        while let Some(msg) = rx.recv().await {
            if sender.send(msg).await.is_err() {
                tracing::debug!("Failed to send message to WebSocket, connection likely closed");
                break;
            }
        }
    });

    // Handle incoming messages from the client
    while let Some(msg) = receiver.next().await {
        match msg {
            Ok(Message::Binary(data)) => {
                // Parse binary protobuf message
                match decode_client_message(&data) {
                    Ok(client_msg) => match client_msg.payload {
                        Some(client_message::Payload::MouseUpdate(mouse_update)) => {
                            state
                                .update_mouse(
                                    user_id,
                                    mouse_update.x,
                                    mouse_update.y,
                                    mouse_update.vx,
                                    mouse_update.vy,
                                )
                                .await;
                        }
                        Some(client_message::Payload::SynthesizerUpdate(synth_update)) => {
                            state.apply_synthesizer_update(synth_update.data).await;
                        }
                        None => {
                            tracing::warn!("Received client message with no payload");
                        }
                    },
                    Err(e) => {
                        tracing::error!("Failed to decode client message: {}", e);
                    }
                }
            }
            Ok(Message::Text(_text)) => {
                // Legacy text messages - log warning
                tracing::warn!(
                    "Received text message from {}, expected binary. Ignoring.",
                    user_id
                );
            }
            Ok(Message::Ping(_)) => {
                // Axum handles pings automatically
            }
            Ok(Message::Pong(_)) => {}
            Ok(Message::Close(_)) => {
                tracing::info!("Client {} requested close", user_id);
                break;
            }
            Err(e) => {
                tracing::error!("WebSocket error for user {}: {}", user_id, e);
                break;
            }
        }
    }

    // Cleanup when the connection closes
    sender_task.abort();
    state.unregister_connection(&user_id).await;
    state.remove_mouse(&user_id).await;
    state.decrement_users();
    tracing::info!(
        "User {} disconnected, remaining connections: {}",
        user_id,
        state.connection_count().await
    );
}
