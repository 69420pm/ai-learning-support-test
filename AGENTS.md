# AGENTS.md

## Project Context & Architecture Overview

**AI Learning Support** is a document-grounded, active-learning system combining PDF/material ingestion, GraphRAG knowledge structuring, dynamic learning plan synthesis, and pedagogical science engines (FSRS spaced repetition scheduling, Feynman explanation audits, guided encoding).

The project is structured as a **Single Next.js Application Architecture** (App Router):
- **`app/`**: Presentation shell containing App Router pages (`layout.tsx`, `page.tsx`), CSS styling (`globals.css`), and thin HTTP API route handlers (`app/api/*`).
- **`components/`**: Modular React UI components (`components/ui`, `components/chat`, `components/document`).
- **`lib/`**: Core domain logic, database schemas, AI providers, and background queue processors (`lib/db`, `lib/ai`, `lib/learning`, `lib/queue`).

## Routing
- Read `rules/single-app-architecture.md` for application architecture, co-location rules, and directory boundaries.
- Read `rules/tech-stack.md` for package versions and official/local documentation sources.
- Read `rules/coding-style.md` for code style guidelines.
- Read `rules/testing.md` for Playwright E2E and Vitest unit testing guidelines.
- Read `rules/git-workflow.md` for commit and PR workflows.
- Read `rules/styling.md` for frontend styling guidelines.
- Read `specs/adr-index.md` for architectural decision records.

<!-- BEGIN:nextjs-agent-rules -->

# This is NOT the Next.js you know

This version has breaking changes — APIs, conventions, and file structure may all differ from your training data. Read the relevant guide in `node_modules/next/dist/docs/` (resolved from this file's directory; in monorepos the `next` package may not be visible from the repo root) before writing any code. Heed deprecation notices.

This block is written and re-added by `next dev` — verify at `node_modules/next/dist/server/lib/generate-agent-files.js`. Removing it from a diff only re-creates the uncommitted change; committing it with your work keeps the tree clean.

<!-- END:nextjs-agent-rules -->
