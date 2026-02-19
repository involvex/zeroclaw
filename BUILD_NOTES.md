# ZeroClaw WebUI - API Routes Fix

## Problem
WebUI API routes were returning 404 errors for PUT and POST requests because the `/api/{*path}` route only handled GET requests.

## Solution Implemented
Changed `src/webui.rs` line 61 from:
```rust
.route("/api/{*path}", get(handle_api))
```
to:
```rust
.route("/api/{*path}", any(handle_api))  // Handle ALL methods for API
```

Also added `any` to imports (line 12):
```rust
routing::{any, get},
```

## Files Modified
- `src/webui.rs` - API route now handles all HTTP methods
- `src/gateway/mod.rs` - Provider config save fix, system info fixes
- `webui/src/services/hooks.ts` - Enhanced error logging
- `webui/debug.html` - Debug tool for testing API endpoints

## Build Issue
**The build is failing on this Windows system due to Rust compiler memory constraints.**

Error: `STATUS_STACK_BUFFER_OVERRUN (0xc0000409)` when compiling dependencies like `chumsky`, `futures-util`, `rustls`.

## Next Steps
To build and test this fix, use one of these options:

1. **GitHub Actions** - Push changes and let CI build
2. **Linux Machine** - Build on Linux with more RAM
3. **Cloud IDE** - Use GitHub Codespaces or Gitpod
4. **Increase Docker Memory** - Allocate 4GB+ to Docker Desktop

## Verification
Once built, test API endpoints:
- GET http://localhost:8080/api/config - Should return config
- PUT http://localhost:8080/api/config - Should update config
- POST http://localhost:8080/api/config/save - Should save to disk

Use the debug tool at: http://localhost:8080/debug.html
