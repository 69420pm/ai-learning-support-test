# Implementation Plan 001: Supabase SSR Clients & Drizzle Profiles Schema

**Epic Reference:** [Epic 001: Basic Email & Password Authentication](file:///workspaces/secure-ai-learning-support/specs/epics/001-email-password-auth.md) — Step 1  
**Status:** Ready for Implementation  
**Target Date:** 2026-08-09  

---

## 1. Overview & Context

This implementation plan covers **Step 1** of Epic 001. It establishes the foundational identity and session management infrastructure for **AI Learning Support** by:
1. Installing required Supabase packages (`@supabase/supabase-js`, `@supabase/ssr`).
2. Creating factory utilities for Supabase browser and server clients (`@/lib/supabase/client.ts` and `@/lib/supabase/server.ts`).
3. Defining the `profiles` table schema in Drizzle ORM (`@/lib/db/schema/profiles.ts`), establishing a foreign-key relationship between application user profiles and Supabase Auth's `auth.users.id`.

### Architectural Alignment
- **Next.js 16 App Router**: Uses `await cookies()` from `next/headers` for server-side cookie management.
- **ADR 001 (Single App Architecture)**: Places core database schemas and client factories strictly within `@/lib`.
- **ADR 005 (Supabase Auth Integration)**: Standardizes identity on `@supabase/ssr` and links user data via `auth.users.id`.

---

## 2. Key Packages & Required Reading

### Dependencies
- `@supabase/supabase-js`: `^2.48.0`
- `@supabase/ssr`: `^0.5.2`
- `drizzle-orm`: `^0.45.2`
- `drizzle-kit`: `^0.31.10`

### Required Reading
- **Internal Rules & ADRs**:
  - [`rules/single-app-architecture.md`](file:///workspaces/secure-ai-learning-support/rules/single-app-architecture.md) — Directory layout and `@/lib` boundaries.
  - [`rules/tech-stack.md`](file:///workspaces/secure-ai-learning-support/rules/tech-stack.md) — Version constraints and dev workflows.
  - [`specs/adrs/005-supabase-auth-integration.md`](file:///workspaces/secure-ai-learning-support/specs/adrs/005-supabase-auth-integration.md) — Decision rationale for Supabase Auth.
  - [`specs/adrs/002-postgresql-pgvector-drizzle.md`](file:///workspaces/secure-ai-learning-support/specs/adrs/002-postgresql-pgvector-drizzle.md) — Drizzle ORM schema standards.
- **External Documentation**:
  - [Supabase SSR Next.js Setup Guide](https://supabase.com/docs/guides/auth/server-side/creating-a-client?framework=nextjs)

---

## 3. User Stories & Definition of Done

### User Story
> As a system developer, I need Supabase SSR client factories and a user profiles Drizzle schema so that user sessions can be accessed seamlessly across Client/Server components and user domain data is safely linked to Supabase authentication identity.

### Definition of Done (Acceptance Criteria)
1. `pnpm add @supabase/supabase-js @supabase/ssr` runs successfully with zero errors.
2. `@/lib/supabase/client.ts` exports `createClient()` utilizing `createBrowserClient` with public environment variables (`NEXT_PUBLIC_SUPABASE_URL`, `NEXT_PUBLIC_SUPABASE_ANON_KEY`).
3. `@/lib/supabase/server.ts` exports `createClient()` utilizing `createServerClient` with `await cookies()` handling `getAll()` and `setAll()`.
4. `@/lib/db/schema/profiles.ts` defines the `profiles` table with `id` referencing `auth.users.id`.
5. `@/lib/db/schema/index.ts` re-exports the `profiles` schema.
6. `pnpm db:generate` generates the corresponding Drizzle migration cleanly.
7. Verification suite (`pnpm check`, `pnpm lint`, `pnpm typecheck`) passes with 0 errors.

---

## 4. File Creation & Modification Matrix

| File Path | Action | Description |
| :--- | :--- | :--- |
| `package.json` | Modify | Add `@supabase/supabase-js` and `@supabase/ssr` dependencies. |
| `lib/supabase/client.ts` | Create | Factory for browser-side Supabase client (`createBrowserClient`). |
| `lib/supabase/server.ts` | Create | Factory for server-side Supabase client (`createServerClient` + `await cookies()`). |
| `lib/db/schema/profiles.ts` | Create | Drizzle ORM schema for `profiles` table referencing `auth.users.id`. |
| `lib/db/schema/index.ts` | Create | Barrel export for Drizzle database schemas. |

---

## 5. Step-by-Step Code Instructions

### Step 5.1: Package Installation

Execute package installation for Supabase client & SSR support:

```bash
pnpm add @supabase/supabase-js @supabase/ssr
```

---

### Step 5.2: Create Browser Supabase Client (`lib/supabase/client.ts`)

Create `lib/supabase/client.ts` to instantiate browser-side client requests:

```typescript
import { createBrowserClient } from '@supabase/ssr';

export function createClient() {
  return createBrowserClient(
    process.env.NEXT_PUBLIC_SUPABASE_URL!,
    process.env.NEXT_PUBLIC_SUPABASE_ANON_KEY!
  );
}
```

---

### Step 5.3: Create Server Supabase Client (`lib/supabase/server.ts`)

Create `lib/supabase/server.ts` utilizing Next.js 16 `await cookies()`:

```typescript
import { createServerClient } from '@supabase/ssr';
import { cookies } from 'next/headers';

export async function createClient() {
  const cookieStore = await cookies();

  return createServerClient(
    process.env.NEXT_PUBLIC_SUPABASE_URL!,
    process.env.NEXT_PUBLIC_SUPABASE_ANON_KEY!,
    {
      cookies: {
        getAll() {
          return cookieStore.getAll();
        },
        setAll(cookiesToSet) {
          try {
            for (const { name, value, options } of cookiesToSet) {
              cookieStore.set(name, value, options);
            }
          } catch {
            // The `setAll` method was called from a Server Component.
            // This can be ignored if you have middleware / proxy refreshing user sessions.
          }
        },
      },
    }
  );
}
```

---

### Step 5.4: Define Drizzle Profiles Schema (`lib/db/schema/profiles.ts`)

Create `lib/db/schema/profiles.ts` establishing the table definition and foreign key linkage to `auth.users.id`:

```typescript
import { pgSchema, pgTable, text, timestamp, uuid } from 'drizzle-orm/pg-core';

// Reference to Supabase Auth's auth.users table
export const authUsers = pgSchema('auth').table('users', {
  id: uuid('id').primaryKey(),
});

export const profiles = pgTable('profiles', {
  id: uuid('id')
    .primaryKey()
    .references(() => authUsers.id, { onDelete: 'cascade' }),
  email: text('email').notNull(),
  fullName: text('full_name'),
  avatarUrl: text('avatar_url'),
  createdAt: timestamp('created_at', { withTimezone: true })
    .defaultNow()
    .notNull(),
  updatedAt: timestamp('updated_at', { withTimezone: true })
    .defaultNow()
    .notNull(),
});

export type Profile = typeof profiles.$inferSelect;
export type NewProfile = typeof profiles.$inferInsert;
```

---

### Step 5.5: Create Schema Barrel Export (`lib/db/schema/index.ts`)

Create `lib/db/schema/index.ts` to export schema definitions:

```typescript
export * from './profiles';
```

---

## 6. Verification Commands

Run the following commands sequentially to verify implementation:

1. **Generate DB Migrations**:
   ```bash
   pnpm db:generate
   ```
2. **Lint & Code Formatting Check**:
   ```bash
   pnpm lint
   ```
3. **TypeScript Typecheck**:
   ```bash
   pnpm typecheck
   ```
4. **Full Verification Suite**:
   ```bash
   pnpm check
   ```
