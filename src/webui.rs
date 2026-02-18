//! WebUI server - serves the React dashboard and proxies API calls.
//!
//! This module provides a static file server for the ZeroClaw web dashboard
//! and proxies API requests to the main gateway.

use anyhow::Result;
use axum::{
    body::{to_bytes, Body},
    extract::Request,
    http::StatusCode,
    response::{IntoResponse, Response},
    Router,
};
use std::fs;
use std::path::PathBuf;
use tokio::net::TcpListener;

/// Default path for WebUI static files
const DEFAULT_WEBUI_PATH: &str = "/usr/local/share/zeroclaw/webui";

/// Run the WebUI server.
pub async fn run_webui(host: &str, port: u16, static_path: Option<&str>) -> Result<()> {
    let path = static_path
        .map(PathBuf::from)
        .unwrap_or_else(|| PathBuf::from(DEFAULT_WEBUI_PATH));

    if !path.exists() {
        tracing::warn!("WebUI static files not found at {}", path.display());
        tracing::warn!("WebUI will not be available. Run 'npm run build' in the webui directory to build the frontend.");
        return Ok(());
    }

    let addr = format!("{host}:{port}");
    let listener = TcpListener::bind(&addr).await?;
    let actual_addr = listener.local_addr()?;

    tracing::info!("🌐 WebUI server listening on http://{}", actual_addr);

    // Build router with proper precedence
    // Important: order matters! More specific routes must come first
    let app = Router::new()
        // All other routes - serve index.html for SPA client-side routing or proxy API
        .fallback(handler_for_all_routes);

    axum::serve(listener, app).await
        .map_err(|e| anyhow::anyhow!("WebUI server error: {e}"))
}

/// Handle all routes - either proxy API requests or serve index.html for SPA
async fn handler_for_all_routes(req: Request) -> Response {
    let uri = req.uri().clone();
    let path = uri.path();

    tracing::info!("Handling request: {}", path);

    // Check if this is an API request
    if path.starts_with("/api/") || path == "/api" {
        proxy_api_request(req).await.into_response()
    }
    // Check if this is an asset request
    else if path.starts_with("/assets/") {
        // Strip leading / and read file
        let file_path = path.trim_start_matches('/');
        let asset_path = PathBuf::from(DEFAULT_WEBUI_PATH).join(file_path);

        match fs::read(&asset_path) {
            Ok(content) => {
                // Determine content type based on file extension
                let content_type = if path.ends_with(".js") {
                    "application/javascript"
                } else if path.ends_with(".css") {
                    "text/css"
                } else if path.ends_with(".html") {
                    "text/html"
                } else {
                    "application/octet-stream"
                };

                Response::builder()
                    .status(StatusCode::OK)
                    .header("Content-Type", content_type)
                    .body(Body::from(content))
                    .unwrap_or_else(|_| Response::new(Body::from("Failed to serve asset")))
            }
            Err(_) => {
                Response::builder()
                    .status(StatusCode::NOT_FOUND)
                    .body(Body::from("Asset not found"))
                    .unwrap()
            }
        }
    }
    // All other requests - serve index.html for SPA client-side routing
    else {
        serve_index_html().await.into_response()
    }
}

/// Serve index.html for all SPA routes
async fn serve_index_html() -> impl IntoResponse {
    let index_path = PathBuf::from(DEFAULT_WEBUI_PATH).join("index.html");
    match fs::read_to_string(&index_path) {
        Ok(content) => Response::builder()
            .status(StatusCode::OK)
            .header("Content-Type", "text/html")
            .body(Body::from(content))
            .unwrap(),
        Err(e) => {
            tracing::error!("Failed to read index.html: {e}");
            Response::builder()
                .status(StatusCode::INTERNAL_SERVER_ERROR)
                .body(Body::from(format!("Failed to load index.html: {}", e)))
                .unwrap()
        }
    }
}

/// Proxy API requests to the gateway on localhost:3000.
async fn proxy_api_request(req: Request) -> impl IntoResponse {
    let method = req.method().clone();
    let uri = req.uri().clone();
    let path_and_query = uri.path_and_query()
        .map(|pq| pq.as_str())
        .unwrap_or("/");

    // Build the gateway URL (localhost:3000)
    // Note: The /api prefix is stripped by .nest(), so we need to add it back
    let gateway_url = format!("http://127.0.0.1:3000/api{}", path_and_query);

    tracing::info!("Proxying API request: {} {} -> {}", method, path_and_query, gateway_url);

    // Build the proxied request
    let client = match reqwest::Client::builder().build() {
        Ok(c) => c,
        Err(e) => {
            return Response::builder()
                .status(StatusCode::INTERNAL_SERVER_ERROR)
                .body(Body::from(format!("Client build error: {}", e)))
                .unwrap();
        }
    };

    let mut proxy_req = client.request(method.clone(), &gateway_url);

    // Copy headers (excluding some that should not be forwarded)
    let headers = req.headers();
    for (name, value) in headers.iter() {
        let name_str = name.as_str();
        // Skip these headers
        if matches!(name_str, "host" | "connection" | "content-length" | "transfer-encoding") {
            continue;
        }
        if let Ok(value_str) = value.to_str() {
            proxy_req = proxy_req.header(name_str, value_str);
        }
    }

    // Copy body if present - read the whole body
    let body_bytes = match to_bytes(req.into_body(), usize::MAX).await {
        Ok(bytes) => bytes,
        Err(e) => {
            return Response::builder()
                .status(StatusCode::BAD_REQUEST)
                .body(Body::from(format!("Failed to read body: {}", e)))
                .unwrap();
        }
    };

    if !body_bytes.is_empty() {
        proxy_req = proxy_req.body(body_bytes.to_vec());
    }

    // Execute the proxied request
    match proxy_req.send().await {
        Ok(response) => {
            let status = response.status();
            let response_status = StatusCode::from_u16(status.as_u16())
                .unwrap_or(StatusCode::INTERNAL_SERVER_ERROR);

            let mut builder = Response::builder().status(response_status);

            // Copy response headers
            for (name, value) in response.headers().iter() {
                if let Ok(value_str) = value.to_str() {
                    builder = builder.header(name.as_str(), value_str);
                }
            }

            // Get response body
            let body_bytes = response.bytes().await.unwrap_or_default();

            builder
                .body(Body::from(body_bytes.to_vec()))
                .unwrap_or_else(|_| Response::new(Body::empty()))
        }
        Err(e) => {
            tracing::error!("API proxy error: {e}");
            Response::builder()
                .status(StatusCode::BAD_GATEWAY)
                .body(Body::from(format!("API proxy error: {}", e)))
                .unwrap()
        }
    }
}

/// Check if WebUI static files exist at the given path.
pub fn webui_files_exist(path: Option<&str>) -> bool {
    let static_path = path
        .map(PathBuf::from)
        .unwrap_or_else(|| PathBuf::from(DEFAULT_WEBUI_PATH));
    static_path.exists() && static_path.join("index.html").exists()
}
