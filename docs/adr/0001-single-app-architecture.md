# Single Next.js Application Architecture Paradigm

**Status:** Accepted | **Date:** 2026-08-08

## The Decision

The system is built as a single, unified Next.js Application Architecture (App Router) where presentation shell (`app/`), UI components (`components/`), and domain modules (`lib/`) are co-located in a single root repository using strict path aliases (`@/app/*`, `@/components/*`, `@/lib/*`).

## Rationale & Alternatives

* **Why Single Next.js App:** Enables unified deployment, rapid development velocity, zero inter-package dependency management overhead, and seamless integration between React Server Components, Server Actions, and `@/lib/*` domain modules.
* **Rejected Multiple Repos / Microservices:** Introduces network latency, complex cross-service HTTP contract management, and deployment overhead without benefit at current scale.
* **Trade-off:** Requires strict enforcement of layer boundaries (`app/api/*` and Server Actions must remain thin controllers) to prevent business logic leakage into presentation components.
