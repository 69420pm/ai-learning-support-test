# AGENTS.md

Living record of project-specific, non-discoverable gotchas and landmines.

## Folder Structure
- `.agents/`: AI agent configuration, session memory (`memory/`), and custom skills (`skills/`).
- `.changeset/`: Changeset configuration for package versioning and release management.
- `.github/`: GitHub Actions CI/CD workflows and repository templates.
- `apps/`: Monorepo application targets.
  - `web/`: Next.js web application frontend.
- `packages/`: Shared workspace packages.
  - `core/`: Core domain logic, database schemas, and adapters.
  - `tsconfig/`: Shared TypeScript configurations.
- `rules/`: Development guidelines and standards referenced by `AGENTS.md`.
- `specs/`: Technical specifications, PRDs (`prds/`), architecture docs (`architecture/`), and ADRs (`adrs/`).

## Active Root Gotchas
* **Memory Loop:** Always log updates in [.agents/memory/session-history.md](file:///workspaces/secure-ai-learning-support/.agents/memory/session-history.md) and don't read memory when not necessary for the task. If you learned something extraordinary regarding agent performance that can improve future agent runs, note it into [.agents/memory/general-learnings.md]

## Tool: mgrep search usage guide
`mgrep` is a tool for natural-language, semantic searching across local files (code, PDFs, images) and the web. It is designed to understand the *intent* of a search rather than requiring exact regex or string matches.

It is registered as a first-class MCP server in the workspace. You can use the `mcp_mgrep_mgrep_search` tool directly to perform semantic queries.

### Inputs for `mcp_mgrep_mgrep_search`:
- `query` (required): The natural language semantic query.
- `path` (optional): File path or directory to limit search context.
- `limit` (optional): Number of results to return (default: 10).
- `web` (optional): Set true to include web search results alongside local files.
- `answer` (optional): Set true to generate a natural language summary answer based on the retrieved code chunks.

Alternatively, you can run search queries from the command line using the wrapper `mgrep search "query"` or `pnpm mgrep search "query"`.

**Examples (via CLI):**
```bash
mgrep "What code parsers are available?"  # search in the current directory
mgrep "How are chunks defined?" src/models  # search in the src/models directory
mgrep -m 10 "What is the maximum number of concurrent workers in the code parser?"  # limit the number of results to 10
mgrep -a "What code parsers are available?"  # generate an answer to the question based on the results
mgrep --web --answer "How do I integrate a JavaScript runtime into Deno?"  # search the web and get a summarized answer
```

## Rules Routing

This file routes the agent to project-specific rules when needed.

- Read `rules/project-rules.md` for general project constraints and philosophy.
- Read `rules/coding-style.md` for code style guidelines.
- Read `rules/testing.md` for testing approach and guidelines.
- Read `rules/git-workflow.md` for branch, commit, and PR workflows.
- Read `rules/documentation-standards.md` for doc requirements.
- Read `rules/styling.md` when working on frontend (e.g. inside `apps/web/`).
