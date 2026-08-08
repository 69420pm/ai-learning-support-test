# AGENTS.md

## Project Context & Architecture Overview

**AI Learning Support** is a document-grounded, active-learning system combining PDF/material ingestion, GraphRAG knowledge structuring, dynamic learning plan synthesis, and pedagogical science engines (FSRS spaced repetition scheduling, Feynman explanation audits, guided encoding).

The project is structured as a **Single Next.js Application Architecture** (App Router):
- **`app/`**: Presentation shell containing App Router pages (`layout.tsx`, `page.tsx`), CSS styling (`globals.css`), and thin HTTP API route handlers (`app/api/*`).
- **`components/`**: Modular React UI components (`components/ui`, `components/chat`, `components/document`).
- **`lib/`**: Core domain logic, database schemas, AI providers, and background queue processors (`lib/db`, `lib/ai`, `lib/learning`, `lib/queue`).

> 📖 **Architecture & Rules Routing:**
> - For application architecture blueprints, co-location rules, and directory standards, see [rules/single-app-architecture.md](file:///workspaces/secure-ai-learning-support/rules/single-app-architecture.md).
> - For coding standards, testing, styling, and git workflows, see [rules/coding-style.md](file:///workspaces/secure-ai-learning-support/rules/coding-style.md), [rules/testing.md](file:///workspaces/secure-ai-learning-support/rules/testing.md), [rules/styling.md](file:///workspaces/secure-ai-learning-support/rules/styling.md), and [rules/git-workflow.md](file:///workspaces/secure-ai-learning-support/rules/git-workflow.md).

## Rules Routing

This file routes the agent to project-specific rules when needed.

- Read `rules/single-app-architecture.md` for application architecture, co-location rules, and directory boundaries.
- Read `rules/coding-style.md` for code style guidelines.
- Read `rules/testing.md` for Playwright E2E and Vitest unit testing guidelines.
- Read `rules/git-workflow.md` for commit and PR workflows.
- Read `rules/styling.md` for frontend styling guidelines.
