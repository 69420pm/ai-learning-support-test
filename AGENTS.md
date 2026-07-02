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
* **Memory Loop:** Always read memory files at startup and log updates in [.agents/memory/session-history.md](file:///workspaces/secure-ai-learning-support/.agents/memory/session-history.md).

## Tool: mgrep search usage guide
`mgrep` is a CLI tool for natural-language, semantic searching across local files (code, PDFs, images) and the web. It is designed to understand the *intent* of a search rather than requiring exact regex or string matches. Prefer it whenever it makes sense over standard `grep` or `rg`.
`pnpm mgrep search` is the default command. It can be used to search the current directory for a pattern.

| Option | Description |
| --- | --- |
| `-m <max_count>` | The maximum number of results to return |
| `-c`, `--content` | Show content of the results |
| `-a`, `--answer` | Generate an answer to the question based on the results |
| `-w`, `--web` | Include web search results alongside local files |
| `--agentic` | Enable agentic search to automatically refine queries and perform multiple searches |
| `-s`, `--sync` | Sync the local files to the store before searching |
| `-d`, `--dry-run` | Dry run the search process (no actual file syncing) |
| `--no-rerank` | Disable reranking of search results |
| `--max-file-size <bytes>` | Maximum file size in bytes to upload (overrides config) |
| `--max-file-count <count>` | Maximum number of files to upload (overrides config) |

**Examples:**
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
