# Implementation Plan 002: Next.js Proxy Session Refresh & Protected Route Guards

> **Epic:** [Epic 001: Basic Email & Password Authentication](file:///workspaces/secure-ai-learning-support/specs/epics/001-email-password-auth.md)  
> **Status:** Draft  
> **Target Branch:** `plan-proxy-session-refresh`  
> **Created:** 2026-08-09  

---

## 1. Overview & Context

This implementation plan details **Step 2 of Epic 001 (Basic Email & Password Authentication)**. It establishes the global Next.js Proxy session refresh mechanism and route protection guards for the **AI Learning Support** platform.

In an App Router architecture utilizing Supabase Auth (`@supabase/ssr`), server-side cookie management and session token refreshes must be handled seamlessly during the request lifecycle before components render. The Next.js root proxy (`proxy.ts`) intercepted requests execute `updateSession()` to synchronize JWT session cookies between incoming requests and outgoing HTTP responses. Simultaneously, the proxy enforces route-level access control, guarding authenticated pages (`/dashboard`, `/learn`, `/review`, `/settings`) against unauthenticated access and redirecting already-authenticated users away from auth pages (`/login`, `/signup`).

### ADR Alignment
- **[ADR 001: Single Next.js Application Architecture](file:///workspaces/secure-ai-learning-support/specs/adrs/001-single-app-architecture.md)** — Co-location of proxy infrastructure in `@/lib/supabase/proxy.ts` and root `proxy.ts`.
- **[ADR 005: Supabase Auth & Local CLI Integration](file:///workspaces/secure-ai-learning-support/specs/adrs/005-supabase-auth-integration.md)** — Standardizing session management on `@supabase/ssr` using `getUser()` for secure server verification.

---

## 2. Key Packages & Required Reading

### Key Dependencies
- **`@supabase/ssr`** (`^0.5.2`): Cookie-based authentication server client factory.
- **`@supabase/supabase-js`** (`^2.48.0`): Supabase core client types and auth API definitions.
- **`next`** (`16.3.0`): App Router HTTP server utilities (`NextRequest`, `NextResponse`).

### Required Reading
Before executing this implementation plan, developers and agents MUST consult:
- **Internal Specs & Rules:**
  - [`specs/epics/001-email-password-auth.md`](file:///workspaces/secure-ai-learning-support/specs/epics/001-email-password-auth.md) (Section 4, Step 2)
  - [`specs/adrs/001-single-app-architecture.md`](file:///workspaces/secure-ai-learning-support/specs/adrs/001-single-app-architecture.md)
  - [`specs/adrs/005-supabase-auth-integration.md`](file:///workspaces/secure-ai-learning-support/specs/adrs/005-supabase-auth-integration.md)
  - [`rules/single-app-architecture.md`](file:///workspaces/secure-ai-learning-support/rules/single-app-architecture.md)
  - [`rules/tech-stack.md`](file:///workspaces/secure-ai-learning-support/rules/tech-stack.md)
- **External Documentation:**
  - [Supabase Server-Side Auth in Next.js](https://supabase.com/docs/guides/auth/server-side/nextjs)

---

## 3. Definition of Done & Route Protection Rules

### Definition of Done (DoD)
- [ ] `@/lib/supabase/proxy.ts` exports `updateSession(request: NextRequest)` which creates a `@supabase/ssr` client with request cookie getters and response cookie setters.
- [ ] `updateSession` executes `supabase.auth.getUser()` to safely revalidate the JWT token and refresh session cookies.
- [ ] Root `proxy.ts` invokes `updateSession` on all non-static requests.
- [ ] Requests to protected routes (`/dashboard`, `/learn`, `/review`, `/settings` and sub-paths) by unauthenticated users are redirected to `/login?redirectTo=<path>`.
- [ ] Requests to auth routes (`/login`, `/signup`, `/forgot-password`, `/reset-password`) by authenticated users are redirected to `/dashboard`.
- [ ] Static assets (`_next/static`, `_next/image`, `favicon.ico`, images) bypass proxy evaluation via matcher configuration.
- [ ] Project checks (`pnpm check`, `pnpm lint`) compile cleanly with zero errors.

### Route Protection Matrix

| Route Pattern | Authentication Status | Proxy Behavior |
| :--- | :--- | :--- |
| `/dashboard/*` | Unauthenticated | Redirect to `/login?redirectTo=/dashboard/*` |
| `/learn/*` | Unauthenticated | Redirect to `/login?redirectTo=/learn/*` |
| `/review/*` | Unauthenticated | Redirect to `/login?redirectTo=/review/*` |
| `/settings/*` | Unauthenticated | Redirect to `/login?redirectTo=/settings/*` |
| `/dashboard/*`, `/learn/*`, `/review/*`, `/settings/*` | Authenticated | Allow access (forward request with refreshed cookies) |
| `/login`, `/signup`, `/forgot-password`, `/reset-password` | Authenticated | Redirect to `/dashboard` |
| `/login`, `/signup`, `/forgot-password`, `/reset-password` | Unauthenticated | Allow access |
| `/` (Landing page / public API) | Any | Allow access |

---

## 4. File Creation & Modification Matrix

| File Path | Action | Description |
| :--- | :--- | :--- |
| [`lib/supabase/proxy.ts`](file:///workspaces/secure-ai-learning-support/lib/supabase/proxy.ts) | **Create** | Implements `updateSession(request: NextRequest)` session refresh helper using `@supabase/ssr`. |
| [`proxy.ts`](file:///workspaces/secure-ai-learning-support/proxy.ts) | **Create** | Next.js root proxy executing `updateSession` and enforcing protected/auth route redirects. |

---

## 5. Step-by-Step Code Instructions

### Step 5.1: Create `@/lib/supabase/proxy.ts`

Create the session refresh helper module at `lib/supabase/proxy.ts`. This helper constructs a Supabase client capable of reading cookies from the incoming `NextRequest` and writing updated auth cookies onto an outgoing `NextResponse`.

```typescript
import { createServerClient } from '@supabase/ssr'
import { type NextRequest, NextResponse } from 'next/server'

/**
 * Refreshes the user's Supabase Auth session token and updates request/response cookies.
 * MUST be called by the root Next.js proxy on every matched request.
 *
 * @param request - Incoming NextRequest from Next.js proxy
 * @returns Object containing the modified NextResponse (with updated cookies) and authenticated User (if valid)
 */
export async function updateSession(request: NextRequest) {
  let supabaseResponse = NextResponse.next({
    request,
  })

  const supabaseUrl = process.env.NEXT_PUBLIC_SUPABASE_URL
  const supabaseAnonKey = process.env.NEXT_PUBLIC_SUPABASE_ANON_KEY

  if (!supabaseUrl || !supabaseAnonKey) {
    throw new Error(
      'Missing Supabase environment variables: NEXT_PUBLIC_SUPABASE_URL or NEXT_PUBLIC_SUPABASE_ANON_KEY'
    )
  }

  const supabase = createServerClient(supabaseUrl, supabaseAnonKey, {
    cookies: {
      getAll() {
        return request.cookies.getAll()
      },
      setAll(cookiesToSet) {
        for (const { name, value } of cookiesToSet) {
          request.cookies.set(name, value)
        }
        supabaseResponse = NextResponse.next({
          request,
        })
        for (const { name, value, options } of cookiesToSet) {
          supabaseResponse.cookies.set(name, value, options)
        }
      },
    },
  })

  // IMPORTANT: Do NOT insert business logic between createServerClient and getUser().
  // Using getUser() instead of getSession() ensures cryptographically secure JWT verification on the server.
  const {
    data: { user },
  } = await supabase.auth.getUser()

  return { supabaseResponse, user }
}
```

---

### Step 5.2: Create Root `proxy.ts`

Create the global Next.js root proxy at `proxy.ts`. This file intercepts incoming requests, invokes `updateSession()`, and applies route guard conditions based on user authentication status.

```typescript
import { type NextRequest, NextResponse } from 'next/server'
import { updateSession } from '@/lib/supabase/proxy'

const PROTECTED_ROUTES = ['/dashboard', '/learn', '/review', '/settings']
const AUTH_ROUTES = ['/login', '/signup', '/forgot-password', '/reset-password']

/**
 * Root Next.js Proxy handler for session refresh and route guarding.
 */
export async function proxy(request: NextRequest) {
  const { supabaseResponse, user } = await updateSession(request)
  const { pathname } = request.nextUrl

  // Check if current route matches protected paths or sub-paths
  const isProtectedRoute = PROTECTED_ROUTES.some(
    (route) => pathname === route || pathname.startsWith(`${route}/`)
  )

  // Check if current route matches auth paths or sub-paths
  const isAuthRoute = AUTH_ROUTES.some(
    (route) => pathname === route || pathname.startsWith(`${route}/`)
  )

  // Guard 1: Redirect unauthenticated users attempting to access protected routes
  if (isProtectedRoute && !user) {
    const loginUrl = request.nextUrl.clone()
    loginUrl.pathname = '/login'
    loginUrl.searchParams.set('redirectTo', pathname)
    return NextResponse.redirect(loginUrl)
  }

  // Guard 2: Redirect authenticated users attempting to access auth routes
  if (isAuthRoute && user) {
    const dashboardUrl = request.nextUrl.clone()
    dashboardUrl.pathname = '/dashboard'
    return NextResponse.redirect(dashboardUrl)
  }

  return supabaseResponse
}

export const config = {
  matcher: [
    /*
     * Match all request paths except:
     * - _next/static (static files)
     * - _next/image (image optimization files)
     * - favicon.ico (favicon file)
     * - Media/asset files (.svg, .png, .jpg, .jpeg, .gif, .webp)
     */
    '/((?!_next/static|_next/image|favicon.ico|.*\\.(?:svg|png|jpg|jpeg|gif|webp)$).*)',
  ],
}
```

---

## 6. Verification Commands & Testing Strategy

### Verification Commands
Run the following commands in terminal to validate syntax, types, and formatting:

```bash
# 1. Typechecking & Biome Linting
pnpm check

# 2. Biome Linting Only
pnpm lint

# 3. Next.js Dev Server Execution
pnpm dev
```

### Manual & Runtime Verification Matrix

| Action / Test Case | Expected Outcome | Verification Method |
| :--- | :--- | :--- |
| Access `http://localhost:3000/dashboard` while logged out | Redirected to `/login?redirectTo=/dashboard` | Browser navigation / `curl -I` |
| Access `http://localhost:3000/learn` while logged out | Redirected to `/login?redirectTo=/learn` | Browser navigation |
| Access `http://localhost:3000/login` while logged in | Redirected to `/dashboard` | Browser navigation |
| Request static asset `/_next/static/css/...` | Bypasses proxy, returns 200 OK | Network devtools |
