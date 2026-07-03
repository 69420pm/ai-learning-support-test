# ADR 002: Dual-Mode Architecture (Local Self-Hosted vs. Cloud SaaS)

**Status:** Accepted  
**Date:** 2026-07-03  

## Context
The application serves two distinct target user segments from a single open-source codebase:
1. **Non-technical SaaS subscribers:** Require a zero-setup, hosted web application (Vercel, Supabase, cloud key proxy, monthly subscription).
2. **Self-hosters and open-source contributors:** Require a free, local-first, zero-dependency environment running locally (SQLite, local disk storage, personal API keys).

To maintain maintainability and community engagement, 99.9% of application logic must be shared without creating code drift, maintaining separate forks, or cluttering business logic with ad-hoc conditional checks.

## Decision
We adopt a **Dual-Mode Pluggable Adapter Architecture** powered by dependency inversion and unified monorepo orchestration (`packages/core`).

### Key Architectural Standards
1. **Environment-Agnostic Core (`packages/core`):** Domain logic (GraphRAG, pedagogical engine, study scheduler, FSRS recall algorithms) contains zero infrastructure dependencies or cloud-specific SDKs.
2. **Database Abstraction (Drizzle ORM):** A single Drizzle schema maps to:
   * **Local Mode:** SQLite database (`.data/app.db`).
   * **Cloud Mode:** Supabase PostgreSQL database (with `pgvector` for concept embeddings).
3. **Storage Abstraction (`StorageService` Interface):**
   * **Local Mode:** `LocalFileSystemStorage` writing directly to disk (`.data/storage/`).
   * **Cloud Mode:** `SupabaseStorage` writing to S3-compatible cloud buckets.
4. **Auth & API Key Provider Abstraction:**
   * **Local Mode:** Single-user local session with direct provider API keys (`GEMINI_API_KEY`).
   * **Cloud Mode:** Supabase OAuth multi-tenant authentication with server-side proxy billing and token usage caps.

Selection between modes is governed deterministically by environment configuration (e.g., `LOCAL_MODE=true`).

## Consequences

### What Becomes Easier
* **Single Source of Truth:** A single monorepo codebase powers both local development/self-hosting and production SaaS.
* **Low Friction Onboarding:** Developers and open-source contributors can clone the repo and run it instantly without creating cloud service accounts.
* **Seamless Scalability:** Core domain features developed locally immediately apply to the cloud SaaS product.

### What Becomes Harder
* **Dual-DB Schema Maintenance:** Drizzle ORM schemas and migrations must be tested and maintained across both SQLite and PostgreSQL target engines.
* **Strict Discipline in Core:** Developers must strictly avoid importing cloud SDKs or direct filesystem utilities inside domain feature packages.

## Alternatives Considered
1. **Separate Codebase / Private SaaS Fork:** Maintaining a private proprietary repository for SaaS. *Rejected* due to massive maintenance overhead, feature drift, and loss of open-source community trust.
2. **SaaS-Only Architecture:** Cloud-only dependencies with no local option. *Rejected* as it violates the privacy-first self-hosting goal defined in [PRD 01](../prds/01-product-vision.md).
3. **Local-Only Distribution:** Requiring all users to run local instances. *Rejected* as it creates high friction for non-technical users who prefer a managed subscription service.
