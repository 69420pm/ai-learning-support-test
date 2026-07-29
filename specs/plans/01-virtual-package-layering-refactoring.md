# Implementation Plan 01: Core Virtual Package Layering Refactoring

---

## 1. Document Control

| Attribute | Value |
| :--- | :--- |
| **Plan ID** | `01-virtual-package-layering-refactoring` |
| **Status** | Proposed |
| **Target Packages** | `packages/shared`, `packages/infrastructure`, `packages/features`, `packages/core`, `apps/web` |
| **Architectural Baseline** | [ADR 003: Modular Monolith Architecture & Layering](file:///workspaces/secure-ai-learning-support/specs/adrs/003-modular-monolith-package-structure.md), [rules/package-architecture.md](file:///workspaces/secure-ai-learning-support/rules/package-architecture.md) |
| **Target Branch** | `plan-core-package-layering` |

---

## 2. Executive Summary & Problem Statement

Currently, code inside `packages/core/src/` has a flat directory layout (`database/`, `storage/`, `services/`, `types/`). This flat layout mixes low-level infrastructure drivers (Drizzle ORM, SQLite/Supabase, local file storage) directly with orchestrators and domain types inside `packages/core/`, creating a bloated "God Package" anti-pattern and awkward `packages/core/src/core/` nesting.

Per **ADR 003**, this plan refactors the codebase into clean package-level directories under `packages/`:
1. `packages/shared/` (`@shared/*`): Zero-dependency domain types and contracts.
2. `packages/infrastructure/` (`@infrastructure/*`): Database repositories, Drizzle schemas, and storage adapters.
3. `packages/features/` (`@features/*`): Pure business logic modules.
4. `packages/core/` (`@core/*`): Lean orchestrator services and workflow runners.

---

## 3. User Stories & Acceptance Criteria

### User Stories
- **As a Developer**, I want clear top-level package directories (`packages/shared`, `packages/infrastructure`, `packages/features`, `packages/core`) so that infrastructure drivers (DB/Storage) are isolated from business services without awkward `core/core` path nesting.
- **As an AI Agent / Maintainer**, I want feature modules and orchestrators to consume data via clean interfaces (`@infrastructure/db`, `@shared/types`) so that swapping SQLite for Supabase PostgreSQL or local storage for S3 requires zero changes to business logic.

### Acceptance Criteria
- [ ] TypeScript path aliases (`@shared/*`, `@infrastructure/*`, `@features/*`, `@core/*`) configured across workspace packages.
- [ ] Domain types migrated to `packages/shared/src/types/`.
- [ ] Storage drivers migrated to `packages/infrastructure/src/storage/`.
- [ ] Database drivers & schemas migrated to `packages/infrastructure/src/db/`.
- [ ] Orchestrators migrated to `packages/core/src/services/`.
- [ ] `packages/core/src/index.ts` re-exports all public contracts maintaining full backwards compatibility for `apps/web`.
- [ ] All unit tests, integration tests, and `pnpm check` pass with zero type errors or broken imports.

---

## 4. Architectural & Monorepo Impact Mapping

### Layer Boundary Verification
- Code placement strictly respects [rules/package-architecture.md](file:///workspaces/secure-ai-learning-support/rules/package-architecture.md) and [ADR 003](file:///workspaces/secure-ai-learning-support/specs/adrs/003-modular-monolith-package-structure.md#L20-L45).
- Direct imports from `@infrastructure/db/schema/*` inside `@features/*` or `@core/*` are forbidden; access must go through `@infrastructure/db` exports or `@shared/*` types.

### Path Aliases Mapping
| Old Path | New Path | TypeScript Path Alias |
| :--- | :--- | :--- |
| `packages/core/src/types/*` | `packages/shared/src/types/*` | `@shared/types/*` |
| `packages/core/src/storage/*` | `packages/infrastructure/src/storage/*` | `@infrastructure/storage/*` |
| `packages/core/src/database/*` | `packages/infrastructure/src/db/*` | `@infrastructure/db/*` |
| `packages/core/src/services/*` | `packages/core/src/services/*` | `@core/services/*` |

---

## 5. Step-by-Step Task Breakdown

### Task 1: Configure TypeScript Path Aliases Across Workspace Packages

- **Goal & Rationale**: Enable TS path aliases (`@shared/*`, `@infrastructure/*`, `@features/*`, `@core/*`) so imports across `apps/web` and `packages/*` use clean package-level aliases.
- **Target Files**:
  - `packages/core/tsconfig.json`
  - `packages/tsconfig/base.json`
- **Interfaces & Configuration**:
  ```json
  {
    "compilerOptions": {
      "baseUrl": ".",
      "paths": {
        "@shared/*": ["packages/shared/src/*"],
        "@infrastructure/*": ["packages/infrastructure/src/*"],
        "@features/*": ["packages/features/src/*"],
        "@core/*": ["packages/core/src/*"]
      }
    }
  }
  ```
- **TDD / Verification Instructions**:
  1. Update tsconfig path aliases.
  2. Run `pnpm check` to verify TypeScript parses the config without errors.
- **Acceptance Criteria**:
  - [ ] Path aliases registered in tsconfig.
  - [ ] `pnpm check` passes without syntax or compiler configuration errors.
- **Git Commit Command**: `feat(core): configure package tsconfig path aliases`

---

### Task 2: Migrate Shared Types to `packages/shared/src/types/`

- **Goal & Rationale**: Move domain type definitions (`DocumentEntity`, `DocumentStatus`) to `packages/shared/src/types/document.ts` to establish the `@shared/*` zero-dependency domain package.
- **Target Files**:
  - `packages/shared/src/types/document.ts`
  - `packages/shared/src/types/document.test.ts`
- **Interfaces & Data Contracts**:
  ```typescript
  export type DocumentStatus = "pending" | "processing" | "completed" | "error";

  export interface DocumentEntity {
    id: string;
    userId: string;
    name: string;
    storagePath: string;
    fileSize: number;
    status: DocumentStatus;
    createdAt: number;
    updatedAt: number;
  }
  ```
- **TDD Instructions**:
  1. **Red**: Create `packages/shared/src/types/document.test.ts` verifying that `DocumentEntity` type contract can be instantiated.
  2. **Green**: Create `packages/shared/src/types/document.ts` and export the types.
  3. **Refactor**: Re-export from `packages/core/src/types/document.ts` to keep existing consumers working.
  4. Run `pnpm test`.
- **Acceptance Criteria**:
  - [ ] `DocumentEntity` and `DocumentStatus` exported from `packages/shared/src/types/document.ts`.
  - [ ] Co-located `document.test.ts` passes.
- **Git Commit Command**: `refactor(shared): create shared domain package and migrate types`

---

### Task 3: Refactor Storage Adapters into `packages/infrastructure/src/storage/`

- **Goal & Rationale**: Move `StorageService` interface and `LocalFileSystemStorage` implementation into `packages/infrastructure/src/storage/` to isolate storage drivers behind the infrastructure layer.
- **Target Files**:
  - `packages/infrastructure/src/storage/storage-service.ts`
  - `packages/infrastructure/src/storage/local-storage.ts`
  - `packages/infrastructure/src/storage/local-storage.test.ts`
- **Interfaces & Data Contracts**:
  ```typescript
  export interface StorageService {
    uploadFile(storagePath: string, buffer: Buffer): Promise<string>;
    deleteFile(storagePath: string): Promise<void>;
    readFile(storagePath: string): Promise<Buffer>;
  }
  ```
- **TDD Instructions**:
  1. Move `storage-service.ts` and `local-storage.ts` to `packages/infrastructure/src/storage/`. Update imports to use `@shared/types` if needed.
  2. Run `pnpm test`.
- **Acceptance Criteria**:
  - [ ] Storage adapters located in `packages/infrastructure/src/storage/`.
  - [ ] `local-storage.test.ts` passes cleanly.
- **Git Commit Command**: `refactor(infrastructure): move storage adapters into infrastructure package`

---

### Task 4: Refactor Database Adapters & Schemas into `packages/infrastructure/src/db/`

- **Goal & Rationale**: Move Drizzle database setup (`db.ts`) and table schema (`schema/documents.ts`) to `packages/infrastructure/src/db/` to isolate persistence drivers.
- **Target Files**:
  - `packages/infrastructure/src/db/db.ts`
  - `packages/infrastructure/src/db/schema/documents.ts`
  - `packages/infrastructure/src/db/db.test.ts`
- **Interfaces & Data Contracts**:
  ```typescript
  export { db } from "./db.js";
  export { documents, type DocumentRow, type NewDocumentRow } from "./schema/documents.js";
  ```
- **TDD Instructions**:
  1. Move `database/db.ts` and `database/schema/documents.ts` to `packages/infrastructure/src/db/`.
  2. Update schema import references to use `@shared/types` if applicable.
  3. Run `pnpm test`.
- **Acceptance Criteria**:
  - [ ] Database client and Drizzle schemas located under `packages/infrastructure/src/db/`.
  - [ ] `db.test.ts` passes cleanly using `DATABASE_PATH` env var isolation.
- **Git Commit Command**: `refactor(infrastructure): move database setup and schema to infrastructure package`

---

### Task 5: Refactor Document Service into Lean `packages/core/src/services/document/`

- **Goal & Rationale**: Keep `DocumentService` in `packages/core/src/services/document/` and update its imports to consume `@infrastructure/db`, `@infrastructure/storage`, and `@shared/types`.
- **Target Files**:
  - `packages/core/src/services/document/document-service.ts`
  - `packages/core/src/services/document/document-service.test.ts`
- **Interfaces & Data Contracts**:
  ```typescript
  import { db } from "@infrastructure/db/db.js";
  import { documents } from "@infrastructure/db/schema/documents.js";
  import type { StorageService } from "@infrastructure/storage/storage-service.js";
  import type { DocumentEntity } from "@shared/types/document.js";
  ```
- **TDD Instructions**:
  1. Update `document-service.ts` imports to point to `@infrastructure/*` and `@shared/*`.
  2. Run `pnpm test`.
- **Acceptance Criteria**:
  - [ ] `DocumentService` located in `packages/core/src/services/document/`.
  - [ ] `document-service.test.ts` passes cleanly.
- **Git Commit Command**: `refactor(core): update DocumentService imports to consume infrastructure and shared packages`

---

### Task 6: Update Core Public Exports in `packages/core/src/index.ts`

- **Goal & Rationale**: Update `packages/core/src/index.ts` to re-export entities from `@shared/*`, `@infrastructure/*`, and `@core/*`, maintaining 100% backwards compatibility for `apps/web`.
- **Target Files**:
  - `packages/core/src/index.ts`
  - `packages/core/src/index.test.ts`
- **Interfaces & Data Contracts**:
  ```typescript
  export { db } from "@infrastructure/db/db.js";
  export { type DocumentRow, documents, type NewDocumentRow } from "@infrastructure/db/schema/documents.js";
  export * from "./services/document/document-service.js";
  export * from "@infrastructure/storage/local-storage.js";
  export * from "@infrastructure/storage/storage-service.js";
  export * from "@shared/types/document.js";
  export const core = () => "core";
  ```
- **TDD Instructions**:
  1. Update `packages/core/src/index.ts`.
  2. Run `pnpm test`.
  3. Verify `index.test.ts` passes.
- **Acceptance Criteria**:
  - [ ] `packages/core/src/index.ts` cleanly re-exports public entities.
  - [ ] Core package build & tests pass.
- **Git Commit Command**: `refactor(core): update package entrypoint exports for top-level package layer structure`

---

### Task 7: Full Monorepo Integration & `pnpm check` Verification

- **Goal & Rationale**: Run full monorepo typechecking and integration tests across `packages/core`, `packages/infrastructure`, `packages/shared`, and `apps/web` to guarantee zero regressions.
- **Target Files**:
  - `apps/web/app/api/documents/route.ts`
  - `apps/web/app/api/documents/upload/route.ts`
  - `apps/web/app/api/documents/route.test.ts`
- **TDD Instructions**:
  1. Run `pnpm check` across the monorepo.
  2. Run `pnpm test` across all workspace packages.
- **Acceptance Criteria**:
  - [ ] `pnpm check` completes with 0 errors across all workspace tasks.
  - [ ] All API routes in `apps/web` build and function with zero import errors.
- **Git Commit Command**: `chore: verify full monorepo integration for top-level package structure`

---

## 6. Risk Assessment & Fallback Plan

- **Risk**: Moving files into `packages/shared` and `packages/infrastructure` might temporarily break imports during migration.
  - **Mitigation**: Re-export moved entities from `packages/core/src/index.ts` during intermediate steps so consumers remain unbroken.
- **Fallback Plan**: If build breaks during refactoring, git reset back to pre-refactor commit on branch `plan-core-package-layering`.

---

## 7. Verification & Definition of Done

- [ ] All 7 tasks executed step-by-step.
- [ ] Top-level package structure established: `packages/shared`, `packages/infrastructure`, `packages/features`, `packages/core`.
- [ ] `pnpm check` passes green across the monorepo.
