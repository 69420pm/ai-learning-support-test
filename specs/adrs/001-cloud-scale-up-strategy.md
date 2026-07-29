# ADR 001: Cloud Scale-Up Strategy
**Status:** Proposed | **Date:** 2026-07-02

## 1. The Decision
We adopt Cloudflare R2 for scalable object storage adapters and dedicated background queues (e.g., Railway BullMQ or AWS Lambda) for long-running PDF ingestion and GraphRAG compilation once free cloud limits are exceeded.

## 2. Rationale & Alternatives (Concise)
*   **Why Cloudflare R2:** Eliminates egress bandwidth fees and provides predictable $0.015/GB/month pricing with standard S3 API compatibility in `@infrastructure`.
*   **Why Dedicated Background Workers:** Bypasses Vercel serverless function execution timeouts (>10s) and body payload limits during heavy GraphRAG processing.
*   **Rejected Supabase Tier Scaling:** Higher tier Supabase storage costs and bandwidth charges scale less predictably than flat R2 pricing.
*   **Rejected In-Memory Vercel Processing:** Vercel serverless timeouts crash long-running PDF parsing and knowledge graph operations.
*   **Trade-off:** Increases cloud infrastructure operational surface area beyond a single hosting provider.
