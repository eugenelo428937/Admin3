#!/usr/bin/env node

import fs from 'fs';
import path from 'path';
import { fileURLToPath } from 'url';

const __filename = fileURLToPath(import.meta.url);
const __dirname = path.dirname(__filename);

// Load environment variables from .env file
try {
  const envPath = path.join(__dirname, '.env');
  if (fs.existsSync(envPath)) {
    const envContent = fs.readFileSync(envPath, 'utf8');
    envContent.split('\n').forEach(line => {
      const [key, value] = line.split('=').map(s => s.trim());
      if (key && value && !process.env[key]) {
        process.env[key] = value;
      }
    });
  }
} catch (error) {
  console.error('Error loading .env file:', error.message);
}

// Set the board ID
process.env.TRELLO_BOARD_ID = 't8OdAj4K';

// Start the actual MCP server
await import('./claude-mcp-trello/build/index.js');