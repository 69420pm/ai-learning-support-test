# ADR 005: Supabase Auth & Local CLI Integration
**Status:** Accepted | **Date:** 2026-08-09

## 1. The Decision
Standardize user authentication, session management, and authorization on **Supabase Auth** (`@supabase/ssr`) across cloud production and local development (via **Supabase Local CLI** in Docker), referencing `auth.users.id` as the primary user identity across all Drizzle ORM schemas in `@/lib/db`.

## 2. Rationale & Alternatives (Concise)
* **Why Supabase Auth + Local CLI:** Delivers 1:1 local-to-cloud environment parity with zero auth engine maintenance (GoTrue microservice), providing a local visual admin UI (Studio) and local email sandbox (Inbucket) out of the box.
* **Why `@supabase/ssr`:** Provides lightweight, idiomatic session cookie management across Next.js App Router Server Components, Client Components, Server Actions, and Middleware.
* **Why Drizzle ORM Synergy:** Relational application tables (`public.*`) reference `auth.users.id` directly via foreign keys while preserving pure SQL-like Drizzle query capabilities.
* **Rejected NextAuth (Auth.js):** Requires building and maintaining custom auth endpoints, session refresh handlers, and database adapter schemas without providing local Studio or email sandbox tools.
* **Rejected Standalone SaaS (Clerk) / Custom Auth (Better Auth):** Avoids introducing additional third-party dependencies or fragmented auth schemas outside the unified PostgreSQL infrastructure established in ADR 002.
* **Trade-off:** Couples authentication infrastructure to PostgreSQL `auth` schemas; migrating away from Supabase would require replacing the auth session layer.
