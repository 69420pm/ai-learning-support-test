# Implementation Plan 005: Header User Navigation Dropdown & Playwright E2E Auth Test Suite

This plan details the implementation of **Step 5 of Epic 001 (Basic Email & Password Authentication)**. It covers building the Header User Navigation Dropdown component, integrating it into the global application header, and creating a comprehensive Playwright End-to-End (E2E) test suite for the authentication system.

---

## 1. Overview & Context

- **Epic Reference:** [Epic 001: Basic Email & Password Authentication](file:///workspaces/secure-ai-learning-support/specs/epics/001-email-password-auth.md)
- **ADR Reference:** 
  - [ADR 001: Single Next.js Application Architecture](file:///workspaces/secure-ai-learning-support/specs/adrs/001-single-app-architecture.md)
  - [ADR 005: Supabase Auth & Local CLI Integration](file:///workspaces/secure-ai-learning-support/specs/adrs/005-supabase-auth-integration.md)
- **Primary Objectives:**
  1. Provide authenticated users with a sleek, accessible header navigation dropdown menu (`@/components/auth/user-nav.tsx`) displaying user identity (avatar/initials, email) and a functional "Sign Out" trigger.
  2. Implement an automated Playwright E2E test suite in `tests/e2e/auth.spec.ts` following the Page Object Model (POM) pattern to lock in end-to-end auth behavior: Registration (Sign Up) → Authentication (Sign In) → Protected Route Access (`/dashboard`) → Session Termination (Sign Out).

---

## 2. Key Packages & Required Reading

### Core Dependencies
- `@supabase/ssr` (`^0.5.2`) / `@supabase/supabase-js` (`^2.48.0`) — Session retrieval and sign-out action invocation.
- `radix-ui` (`^1.6.7`) — `DropdownMenu` and `Avatar` primitives for UI components.
- `lucide-react` (`^1.30.0`) — Icons (`User`, `LogOut`, `Settings`, `Shield`).
- `@playwright/test` — End-to-end test execution.

### Required Reading & Guidelines
- **Internal Rules:**
  - [`rules/testing.md`](file:///workspaces/secure-ai-learning-support/rules/testing.md) — Objective-driven testing, POM patterns, locator standards (`data-testid` and ARIA roles).
  - [`rules/styling.md`](file:///workspaces/secure-ai-learning-support/rules/styling.md) — Tailwind CSS v4 OKLCH tokens, semantic classes, class merging via `cn()`.
  - [`rules/single-app-architecture.md`](file:///workspaces/secure-ai-learning-support/rules/single-app-architecture.md) — Layer boundaries (`components/auth/` for auth UI, `tests/e2e/` for Playwright suites).
  - [`rules/coding-style.md`](file:///workspaces/secure-ai-learning-support/rules/coding-style.md) — Named exports, path aliases (`@/...`), TypeScript strict mode.
- **Skills to Consult:**
  - [`test-writer` skill](file:///workspaces/secure-ai-learning-support/.agents/skills/test-writer/SKILL.md) — Step-by-step test creation workflow and standards.
  - [`shadcn` skill](file:///workspaces/secure-ai-learning-support/.agents/skills/shadcn/SKILL.md) — Dropdown Menu and Avatar UI primitive composition.

---

## 3. Definition of Done (DoD)

- [ ] **User Navigation Component (`@/components/auth/user-nav.tsx`):**
  - Renders a user avatar button displaying user initials (or fallback icon) and trigger menu.
  - Dropdown content displays the user's primary email address and account info.
  - Includes a functional "Sign Out" button that triggers `signOut()` Server Action and clears JWT session cookies.
- [ ] **Header Component Integration (`@/components/header.tsx`):**
  - Displays `user-nav` when an active user session exists.
  - Displays "Sign In" / "Sign Up" navigation links when no user session exists.
- [ ] **Playwright Page Object Model (`tests/pages/auth.ts`):**
  - Encapsulates locators and interaction helpers for auth pages (`/login`, `/signup`) and the header `user-nav` element.
  - Avoids inline complex locators in test specs; uses `data-testid` attributes.
- [ ] **Playwright E2E Auth Test Suite (`tests/e2e/auth.spec.ts`):**
  - **Sign Up Flow:** Registers a new unique test user and verifies successful confirmation/redirection.
  - **Login Flow:** Authenticates an existing user and asserts successful session creation.
  - **Protected Route Access:** Confirms authenticated access to `/dashboard`.
  - **Logout Flow:** Clicks "Sign Out" in `user-nav`, verifies session invalidation, and confirms unauthenticated requests to `/dashboard` redirect to `/login`.
- [ ] **Verification Gate:**
  - `pnpm test:e2e` passes 100% cleanly.
  - `pnpm check` (typecheck + lint + Vitest unit tests) returns 0 errors.

---

## 4. File Creation & Modification Matrix

| File Path | Operation | Purpose / Description |
| :--- | :--- | :--- |
| `components/auth/user-nav.tsx` | **Create** | Dropdown menu rendering avatar, email header, and Sign Out action trigger. |
| `components/ui/dropdown-menu.tsx` | **Create / Add** | Radix UI Dropdown Menu primitive component (shadcn). |
| `components/ui/avatar.tsx` | **Create / Add** | Radix UI Avatar primitive component (shadcn). |
| `components/header.tsx` | **Create / Modify** | Main application header with session-aware user navigation integration. |
| `app/layout.tsx` | **Modify** | Embed `Header` component into root layout shell. |
| `tests/pages/auth.ts` | **Create** | Page Object Model class for Auth UI components and page interactions. |
| `tests/e2e/auth.spec.ts` | **Create** | Complete Playwright E2E test suite for registration, login, protected routes, and logout. |
| `tests/fixtures.ts` | **Create / Modify** | Playwright test fixtures extending base test with `authPage` POM instance. |
| `specs/plan-index.md` | **Modify** | Register plan 005 status in the implementation plan index. |

---

## 5. Step-by-Step Implementation & Testing Instructions

### Phase 1: Header User Navigation Component (`user-nav.tsx`)

1. **Add Required UI Primitives:**
   Create or verify `dropdown-menu.tsx` and `avatar.tsx` in `components/ui/` using standard Radix primitives and Tailwind styling per [`rules/styling.md`](file:///workspaces/secure-ai-learning-support/rules/styling.md).

2. **Implement `@/components/auth/user-nav.tsx`:**
   - Props: Accepts `user: { email?: string; user_metadata?: { full_name?: string } } | null`.
   - Layout:
     - Avatar button with `data-testid="user-nav-trigger"`.
     - Dropdown header showing user full name and email with `data-testid="user-nav-email"`.
     - Action menu item for "Sign Out" with `data-testid="user-nav-logout"`, invoking `signOut()` Server Action from `@/lib/auth/actions.ts`.

3. **Integrate into `@/components/header.tsx`:**
   - Fetch session/user on the server via `createClient()` from `@/lib/supabase/server.ts`.
   - Pass user object to `UserNav`.
   - Render "Sign In" and "Get Started" buttons if user is `null`.

### Phase 2: Page Object Model (`tests/pages/auth.ts`)

1. **Define `AuthPage` Class:**
   ```typescript
   import type { Page } from "@playwright/test";

   export class AuthPage {
     constructor(public page: Page) {}

     // Locators
     get emailInput() { return this.page.getByTestId("auth-email-input"); }
     get passwordInput() { return this.page.getByTestId("auth-password-input"); }
     get fullNameInput() { return this.page.getByTestId("auth-fullname-input"); }
     get submitButton() { return this.page.getByTestId("auth-submit-button"); }
     get userNavTrigger() { return this.page.getByTestId("user-nav-trigger"); }
     get userNavLogout() { return this.page.getByTestId("user-nav-logout"); }

     // Actions
     async gotoLogin() { await this.page.goto("/login"); }
     async gotoSignup() { await this.page.goto("/signup"); }
     async fillCredentials(email: string, password: string, fullName?: string) { ... }
     async logout() {
       await this.userNavTrigger.click();
       await this.userNavLogout.click();
     }
   }
   ```

2. **Extend Test Fixtures (`tests/fixtures.ts`):**
   Expose `authPage` fixture to simplify test spec declarations.

### Phase 3: Playwright E2E Test Suite (`tests/e2e/auth.spec.ts`)

Write the objective-driven test suite covering high-level DoD requirements:

```typescript
import { test, expect } from "../fixtures";
import { generateRandomTestUser } from "../helpers";

test.describe("Authentication System E2E", () => {
  test("full user authentication lifecycle: signup -> login -> protected route -> logout", async ({ authPage, page }) => {
    const user = generateRandomTestUser();

    // 1. Sign Up
    await authPage.gotoSignup();
    await authPage.signUp(user.email, user.password, user.fullName);
    await expect(page).toHaveURL(/\/(dashboard|login\?registered=true)/);

    // 2. Sign In
    await authPage.gotoLogin();
    await authPage.login(user.email, user.password);
    await expect(page).toHaveURL("/dashboard");

    // 3. Verify Protected Route & User Nav Presence
    await page.goto("/dashboard");
    await expect(authPage.userNavTrigger).toBeVisible();

    // 4. Sign Out
    await authPage.logout();
    await expect(page).toHaveURL("/login");

    // 5. Verify Unauthenticated Redirection
    await page.goto("/dashboard");
    await expect(page).toHaveURL(/\/login/);
  });
});
```

---

## 6. Verification & Validation Commands

Run the following commands in order to validate implementation accuracy:

```bash
# 1. Run Playwright End-to-End tests
pnpm test:e2e

# 2. Run Vitest domain unit tests
pnpm test

# 3. Full project validation (lint + typecheck + tests)
pnpm check
```
