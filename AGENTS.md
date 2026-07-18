# AGENTS.md

Living record of project-specific, non-discoverable gotchas and landmines.

## The Flat, Un-Bureaucratic Structure

The project strictly separates human-facing specifications from agent-only memory:

- `rules/` (Root): Strict, fluff-free constraints. Merges coding style, architecture, tool usage, and LLM gotchas into one place.
- `specs/` (Root): The living truth of the software. Contains `templates/`, `prds/`, `adrs/`, and `plans/`. (Kept out of agent-only memory so humans can easily read and write them).
- `.agents/memory/resources/`: Deep context only pulled when explicitly needed via search. Contains PDFs, domain research, and reference repos.
- `.agents/memory/rsi/`: The recursive self-improvement engine room. Stores run logs, human satisfaction scores, and synthesized lessons waiting to be verified and promoted to `rules/`.

## Dynamic Semantic Exploration

Instead of static routing tables, the agent relies heavily on Semantic Search (`mgrep`). Before beginning a task, dynamically search for relevant rules and resources in the `rules/`, `specs/`, and `.agents/memory/` directories.

## Tool: mgrep search
`mgrep` is registered as an MCP server. Use the `mcp_mgrep_search` tool directly to perform semantic search across the codebase or the web.
