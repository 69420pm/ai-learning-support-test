# Epic 001: Basic Email & Password Authentication

## 1. Overview & Vision

**AI Learning Support** requires a secure, grounded user authentication foundation to personalize learning plans, FSRS spaced repetition schedules, document ingestions, and Feynman explanation audits. 

This Epic defines the full **Email & Password Authentication** system built on **Supabase Auth** (`@supabase/ssr`) and Next.js 16 App Router. It encompasses registration (Sign Up), authentication (Sign In), session termination (Sign Out), and account recovery (Password Reset). User identity is bridged directly to the application database by synchronizing `auth.users.id` with a custom `profiles` schema in Drizzle ORM.

### Key Goals
- **Seamless Authentication Flows**: Dedicated `/login`, `/signup`, `/forgot-password`, and `/reset-password` pages styled with `shadcn/ui` and validated with Zod.
- **SSR & Cookie Session Handling**: Automatic JWT session token refresh via Next.js Proxy (`proxy.ts`) without client-side hydration flickers.
- **Environment Parity**: Mandatory email verification in production, with instant local development testing supported by Supabase Local CLI and the Inbucket mail sandbox.
- **Drizzle Identity Synergy**: Foreign-key linking of user profiles and application domain data to Supabase `auth.users.id`.

---

## 2. Technical Architecture & Directory Placement

### Pinned Core Framework & Library Versions
- **Next.js**: `16.3.0` (App Router, Server Actions, Proxy)
- **React**: `19.2.8`
- **Supabase Auth SSR**: `@supabase/ssr` `^0.5.2`, `@supabase/supabase-js` `^2.48.0`
- **Drizzle ORM**: `drizzle-orm` `^0.45.2`, `drizzle-kit` `^0.31.10`
- **Validation & UI**: `zod` `^4.4.3`, `radix-ui` `^1.6.7`, `lucide-react` `^1.30.0`

