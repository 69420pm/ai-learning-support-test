# Infrastructure Package (`@infrastructure/*`)

This package provides low-level database drivers, Drizzle ORM schemas, Supabase client abstractions, and file storage adapters.

## Architecture & Responsibilities

- **Database Schemas & Repositories**: Implements data access contracts defined in `@shared` using Drizzle ORM and Supabase.
- **Storage Adapters**: Implements local disk file storage and Cloudflare R2 / S3 cloud storage adapters.
- **Factory Adapters**: Enforces Dual-Mode architecture (switching between Local Mode and Cloud Mode dynamically).

## Layer Constraints

- `@infrastructure` may import `@shared`.
- `@infrastructure` MUST NOT import `apps/web` or UI-layer framework code.
- Higher layers (`apps/web`, `@core`) access infrastructure services through interface contracts or factory functions.
