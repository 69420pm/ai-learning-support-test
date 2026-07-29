# ADR 003: Modular Monolith Architecture & Layering
**Status:** Accepted | **Date:** 2026-07-03

## 1. The Decision
We structure the monorepo into a Modular Monolith with strict 4-tier layer boundaries (`@shared`, `@infrastructure`, `@features`, `@core`) enforced via TypeScript path aliases and repository interfaces for data access.

## 2. Rationale & Alternatives (Concise)
*   **Why Virtual Package Boundaries:** Eliminates bloated "God packages" and awkward folder nesting (`packages/core/src/core/`) while enabling fast hot-reloading without overhead from separate npm build/publish pipelines.
*   **Why Repository Contracts for Data Access:** Isolates feature modules from direct database drivers (Drizzle/Supabase), enabling pure-data unit testing without database dependencies.
*   **Why 3-Tier Governance:** Separates immutable decision history (`specs/adrs/`), living architecture blueprints (`rules/package-architecture.md`), and active coding rules (`rules/*.md`).
*   **Rejected Flat/Unlayered core Package:** Mixing database drivers, domain logic, and sub-features in a single package created tight coupling and leaky abstractions.
*   **Trade-off:** Strict package path boundaries require diligent path alias configuration and linting enforcement across workspace packages.
