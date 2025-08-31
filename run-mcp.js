#!/usr/bin/env node

const { spawn } = require('child_process');
const os = require('os');

const args = process.argv.slice(2);
const [server, ...restArgs] = args;

const servers = {
  browsermcp: {
    windows: {
      command: 'cmd',
      args: ['/c', 'npx', '-y', '@browsermcp/mcp@latest']
    },
    default: {
      command: 'npx',
      args: ['-y', '@browsermcp/mcp@latest']
    }
  },
  github: {
    windows: {
      command: 'cmd',
      args: ['/c', 'npx', '-y', '@modelcontextprotocol/server-github']
    },
    default: {
      command: 'npx',
      args: ['-y', '@modelcontextprotocol/server-github']
    }
  },
  playwright: {
    windows: {
      command: 'cmd',
      args: ['/c', 'npx', '-y', '@modelcontextprotocol/server-playwright']
    },
    default: {
      command: 'npx',
      args: ['-y', '@modelcontextprotocol/server-playwright']
    }
  }
};

const serverConfig = servers[server];
if (!serverConfig) {
  console.error(`Unknown server: ${server}`);
  process.exit(1);
}

const platform = os.platform() === 'win32' ? 'windows' : 'default';
const config = serverConfig[platform] || serverConfig.default;

const child = spawn(config.command, [...config.args, ...restArgs], {
  stdio: 'inherit',
  shell: false
});

child.on('exit', (code) => {
  process.exit(code);
});