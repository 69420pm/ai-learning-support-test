# AGENTS.md

Living record of project-specific context, non-discoverable gotchas, and landmines.

## Project Context & Architecture Overview

**AI Learning Support** is a document-grounded, active-learning system combining PDF/material ingestion, GraphRAG knowledge structuring, dynamic learning plan synthesis, and pedagogical science engines (FSRS spaced repetition scheduling, Feynman explanation audits, guided encoding).

The project is structured as a **Single Next.js Application Architecture** (App Router):
- **`app/`**: Presentation shell containing App Router pages (`layout.tsx`, `page.tsx`), Tailwind styling (`globals.css`), and thin HTTP API route handlers (`app/api/*`).
- **`components/`**: Modular React UI components (`components/ui`, `components/chat`, `components/document`).
- **`lib/`**: Core domain logic, database schemas, AI providers, and background queue processors (`lib/db`, `lib/ai`, `lib/learning`, `lib/queue`).

> 📖 **Architecture & Rules Routing:**
> - For application architecture blueprints, co-location rules, and directory standards, see [rules/single-app-architecture.md](file:///workspaces/secure-ai-learning-support/rules/single-app-architecture.md).
> - For coding standards, testing, styling, and git workflows, see [rules/coding-style.md](file:///workspaces/secure-ai-learning-support/rules/coding-style.md), [rules/testing.md](file:///workspaces/secure-ai-learning-support/rules/testing.md), [rules/styling.md](file:///workspaces/secure-ai-learning-support/rules/styling.md), and [rules/git-workflow.md](file:///workspaces/secure-ai-learning-support/rules/git-workflow.md).

---

## Non-Discoverable Gotchas & Landmines

1. **Thin Controller Rule**:
   - Next.js API route handlers (`app/api/*`) and Server Actions are thin HTTP controllers. They must only parse input with Zod, check authorization, and delegate execution to `@/lib/*` domain orchestrators. Never write raw SQL or complex business logic directly in API routes.
2. **Database Encapsulation**:
   - Always import Drizzle ORM client and schemas from `@/lib/db`. PostgreSQL with `pgvector` powers data storage across both local Docker and cloud Supabase environments.
3. **Background Async Ingestion**:
   - Heavy tasks like PDF parsing, chunking, and GraphRAG compilation exceed serverless execution timeouts (>10s). Dispatch long-running processing tasks to `@/lib/queue` for background execution.
4. **Vercel AI SDK Standard**:
   - All AI streaming, model provider selection, and tool execution use the Vercel AI SDK (`ai`) standardized in `@/lib/ai`.
5. **No Legacy Monorepo Artifacts**:
   - Do not reintroduce multi-package monorepo boundaries (`packages/*`, `apps/*`, `pnpm-workspace.yaml`). All application logic is co-located under root `app/`, `components/`, and `lib/`.

---

## Folder Overview

- `app/`: Next.js App Router pages, layouts, and HTTP API route handlers.
- `components/`: UI components (`ui/`, `chat/`, `document/`).
- `lib/`: Core modules (`ai/`, `db/`, `learning/`, `queue/`, `utils.ts`).
- `public/`: Static assets.
- `rules/`: Development standards (`single-app-architecture.md`, `coding-style.md`, `testing.md`, `styling.md`, `git-workflow.md`).
- `specs/`: Architecture Decision Records (`adrs/`), Feature Epics (`epics/`), and Implementation Plans (`plans/`).

---

## Rules Routing

This file routes the agent to project-specific rules when needed.

- Read `rules/single-app-architecture.md` for application architecture, co-location rules, and directory boundaries.
- Read `rules/coding-style.md` for code style guidelines.
- Read `rules/testing.md` for Vitest testing approach and guidelines.
- Read `rules/git-workflow.md` for commit and PR workflows.
- Read `rules/styling.md` for frontend styling guidelines.