### ADR Alignment
- **[ADR 001: Single Next.js Application Architecture](file:///workspaces/secure-ai-learning-support/specs/adrs/001-single-app-architecture.md)** — Strict placement of auth domain logic in `@/lib/auth`, presentation in `@/components/auth`, and routes in `@/app/(auth)`.
- **[ADR 002: PostgreSQL with pgvector & Drizzle ORM](file:///workspaces/secure-ai-learning-support/specs/adrs/002-postgresql-pgvector-drizzle.md)** — Drizzle ORM database schema definition for user profiles.
- **[ADR 005: Supabase Auth & Local CLI Integration](file:///workspaces/secure-ai-learning-support/specs/adrs/005-supabase-auth-integration.md)** — Selection of Supabase Auth (`@supabase/ssr`) as the core identity provider.

### Directory Placement Matrix

```text
secure-ai-learning-support/
├── app/
│   ├── (auth)/
│   │   ├── layout.tsx                # Centered card layout for auth pages
│   │   ├── login/page.tsx            # Login page route
│   │   ├── signup/page.tsx           # Signup page route
│   │   ├── forgot-password/page.tsx  # Password reset request route
│   │   ├── reset-password/page.tsx   # Password update route
│   │   └── auth/callback/route.ts    # PKCE / Email verification callback handler
│   └── proxy.ts                      # Next.js root proxy for auth & route protection
├── components/
│   └── auth/
│       ├── login-form.tsx            # Sign In form component with Zod validation
│       ├── signup-form.tsx           # Sign Up form component with Zod validation
│       ├── forgot-password-form.tsx  # Forgot password form component
│       ├── reset-password-form.tsx   # Reset password form component
│       └── user-nav.tsx              # Header user menu (Avatar, Profile, Sign Out button)
└── lib/
    ├── supabase/
    │   ├── client.ts                 # Browser Supabase client (createBrowserClient)
    │   ├── server.ts                 # Server Supabase client (createServerClient + cookies())
    │   └── proxy.ts                  # Session refresh helper (updateSession)
    ├── db/
    │   └── schema/
    │       └── profiles.ts           # Drizzle schema for user profiles (references auth.users.id)
    └── auth/
        ├── actions.ts                # Server Actions (signUp, signIn, signOut, resetPassword)
        └── validation.ts             # Shared Zod schemas for auth inputs
```

- **`lib/`**:
  - `@/lib/supabase/client.ts`: Instantiates browser Supabase client via `createBrowserClient`.
  - `@/lib/supabase/server.ts`: Instantiates server Supabase client via `createServerClient` and `next/headers` `cookies()`.
  - `@/lib/supabase/proxy.ts`: Implements `updateSession(request: NextRequest)` to refresh JWT cookies.
  - `@/lib/db/schema/profiles.ts`: Drizzle table `profiles` (`id` uuid PK referencing `auth.users.id`, `email` varchar, `full_name` varchar, `created_at` timestamp, `updated_at` timestamp).
  - `@/lib/auth/actions.ts`: Server Actions (`signUp`, `signIn`, `signOut`, `requestPasswordReset`, `updatePassword`) handling input validation and Supabase API calls.
  - `@/lib/auth/validation.ts`: Zod validation schemas (`loginSchema`, `signUpSchema`, `forgotPasswordSchema`, `resetPasswordSchema`).
- **`components/`**:
  - `@/components/auth/login-form.tsx`: Client form using `shadcn/ui` Input, Button, Label, and Zod error messages.
  - `@/components/auth/signup-form.tsx`: Client form for registration.
  - `@/components/auth/forgot-password-form.tsx`: Password recovery request form.
  - `@/components/auth/reset-password-form.tsx`: Password update form.
  - `@/components/auth/user-nav.tsx`: User dropdown menu displaying user identity and Sign Out button.
- **`app/`**:
  - `@/app/(auth)/layout.tsx`: Presentation shell for authentication routes.
  - `@/app/(auth)/login/page.tsx`, `signup/page.tsx`, `forgot-password/page.tsx`, `reset-password/page.tsx`.
  - `@/app/(auth)/auth/callback/route.ts`: API route handler exchanging `code` for session token on email confirmation or password recovery redirect.
  - `@/proxy.ts`: Global Next.js proxy executing session refresh and guarding protected routes (`/dashboard`, `/learn`, `/review`, `/settings`).

---

## 3. Out of Scope

To maintain focus and rapid delivery, the following capabilities are explicitly **OUT OF SCOPE** for this Epic:
- **Social OAuth Identity Providers**: Google, GitHub, Apple, or Microsoft OAuth integrations.
- **Passwordless / WebAuthn / Passkeys**: FIDO2 biometric or passkey authentication.
- **Multi-Factor Authentication (MFA / 2FA)**: TOTP or SMS multi-factor authentication.
- **Magic Links**: Pure email magic link login (strictly password-based authentication in this epic).
- **Complex RBAC / Multi-Tenancy**: Organization structures, workspace switching, or enterprise SAML/SSO.

---

## 4. Implementation Steps & Definitions of Done

### Step 1: Supabase SSR Clients & Drizzle Profiles Schema
- **Goal:** Install Supabase dependencies, configure `@supabase/ssr` client factories for server/browser, define `profiles` table in Drizzle ORM, and execute migrations.
- **Key packages:** `@supabase/supabase-js`, `@supabase/ssr`, `drizzle-orm`, `drizzle-kit`
- **Required reading:**
  - Internal: [`rules/single-app-architecture.md`](file:///workspaces/secure-ai-learning-support/rules/single-app-architecture.md), [`specs/adrs/005-supabase-auth-integration.md`](file:///workspaces/secure-ai-learning-support/specs/adrs/005-supabase-auth-integration.md)
  - External: [Supabase SSR Next.js Setup Guide](https://supabase.com/docs/guides/auth/server-side/creating-a-client?framework=nextjs)
- **Sources & Verification:**
  - Verified `createBrowserClient` and `createServerClient` patterns from official Supabase SSR docs.
  - Verified `cookies()` usage with Next.js 16 App Router `await cookies()`.
- **Definition of Done:**
  - `pnpm add @supabase/supabase-js @supabase/ssr` completes with zero errors.
  - `@/lib/supabase/client.ts` exports `createClient()` using `createBrowserClient`.
  - `@/lib/supabase/server.ts` exports `createClient()` using `createServerClient` with `await cookies()`.
  - `@/lib/db/schema/profiles.ts` is defined with `id` referencing `auth.users.id`.
  - `pnpm db:generate` creates migration and `pnpm check` passes with 0 lint/type errors.

### Step 2: Next.js Proxy Session Refresh & Protected Route Guards
- **Goal:** Implement `updateSession` in `@/lib/supabase/proxy.ts` and configure root `proxy.ts` to refresh session cookies and protect authenticated routes (`/dashboard`, `/learn`, `/review`, `/settings`).
- **Key packages:** `@supabase/ssr`, `next`
- **Required reading:**
  - Internal: [`rules/single-app-architecture.md`](file:///workspaces/secure-ai-learning-support/rules/single-app-architecture.md)
  - External: [Supabase Next.js Middleware Guide](https://supabase.com/docs/guides/getting-started/quickstarts/nextjs)
- **Sources & Verification:**
  - Verified `updateSession` pattern copying request cookies to `NextResponse` and calling `supabase.auth.getUser()`.
- **Definition of Done:**
  - `@/lib/supabase/proxy.ts` exports `updateSession(request: NextRequest)`.
  - Root `proxy.ts` calls `updateSession` and redirects unauthenticated users accessing `/dashboard` to `/login?redirectTo=/dashboard`.
  - `pnpm dev` starts cleanly, and requesting `/dashboard` while unauthenticated redirects to `/login`.

### Step 3: Auth Server Actions & Auth Callback Route
- **Goal:** Create Zod schemas and Server Actions (`signUp`, `signIn`, `signOut`, `requestPasswordReset`, `updatePassword`) in `@/lib/auth`, and implement `@/app/(auth)/auth/callback/route.ts` for PKCE code exchange.
- **Key packages:** `zod`, `@supabase/ssr`, `next`, `drizzle-orm`
- **Required reading:**
  - Internal: [`rules/single-app-architecture.md`](file:///workspaces/secure-ai-learning-support/rules/single-app-architecture.md), `test-writer` skill
  - External: [Supabase Auth Server Actions Guide](https://supabase.com/docs/guides/auth/server-side/nextjs)
- **Sources & Verification:**
  - Verified using `supabase.auth.getUser()` inside server actions for secure session verification.
  - Verified PKCE code exchange using `supabase.auth.exchangeCodeForSession(code)`.
- **Definition of Done:**
  - Server Actions in `@/lib/auth/actions.ts` validate inputs with Zod schemas and handle errors gracefully.
  - Successful `signUp` action inserts a initial profile row into `profiles` table in Drizzle.
  - Route handler at `/auth/callback` handles `code` param, exchanges it for a session, and redirects to target destination.
  - Unit tests in `tests/unit/auth-actions.test.ts` pass via `pnpm test`.

### Step 4: Authentication UI Components, Pages & Navigation Dropdown
- **Goal:** Build `/login`, `/signup`, `/forgot-password`, and `/reset-password` pages with `shadcn/ui` components and create a header `user-nav.tsx` dropdown.
- **Key packages:** `radix-ui`, `lucide-react`, `tailwindcss`, `class-variance-authority`
- **Required reading:**
  - Internal: [`rules/styling.md`](file:///workspaces/secure-ai-learning-support/rules/styling.md), `shadcn` skill
- **Definition of Done:**
  - Visually polished form components (`login-form`, `signup-form`, `forgot-password-form`, `reset-password-form`) rendered under `/login`, `/signup`, `/forgot-password`, `/reset-password`.
  - Client validation highlights invalid email formats or passwords under 8 characters before submitting.
  - Navigation header renders `user-nav` showing logged-in user email and working "Sign Out" button.
  - E2E Playwright test in `tests/e2e/auth.spec.ts` verifies sign up, login, and logout flow.

---

## 5. Security & Data Isolation

Security and data isolation are enforced across all application layers:

1. **Route & Proxy Layer**:
   - Next.js root `proxy.ts` runs on every matched request, executing `updateSession()` to ensure JWT tokens are refreshed and invalid session cookies are cleared.
   - Protected routes (`/dashboard`, `/learn`, `/review`, `/settings`) strictly reject requests without a valid Supabase JWT, redirecting to `/login`.

2. **Server Action & Controller Layer**:
   - Authorization checks inside Server Actions and API route handlers MUST call `supabase.auth.getUser()`. Never rely on `getSession()` or untrusted request headers for security-critical decisions.
   - User identity (`user.id`) extracted from `getUser()` is passed to Drizzle database operations.

3. **Database & ORM Layer**:
   - The `profiles` table uses `id` (uuid) as primary key matching `auth.users.id`.
   - Domain entity tables (e.g. documents, flashcards, learning plans) include `user_id` foreign keys referencing `profiles.id`.
   - All Drizzle queries filter explicitly by `eq(schema.table.userId, authenticatedUserId)` to guarantee multi-tenant data isolation.

4. **Input Validation & Credential Safety**:
   - All inputs (`email`, `password`, `fullName`) are sanitized and validated with Zod on both client and server before passing to Supabase Auth API calls.
   - Minimum password length of 8 characters with character complexity validation.
