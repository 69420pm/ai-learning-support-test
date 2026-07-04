# Project Philosophy & Architecture Rules

- **Lean & Simple**: Simplicity is key. Avoid unnecessary abstractions, premature optimization, or overly rigid workflows.
- **4-Tier Package Layers**: Code under `packages/` is partitioned into distinct package layers (`packages/shared`, `packages/infrastructure`, `packages/features`, `packages/core`).
- **Lean Core Orchestration**: `packages/core` (`@core/*`) handles execution pipelines, state machines, and workflow runners. Core orchestrates; features execute pure domain logic.
- **Feature Isolation**: Features (`packages/features/*` / `@features/*`) must be self-contained and isolated. Features MUST NOT cross-import from other features.
- **Infrastructure Isolation**: External drivers (Supabase, Drizzle ORM, S3, local disk) belong exclusively in `packages/infrastructure/*` (`@infrastructure/*`).
- **Database Access Pattern**: Features MUST NOT import raw database drivers, clients, or SQL table schemas directly. Features interact with database data via typed Repository interfaces (`@infrastructure/db`) or runtime Ports & Adapters.
- **Adapter Pattern**: Always write against interfaces for database and storage, allowing hot-swapping between Local and Cloud modes.
- **3-Tier Documentation Governance**:
  - `specs/adrs/`: Historical ADRs explaining *WHY* technical decisions were made.
  - `specs/architecture-index.md`: System blueprint mapping *WHAT* current system layers look like.
  - `rules/`: Active, enforceable guidelines specifying *HOW* developers and AI agents must write code.
- **Reversibility**: Prefer architectural decisions that are easy to change later over "perfect" but rigid ones.
- **Maintainability**: Emulate high-value engineering cultures (Anthropic, Meta): highly scalable, well-documented, and robust.
