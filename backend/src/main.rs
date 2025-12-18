mod dto;
mod handlers;
mod routes;
mod state;
mod tasks;
mod ws;

use tracing_subscriber::{layer::SubscriberExt, util::SubscriberInitExt};

#[tokio::main]
async fn main() {
    // Initialize tracing
    tracing_subscriber::registry()
        .with(
            tracing_subscriber::EnvFilter::try_from_default_env()
                .unwrap_or_else(|_| "backend=debug,tower_http=debug,axum::rejection=trace".into()),
        )
        .with(tracing_subscriber::fmt::layer())
        .init();

    // Create shared app state
    let app_state = state::AppState::new();

    // Spawn global broadcast tasks
    tracing::info!("Starting global broadcast tasks");
    tokio::spawn(tasks::global_stats_broadcast_task(app_state.clone()));
    tokio::spawn(tasks::global_mouse_broadcast_task(app_state.clone()));

    // Build the router
    let app = routes::create_router(app_state);

    // Run the server
    let listener = tokio::net::TcpListener::bind("0.0.0.0:3000").await.unwrap();
    tracing::info!("Server listening on {}", listener.local_addr().unwrap());
    axum::serve(listener, app).await.unwrap();
}
