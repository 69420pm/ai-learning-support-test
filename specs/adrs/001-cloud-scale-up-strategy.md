# ADR 001: Cloud Scale-Up Strategy

**Status:** Proposed  
**Date:** 2026-07-02  

## Context
As the platform scales beyond MVP, we will exceed the free limits for Supabase storage and encounter processing limitations with Vercel serverless functions (like the 4.5MB payload limit and short timeouts) during background ingestion of PDFs and GraphRAG compilation.

## Decision / Future Plans

### 1. Storage Migration (Cloudflare R2)
Once storage needs exceed Supabase free limits, we will migrate to **Cloudflare R2**.
* **Why:** To avoid egress/bandwidth charges and access flat $0.015/GB/month pricing. 
* **Implementation:** Add a `CloudflareR2Storage` adapter implementing the `StorageService` interface (using the S3 API).

### 2. Queue & Worker Hosting
To handle long-running PDF text extraction and GraphRAG generation (which can exceed 10 seconds), we will move from a local in-memory worker to a dedicated background processing queue in the cloud.
* **Option A (Railway VPS):** Deploy a standard Node.js server container running BullMQ or Inngest. This bypasses Vercel function timeouts entirely.
* **Option B (AWS Lambda / SST):** Scale-to-zero serverless functions with a 15-minute timeout limit. Highly cost-effective (huge free tier) but requires more DevOps setup.
