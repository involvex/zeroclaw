//! WebSocket support for real-time dashboard updates.
//!
//! Provides log streaming, status updates, channel health changes,
//! and provider connection status via WebSocket connections.

use axum::{
    extract::{
        ws::{Message, WebSocket, WebSocketUpgrade},
        State,
    },
    response::IntoResponse,
};
use futures_util::{SinkExt, StreamExt};
use parking_lot::Mutex;
use serde::{Deserialize, Serialize};
use std::sync::Arc;
use tokio::sync::broadcast;

/// WebSocket message types for real-time updates.
#[derive(Debug, Clone, Serialize, Deserialize)]
#[serde(tag = "type", content = "data")]
pub enum WsMessage {
    /// Log entry with level and message
    Log { level: String, message: String, timestamp: i64 },
    /// Daemon status update
    Status { status: String, uptime_secs: u64 },
    /// Channel health change
    ChannelHealth { channel_id: String, healthy: bool },
    /// Provider connection status
    ProviderStatus { provider_id: String, connected: bool },
    /// Config change notification
    ConfigChanged,
    /// Ping to keep connection alive
    Ping,
}

/// Shared state for WebSocket connections.
#[derive(Clone)]
pub struct WsState {
    /// Broadcast channel for sending messages to all connected clients
    tx: broadcast::Sender<WsMessage>,
    /// Connected client count (for monitoring)
    client_count: Arc<Mutex<usize>>,
}

impl WsState {
    /// Create a new WebSocket state with the given channel capacity.
    pub fn new(capacity: usize) -> Self {
        let (tx, _) = broadcast::channel(capacity);
        Self {
            tx,
            client_count: Arc::new(Mutex::new(0)),
        }
    }

    /// Broadcast a message to all connected clients.
    pub fn broadcast(&self, msg: WsMessage) {
        // Ignore errors when no clients are connected
        let _ = self.tx.send(msg);
    }

    /// Get the number of connected clients.
    pub fn client_count(&self) -> usize {
        *self.client_count.lock()
    }

    /// Increment the client count.
    fn increment_client_count(&self) {
        let mut count = self.client_count.lock();
        *count += 1;
    }

    /// Decrement the client count.
    fn decrement_client_count(&self) {
        let mut count = self.client_count.lock();
        if *count > 0 {
            *count -= 1;
        }
    }
}

/// Handle WebSocket upgrade and connection.
pub async fn ws_handler(
    ws: WebSocketUpgrade,
    State(state): State<super::AppState>,
) -> impl IntoResponse {
    ws.on_upgrade(move |socket| handle_socket(socket, state))
}

/// Handle an active WebSocket connection.
async fn handle_socket(socket: WebSocket, state: super::AppState) {
    // Get the ws_state from AppState
    let ws_state = &state.ws_state;

    // Increment client count
    ws_state.increment_client_count();

    // Split the socket into sender and receiver
    let (mut sender, mut receiver) = socket.split();

    // Subscribe to the broadcast channel
    let mut rx = ws_state.tx.subscribe();

    // Spawn a task to forward broadcast messages to the WebSocket
    let send_task = tokio::spawn(async move {
        while let Ok(msg) = rx.recv().await {
            let json = match serde_json::to_string(&msg) {
                Ok(json) => json,
                Err(e) => {
                    tracing::error!("Failed to serialize WebSocket message: {e}");
                    continue;
                }
            };

            if sender.send(Message::Text(json.into())).await.is_err() {
                break;
            }
        }
    });

    // Handle incoming messages from the client
    let recv_task = tokio::spawn(async move {
        while let Some(Ok(msg)) = receiver.next().await {
            match msg {
                Message::Text(text) => {
                    // Handle incoming text messages (e.g., ping/pong)
                    if let Ok(client_msg) = serde_json::from_str::<WsMessage>(&text) {
                        match client_msg {
                            WsMessage::Ping => {
                                // Respond with a pong (we use Ping for both directions)
                            }
                            _ => {
                                tracing::debug!("Received WebSocket message: {:?}", client_msg);
                            }
                        }
                    }
                }
                Message::Close(_) => {
                    break;
                }
                _ => {}
            }
        }
    });

    // Wait for either task to complete
    tokio::select! {
        _ = send_task => {},
        _ = recv_task => {},
    }

    // Decrement client count when connection closes
    ws_state.decrement_client_count();
}

/// Create a WebSocket state for the dashboard.
pub fn create_ws_state() -> WsState {
    WsState::new(100) // Buffer up to 100 messages per client
}

#[cfg(test)]
mod tests {
    use super::*;

    #[test]
    fn test_ws_message_serialization() {
        let msg = WsMessage::Log {
            level: "INFO".into(),
            message: "Test message".into(),
            timestamp: 1234567890,
        };

        let json = serde_json::to_string(&msg).unwrap();
        assert!(json.contains("Log"));
        assert!(json.contains("INFO"));
        assert!(json.contains("Test message"));
    }

    #[test]
    fn test_ws_state_client_count() {
        let state = WsState::new(10);
        assert_eq!(state.client_count(), 0);

        state.increment_client_count();
        assert_eq!(state.client_count(), 1);

        state.decrement_client_count();
        assert_eq!(state.client_count(), 0);
    }
}
