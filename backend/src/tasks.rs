use axum::extract::ws::{Message, WebSocket};
use futures::{stream::SplitSink, SinkExt};
use tokio::time::{interval, Duration};

use crate::{dto::ServerStatsMessage, state::AppState};

pub async fn send_stats_task(mut sender: SplitSink<WebSocket, Message>, state: AppState) {
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
