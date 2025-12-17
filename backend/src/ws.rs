use axum::{
    extract::{
        ws::{Message, WebSocket, WebSocketUpgrade},
        State,
    },
    response::IntoResponse,
};
use futures::StreamExt;

use crate::{state::AppState, tasks::send_stats_task};

pub async fn ws_handler(ws: WebSocketUpgrade, State(state): State<AppState>) -> impl IntoResponse {
    ws.on_upgrade(move |socket| handle_socket(socket, state))
}

async fn handle_socket(socket: WebSocket, state: AppState) {
    // Increment online users count
    state.increment_users();

    // Split the socket into sender and receiver
    let (sender, mut receiver) = socket.split();

    // Spawn background task to send stats every 500ms
    let stats_task = tokio::spawn(send_stats_task(sender, state.clone()));

    // Handle incoming messages
    while let Some(msg) = receiver.next().await {
        match msg {
            Ok(Message::Text(_text)) => {
                // Do nothing
            }
            Ok(Message::Binary(_data)) => {
                // Do nothing
            }
            Ok(Message::Ping(_)) => {
                // Axum handles pings automatically
            }
            Ok(Message::Pong(_)) => {}
            Ok(Message::Close(_)) => {
                tracing::info!("Client disconnected");
                break;
            }
            Err(e) => {
                tracing::error!("WebSocket error: {}", e);
                break;
            }
        }
    }

    // Abort the stats task when the connection closes
    stats_task.abort();
    state.decrement_users();
}
