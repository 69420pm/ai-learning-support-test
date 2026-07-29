# AGENTS.md

Living record of project-specific context, non-discoverable gotchas, and landmines.

## Project Context & Architecture Overview

**AI Learning Support** is a document-grounded, active-learning system. It combines PDF/material ingestion, GraphRAG knowledge structuring, dynamic learning plan synthesis, and pedagogical science engines (FSRS spaced repetition scheduling, Feynman explanation audits, guided encoding).

The project is structured as a **pnpm + Turborepo monorepo** adhering to a decoupled 4-tier architecture:
- **`apps/web`**: Next.js App Router presentation shell.
- **`packages/core` (`@core`)**: Core domain orchestrators, workflow pipelines, and pedagogical engines. Depends on `@shared` for interfaces; only factory files import from `@infrastructure`.
- **`packages/infrastructure` (`@infrastructure`)**: Concrete implementations of repository and storage interfaces defined in `@shared` (Drizzle ORM, Supabase clients, file storage adapters).
- **`packages/shared` (`@shared`)**: Zero-dependency domain entities, repository/storage interface contracts, and DTO types.

> 📖 **Architecture & Rules Routing:**
> - For system architecture blueprints, package layer boundaries, import matrices, and decision trees, see [rules/package-architecture.md](file:///workspaces/secure-ai-learning-support/rules/package-architecture.md).
> - For package-specific architecture, see [packages/core/README.md](file:///workspaces/secure-ai-learning-support/packages/core/README.md), [packages/infrastructure/README.md](file:///workspaces/secure-ai-learning-support/packages/infrastructure/README.md), and [packages/shared/README.md](file:///workspaces/secure-ai-learning-support/packages/shared/README.md).

---

## Non-Discoverable Gotchas & Landmines

1. **Dependency Inversion (Interfaces in `@shared`)**:
   - Repository interfaces (`DocumentRepository`, `StorageService`, etc.) are defined in `@shared`. `@infrastructure` implements them. `@core` services import only the interfaces from `@shared` via constructor injection.
   - *Never* define new interfaces in `@infrastructure`. Always define them in `@shared`.
2. **Composition Root in Factory Files**:
   - The only files in `@core` that may import concrete classes from `@infrastructure` are **factory files** (e.g., `factory.ts`). All other core services depend solely on `@shared` interfaces.
   - *Never* add `export * from '@ai-learning-support/infrastructure'` or similar re-exports in core's barrel file.
3. **Dual-Mode Storage & Database Abstraction**:
   - The application supports both **Local Mode** (local disk + embedded/SQLite) and **Cloud Mode** (S3/R2 + Supabase).
   - Always consume repository interfaces from `@shared`. Never import raw DB drivers or hardcode local filesystem calls in `@core` or `apps/web`.
4. **Zero Dependencies in `@shared`**:
   - `packages/shared` MUST remain zero-dependency (pure TypeScript types/interfaces only). No Zod, no validation libraries, no imports from `@core`, `@infrastructure`, or `@features`.
5. **Thin Controller Rule in `apps/web`**:
   - Next.js API routes (`app/api/*`) are thin HTTP controllers. They must only parse input, check authorization, and delegate execution to `@core` service orchestrators. Never put SQL queries or complex business logic in API routes.
6. **Background Async Ingestion**:
   - PDF parsing and GraphRAG operations exceed 10 seconds. Long-running tasks must run asynchronously using background execution state machines. See [packages/core/README.md](file:///workspaces/secure-ai-learning-support/packages/core/README.md).

---

## Folder Overview

- `apps/`: Monorepo application targets.
  - `web/`: Next.js web application frontend featuring App Router (`app/`), dashboard, developer LLM chat playground, and API endpoints.
- `packages/`: Shared workspace packages.
  - `core/`: Domain orchestration pipelines, workflow state machines, and pedagogical services (`@core/*`).
  - `infrastructure/`: Concrete implementations of repository/storage interfaces from `@shared` (Drizzle, Supabase, local disk adapters) (`@infrastructure`).
  - `shared/`: Shared domain entities, DTO types, and zero-dependency domain models (`@shared/*`).
  - `tsconfig/`: Shared TypeScript configuration presets (`base.json`, `nextjs.json`).
- `rules/`: Development guidelines and standards referenced by `AGENTS.md`.
  - `package-architecture.md`: **Single source of truth** for package layer boundaries (`web`, `core`, `infrastructure`, `shared`), import matrix, and decision tree.
  - `coding-style.md`, `testing.md`, `git-workflow.md`, `documentation-standards.md`, `styling.md`.
- `specs/`: Technical specifications, Feature Epics, and Architecture Decision Records (ADRs).
  - `adrs/`: Architecture Decision Records (`001` through `004`).
  - `architecture/`: Technical design specifications and data models.
  - `plans/`: Implementation plans.
  - Index files: `plan-index.md`, `adr-index.md`.

---

## Rules Routing

This file routes the agent to project-specific rules when needed.

- Read `rules/package-architecture.md` for package layer boundaries, responsibilities, import matrix, and decision tree.
- Read `rules/coding-style.md` for code style guidelines.
- Read `rules/testing.md` for testing approach and guidelines.
- Read `rules/git-workflow.md` for branch, commit, and PR workflows.
- Read `rules/documentation-standards.md` for doc requirements.
- Read `rules/styling.md` when working on frontend (e.g. inside `apps/web/`).

