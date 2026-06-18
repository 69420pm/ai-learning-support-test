# Architectural Decision Records (ADR Log)

This log tracks the chronological history of key design and architectural decisions in the **AI Learning Support** project. All future architecture and planning agents must read this log to understand codebase constraints and design patterns.

| ID | Date | Status | Title | Context / Problem | Chosen Approach & Rationale | Alternatives Rejected |
| :--- | :--- | :--- | :--- | :--- | :--- | :--- |
| **ADR-001** | 2026-06-05 | **Accepted** | Biome for Linting & Formatting | Maintaining separate ESLint and Prettier configurations adds friction, slows down git hooks, and increases agent tool confusion. | We use **Biome** as a single tool for code formatting, import sorting, and linting. It is extremely fast and enforced via pre-commit Git hooks. | ESLint & Prettier (rejected due to speed and complex configuration overhead). |
| **ADR-002** | 2026-06-05 | **Accepted** | Vitest for Unit Testing | Need a fast, native test runner for TypeScript modules that integrates seamlessly with Biome and Turborepo. | We use **Vitest** for unit testing. Tests reside next to the code they verify (e.g., `src/index.test.ts` next to `src/index.ts`). | Jest (rejected due to slower TypeScript compilation and configuration complexity). |
| **ADR-003** | 2026-06-05 | **Accepted** | Monorepo via pnpm Workspaces & Turborepo | Product logic (PDF parser, FSRS scheduler, GraphRAG) needs to be decoupled from frontend API shells to allow future CLI or alternate UI wrappers. | A monorepo structure managed by **pnpm workspaces** and coordinated with **Turborepo** caching. UI shell resides in `apps/web/`, core packages reside in `packages/core/`. | Single package structure (rejected due to coupling and lack of clean separation of concerns). |
| **ADR-004** | 2026-06-05 | **Accepted** | Pluggable DB Adapter via Drizzle ORM | The system must run both in a zero-dependency Local Mode (SQLite) and a scalable Cloud Mode (Supabase/Postgres). | We use **Drizzle ORM** with a database adapter interface. Depending on `LOCAL_MODE=true` environment, it initializes a SQLite client (`.data/app.db`) or PostgreSQL client. Vectors are queried using Supabase `pgvector`. | Prisma (rejected due to heavy engine footprint and limited SQLite/pgvector runtime switching flexibility). |
| **ADR-005** | 2026-06-05 | **Accepted** | Pluggable File Storage | Uploaded PDFs must be stored locally during development, but hosted in Cloud Mode without changing business logic. | A pluggable `StorageService` interface. Local mode writes to local disk (`.data/storage/`). Cloud MVP uses Supabase Storage. Large scale-up target is Cloudflare R2. | Direct disk storage only (rejected because it blocks hosting) or S3-only (rejected because it adds local dev credentials setup friction). |
| **ADR-006** | 2026-06-05 | **Accepted** | In-Memory Background Promise for Dev Queue | PDF text extraction and GraphRAG compilation can exceed Vercel's serverless function timeouts. Cloud queues add hosting cost/complexity for local development. | In local mode, Next.js triggers an in-memory background promise or simple local worker thread. Cloud scale-up targets are Railway container (running BullMQ) or AWS Lambda/SST. | BullMQ locally (rejected to avoid requiring Redis for local dev start). |
| **ADR-007** | 2026-06-05 | **Accepted** | Bring Your Own Key (BYOK) for LLM API | High AI usage costs block hosting a free demo/MVP for users. | We provide a settings panel where users can input their own Gemini or OpenAI API keys, ensuring $0 developer LLM API cost. | Developer-funded API keys (rejected as financially unsustainable for a $0 budget MVP). |

---

## Guidelines for Adding Decision Records

When a planning agent or developer introduces a new architectural pattern or rejects alternative strategies:
1. Document the decision in the **Key Decisions & Rationale** section of the Technical Implementation Plan.
2. Once the plan is approved, append the decision chronologically to this log.
3. Keep descriptions concise, factual, and focused on *why* the approach was chosen.
