# ZeroClaw Web Dashboard Implementation Plan

## Context

ZeroClaw currently has no web UI for configuration or monitoring. Users must:
- Edit TOML config files manually
- Use CLI commands for all operations
- No visual way to monitor daemon status
- No web-based provider/channel configuration

This plan implements a modern, responsive web dashboard with Material Design, supporting configuration for all 33 AI providers and 13 channels, with real-time daemon monitoring via WebSockets.

## User Choices

- **Frontend**: React + Vite with Material UI (MUI)
- **Real-time**: WebSockets for daemon monitoring
- **Ports**: Separate configurable port for WebUI
- **Build**: Multi-stage Docker (Node.js → Rust)

## Implementation Plan

### Phase 1: Backend API Extensions

#### 1.1 Add New API Endpoints (`src/gateway/mod.rs`)

New routes for the dashboard API:

```rust
// Configuration APIs
GET  /api/config          - Get full config (sanitized)
PUT  /api/config          - Update config
POST /api/config/save     - Save config to disk
POST /api/config/reload   - Reload config from disk

// Provider APIs
GET  /api/providers       - List all available providers
GET  /api/providers/{id}/models - Get models for provider
POST /api/providers/{id}/test   - Test provider connection

// Channel APIs
GET  /api/channels        - List all channels
GET  /api/channels/{id}   - Get channel config
PUT  /api/channels/{id}   - Update channel config
POST /api/channels/{id}/test   - Test channel connection
GET  /api/channels/{id}/status - Get channel health status

// Daemon APIs
GET  /api/daemon/status   - Get daemon status
POST /api/daemon/restart  - Restart daemon
GET  /api/daemon/logs     - Get recent logs (streaming via WebSocket)
GET  /api/daemon/health   - Health check with component details

// System APIs
GET  /api/system/info     - System info (version, platform, uptime)
GET  /api/system/metrics  - Performance metrics
```

#### 1.2 WebSocket Support for Real-time Updates

```rust
// New file: src/gateway/websocket.rs
// WebSocket endpoint for:
// - Log streaming
// - Status updates
// - Channel health changes
// - Provider connection status

Route: WS /api/ws/subscribe
```

#### 1.3 New Config Schema Fields

Add to `src/config/schema.rs`:

```rust
#[derive(Debug, Clone, Serialize, Deserialize)]
pub struct WebUIConfig {
    pub enabled: bool,
    pub host: String,
    pub port: u16,
}

// Add to main Config struct
pub webui: Option<WebUIConfig>,
```

### Phase 2: Frontend Application

#### 2.1 Project Structure

```
webui/
├── package.json
├── vite.config.js
├── tsconfig.json
├── index.html
├── public/
├── src/
│   ├── main.tsx
│   ├── App.tsx
│   ├── index.css
│   ├── components/
│   │   ├── Layout/
│   │   │   ├── DashboardLayout.tsx
│   │   │   ├── Header.tsx
│   │   │   ├── Sidebar.tsx
│   │   │   └── ThemeToggle.tsx
│   │   ├── Config/
│   │   │   ├── ProviderConfig.tsx
│   │   │   ├── ChannelConfig.tsx
│   │   │   ├── GatewayConfig.tsx
│   │   │   └── WebUIConfig.tsx
│   │   ├── Monitoring/
│   │   │   ├── DaemonStatus.tsx
│   │   │   ├── LogViewer.tsx
│   │   │   ├── MetricsChart.tsx
│   │   │   └── ChannelHealth.tsx
│   │   └── Common/
│   │       ├── Loading.tsx
│   │       ├── Error.tsx
│   │       └── ConfirmDialog.tsx
│   ├── pages/
│   │   ├── Dashboard.tsx
│   │   ├── Providers.tsx
│   │   ├── Channels.tsx
│   │   ├── Gateway.tsx
│   │   ├── Logs.tsx
│   │   └── Settings.tsx
│   ├── hooks/
│   │   ├── useConfig.ts
│   │   ├── useWebSocket.ts
│   │   ├── useProviders.ts
│   │   ├── useChannels.ts
│   │   └── useDaemon.ts
│   ├── services/
│   │   ├── api.ts
│   │   ├── websocket.ts
│   │   └── types.ts
│   └── theme/
│       ├── theme.ts
│       └── themes.ts
```

#### 2.2 Key Features by Page

**Dashboard (Home)**
- System overview cards (status, uptime, active channels)
- Quick actions (restart daemon, reload config)
- Recent activity feed
- Channel health indicators

**Providers Page**
- List of all 33 providers with status
- Provider configuration form (API key, base URL, default model)
- Model selection dropdown (fetched from provider)
- Test connection button
- Enable/disable toggle per provider

**Channels Page**
- List of all 13 channels with status
- Channel-specific configuration forms
- Enable/disable toggle per channel
- Test connection button
- Health check status

**Gateway Settings**
- Port configuration
- Host binding
- Public bind toggle
- Pairing requirement
- Rate limiting settings

**Logs Page**
- Real-time log streaming via WebSocket
- Log level filter
- Search functionality
- Auto-scroll toggle

**Settings Page**
- WebUI configuration (port, host)
- Theme toggle (light/dark)
- Language preferences
- About/Version info

#### 2.3 Dependencies

