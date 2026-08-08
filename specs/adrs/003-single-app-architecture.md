# ADR 003: Single Next.js Application Architecture
**Status:** Accepted | **Date:** 2026-08-08

## 1. The Decision
We adopt a Single Next.js Application Architecture (App Router) with co-located domain modules in `lib/` (`lib/db`, `lib/ai`, `lib/learning`, `lib/queue`), collapsing the legacy multi-package monorepo into a single Next.js project layout.

## 2. Rationale & Alternatives (Concise)
*   **Why Single Next.js App Architecture:** Eliminates cross-package dependency friction, circular import hazards, tsconfig build overhead, and premature package abstractions.
*   **Why Co-location in lib/:** Clear, standard Next.js conventions (`app/` presentation shell, `components/` UI widgets, `lib/` domain logic & infrastructure) enable rapid iteration and direct code navigation.
*   **Rejected Multi-Package Monorepo:** Over-engineered package boundaries (`packages/core`, `packages/infrastructure`, `packages/shared`) added severe indirection friction and maintenance overhead without providing independent deployable boundaries.
*   **Trade-off:** Requires disciplined discipline within `lib/` subfolders to prevent coupling UI logic with backend processing.
