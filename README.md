<img src="assets/fathom-header-banner.svg" alt="Fathom Works — gsd-browser-mcp" width="100%">

# `$ gsd-browser-mcp`

**A self-hosted MCP (Model Context Protocol) server that gives Claude and other AI clients the ability to browse the web using a headless Chrome instance running in Docker.** Built on top of [gsd-browser](https://github.com/open-gsd/gsd-browser).

---

## `[ what it does ]`

- Runs Chromium in a Docker container
- Exposes a single MCP tool (`gsd_browser_run`) over HTTP on port **8788**
- Lets your AI client navigate pages, take screenshots, click elements, fill forms, and run JavaScript — all through the remote browser

---

## `[ quick start ]`

### 1. clone and configure

```bash
$ git clone https://github.com/Jemplayer82/gsd-browser-mcp.git
$ cd gsd-browser-mcp
$ cp .env.example .env
```

Edit `.env` and set a secret token:

```
GSD_BROWSER_MCP_TOKEN=your-secret-token-here
```

### 2. start the container

```bash
$ docker compose up -d
```

The server starts on port **8788** with a health check at `/healthz`.

### 3. connect your mcp client

Point your MCP client at:

```
http://localhost:8788/mcp
```

Authenticate with a Bearer token header:

```
Authorization: Bearer your-secret-token-here
```

---

## `[ how to use the tool ]`

The server exposes one tool: **`gsd_browser_run`**

Pass any `gsd-browser` subcommand as the argument. Here are common examples:

```
navigate https://example.com
snapshot
screenshot
click-ref @v1:e1
fill-ref @v1:e2 hello world
eval "document.title"
```

Screenshots are returned as base64-encoded PNG images.

---

## `[ docker compose ]`

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

---

## `[ environment variables ]`

| Variable | Required | Description |
|---|---|---|
| `GSD_BROWSER_MCP_TOKEN` | Yes | Bearer token used to authenticate MCP requests |

---

## `[ architecture ]`

- **Base image:** `node:24-trixie-slim` with Chromium and required system libraries
- **Browser binary:** `gsd-browser` v0.1.25 (downloaded at build time from GitHub releases)
- **Runtime:** Node.js server using `@modelcontextprotocol/sdk`
- **Security:** Runs as a non-root `gsd` user; Chromium runs with `--no-sandbox` and `--disable-dev-shm-usage` for Docker compatibility

Each MCP tool call spawns a `gsd-browser` child process with the supplied arguments and streams back the result.

---

## `[ requirements ]`

- Docker and Docker Compose
- Port 8788 available on the host

---

## `[ related ]`

- [gsd-browser](https://github.com/open-gsd/gsd-browser) — the headless Chrome CLI tool this wraps
- [gsd-gateway](https://github.com/Jemplayer82/gsd-gateway) — companion gateway for connecting through a cloud MCP endpoint

---

<img src="assets/fathom-footer-banner.svg" alt="Fathom Works — sound the depths before you set a course" width="100%">
