import { McpServer } from "@modelcontextprotocol/sdk/server/mcp.js";
import { StreamableHTTPServerTransport } from "@modelcontextprotocol/sdk/server/streamableHttp.js";
import { createServer } from "node:http";
import { spawn } from "node:child_process";
import { readFile, unlink, writeFile, mkdir } from "node:fs/promises";
import { tmpdir, homedir } from "node:os";
import { join } from "node:path";
import { randomUUID } from "node:crypto";
import { z } from "zod";

const USER_TOKEN = process.env.GSD_BROWSER_MCP_TOKEN;
const PORT = Number(process.env.PORT ?? 8788);

if (!USER_TOKEN) {
  console.error("[gsd-browser-mcp] GSD_BROWSER_MCP_TOKEN is required");
  process.exit(1);
}

// Write gsd-browser config pointing at the chromium-wrapper script.
// gsd-browser's TOML schema only exposes browser.path (not extra args),
// so the wrapper bakes in --no-sandbox + other Docker-required flags.
async function writeGsdBrowserConfig() {
  const configDir = join(homedir(), ".gsd-browser");
  await mkdir(configDir, { recursive: true });
  const configPath = join(configDir, "config.toml");
  const content = `[browser]
path = "/usr/local/bin/chromium-wrapper"
headless = true
`;
  await writeFile(configPath, content, "utf-8");
}

function runGsdBrowser(args) {
  return new Promise((resolve) => {
    const proc = spawn("gsd-browser", args, {
      env: { ...process.env, HOME: homedir() },
      timeout: 60000,
    });
    const stdout = [];
    const stderr = [];
    proc.stdout.on("data", (d) => stdout.push(d));
    proc.stderr.on("data", (d) => stderr.push(d));
    proc.on("close", (code) => {
      resolve({
        code,
        stdout: Buffer.concat(stdout).toString("utf-8").trim(),
        stderr: Buffer.concat(stderr).toString("utf-8").trim(),
      });
    });
    proc.on("error", (err) => {
      resolve({ code: 1, stdout: "", stderr: err.message });
    });
  });
}

function extractBearerToken(authHeader) {
  if (!authHeader) return null;
  const match = authHeader.match(/^Bearer\s+(.+)$/i);
  return match ? match[1] : null;
}

function sendJson(res, status, body) {
  if (res.headersSent) return;
  res.writeHead(status, { "content-type": "application/json" });
  res.end(JSON.stringify(body));
}

async function createMcpServer() {
  const server = new McpServer(
    { name: "gsd-browser", version: "0.1.25" },
    { capabilities: { tools: {} } },
  );

  server.registerTool(
    "gsd_browser_run",
    {
      description: [
        "Run a gsd-browser command on the remote headless Chrome instance.",
        "Pass the full subcommand and arguments as a single string.",
        "Examples: 'navigate https://example.com', 'snapshot', 'click-ref @v1:e1',",
        "'fill-ref @v1:e2 hello@example.com', 'wait-for --condition network_idle',",
        "'screenshot', 'eval \"document.title\"', 'daemon health'.",
        "For screenshots the image is returned as base64 PNG.",
        "Always run 'snapshot' after navigation or DOM changes to get fresh element refs.",
      ].join(" "),
      inputSchema: z.object({
        command: z.string().describe(
          "The gsd-browser subcommand and its arguments (without the 'gsd-browser' prefix)."
        ),
      }),
    },
    async ({ command }) => {
      const args = parseCommandString(command);
      const isScreenshot = args[0] === "screenshot";

      if (isScreenshot) {
        const tmpFile = join(tmpdir(), `gsd-screenshot-${randomUUID()}.png`);
        // Inject --output and --format, remove any existing conflicting flags
        const filteredArgs = args.filter((a, i) => {
          const prev = args[i - 1];
          return a !== "--output" && a !== "--format" && prev !== "--output" && prev !== "--format";
        });
        const result = await runGsdBrowser([...filteredArgs, "--output", tmpFile, "--format", "png"]);
        if (result.code !== 0) {
          return {
            content: [{ type: "text", text: result.stderr || result.stdout || `gsd-browser exited with code ${result.code}` }],
            isError: true,
          };
        }
        try {
          const imageData = await readFile(tmpFile);
          await unlink(tmpFile).catch(() => {});
          return {
            content: [
              { type: "image", data: imageData.toString("base64"), mimeType: "image/png" },
            ],
          };
        } catch {
          return {
            content: [{ type: "text", text: "Screenshot taken but failed to read file." }],
            isError: true,
          };
        }
      }

      const result = await runGsdBrowser(args);
      const text = result.stdout || result.stderr || `(exit code ${result.code})`;
      return {
        content: [{ type: "text", text }],
        isError: result.code !== 0,
      };
    },
  );

  return server;
}

function parseCommandString(command) {
  // Simple shell-like tokenizer: handles quoted strings
  const args = [];
  let current = "";
  let inDouble = false;
  let inSingle = false;
  for (let i = 0; i < command.length; i++) {
    const ch = command[i];
    if (ch === '"' && !inSingle) { inDouble = !inDouble; continue; }
    if (ch === "'" && !inDouble) { inSingle = !inSingle; continue; }
    if (ch === " " && !inDouble && !inSingle) {
      if (current.length) { args.push(current); current = ""; }
      continue;
    }
    current += ch;
  }
  if (current.length) args.push(current);
  return args;
}

await writeGsdBrowserConfig();

const httpServer = createServer(async (req, res) => {
  try {
    if (req.method === "GET" && req.url === "/healthz") {
      return sendJson(res, 200, { ok: true });
    }

    if (!req.url?.startsWith("/mcp")) {
      return sendJson(res, 404, { error: "Not found" });
    }

    const token = extractBearerToken(req.headers.authorization);
    if (token !== USER_TOKEN) {
      return sendJson(res, 401, { error: "Unauthorized" });
    }

    const mcpServer = await createMcpServer();
    const transport = new StreamableHTTPServerTransport({ sessionIdGenerator: undefined });
    await mcpServer.connect(transport);

    let body;
    if (req.method === "POST") {
      const chunks = [];
      for await (const chunk of req) chunks.push(chunk);
      try { body = JSON.parse(Buffer.concat(chunks).toString("utf-8")); } catch { body = undefined; }
    }

    await transport.handleRequest(req, res, body);
  } catch (err) {
    console.error("[gsd-browser-mcp] request error:", err);
    sendJson(res, 500, { error: "Internal server error" });
  }
});

httpServer.listen(PORT, "0.0.0.0", () => {
  console.log(`[gsd-browser-mcp] listening on port ${PORT}`);
});
