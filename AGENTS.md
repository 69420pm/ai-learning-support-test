# AGENTS.md

## Project Context & Architecture Overview

**AI Learning Support** is a document-grounded, active-learning system combining PDF/material ingestion, GraphRAG knowledge structuring, dynamic learning plan synthesis, and pedagogical science engines (FSRS spaced repetition scheduling, Feynman explanation audits, guided encoding).

The project is structured as a **Single Next.js Application Architecture** (App Router):
- **`app/`**: Presentation shell containing App Router pages (`layout.tsx`, `page.tsx`), CSS styling (`globals.css`), and thin HTTP API route handlers (`app/api/*`).
- **`components/`**: Modular React UI components (`components/ui`, `components/chat`, `components/document`).
- **`lib/`**: Core domain logic, database schemas, AI providers, and background queue processors (`lib/db`, `lib/ai`, `lib/learning`, `lib/queue`).

## Routing
- **Architecture**: Read `rules/architecture.md` when structuring directories, adding routes, or defining layer boundaries (`app/` vs `components/` vs `lib/`).
- **Domain vocabulary**: Read `CONTEXT.md` when naming domain concepts or resolving terminology.
- **Architectural decisions**: Read `docs/adr/` when making or checking foundational technology and boundary choices.
- **Tech stack & docs**: Read `rules/tech-stack.md` when verifying package versions, imports, or official/local doc sources.
- **Coding standards**: Read `rules/coding-style.md` when writing TypeScript types, thin API route controllers, or domain errors.
- **UI & styling**: Read `rules/styling.md` when building UI components with Tailwind CSS, CVA, or Radix primitives.
- **Testing**: Read `rules/testing.md` when writing Vitest unit tests, Playwright POMs, or mocking network boundaries.
- **Git & PRs**: Read `rules/git-workflow.md` when creating branches, committing changes, or opening PRs.
- **External repos**: Read `rules/external-repos.md` when referencing sibling codebases (`../chatbot`, `../opencode`).

## Agent skills

### Issue tracker

GitHub issues via `gh` CLI (`69420pm/ai-learning-support-test`). See `docs/agents/issue-tracker.md`.

### Triage labels

Canonical 5-role vocabulary (`needs-triage`, `needs-info`, `ready-for-agent`, `ready-for-human`, `wontfix`). See `docs/agents/triage-labels.md`.

### Domain docs

Single-context layout (`CONTEXT.md` at root, `docs/adr/`). See `docs/agents/domain.md`.

<!-- BEGIN:nextjs-agent-rules -->

# This is NOT the Next.js you know

This version has breaking changes — APIs, conventions, and file structure may all differ from your training data. Read the relevant guide in `node_modules/next/dist/docs/` (resolved from this file's directory; in monorepos the `next` package may not be visible from the repo root) before writing any code. Heed deprecation notices.

This block is written and re-added by `next dev` — verify at `node_modules/next/dist/server/lib/generate-agent-files.js`. Removing it from a diff only re-creates the uncommitted change; committing it with your work keeps the tree clean.

<!-- END:nextjs-agent-rules -->
