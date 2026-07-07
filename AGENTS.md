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

## Tool: mgrep search
`mgrep` is registered as an MCP server. Use the `mcp_mgrep_search` tool directly to perform semantic search across the codebase or the web (see the tool's description for parameter details).

## Rules Routing

This file routes the agent to project-specific rules when needed.

- Read `rules/project-rules.md` for general project constraints and philosophy.
- Read `rules/coding-style.md` for code style guidelines.
- Read `rules/testing.md` for testing approach and guidelines.
- Read `rules/git-workflow.md` for branch, commit, and PR workflows.
- Read `rules/documentation-standards.md` for doc requirements.
- Read `rules/styling.md` when working on frontend (e.g. inside `apps/web/`).
