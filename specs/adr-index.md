# Architectural Decision Records (ADRs)

Overview of architectural decisions for AI agents and developers. Each decision is documented in detail under `specs/adrs/`.

## Foundation & Core Invariants (Must-Read for Architectural & Structural Changes)

- **[ADR 001: Single Next.js Application Architecture Paradigm](adrs/001-single-app-architecture.md)**
  - **Keywords / Tech:** Next.js (App Router), React Server Components (RSC), Server Actions, path aliases (`@/app`, `@/components`, `@/lib`), thin API controllers (`app/api/*`).
  - **When to Read:** Read before creating new routes/APIs, reorganizing directory boundaries, or placing code across presentation vs `lib/` domain layers.

- **[ADR 002: PostgreSQL with pgvector & Drizzle ORM](adrs/002-postgresql-pgvector-drizzle.md)**
  - **Keywords / Tech:** PostgreSQL, Supabase (cloud DB provider), local Docker, `pgvector` (HNSW/IVFFlat), Drizzle ORM (`lib/db`), unified relational & vector embeddings data store.
  - **When to Read:** Read before modifying database schemas, writing Drizzle ORM queries/migrations, or implementing vector similarity search.

## Domain & Feature Infrastructure (Read When Modifying Related Subsystems)

- **[ADR 003: Postgres-Backed Job Queue for Asynchronous Processing](adrs/003-postgres-backed-job-queue.md)**
  - **Keywords / Tech:** PostgreSQL / Supabase backend provider, `pg-boss`, `FOR UPDATE SKIP LOCKED`, `@/lib/queue`, transactional enqueueing, background processing (PDF ingestion, chunking, GraphRAG compilation).
  - **When to Read:** Read before adding or modifying long-running background tasks (>10s), document ingestion pipelines, or queue worker handlers.

- **[ADR 004: Vercel AI SDK Integration & Multi-LLM BYOK Strategy](adrs/004-vercel-ai-sdk-byok.md)**
  - **Keywords / Tech:** Vercel AI SDK (`ai`), `@/lib/ai`, Multi-LLM (OpenAI, Google Gemini, Anthropic), Bring-Your-Own-Key (BYOK), `streamText`, `generateObject`, `useChat`, tool calling, SSE streaming.
  - **When to Read:** Read before adding or editing LLM prompt calls, agentic tool routines, structured outputs, AI chat interfaces, or provider key management.

- **[ADR 005: Supabase Auth & Local CLI Integration](adrs/005-supabase-auth-integration.md)**
  - **Keywords / Tech:** Supabase Auth (`@supabase/ssr`), Supabase Local CLI, Docker, `auth.users.id`, Drizzle ORM foreign keys, session management, Next.js proxy (`proxy.ts`).
  - **When to Read:** Read before implementing user authentication, session proxy/middleware, protected route guards, or linking domain entities to user accounts.