```json
{
  "dependencies": {
    "react": "^18.3.1",
    "react-dom": "^18.3.1",
    "react-router-dom": "^6.22.0",
    "@mui/material": "^5.15.0",
    "@mui/icons-material": "^5.15.0",
    "@emotion/react": "^11.11.0",
    "@emotion/styled": "^11.11.0",
    "@tanstack/react-query": "^5.17.0",
    "recharts": "^2.10.0",
    "axios": "^1.6.0"
  },
  "devDependencies": {
    "@types/react": "^18.3.0",
    "@types/react-dom": "^18.3.0",
    "@vitejs/plugin-react": "^4.2.0",
    "typescript": "^5.3.0",
    "vite": "^5.0.0"
  }
}
```

### Phase 3: Docker Integration

#### 3.1 Updated Dockerfile

Add WebUI build stage:

```dockerfile
# ── Stage 2a: Build WebUI ────────────────────────────────
FROM node:20-alpine@sha256:... AS webui-builder

WORKDIR /webui
COPY webui/package.json webui/package-lock.json ./
RUN npm ci
COPY webui/ ./
RUN npm run build

# ── Stage 3: Production Runtime (updated) ────────────────
FROM gcr.io/distroless/cc-debian13:nonroot@sha256:... AS release

COPY --from=builder /app/zeroclaw /usr/local/bin/zeroclaw
COPY --from=permissions /zeroclaw-data /zeroclaw-data
COPY --from=webui-builder /webui/dist /usr/local/share/zeroclaw/webui

# WebUI environment
ENV ZEROCLAW_WEBUI_ENABLED=true
ENV ZEROCLAW_WEBUI_PORT=8080
# ... rest of existing env
```

#### 3.2 Updated docker-compose.yml

```yaml
services:
  zeroclaw:
    build: .
    container_name: zeroclaw
    ports:
      - "3000:3000"  # Gateway API
      - "8080:8080"  # WebUI
    environment:
      - API_KEY=${API_KEY}
      - PROVIDER=${PROVIDER:-zai}
      - ZEROCLAW_ALLOW_PUBLIC_BIND=true
      - ZEROCLAW_WEBUI_ENABLED=true
      - ZEROCLAW_WEBUI_PORT=8080
      - ZEROCLAW_WEBUI_HOST=0.0.0.0
    volumes:
      - zeroclaw-data:/zeroclaw-data
```

### Phase 4: Critical Files to Modify/Create

| File | Action |
|------|--------|
| `src/config/schema.rs` | Add WebUIConfig struct, integrate into Config |
| `src/gateway/mod.rs` | Add new API routes, WebSocket handler |
| `src/gateway/websocket.rs` | **NEW** - WebSocket implementation |
| `src/main.rs` | Add WebUI server startup logic |
| `Cargo.toml` | Add dependencies (tokio-tungstenite, etc.) |
| `webui/` | **NEW** - Entire React application |
| `Dockerfile` | Add WebUI build stage |
| `docker-compose.yml` | Add WebUI port mapping |
| `.gitignore` | Add webui/node_modules, webui/dist |

### Phase 5: Implementation Order

1. **Backend First**
   - Add WebUIConfig to schema
   - Add API endpoints to gateway
   - Implement WebSocket support
   - Add WebUI server to main.rs

2. **Frontend Second**
   - Initialize React + Vite project
   - Set up MUI theme (light/dark)
   - Create layout components
   - Implement API service layer
   - Build each page iteratively
   - Add WebSocket hooks

3. **Docker Integration**
   - Update Dockerfile with multi-stage build
   - Update docker-compose.yml
   - Test container build and deployment

### Phase 6: Security Considerations

- **Authentication**: WebUI requires pairing token (same as gateway)
- **CORS**: Proper configuration for API access
- **CSRF**: Token validation for state-changing operations
- **CSP**: Content Security Policy headers
- **Secret masking**: Never expose API keys in UI (show asterisks)
- **HTTPS**: Recommend reverse proxy for production

## Verification Steps

1. **Build Test**
   ```bash
   cd webui && npm install && npm run build
   cargo build --release
   docker build -t zeroclaw-webui .
   ```

2. **Local Development**
   ```bash
   # Terminal 1: Backend
   cargo run -- --webui-enabled --webui-port=8080

   # Terminal 2: Frontend (dev mode)
   cd webui && npm run dev
   ```

3. **Docker Test**
   ```bash
   docker compose up -d
   docker compose logs -f
   # Access http://localhost:8080
   ```

4. **Functional Tests**
   - Navigate to all pages
   - Configure a provider and test connection
   - Configure a channel and test connection
   - Watch real-time logs
   - Toggle dark/light mode
   - Restart daemon from UI
   - Save and reload config

5. **Integration Tests**
   - WebSocket connection stays alive
   - Config changes persist after restart
   - Provider model lists load correctly
   - Channel health checks work

## Dependencies to Add

### Cargo.toml
```toml
tokio-tungstenite = "0.21"
base64 = "0.21"
```

### Existing Reusable Code

- `src/gateway/mod.rs:374-386` - Router setup pattern
- `src/gateway/mod.rs:177-193` - AppState pattern
- `src/config/schema.rs:2052-2143` - Config save/load
- `src/daemon/mod.rs` - Health monitoring patterns
