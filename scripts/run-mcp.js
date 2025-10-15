#!/usr/bin/env node

const { spawn } = require("child_process");
const os = require("os");

const args = process.argv.slice(2);
const [server, ...restArgs] = args;

const servers = {
   browsermcp: {
      windows: {
         command: "cmd",
         args: ["/c", "npx", "-y", "@browsermcp/mcp@latest"],
      },
      default: {
         command: "npx",
         args: ["-y", "@browsermcp/mcp@latest"],
      },
   },
   github: {
      windows: {
         command: "cmd",
         args: ["/c", "npx", "-y", "@modelcontextprotocol/server-github"],
      },
      default: {
         command: "npx",
         args: ["-y", "@modelcontextprotocol/server-github"],
      },
   },
   playwright: {
      windows: {
         command: "cmd",
         args: ["/c", "npx", "-y", "@modelcontextprotocol/server-playwright"],
      },
      default: {
         command: "npx",
         args: ["-y", "@modelcontextprotocol/server-playwright"],
      },
   },
   "tdd-guard Docs": {
      windows: {
         command: "cmd",
         args: [
            "/c",
            "npx",
            "-y",
            "mcp-remote",
            "https://gitmcp.io/nizos/tdd-guard",
         ],
      },
      default: {
         command: "npx",
         args: ["-y", "mcp-remote", "https://gitmcp.io/nizos/tdd-guard"],
      },
   },
   "material-ui Docs": {
      windows: {
         command: "cmd",
         args: [
            "/c",
            "npx",
            "mcp-remote",
            "https://gitmcp.io/mui/material-ui-docs",
         ],
      },
      default: {
         command: "npx",
         args: ["mcp-remote", "https://gitmcp.io/mui/material-ui"],
      },
   },
   "json-logic-py Docs": {
      windows: {
         command: "cmd",
         args: [
            "/c",
            "npx",
            "mcp-remote",
            "https://gitmcp.io/nadirizr/json-logic-py",
         ],
      },
      default: {
         command: "npx",
         args: ["mcp-remote", "https://gitmcp.io/nadirizr/json-logic-py"],
      },
   },
   "mui-mcp": {
      windows: {
         type: "stdio",
         command: "cmd",
         args: ["/c", "npx", "-y", "@mui/mcp@latest"],
      },
      default: {
         type: "stdio",
         command: "npx",
         args: ["-y", "@mui/mcp@latest"],
      },
   },
   "spec-kit Docs": {
      windows: {
         command: "cmd",
         args: ["/c", "npx", "mcp-remote", "https://gitmcp.io/github/spec-kit"],
      },
      default: {
         command: "npx",
         args: ["mcp-remote", "https://gitmcp.io/github/spec-kit"],
      },
   },
   "BMAD-METHOD Docs": {
      windows: {
         command: "cmd",
         args: [
            "/c",
            "npx",
            "mcp-remote",
            "https://gitmcp.io/bmad-code-org/BMAD-METHOD",
         ],
      },
      default: {
         command: "npx",
         args: ["mcp-remote", "https://gitmcp.io/bmad-code-org/BMAD-METHOD"],
      },
   },
   "chrome-devtools-mcp Docs": {
      windows: {
         command: "cmd",
         args: [
            "/c",
            "npx",
            "mcp-remote",
            "https://gitmcp.io/benjaminr/chrome-devtools-mcp",
         ],
      },
      default: {
         command: "npx",
         args: [
            "mcp-remote",
            "https://gitmcp.io/benjaminr/chrome-devtools-mcp",
         ],
      },
   },
   "railway-mcp-server": {
      windows: {
         command: "cmd",
         args: ["/c", "npx", "-y", "@railway/mcp-server"],
      },
      default: {
         command: "npx",
         args: ["-y", "@railway/mcp-server"],
      },
   },
   "railway-cli Docs": {
      windows: {
         command: "cmd",
         args: ["/c", "npx", "mcp-remote", "https://gitmcp.io/railwayapp/cli"],
      },
      default: {
         command: "npx",
         args: ["mcp-remote", "https://gitmcp.io/railwayapp/cli"],
      },
   },
   "railway-Docs Docs": {
      windows: {
         command: "cmd",
         args: ["/c", "npx", "mcp-remote", "https://gitmcp.io/railwayapp/docs"],
      },
      default: {
         command: "npx",
         args: ["mcp-remote", "https://gitmcp.io/railwayapp/docs"],
      },
   },
};

const serverConfig = servers[server];
if (!serverConfig) {
   console.error(`Unknown server: ${server}`);
   process.exit(1);
}

const platform = os.platform() === "win32" ? "windows" : "default";
const config = serverConfig[platform] || serverConfig.default;

const child = spawn(config.command, [...config.args, ...restArgs], {
   stdio: "inherit",
   shell: false,
});

child.on("exit", (code) => {
   process.exit(code);
});
