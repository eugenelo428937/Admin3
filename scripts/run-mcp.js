#!/usr/bin/env node

const { spawn } = require("child_process");
const os = require("os");

const args = process.argv.slice(2);
const [server, ...restArgs] = args;

const servers = {   
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
