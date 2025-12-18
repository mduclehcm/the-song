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
    dto::{ClientMessage, ServerMessage, ServerWelcomeMessage},
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

    // Send welcome message with user ID
    let welcome_msg: ServerMessage =
        ServerMessage::Welcome(ServerWelcomeMessage::new(user_id, synthesizer_snapshot));

    let welcome_json = serde_json::to_string(&welcome_msg).unwrap();
    if sender
        .send(Message::Text(welcome_json.into()))
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
            Ok(Message::Text(text)) => {
                // Parse incoming message
                if let Ok(msg) = serde_json::from_str::<ClientMessage>(&text) {
                    match msg {
                        ClientMessage::MouseUpdate(mouse_msg) => {
                            // state
                            //     .update_mouse(user_id, mouse_msg.x, mouse_msg.y, mouse_msg.vx, mouse_msg.vy)
                            //     .await;
                        }
                        ClientMessage::SynthesizerUpdate(synthesizer_msg) => {
                            state.apply_synthesizer_update(synthesizer_msg.data).await;
                        }
                    }
                } else {
                    tracing::error!("Failed to parse client message: {}", text);
                }
            }
            Ok(Message::Binary(_data)) => {
                // Do nothing
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
