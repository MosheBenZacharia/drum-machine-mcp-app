import { StdioServerTransport } from "@modelcontextprotocol/sdk/server/stdio.js";
import { createMcpExpressApp } from "@modelcontextprotocol/sdk/server/express.js";
import type { McpServer } from "@modelcontextprotocol/sdk/server/mcp.js";
import { StreamableHTTPServerTransport } from "@modelcontextprotocol/sdk/server/streamableHttp.js";
import cors from "cors";
import type { Request, Response } from "express";
import { createServer } from "./server.js";

export async function startStreamableHTTPServer(
  createServer: () => McpServer,
): Promise<void> {
  const port = parseInt(process.env.PORT ?? "3001", 10);

  const app = createMcpExpressApp({ host: "0.0.0.0" });
  app.use(cors());

  // Serve favicon as inline SVG — drum machine icon
  const FAVICON_SVG = `<svg xmlns="http://www.w3.org/2000/svg" viewBox="0 0 100 100"><rect width="100" height="100" rx="20" fill="#0a0a0f"/><circle cx="50" cy="48" r="30" fill="none" stroke="#e74c3c" stroke-width="3"/><circle cx="50" cy="48" r="20" fill="none" stroke="#f39c12" stroke-width="2"/><circle cx="50" cy="48" r="10" fill="#2ecc71" opacity="0.8"/><rect x="20" y="78" width="8" height="3" rx="1" fill="#3498db"/><rect x="32" y="78" width="8" height="3" rx="1" fill="#9b59b6"/><rect x="44" y="78" width="8" height="3" rx="1" fill="#2ecc71"/><rect x="56" y="78" width="8" height="3" rx="1" fill="#f39c12"/><rect x="68" y="78" width="8" height="3" rx="1" fill="#e74c3c"/></svg>`;
  app.get("/favicon.ico", (_req: Request, res: Response) => {
    res.setHeader("Content-Type", "image/svg+xml");
    res.send(FAVICON_SVG);
  });
  app.get("/favicon.svg", (_req: Request, res: Response) => {
    res.setHeader("Content-Type", "image/svg+xml");
    res.send(FAVICON_SVG);
  });

  app.all("/mcp", async (req: Request, res: Response) => {
    const server = createServer();
    const transport = new StreamableHTTPServerTransport({
      sessionIdGenerator: undefined,
    });

    res.on("close", () => {
      transport.close().catch(() => {});
      server.close().catch(() => {});
    });

    try {
      await server.connect(transport);
      await transport.handleRequest(req, res, req.body);
    } catch (error) {
      console.error("MCP error:", error);
      if (!res.headersSent) {
        res.status(500).json({
          jsonrpc: "2.0",
          error: { code: -32603, message: "Internal server error" },
          id: null,
        });
      }
    }
  });

  const httpServer = app.listen(port, (err) => {
    if (err) {
      console.error("Failed to start server:", err);
      process.exit(1);
    }
    console.log(`MCP server listening on http://localhost:${port}/mcp`);
  });

  const shutdown = () => {
    console.log("\nShutting down...");
    httpServer.close(() => process.exit(0));
  };

  process.on("SIGINT", shutdown);
  process.on("SIGTERM", shutdown);
}

export async function startStdioServer(
  createServer: () => McpServer,
): Promise<void> {
  await createServer().connect(new StdioServerTransport());
}

async function main() {
  if (process.argv.includes("--stdio")) {
    await startStdioServer(createServer);
  } else {
    await startStreamableHTTPServer(createServer);
  }
}

main().catch((e) => {
  console.error(e);
  process.exit(1);
});
