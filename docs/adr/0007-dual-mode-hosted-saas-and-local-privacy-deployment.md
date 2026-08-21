# Dual-Target Deployment Architecture (Cloud Hosted SaaS vs. Local Privacy Mode)

**Status:** Accepted | **Date:** 2026-08-20

## The Decision

The system is architected as a **single unified Next.js codebase (99.9% shared code)** supporting two first-class deployment targets. Environment-specific variations are isolated behind thin domain seams, while core business logic, UI components, and data schemas remain completely uniform.

---

### 1. The Two Deployment Targets

| Dimension | Cloud-Hosted Multi-Tenant SaaS | Local Privacy / Self-Hosted Mode |
| :--- | :--- | :--- |
| **Target Audience** | General learners seeking instant zero-setup web access with managed models. | Tech-savvy users and privacy-focused learners wanting 100% offline data locality or BYOK. |
| **Authentication** | Managed Supabase Auth (`@supabase/ssr`) with multi-tenant session isolation. | Single-user bypass (`LOCAL_MODE=true` / `LOCAL_DEV_AUTH=true`) mapping to a deterministic local user ID. |
| **Database** | Managed Supabase PostgreSQL with `pgvector`. | Local PostgreSQL with `pgvector`, runnable as a **host system service** (Linux/macOS) or via **Docker Compose**. |
| **AI Providers & Keys** | Platform-managed keys with optional client-side header BYOK (`x-api-key`). | Full BYOK via `.env` (Gemini, OpenAI, Claude) and local OpenAI-compatible inference (`OLLAMA_BASE_URL` / `LOCAL_AI_BASE_URL`). |
| **Material Storage** | Supabase Storage / S3 cloud object store via `lib/storage`. | Local filesystem storage (`./data/uploads/`) via `lib/storage`. |
| **Background Queue** | Dedicated background worker instance executing `pg-boss` jobs. | In-process `pg-boss` worker booted automatically via Next.js `instrumentation.ts` on server startup. |
| **Quotas & Billing** | Usage limits and paywall guards enforced at controller layer (`app/api/*`) via `lib/billing`. | Completely bypassed; all features and throughput are unrestricted. |

---

### 2. Shared Cross-Target Invariants

To eliminate duplicate code paths and schema drift, both deployment targets adhere to the following shared invariants:

1. **Standardized 768-Dimension Vector Embeddings**:
   * All vector columns in `pgvector` schemas are fixed at **768 dimensions**.
   * The specific embedding model remains open and configurable (e.g., Google `gemini-embedding-001` (768d MRL), Ollama `nomic-embed-text`, BAAI `bge-base-en-v1.5`), ensuring database schemas and HNSW vector indexes remain invariant across cloud and local setups without dynamic SQL migrations.

2. **Unified Drizzle Data Model**:
   * Relational schemas, queries, and migrations in `lib/db` are 100% identical. The initial migration provisions an `auth` schema placeholder in standalone PostgreSQL to guarantee foreign key integrity with zero code changes.

3. **Isolated Seam Abstractions**:
   * All environment-specific behaviors are encapsulated in dedicated modules (`lib/auth/session.ts`, `lib/ai/providers.ts`, `lib/storage`, `lib/queue`, `lib/billing`). UI components and pedagogical engines (`lib/learning`) have zero knowledge of whether the app is running in cloud SaaS or local mode.

---

## Rationale & Alternatives

* **Why Seam-Based Dual Mode**: Isolating deployment differences behind thin interfaces keeps the domain modules (`lib/learning`, `lib/ai`, `lib/db/queries`) 100% shared, preventing feature divergence and tech debt.
* **Why Flexible Local PostgreSQL (Service or Docker)**: Supporting standard PostgreSQL host services as well as Docker Compose ensures local users and developers have total flexibility regardless of container tooling availability.
* **Why 768-Dimension Schema Invariant**: 768 dimensions represents the standard intersection across leading hosted models and local open-source embedding models, eliminating vector table schema divergence while keeping the model open.
* **Why In-Process Local Workers**: Using Next.js `instrumentation.ts` avoids forcing self-hosters to run multi-process orchestrators (e.g. separate worker containers or Procfiles).
* **Rejected Separate Forks / Repositories**: Maintaining separate codebases for open-source/local vs cloud SaaS leads to immediate code rot and doubled development overhead.
* **Rejected Heavy Local Supabase / MinIO Stacks**: Requiring the entire 12-container Supabase local CLI stack or MinIO S3 emulators creates excessive RAM and CPU footprint for users wanting simple, lightweight local execution.
* **Trade-off**: Embeddings are constrained to 768-dimension models (or models supporting MRL / dimension truncation), and cloud-specific features like Stripe webhooks must reside strictly outside the core domain.
