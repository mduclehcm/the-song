use axum::{
    extract::{
        ws::{Message, WebSocket, WebSocketUpgrade},
        State,
    },
    response::IntoResponse,
};
use futures::{stream::SplitSink, SinkExt, StreamExt};
use tokio::time::{interval, Duration};

use crate::{dto::ServerStatsMessage, state::AppState};

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

async fn send_stats_task(mut sender: SplitSink<WebSocket, Message>, state: AppState) {
    let mut interval = interval(Duration::from_millis(500));

    let mut last_stats = None;
    loop {
        interval.tick().await;

        let server_stats = state.get_server_stats();
        if last_stats.as_ref() == Some(&server_stats) {
            continue;
        }
        last_stats = Some(server_stats.clone());
        let response = ServerStatsMessage::new(server_stats);
        if sender
            .send(Message::Text(
                serde_json::to_string(&response).unwrap().into(),
            ))
            .await
            .is_err()
        {
            tracing::debug!("Failed to send stats, connection likely closed");
            break;
        }
    }
}
