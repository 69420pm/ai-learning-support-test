# Technical Implementation Plan: Local Mode Document Ingestion Foundation & UI

## 1. Overview & Context
- **Feature Description**: Implement the local development foundation for document ingestion. This includes defining the data models and database/storage adapter interfaces in the core package (structured in domain-grouped layers), setting up a local SQLite database via Drizzle ORM, creating a local filesystem storage adapter, building the Next.js API upload/list routes, and designing a responsive drag-and-drop files dashboard UI.
- **User Value / Problem Solved**: Unlocks the gateway for learning content ingestion. Users can upload and review their PDFs in a zero-dependency local mode before cloud database/storage dependencies are integrated.
- **Idea Path**: N/A (Iterating on the MVP roadmap from [product_requirements_document.md](file:///Users/kevinsmith/Documents/development/typescript/ai-learning-support/specs/product_requirements_document.md))

---

## 2. Scope Boundaries (Goals & Non-Goals)
- **Goals (In Scope)**:
  - Install core backend dependencies (`drizzle-orm`, `better-sqlite3`, `uuid`) in `@ai-learning-support/core`.
  - Structure core directories into domain-grouped subdirectories (e.g., `src/database/schema/`, `src/services/document/`, `src/types/`) to maintain modularity and prevent file clutter.
  - Define the `StorageService` interface in the core package.
  - Implement `LocalFileSystemStorage` writing files to `.data/storage/` in the workspace.
  - Create the Drizzle schema mapping the `documents` table (UUID, original filename, storage key, file size, processing status, and epoch timestamps).
  - Track files against a default tenant ID (`user_local_dev_123`) in Local Mode to ensure the database schema remains multi-tenant compatible.
  - Create a self-healing database client initialization in `packages/core/src/database/db.ts` that automatically creates tables if they do not exist.
  - Expose a `DocumentService` orchestrator in `@ai-learning-support/core` that handles transactional document saving (DB record creation + disk write).
  - Create Next.js API endpoints `/api/documents/upload` (multipart parser) and `/api/documents` (GET list).
  - Implement a premium drag-and-drop dashboard UI with smooth CSS hover transitions and a file listing table in `apps/web/app/dashboard`.
  - Add comprehensive unit tests in Vitest for the storage adapter and orchestrator.
- **Non-Goals (Out of Scope)**:
  - Performing PDF text extraction, parsing, or chunking. For this milestone, the file will simply be saved in its raw binary format, and the database status will remain `pending`.
  - Setting up the cloud Supabase Postgres database client or pgvector extensions.
  - Setting up the Supabase cloud bucket adapter.
  - Integrating Supabase Auth client logic (authentication routing and cookies are mocked via a mock session context).

---

## 3. Architecture & Components

### Target Repository Layout
```text
├── apps/
│   └── web/
│       ├── app/
│       │   ├── api/
│       │   │   └── documents/
│       │   │       ├── route.ts             # GET list documents
│       │   │       └── upload/
│       │   │           └── route.ts         # POST upload endpoint
│       │   ├── dashboard/
│       │   │   ├── page.tsx                 # Dashboard view
│       │   │   └── dashboard.css            # Styles for dashboard & dropzone
│       │   └── page.tsx                     # Updated home redirect
├── packages/
│   ├── core/
│   │   ├── src/
│   │   │   ├── database/
│   │   │   │   ├── db.ts                    # SQLite/Drizzle client initialization
│   │   │   │   └── schema/
│   │   │   │       └── documents.ts         # Documents table schema
│   │   │   ├── storage/
│   │   │   │   ├── storage-service.ts       # Storage interface
│   │   │   │   ├── local-storage.ts         # FS storage adapter
│   │   │   │   └── local-storage.test.ts
│   │   │   ├── services/
│   │   │   │   └── document/
│   │   │   │       ├── document-service.ts  # Orchestrator core service
│   │   │   │       └── document-service.test.ts
│   │   │   ├── types/
│   │   │   │   └── document.ts              # Document entity type definitions
│   │   │   └── index.ts                     # Entrypoint exports
```

### Component Breakdown & Interfaces

#### 1. **`packages/core/src/types/document.ts`**
Declares the shared domain model:
- `id`: string (UUID)
- `userId`: string (owner reference)
- `name`: string (filename)
- `storagePath`: string (path key in bucket/disk)
- `fileSize`: number (bytes)
- `status`: union literal (`pending` | `processing` | `completed` | `failed`)
- `createdAt`: number (epoch ms timestamp)
- `updatedAt`: number (epoch ms timestamp)

#### 2. **`packages/core/src/database/schema/documents.ts`**
Declares the `documents` Drizzle SQLite table mapping. Exposes the inferred model types (`DocumentRow` and `NewDocumentRow`).

#### 3. **`packages/core/src/database/db.ts`**
- Initializes `better-sqlite3` targeting `.data/app.db`.
- Contains schema bootstrapping code running inline SQL statement: `CREATE TABLE IF NOT EXISTS documents (...)` to auto-heal/self-initialize on require, avoiding migration script runner overhead in development.

#### 4. **`packages/core/src/storage/storage-service.ts`**
TypeScript interface outlining the contract for pluggable file access:
```typescript
export interface StorageService {
  uploadFile(path: string, file: Buffer): Promise<string>;
  getFile(path: string): Promise<Buffer>;
  deleteFile(path: string): Promise<void>;
  getFileUrl(path: string): Promise<string>;
}
```

#### 5. **`packages/core/src/storage/local-storage.ts`**
Implements `StorageService`. 
- Creates `.data/storage/` if missing.
- Methods write, read, and delete files on disk using standard `node:fs` synchronous/promise calls.
- `getFileUrl` returns a local web path `/api/documents/view?path=...`.

#### 6. **`packages/core/src/services/document/document-service.ts`**
Orchestration layer coordinating transactions:
- `uploadDocument(userId: string, filename: string, fileBuffer: Buffer): Promise<DocumentEntity>`
  - Generates UUID `documentId` and path `users/{userId}/documents/{documentId}-{filename}`.
  - Calls storage adapter to save binary payload.
  - Inserts database metadata row using `db.insert(...)` with default `status: 'pending'`.
- `listDocuments(userId: string): Promise<DocumentEntity[]>`
  - Queries `documents` SQLite table filtering by `userId` and sorted by `createdAt`.

#### 7. **`apps/web/app/api/documents/upload/route.ts`**
Next.js POST API endpoint:
- Parses `multipart/form-data` request body.
- Extracts `file` payload and converts its array buffer to `Buffer`.
- Resolves default `MOCK_USER_ID = "user_local_dev_123"`.
- Runs `DocumentService.uploadDocument` and returns JSON response `NextResponse.json({ success: true, data })`.

#### 8. **`apps/web/app/api/documents/route.ts`**
Next.js GET API endpoint:
- Resolves default `MOCK_USER_ID = "user_local_dev_123"`.
- Runs `DocumentService.listDocuments` and returns JSON response.

#### 9. **`apps/web/app/dashboard/`**
- **`dashboard.css`**: Defines styles for a high-fidelity dark mode panel. Includes styling for the dropzone states (hover, dragging active), file table row hover effects, and warning alert tags.
- **`page.tsx`**: Client component (`"use client"`) implementing state hooks:
  - `documents`: array of items fetched from `/api/documents`.
  - `uploading`: boolean indicating network fetch state.
  - `dragActive`: tracking drag enter/leave UI changes.
  - Handles drag events and triggers form-data POST request using `fetch` on drop/selection.

---

## 4. Acceptance Criteria
- [ ] Running `pnpm install` resolves dependencies cleanly in `@ai-learning-support/core`.
- [ ] Programmatic database creation is verified: launching the dev server creates the `.data/app.db` file and the `documents` SQLite table.
- [ ] Running `pnpm run build` compiles both the `@ai-learning-support/core` package and the Next.js `web` package with zero compile or typecheck errors.
- [ ] Launching the Next.js development server and visiting `http://localhost:3000` redirects correctly to `/dashboard`.
- [ ] Dragging and dropping a PDF file (or using the file explorer picker) uploads the file to the Next.js API, returns a 200 JSON payload, writes the PDF block to `.data/storage/users/user_local_dev_123/documents/`, and inserts the metadata row into the `documents` database table.
- [ ] The dashboard documents list table refreshes dynamically to show the new file metadata row with `status: pending`.
- [ ] Running `pnpm run check` compiles, lints (Biome), and executes test suites without failure.

---

## 4.5 Key Decisions & Rationale

| Decision | Why this approach | Alternatives rejected | Constraints |
| :--- | :--- | :--- | :--- |
| **Domain-Grouped Layout** | Groups services, schemas, and types in nested directories by function (e.g. `services/document/`) inside technical layers. | Flat files in root layer folders (`services/document-service.ts`) OR pure vertical slices containing both DB and storage logic. | Restructures layers to keep navigation tidy as scale grows without violating Clean Architecture dependency rules. |
| **Programmatic Table Creation** | Creates SQLite schema inline in `db.ts` upon client load to keep development zero-dependency. | Running migrations CLI runner (`drizzle-kit push`). | Reduces startup complexity for users clone-running the repository in Local Mode. |
| **Mocked Tenant Association** | Assigns `user_local_dev_123` hardcoded value to all files and DB entries in Local Mode. | Eliminating user references from SQLite database. | Prevents schema drift or heavy migration tasks when moving to Supabase multi-tenant mode in Milestone 3. |
| **In-Memory Buffer Parsing** | Next.js API reads standard multipart file blocks directly into memory before calling `uploadDocument`. | Writing files to temporary local directory via `multer`/`formidable`. | Vercel's host filesystem is read-only (except `/tmp`), making multi-part memory buffer processing mandatory for future cloud compatibility. |

---

## 5. Testing Strategy
- **Unit Testing**:
  - Implement unit tests for `LocalFileSystemStorage` in `packages/core/src/storage/local-storage.test.ts` verifying file writing, read checking, and cleanup.
  - Implement unit tests for `DocumentService` in `packages/core/src/services/document/document-service.test.ts` verifying DB row insertions and storage callbacks.
- **Manual Verification**:
  - Upload real PDFs (small and >10MB) via `/dashboard` drag-and-drop to verify responsiveness, layout rendering, file listing refresh, and local file storage structure.
