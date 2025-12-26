use axum::extract::ws::Message;
use tokio::time::{interval, Duration};

use crate::{
    dto::{create_mouse_positions_message, create_stats_message, encode_server_message},
    state::AppState,
};

/// Global task that broadcasts server stats to all connected clients
pub async fn global_stats_broadcast_task(state: AppState) {
    let mut interval = interval(Duration::from_millis(1000));
    let mut last_server_stat = None;
    loop {
        interval.tick().await;

        // Check if there are any connections before broadcasting
        let connection_count = state.connection_count().await;
        if connection_count == 0 {
            continue;
        }

        let server_stats = state.get_server_stats();
        if last_server_stat == Some(server_stats) {
            continue;
        }
        last_server_stat = Some(server_stats);
        let response = create_stats_message(server_stats.online_users as u32);
        let bytes = encode_server_message(&response);

        state.broadcast(Message::Binary(bytes.into())).await;
        tracing::trace!("Broadcasted stats to {} connections", connection_count);
    }
}

/// Global task that broadcasts mouse positions to all connected clients
pub async fn global_mouse_broadcast_task(state: AppState) {
    let mut interval = interval(Duration::from_millis(100));

    loop {
        interval.tick().await;

        let positions = state.get_dirty_mouse_positions().await;
        if positions.is_empty() {
            continue;
        }

        let positions_count = positions.keys().len();
        let response = create_mouse_positions_message(positions);
        let bytes = encode_server_message(&response);

        state.broadcast(Message::Binary(bytes.into())).await;
        tracing::trace!(
            "Broadcasted {} mouse positions to all connections",
            positions_count
        );
    }
}
