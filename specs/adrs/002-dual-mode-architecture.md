# ADR 002: Dual-Mode Architecture (Local Self-Hosted vs. Cloud SaaS)
**Status:** Accepted | **Date:** 2026-07-03

## 1. The Decision
We adopt a Dual-Mode Pluggable Adapter Architecture using dependency inversion to support both local-first self-hosting (SQLite, local disk) and cloud SaaS (Supabase PostgreSQL, S3 storage) from a single shared codebase governed by `LOCAL_MODE` configuration.

## 2. Rationale & Alternatives (Concise)
*   **Why Dual-Mode Adapters:** Allows 99.9% of domain logic in `@core` to be shared without code forks or conditional branching, satisfying both privacy-focused self-hosters and non-technical SaaS subscribers.
*   **Why Drizzle ORM + StorageService Abstractions:** Enables seamless switching between SQLite/local disk and Supabase PG/S3 storage while keeping `@core` completely environment-agnostic.
*   **Rejected Separate SaaS Repository/Fork:** Maintaining a proprietary private fork creates high maintenance overhead, feature drift, and loss of open-source community trust.
*   **Rejected Cloud-Only Architecture:** Violates the privacy-first self-hosting requirement for open-source contributors and local users.
*   **Trade-off:** Requires maintaining and testing Drizzle ORM schemas across both SQLite and PostgreSQL target database engines.
