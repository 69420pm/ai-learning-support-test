# Architectural Decision Records (ADRs)

Overview of the architectural decisions made for the project. Each decision is documented in `specs/adrs/`.

## Foundation & Core Invariants (Must-Read for All Architectural Changes)
Architectural decisions that define active, repository-wide invariants and code design patterns.

- [ADR 001: Single Next.js Application Architecture Paradigm](adrs/001-single-app-architecture.md)
- [ADR 002: PostgreSQL with pgvector & Drizzle ORM](adrs/002-postgresql-pgvector-drizzle.md)

## Domain & Feature Infrastructure (Read When Modifying Related Subsystems)
Decisions specific to sub-domains, background workers, or LLM integrations.

- [ADR 003: Postgres-Backed Job Queue for Asynchronous Processing](adrs/003-postgres-backed-job-queue.md)
- [ADR 004: Vercel AI SDK Integration & Multi-LLM BYOK Strategy](adrs/004-vercel-ai-sdk-byok.md)
