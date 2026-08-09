# Epic: User Authentication Infrastructure & UI

## 1. Overview & Vision

The **User Authentication Infrastructure & UI** epic provides a secure, document-grounded, identity-aware foundation for **AI Learning Support**. Powered by **Supabase Auth** (`@supabase/ssr`) and integrated into our unified PostgreSQL database via **Drizzle ORM**, this system enables learners to register, sign in, manage sessions, and protect private learning artifacts (documents, flashcards, GraphRAG structures, and AI chat logs).

By enforcing strict Next.js App Router Middleware guards and automatic Drizzle profile synchronization, every user entity and interactive AI session is securely linked to `auth.users.id`.

---

## 2. Technical Architecture & Directory Placement

All components follow the Single Next.js Application Architecture guidelines established in `rules/single-app-architecture.md` and reference **ADR 005** (Supabase Auth & Local CLI Integration).

```text
secure-ai-learning-support/
├── app/
│   ├── (auth)/
│   │   ├── login/page.tsx           # Login page UI component
│   │   ├── signup/page.tsx          # Sign-Up page UI component
│   │   ├── forgot-password/page.tsx # Password reset request page
│   │   └── reset-password/page.tsx  # New password entry page
│   ├── auth/
│   │   └── callback/route.ts        # Next.js API route handler for auth state exchange
│   └── layout.tsx                   # App layout updated with Header User Menu
├── components/
│   └── ui/
│       ├── user-menu.tsx            # Dropdown avatar & logout trigger component
│       └── auth-form.tsx            # Shared accessible form primitive
├── lib/
│   ├── auth/
│   │   ├── client.ts                # Supabase browser client factory (@supabase/ssr)
│   │   ├── server.ts                # Supabase server client factory (@supabase/ssr)
│   │   └── actions.ts               # Form validation & Server Actions (login, signup, logout)
│   └── db/
│       └── schema/
│           └── profiles.ts          # Drizzle ORM schema for user profiles linked to auth.users.id
└── middleware.ts                    # Next.js App Router session guard & route protector
```

### Directory Placement Mapping
- **`lib/`**:
  - `lib/db/schema/profiles.ts` — Relational profile table schema linked to `auth.users.id` via foreign key.
  - `lib/auth/client.ts` & `lib/auth/server.ts` — Server Component, Client Component, and Middleware Supabase SSR client factories.
  - `lib/auth/actions.ts` — Server Actions for authentication credentials, input validation, and session termination.
- **`components/`**:
  - `components/ui/user-menu.tsx` — Client component rendering user initials/avatar and logout options.
  - `components/ui/auth-form.tsx` — Standardized form container with accessible error messages and loading spinners.
- **`app/`**:
  - `app/(auth)/login/page.tsx` — Login view.
  - `app/(auth)/signup/page.tsx` — Signup view.
  - `app/(auth)/forgot-password/page.tsx` & `app/(auth)/reset-password/page.tsx` — Recovery views.
  - `app/auth/callback/route.ts` — PKCE code exchange handler.
  - `middleware.ts` — Global route protection middleware.

---

## 3. Out of Scope

The following capabilities are explicitly out of scope for this Epic and reserved for future iterations:
- **Social OAuth Providers**: Google, GitHub, and Apple third-party sign-in options.
- **Multi-Factor Authentication (MFA / 2FA)**: Time-based One-Time Password (TOTP) or SMS security codes.
- **Enterprise SSO / SAML**: Identity provider integration (e.g., Okta, Azure AD).
- **Multi-Tenant Team Workspaces**: Organization-level permissions, shared workspaces, and team RBAC management.

---

## 4. Implementation Steps

### Step 1: Drizzle Database Schema & User Profile Synchronization
- **Goal:** Define the Drizzle ORM schema for `profiles` in `lib/db/schema/profiles.ts` referencing `auth.users.id`, and create helper functions for profile instantiation and retrieval.
- **Key packages:** `drizzle-orm`, `@supabase/ssr`, `postgres`, `zod`
- **Required reading:** `specs/adrs/002-postgresql-pgvector-drizzle.md`, `specs/adrs/005-supabase-auth-integration.md`, `rules/single-app-architecture.md`, `rules/tech-stack.md`
- **Definition of Done:**
  - Run `pnpm db:generate` to produce the Drizzle migration for `profiles`.
  - Apply the migration using `pnpm db:migrate`.
  - Vitest unit tests in `tests/unit/profiles.test.ts` pass cleanly (`pnpm test`).
  - Zero lint (`pnpm lint`) and zero type errors (`pnpm check`).

