# CLAUDE.md

## Project

Drum Machine MCP App — an interactive step sequencer served as an MCP App.

## Build & Run

```bash
npm run dev          # Dev mode: hot-reload UI + server on port 3001
npm run build        # Production build (typecheck + vite bundle + server declarations)
npm run serve:prod   # Start server without --watch (for deployment)
```

## Architecture

Two-part MCP App: server (Node.js) + UI (vanilla JS bundled into single HTML).

- `server.ts` — `registerAppTool` + `registerAppResource`, linked by `ui://drum-sequencer/mcp-app.html`
- `main.ts` — Streamable HTTP (port from `$PORT`, default 3001) and stdio transports
- `src/mcp-app.ts` — Sequencer grid, Tone.js synths, App SDK lifecycle (`ontoolinput`, `ontoolresult`, `ontoolinputpartial`)
- `src/styles.css` — Dark neon glow aesthetic, CSS grid layout, per-instrument neon colors
- `src/tone.d.ts` — Type declarations for Tone.js global (loaded from CDN)
- `mcp-app.html` — HTML shell, loads Tone.js from cdnjs.cloudflare.com
- `vite.config.ts` — `vite-plugin-singlefile` bundles everything into `dist/mcp-app.html`

## Key Patterns

- Tone.js is loaded from CDN, not bundled. CSP `resourceDomains` whitelists `cdnjs.cloudflare.com` in the resource metadata.
- All drum sounds are synthesized (MembraneSynth, NoiseSynth, MetalSynth) — no audio files.
- `ontoolinputpartial` enables live grid preview as the LLM streams tool arguments.
- `updateModelContext` syncs pattern state back to the host.
- The server provides a default boom-bap pattern when no pattern is specified.

## Testing

Use the ext-apps basic-host at `http://localhost:8080` with `SERVERS='["http://localhost:3001/mcp"]'`.

## Deployment

Railway via Procfile (`web: npm run serve:prod`). `tsx` and `cross-env` are in production deps.
