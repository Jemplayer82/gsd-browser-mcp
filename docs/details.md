# Docker Compose and architecture

## Docker Compose

```yaml
services:
  gsd-browser-mcp:
    build: .
    ports:
      - "8788:8788"
    environment:
      GSD_BROWSER_MCP_TOKEN: your-secret-token-here
    restart: unless-stopped
```

## Architecture

- **Base image:** `node:24-trixie-slim` with Chromium and required system libraries
- **Browser binary:** `gsd-browser` v0.1.25 (downloaded at build time from GitHub releases)
- **Runtime:** Node.js server using `@modelcontextprotocol/sdk`
- **Security:** Runs as a non-root `gsd` user; Chromium runs with `--no-sandbox` and `--disable-dev-shm-usage` for Docker compatibility

Each MCP tool call spawns a `gsd-browser` child process with the supplied arguments and streams back the result.

## Requirements

- Docker and Docker Compose
- Port 8788 available on the host

## Related

- [gsd-browser](https://github.com/open-gsd/gsd-browser) — the headless Chrome CLI tool this wraps
- [gsd-gateway](https://github.com/Jemplayer82/gsd-gateway) — companion gateway for connecting through a cloud MCP endpoint
