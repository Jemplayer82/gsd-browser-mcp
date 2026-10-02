<p align="center"><img src="assets/fathom-header-banner.svg" alt="Fathom Works — gsd-browser-mcp" width="100%"></p>

# `$ gsd-browser-mcp`

**Lets an AI assistant like Claude open and use web pages on a browser that runs on your own server.** It is built on top of [gsd-browser](https://github.com/open-gsd/gsd-browser).

**In plain terms:** MCP (Model Context Protocol) is a plug-in standard that lets an AI assistant use outside tools. This project is one such plug-in. It gives the assistant a web browser it can control, kept inside a Docker container (a sealed box that runs software the same way on any machine).

*A [Fathom Works](https://github.com/Jemplayer82) project.*

## `[ quick start ]`

Download the project and create your settings file.

```bash
$ git clone https://github.com/Jemplayer82/gsd-browser-mcp.git
$ cd gsd-browser-mcp
$ cp .env.example .env
```

Edit `.env` and set a secret token. This is the password your AI client will use.

```
GSD_BROWSER_MCP_TOKEN=your-secret-token-here
```

Start the container.

```bash
$ docker compose up -d
```

The server listens on port **8788** and reports its health at `/healthz`.

Point your MCP client at this address:

```
http://localhost:8788/mcp
```

Send the token in this header:

```
Authorization: Bearer your-secret-token-here
```

## `[ usage ]`

The server offers one tool, `gsd_browser_run`. Give it a `gsd-browser` command and it runs that command in the remote browser. You can open pages, take screenshots, click, fill in forms, and run JavaScript.

Common commands:

```
navigate https://example.com
snapshot
screenshot
click-ref @v1:e1
fill-ref @v1:e2 hello world
eval "document.title"
```

Screenshots come back as base64-encoded PNG images (text that stands in for a picture).

## `[ configuration ]`

| Variable | Required | What it does |
|---|---|---|
| `GSD_BROWSER_MCP_TOKEN` | Yes | Token that clients must send to use the server |

## `[ docs ]`

- [Docker Compose example, architecture, requirements and related projects](docs/details.md)

## `[ license ]`

See [LICENSE](LICENSE).

<img src="assets/fathom-footer-banner.svg" alt="Fathom Works — sound the depths before you set a course" width="100%">
