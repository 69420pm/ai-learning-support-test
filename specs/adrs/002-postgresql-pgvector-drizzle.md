# ADR 002: PostgreSQL with pgvector & Drizzle ORM
**Status:** Accepted | **Date:** 2026-08-08

## 1. The Decision
Use PostgreSQL with `pgvector` as the unified data store for relational application data and vector embeddings, managed exclusively via Drizzle ORM (`lib/db`) across local Docker and cloud Supabase environments.

## 2. Rationale & Alternatives (Concise)
* **Why PostgreSQL + pgvector:** Keeps relational entity data (users, learning plans, materials) and vector embeddings in a single ACID-compliant database, ensuring transactional consistency and simpler operation.
* **Why Drizzle ORM:** Delivers zero-overhead TypeScript type safety, SQL-like control, and first-class native `pgvector` support.
* **Rejected Standalone Vector DBs (Pinecone, Qdrant):** Eliminates secondary infrastructure management, network hop latencies, extra service costs, and data drift between relational and vector stores.
* **Rejected Prisma:** Prisma's engine abstraction adds runtime overhead and less direct control over `pgvector` index types (HNSW/IVFFlat) compared to Drizzle.
* **Trade-off:** Standalone vector databases scale higher on ultra-large vector counts; we accept tuning PostgreSQL `pgvector` indexes in exchange for operational simplicity.