### Step 2: Supabase SSR Client Factories & Route Security Middleware
- **Goal:** Instantiate `@supabase/ssr` server, browser, and middleware clients, and implement `middleware.ts` to refresh session cookies and restrict unauthenticated access to protected app routes.
- **Key packages:** `@supabase/ssr`, `@supabase/supabase-js`, `next` (Middleware)
- **Required reading:** `specs/adrs/005-supabase-auth-integration.md`, `rules/single-app-architecture.md`, `rules/tech-stack.md`
- **Definition of Done:**
  - Unauthenticated requests to protected paths (`/dashboard`, `/documents`, `/review`) are automatically redirected to `/login?redirectTo=...`.
  - Public routes (`/login`, `/signup`, `/forgot-password`, `/auth/callback`) remain accessible without redirect loops.
  - Run `pnpm check` and `pnpm lint` — zero type or lint errors.

### Step 3: Auth Server Actions & Input Validation
- **Goal:** Create Server Actions in `lib/auth/actions.ts` (`signInWithEmail`, `signUpWithEmail`, `signOut`, `requestPasswordReset`) backed by Zod input schemas.
- **Key packages:** `@supabase/ssr`, `zod`, `next`, `react` (`useActionState`)
- **Required reading:** `specs/adrs/005-supabase-auth-integration.md`, `rules/coding-style.md`, `rules/tech-stack.md`
- **Definition of Done:**
  - Server Actions validate inputs with Zod and return structured result objects `{ success: boolean, error?: string }`.
  - Unit tests in `tests/unit/auth-actions.test.ts` pass cleanly with `pnpm test`.
  - Zero unhandled promise rejections on invalid credentials or Supabase API errors.

### Step 4: Auth UI Pages (`/login`, `/signup`, `/forgot-password`, `/reset-password`)
- **Goal:** Build clean, responsive, and accessible UI pages in `app/(auth)/` using Tailwind CSS v4 and shadcn/ui components.
- **Key packages:** `shadcn/ui`, `lucide-react`, `tailwindcss`, `cva`, `clsx`
- **Required reading:** `shadcn` skill, `rules/styling.md`, `rules/single-app-architecture.md`, `rules/tech-stack.md`
- **Definition of Done:**
  - Run dev server with `pnpm dev`.
  - Visually inspect `/login`, `/signup`, `/forgot-password`, and `/reset-password`; confirm clean styling, form states, error indicators, and dark/light mode compatibility.
  - Verify semantic HTML, labels, and accessible inputs for all forms.
  - `pnpm check` passes with zero errors.

### Step 5: Header Navigation & User Menu Component
- **Goal:** Create a `UserMenu` React component in `components/ui/user-menu.tsx` to display user initials/avatar in the header with a dropdown menu and sign-out action.
- **Key packages:** `shadcn/ui` (DropdownMenu, Avatar), `lucide-react`, `next`, `react`
- **Required reading:** `shadcn` skill, `rules/styling.md`, `rules/single-app-architecture.md`
- **Definition of Done:**
  - Header renders `UserMenu` when session is active.
  - Clicking "Sign Out" executes the `signOut` Server Action, clears cookies, and redirects to `/login`.
  - `pnpm check` and `pnpm lint` complete with zero errors.

### Step 6: End-to-End Playwright Auth Test Suite
- **Goal:** Write an automated Playwright E2E test suite in `tests/e2e/auth.spec.ts` testing the complete authentication lifecycle.
- **Key packages:** `@playwright/test`, `next`
- **Required reading:** `test-writer` skill, `rules/testing.md`
- **Definition of Done:**
  - Execute `pnpm test:e2e` — Playwright test suite completes with 100% pass rate.
  - Validates registration -> profile creation -> middleware protection -> login -> logout loop.
