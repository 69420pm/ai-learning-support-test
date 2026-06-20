# Technical Plan: Cloud Storage & Database Adapters (Milestone 2)

## 1. Overview & Context
- **Feature Description**: Implement Cloud Mode adapters for database and storage, enabling the application to run hosted on Supabase (PostgreSQL and Supabase Storage bucket) instead of local SQLite/file disk when `LOCAL_MODE=false`.
- **User Value / Problem Solved**: Lays down the hostable SaaS integration layer, decoupling the local development mode from hosted environments.
- **Dependency**: Milestone 1 (Local Document Upload) must be completed.

---

## 2. Scope Boundaries (Goals & Non-Goals)
- **Goals (In Scope)**:
  - Add PostgreSQL driver support (`@neondatabase/serverless` or standard Postgres driver `postgres`/`pg` depending on choice) in `@ai-learning-support/core`.
  - Implement `SupabaseStorage` in `packages/core/src/storage/supabase-storage.ts` satisfying the `StorageService` interface contract.
  - Set up Drizzle schema variables targeting Postgres syntax (translating basic SQLite column types to Postgres types, e.g., uuid, timestamp).
  - Implement a dynamic initialization factory in `packages/core/src/database/db.ts` and `packages/core/src/storage/storage-factory.ts` that selects the adapter based on the `LOCAL_MODE` environment variable.
  - Run database schema migration/sync script configuration for Postgres using `drizzle-kit`.
- **Non-Goals (Out of Scope)**:
  - Setting up user accounts or integrating signups (mock session user ID is still used in this phase).
  - Direct-to-storage presigned uploads from the client (we will still post files to Next.js API route first as a proxy, or prepare it for Milestone 3 client integrations).

---

## 3. Architecture & Adapter Design

### Target Layout
```text
packages/core/src/
├── database/
│   ├── db.ts                    # Factory to return SQLite or Postgres drizzle client
│   ├── schema/
│   │   └── documents.ts         # Shared table mapping (using pgTable and sqliteTable appropriately)
│   └── postgres-client.ts       # PostgreSQL connection client
├── storage/
│   ├── storage-factory.ts       # Storage adapter selector factory
│   └── supabase-storage.ts      # Supabase client storage adapter
```

### Key Components to Implement

1. **Drizzle Dual Schema Mapping:**
   Using Drizzle tools (or helper functions) to export a schema mapping that supports both SQLite and Postgres. E.g., importing `pgTable` when connection is Postgres, or compiling columns conditionally.
2. **Storage Factory:**
   ```typescript
   export function getStorageService(): StorageService {
     if (process.env.LOCAL_MODE === "true") {
       return new LocalFileSystemStorage();
     }
     return new SupabaseStorage({
       url: process.env.SUPABASE_URL!,
       anonKey: process.env.SUPABASE_ANON_KEY!,
       bucket: "documents",
     });
   }
   ```
3. **Supabase Storage Adapter:**
   Uses `@supabase/supabase-js` storage client APIs to upload, retrieve, and delete files inside a private bucket.

---

## 4. Testing Strategy
- Unit tests verifying factory resolver outputs correct instance types depending on environment variables.
- Integration tests targeting test Supabase bucket and Postgres connection when configured.
