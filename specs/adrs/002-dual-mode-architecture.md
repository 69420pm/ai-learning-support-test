# ADR 002: PostgreSQL + pgvector & Drizzle ORM Strategy
**Status:** Accepted | **Date:** 2026-08-08

## 1. The Decision
We adopt PostgreSQL with `pgvector` as the single database engine standard across all environments (managed via Supabase Cloud in production and local Docker compose in development), using Drizzle ORM in `lib/db` for type-safe database queries and vector similarity searches.

## 2. Rationale & Alternatives (Concise)
*   **Why PostgreSQL + pgvector + Drizzle ORM:** Standardizes vector embeddings, relational schemas, and background job queue storage on a single database engine. Eliminates dual-dialect SQL translation bugs between SQLite and PostgreSQL.
*   **Why Local Docker Compose + Supabase Cloud:** Ensures 100% feature parity between local development and cloud production deployments without behavioral divergence.
*   **Rejected SQLite / Dual-Dialect Support:** Dual-dialect ORM abstractions created subtle SQL incompatibility bugs, fragile migration scripts, and vector extension mismatches.
*   **Trade-off:** Requires developers to run local Docker for PostgreSQL development.
