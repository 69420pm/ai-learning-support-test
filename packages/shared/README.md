# Shared Domain Package (`@shared/*`)

This package contains pure domain models, interface contracts, DTO types, Zod validation schemas, and error definitions used across all workspace packages.

## Layer Constraints & Principles

- **Zero Monorepo Dependencies**: `@shared` MUST NOT import from `@core`, `@infrastructure`, `@features`, or `apps/web`.
- **Framework Agnostic**: Pure TypeScript entity definitions and interface signatures.
- **Single Source of Truth**: Data models defined here serve as contract definitions for presentation (`apps/web`), orchestration (`@core`), and persistence (`@infrastructure`).
