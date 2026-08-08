# ADR 001: Cloud Scale-Up Strategy & Postgres Background Job Queue
**Status:** Accepted | **Date:** 2026-08-08

## 1. The Decision
We adopt Cloudflare R2 for scalable object storage and a PostgreSQL-backed Job Queue (`pg-boss` utilizing `FOR UPDATE SKIP LOCKED`) in `lib/queue` for processing long-running PDF ingestion, chunking, and GraphRAG knowledge graph compilation.

## 2. Rationale & Alternatives (Concise)
*   **Why Postgres Job Queue (`pg-boss`):** Reuses our existing PostgreSQL database without introducing Redis, RabbitMQ, or external worker service dependencies, simplifying operational overhead while preventing Vercel serverless function timeouts (>10s).
*   **Why Cloudflare R2:** Eliminates egress bandwidth fees and provides predictable pricing with S3 API compatibility.
*   **Rejected Heavy Redis/BullMQ Infrastructure:** Avoids adding a separate Redis deployment for job queue management when PostgreSQL `SKIP LOCKED` satisfies background job requirements.
*   **Rejected In-Memory Vercel Processing:** Vercel serverless timeouts crash long-running PDF parsing and knowledge graph extraction workflows.
*   **Trade-off:** Long-running GraphRAG jobs consume database pool connections during heavy processing runs.
