# Community Figma MCP Server Setup

## Overview

The [community Figma MCP server](https://github.com/Antonytm/figma-mcp-server) (`@antonytm/figma-mcp-server`) enables AI agents to **read and write** Figma documents — unlike the official Figma MCP server which is read-only.

## Architecture

```
Claude Code <--(stdio)--> MCP Server <--(Socket.IO :38450)--> Figma Plugin
```

- **stdio**: JSON-RPC protocol between Claude Code and the MCP server process
- **Socket.IO on port 38450**: WebSocket bridge between the MCP server and the Figma desktop plugin

## Local Installation

The server is cloned to `/Users/work/Documents/Code/figma-mcp-server/`.

### Directory Structure

```
figma-mcp-server/
├── mcp/             # MCP server (Node.js)
│   ├── dist/        # Compiled output (tsc)
│   ├── node_modules/
│   ├── .env         # Local env (sets TRANSPORT=streamable-http by default)
│   └── package.json
└── plugin/          # Figma desktop plugin
    ├── dist/        # Built plugin
    └── manifest.json
```

### Build Commands

```bash
# Build MCP server
cd figma-mcp-server/mcp && npm install && npm run build

# Build Figma plugin
cd figma-mcp-server/plugin && npm install && npm run build
```

## Claude Code Configuration

In `.mcp.json`:

```json
{
  "figma-community": {
    "type": "stdio",
    "command": "node",
    "args": ["/Users/work/Documents/Code/figma-mcp-server/mcp/dist/index.js"],
    "env": {
      "TRANSPORT": "stdio",
      "DOTENV_CONFIG_QUIET": "true"
    }
  }
}
```

### Required Environment Variables

| Variable | Value | Purpose |
|----------|-------|---------|
| `TRANSPORT` | `stdio` | Forces stdio transport (overrides `.env` which defaults to `streamable-http`) |
| `DOTENV_CONFIG_QUIET` | `true` | **Critical** — suppresses dotenv v17 stdout banner that corrupts the MCP protocol |

## Figma Plugin Setup

1. Open **Figma Desktop** and open the document you want to work with
2. Go to **Plugins > Development > Import plugin from manifest...**
3. Select: `/Users/work/Documents/Code/figma-mcp-server/plugin/manifest.json`
4. Start the plugin: **Plugins > Development > Figma MCP Server**
5. The plugin should show "Connected to MCP server" once Claude Code starts the MCP process

After first import, the plugin appears under **Plugins > Development > Figma MCP Server** for quick access.

## Troubleshooting

### MCP server fails to connect (most common)

**Symptom**: Claude Code shows the figma-community server as errored on startup.

**Cause**: `dotenv@17.2.2` prints a banner to **stdout** on startup:
```
[dotenv@17.2.2] injecting env (0) from .env -- tip: ...
```
MCP stdio transport uses stdout exclusively for JSON-RPC messages. Any non-protocol output corrupts the handshake.

**Fix**: Ensure `"DOTENV_CONFIG_QUIET": "true"` is set in the `env` block of `.mcp.json`.

### Port 38450 already in use

**Symptom**: `EADDRINUSE: address already in use :::38450`

**Cause**: A previous MCP server instance didn't shut down cleanly.

**Fix**:
```bash
# Find the process
lsof -i :38450

# Kill it
kill <PID>
```

### Entry point not found

**Symptom**: `Cannot find module .../dist/bundle.js`

**Cause**: The `package.json` references `dist/bundle.js` (Rollup output) but the project is compiled with `tsc` only, producing `dist/index.js`.

**Fix**: Ensure `.mcp.json` points to `dist/index.js`, not `dist/bundle.js`.

### Plugin shows "Not connected to MCP server"

- Verify the MCP server is running (Claude Code session must be active)
- Check that port 38450 is not blocked
- Restart the plugin in Figma: close and reopen via Plugins > Development > Figma MCP Server
- Keep the plugin window open — closing it disconnects the WebSocket

## Key Notes

- The entry point is `dist/index.js` (compiled by `tsc`), **not** `dist/bundle.js` (Rollup bundle does not exist)
- The `.env` file in the mcp directory sets `TRANSPORT=streamable-http` by default — the `.mcp.json` env override to `stdio` is necessary
- `dotenv` does not override existing env vars by default, so the Claude Code env takes precedence
- After any `.mcp.json` change, restart Claude Code for it to take effect
