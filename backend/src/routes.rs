use axum::Router;
use tower_http::{
    cors::{Any, CorsLayer},
    trace::TraceLayer,
};

use crate::{state::AppState, ws};

pub fn create_router(state: AppState) -> Router {
    Router::new()
        .route("/ws", axum::routing::get(ws::ws_handler))
        .with_state(state)
        .layer(TraceLayer::new_for_http())
        .layer(CorsLayer::new().allow_origin(Any).allow_methods(Any))
}
