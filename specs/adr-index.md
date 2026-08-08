# Architectural Decision Records (ADRs)

Overview of the architectural decisions made for the project. Each decision is documented in `specs/adrs/`.

## Foundation & Core Invariants (Must-Read for All Architectural Changes)
Architectural decisions that define active, repository-wide invariants and code design patterns.

- [ADR 002: PostgreSQL + pgvector & Drizzle ORM Strategy](adrs/002-dual-mode-architecture.md) — *PostgreSQL + pgvector single database engine standard (Supabase Cloud & Local Docker)*
- [ADR 003: Single Next.js Application Architecture](adrs/003-single-app-architecture.md) — *Collapse 4-tier monorepo into standard single Next.js App Router application*

## Domain & Feature Infrastructure (Read When Modifying Related Subsystems)
Decisions specific to sub-domains, background workers, or LLM integrations.

- [ADR 001: Cloud Scale-Up Strategy & Postgres Background Job Queue](adrs/001-cloud-scale-up-strategy.md) — *Postgres-backed job queue (`pg-boss` / `FOR UPDATE SKIP LOCKED`) and Cloudflare R2 object storage*
- [ADR 004: Standardizing AI Operations via Vercel AI SDK 7.x](adrs/004-llm-provider-abstraction.md) — *Vercel AI SDK standard for streaming, tool invocation, and structured outputs*
- [ADR 005: Multi-Provider & Bring-Your-Own-Key (BYOK) LLM Configuration](adrs/005-pluggable-llm-providers.md) — *Dynamic multi-provider LLM registry (OpenAI, Gemini, OpenWebUI, BYOK)*
