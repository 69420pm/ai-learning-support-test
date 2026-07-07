#!/usr/bin/env node
/* biome-ignore-all lint/suspicious/noConsole: console is redirected to stderr for MCP compatibility */

import { exec, spawn } from 'node:child_process';
import { promisify } from 'node:util';
import { Server } from '@modelcontextprotocol/sdk/server/index.js';
import { StdioServerTransport } from '@modelcontextprotocol/sdk/server/stdio.js';
import { CallToolRequestSchema, ListToolsRequestSchema } from '@modelcontextprotocol/sdk/types.js';

const execAsync = promisify(exec);
const WORKSPACE_DIR = '/workspaces/secure-ai-learning-support';
const MGREP_PATH = '/home/vscode/.local/bin/mgrep';

// Redirect console.log/error/debug to stderr because MCP uses stdout for protocol communication
console.log = (...args) => process.stderr.write(`[LOG] ${args.join(' ')}\n`);
console.error = (...args) => process.stderr.write(`[ERROR] ${args.join(' ')}\n`);
console.debug = (...args) => process.stderr.write(`[DEBUG] ${args.join(' ')}\n`);

const server = new Server(
  {
    name: 'mgrep-search-bridge',
    version: '1.0.0',
  },
  {
    capabilities: {
      tools: {},
    },
  },
);

server.setRequestHandler(ListToolsRequestSchema, () => {
  return {
    tools: [
      {
        name: 'search',
        description:
          'Perform semantic (intent-based) natural language search across local files and the web. Use this to find where features or concepts are implemented, feature files, or web documentation when you do not know the exact keyword or code structure. DO NOT use this for exact symbol tracing or refactoring regex; use standard grep/ripgrep for exact keyword matches.',
        inputSchema: {
          type: 'object',
          properties: {
            query: {
              type: 'string',
              description: 'The natural language semantic query to search for.',
            },
            path: {
              type: 'string',
              description: 'Optional file path or directory to limit the search context to.',
            },
            limit: {
              type: 'integer',
              description: 'Optional maximum number of results to return (defaults to 10).',
              default: 10,
            },
            web: {
              type: 'boolean',
              description: 'Include web search results alongside local files.',
              default: false,
            },
            answer: {
              type: 'boolean',
              description:
                'Generate a natural language answer based on the search results instead of returning raw snippets.',
              default: false,
            },
          },
          required: ['query'],
        },
      },
    ],
  };
});

server.setRequestHandler(CallToolRequestSchema, async (request) => {
  if (request.params.name !== 'search') {
    throw new Error(`Tool not found: ${request.params.name}`);
  }

  const { query, path, limit, web, answer } = request.params.arguments;

  // Build command
  let cmd = `"${MGREP_PATH}" search --content`;
  if (limit) cmd += ` -m ${limit}`;
  if (web) cmd += ` --web`;
  if (answer) cmd += ` --answer`;

  // Escape query and optional path for bash execution safely
  const escapedQuery = JSON.stringify(query);
  cmd += ` ${escapedQuery}`;

  if (path) {
    const escapedPath = JSON.stringify(path);
    cmd += ` ${escapedPath}`;
  }

  console.log(`Executing: ${cmd}`);

  try {
    const { stdout, stderr } = await execAsync(cmd, {
      cwd: WORKSPACE_DIR,
    });

    return {
      content: [
        {
          type: 'text',
          text: stdout || stderr || 'No results found.',
        },
      ],
    };
  } catch (error) {
    return {
      content: [
        {
          type: 'text',
          text: `Error executing search: ${error.message}\n${error.stderr || ''}`,
        },
      ],
      isError: true,
    };
  }
});

const transport = new StdioServerTransport();
await server.connect(transport);
console.error('mgrep-search-bridge MCP server running on stdio');

// Start the file watcher in the background to replicate the original mgrep watch hook
const startBackgroundSync = () => {
  console.log('Scheduling background mgrep watch sync...');
  setTimeout(() => {
    console.log('Starting background mgrep watch...');
    const watcher = spawn(MGREP_PATH, ['watch'], {
      cwd: WORKSPACE_DIR,
      stdio: 'ignore',
      detached: true,
    });
    watcher.unref();
  }, 1000);
};

startBackgroundSync();
