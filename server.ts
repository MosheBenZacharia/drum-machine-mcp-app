import { registerAppResource, registerAppTool, RESOURCE_MIME_TYPE } from "@modelcontextprotocol/ext-apps/server";
import { McpServer } from "@modelcontextprotocol/sdk/server/mcp.js";
import type { CallToolResult, ReadResourceResult } from "@modelcontextprotocol/sdk/types.js";
import fs from "node:fs/promises";
import path from "node:path";
import { z } from "zod";

const __filename = new URL(import.meta.url).pathname;
const __dirname = path.dirname(__filename);
const DIST_DIR = __filename.endsWith(".ts")
  ? path.join(__dirname, "dist")
  : __dirname;

const stepArray = z.array(z.boolean()).length(16).optional();

const F = false, T = true;
const DEFAULT_PATTERN = {
  kick:    [T,F,F,F, F,F,T,F, T,F,F,F, F,F,T,F],
  snare:   [F,F,F,F, T,F,F,F, F,F,F,F, T,F,F,F],
  hihat:   [T,F,T,F, T,F,T,F, T,F,T,F, T,F,T,F],
  openhat: [F,F,F,F, F,F,F,F, F,F,F,F, F,F,F,F],
  clap:    [F,F,F,F, T,F,F,F, F,F,F,F, T,F,F,F],
  tom:     [F,F,F,F, F,F,F,F, F,F,F,T, F,F,F,F],
  rimshot: [F,F,F,F, F,F,F,F, F,F,F,F, F,F,F,F],
};

export function createServer(): McpServer {
  const server = new McpServer({
    name: "Drum Machine",
    version: "1.0.0",
    icons: [{
      src: "data:image/svg+xml,%3Csvg xmlns='http://www.w3.org/2000/svg' viewBox='0 0 100 100'%3E%3Crect width='100' height='100' rx='20' fill='%230a0a0f'/%3E%3Ccircle cx='50' cy='48' r='30' fill='none' stroke='%23e74c3c' stroke-width='3'/%3E%3Ccircle cx='50' cy='48' r='20' fill='none' stroke='%23f39c12' stroke-width='2'/%3E%3Ccircle cx='50' cy='48' r='10' fill='%232ecc71' opacity='0.8'/%3E%3Crect x='20' y='78' width='8' height='3' rx='1' fill='%233498db'/%3E%3Crect x='32' y='78' width='8' height='3' rx='1' fill='%239b59b6'/%3E%3Crect x='44' y='78' width='8' height='3' rx='1' fill='%232ecc71'/%3E%3Crect x='56' y='78' width='8' height='3' rx='1' fill='%23f39c12'/%3E%3Crect x='68' y='78' width='8' height='3' rx='1' fill='%23e74c3c'/%3E%3C/svg%3E",
      mimeType: "image/svg+xml",
      sizes: ["any"],
    }],
  });

  const resourceUri = "ui://drum-sequencer/mcp-app.html";

  registerAppTool(server,
    "play-drum-pattern",
    {
      title: "Drum Machine",
      description: "Interactive drum machine and step sequencer. Use this when the user wants to create, play, or explore drum patterns, beats, or rhythms. Supports kick, snare, hi-hat, open hi-hat, clap, rimshot, and tom across a 16-step grid with adjustable BPM and swing. Great for music production, beat-making, learning rhythm patterns, or just having fun.",
      inputSchema: {
        bpm: z.number().min(40).max(200).default(120).describe("Tempo in beats per minute (40-200)"),
        pattern: z.object({
          kick: stepArray,
          snare: stepArray,
          hihat: stepArray,
          openhat: stepArray,
          clap: stepArray,
          tom: stepArray,
          rimshot: stepArray,
        }).default(DEFAULT_PATTERN).describe("Drum pattern. Keys: kick, snare, hihat, openhat, clap, tom, rimshot. Values: arrays of 16 booleans (one per 16th note step)."),
        swing: z.number().min(0).max(1).default(0).describe("Swing amount (0-1, where 0 is straight and 1 is full shuffle)"),
      },
      _meta: { ui: { resourceUri } },
    },
    async (args): Promise<CallToolResult> => {
      const { bpm = 120, pattern, swing = 0 } = args;

      const activeInstruments: string[] = [];
      for (const [name, steps] of Object.entries(pattern)) {
        if (steps && steps.some((s: boolean) => s)) {
          activeInstruments.push(name);
        }
      }

      let summary = `Loaded a ${bpm} BPM drum pattern`;
      if (swing > 0) summary += ` with ${Math.round(swing * 100)}% swing`;
      if (activeInstruments.length > 0) {
        summary += `. Active instruments: ${activeInstruments.join(", ")}`;
      } else {
        summary += `. Empty pattern — use the sequencer grid to add beats.`;
      }

      return {
        content: [{ type: "text", text: summary }],
        structuredContent: { bpm, pattern, swing },
      };
    },
  );

  registerAppResource(server,
    resourceUri,
    resourceUri,
    { mimeType: RESOURCE_MIME_TYPE },
    async (): Promise<ReadResourceResult> => {
      const html = await fs.readFile(path.join(DIST_DIR, "mcp-app.html"), "utf-8");

      return {
        contents: [
          {
            uri: resourceUri,
            mimeType: RESOURCE_MIME_TYPE,
            text: html,
            _meta: {
              ui: {
                csp: {
                  resourceDomains: ["https://cdnjs.cloudflare.com"],
                },
              },
            },
          },
        ],
      };
    },
  );

  return server;
}
