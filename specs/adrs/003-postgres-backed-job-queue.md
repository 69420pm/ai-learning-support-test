# ADR 003: Postgres-Backed Job Queue for Asynchronous Processing
**Status:** Accepted | **Date:** 2026-08-08

## 1. The Decision
Offload long-running processing tasks (PDF ingestion, chunking, GraphRAG compilation) to a Postgres-backed job queue (`pg-boss` / `FOR UPDATE SKIP LOCKED`) encapsulated in `@/lib/queue`, isolating background execution from Next.js HTTP route handlers.

## 2. Rationale & Alternatives (Concise)
* **Why Postgres Queue:** Prevents HTTP route timeouts (>10s) in Next.js while leveraging existing PostgreSQL infrastructure without introducing new stateful services.
* **Why Transactional Enqueueing:** Enqueuing job items inside the same Postgres transaction as database inserts guarantees atomic background processing.
* **Rejected Redis + BullMQ / RabbitMQ:** Avoids adding a secondary Redis infrastructure dependency, saving cost and reducing DevOps footprint during early architecture.
* **Rejected Synchronous HTTP Processing:** Processing large documents inline causes browser timeout failures and blocks API server threads.
* **Trade-off:** Heavy queue polling can increase PostgreSQL database connection load, requiring managed connection pooling and batch processing.
