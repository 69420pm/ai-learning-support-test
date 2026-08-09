# Plan 004: Auth UI Form Components & Authentication Pages

- **Epic Reference:** [Epic 001: Basic Email & Password Authentication](file:///workspaces/secure-ai-learning-support/specs/epics/001-email-password-auth.md) (Step 4)
- **Status:** Draft / Ready for Implementation
- **Target Scope:** Presentation shell (`app/(auth)/*`), Auth form components (`components/auth/*`), UI primitives (`components/ui/*`), and E2E test suite (`tests/e2e/auth.spec.ts`).

---

## 1. Overview & Context

This implementation plan details **Step 4 of Epic 001**, focusing on creating a secure, accessible, responsive, and visually stunning authentication user interface for **AI Learning Support**. 

The goal is to build client-side form components (`login-form.tsx`, `signup-form.tsx`, `forgot-password-form.tsx`, `reset-password-form.tsx`), authentication route pages under `app/(auth)/`, a unified centered card layout wrapper (`layout.tsx`), and a header user dropdown menu (`user-nav.tsx`).

### Design & Engineering Highlights
- **Design Tokens & Theme:** Pure Tailwind CSS v4 styling with OKLCH design tokens (`bg-background`, `text-foreground`, `bg-primary`, `border-border`), subtle glassmorphic card containers, and smooth spring-micro-interactions.
- **Client-Side Zod Validation:** Instant feedback before submitting forms, checking email formatting, password length (minimum 8 characters), and matching password confirmations.
- **Accessible Feedback:** `data-invalid` / `aria-invalid` attributes on inputs, visible red error labels, and full screen reader accessibility following WAI-ARIA form guidelines.
- **Loading & Submitting States:** Dynamic button states rendering `Loader2` spinners and `disabled` attributes during server action execution to prevent duplicate submissions.
- **Session Navigation:** Dynamic redirect handling via `redirectTo` query parameter after successful authentication, with `user-nav.tsx` displaying logged-in state and providing session termination.

---

## 2. Key Packages & Required Reading

### Key Packages

| Package | Pinned Version | Purpose in this Plan |
| :--- | :--- | :--- |
| **`zod`** | `^4.4.3` | Client-side input validation and error parsing |
| **`radix-ui`** | `^1.6.7` | Primitive roots for Slot, Label, DropdownMenu, Avatar |
| **`lucide-react`** | `^1.30.0` | UI icons (`Loader2`, `LogOut`, `User`, `Mail`, `Lock`, `ArrowRight`, `AlertCircle`, `CheckCircle2`) |
| **`tailwindcss`** | `^4.3.3` | Tailwind v4 styling with `@theme inline` OKLCH tokens |
| **`class-variance-authority`** | `^0.7.1` | Component variant composition |
| **`@supabase/ssr`** | `^0.5.2` | Browser client session detection and server action triggering |
| **`next`** | `^16.3.0` | App Router pages, layouts, `useRouter`, `useSearchParams`, `useActionState` |

### Required Reading

Before implementing this plan, developers and AI agents **MUST** read the following documents:

1. **Internal Architecture & Styling Rules:**
   - [`rules/styling.md`](file:///workspaces/secure-ai-learning-support/rules/styling.md) — Tailwind CSS v4 OKLCH tokens, `cn()` utility, flex layout (`gap-*` instead of `space-y-*`), `size-*` shorthands, dark mode styling.
   - [`rules/single-app-architecture.md`](file:///workspaces/secure-ai-learning-support/rules/single-app-architecture.md) — Placement of presentation code in `@/app` and `@/components`.
   - [`rules/tech-stack.md`](file:///workspaces/secure-ai-learning-support/rules/tech-stack.md) — Version matrix and documentation sources.
   - [`rules/coding-style.md`](file:///workspaces/secure-ai-learning-support/rules/coding-style.md) — TypeScript conventions, error handling, thin components.
2. **Skills:**
   - [`shadcn` Skill](file:///workspaces/secure-ai-learning-support/.agents/skills/shadcn/SKILL.md) — Rules for form layout (`FieldGroup`, `Field`), button loading state, accessible inputs.
   - [`test-writer` Skill](file:///workspaces/secure-ai-learning-support/.agents/skills/test-writer/SKILL.md) — E2E Playwright test patterns.
3. **Architectural Decision Records:**
   - [`ADR 001: Single Next.js Application Architecture`](file:///workspaces/secure-ai-learning-support/specs/adrs/001-single-app-architecture.md)
   - [`ADR 005: Supabase Auth Integration`](file:///workspaces/secure-ai-learning-support/specs/adrs/005-supabase-auth-integration.md)

---

## 3. Definition of Done (DoD)

To mark this plan complete, the following criteria must be satisfied and verified:

- [ ] **UI Primitives Installed & Configured:** `components/ui/` contains required shadcn UI primitives (`input.tsx`, `label.tsx`, `alert.tsx`, `avatar.tsx`, `dropdown-menu.tsx`).
- [ ] **Auth Layout (`app/(auth)/layout.tsx`):** A centered layout shell rendering a sleek container card with brand branding, ambient background blur, and theme toggle capability.
- [ ] **Sign In Form & Page (`/login`):**
  - Displays `login-form.tsx` with email and password inputs.
  - Validates email format and minimum 8-character password on client before submit.
  - Invokes `signIn` server action, displaying `Loader2` spinner on submit.
  - Displays alert banner on failed credentials or server errors.
  - Redirects to `redirectTo` URL (defaulting to `/dashboard`) upon success.
- [ ] **Sign Up Form & Page (`/signup`):**
  - Displays `signup-form.tsx` with full name, email, password, and confirm password fields.
  - Validates matching passwords and password complexity on client side.
  - Invokes `signUp` server action, displaying loading state.
  - Renders success state prompting user to check their email for verification when required.
- [ ] **Forgot Password Form & Page (`/forgot-password`):**
  - Displays `forgot-password-form.tsx` requesting email address.
  - Invokes `requestPasswordReset` server action.
  - Shows success confirmation screen with email delivery instructions.
- [ ] **Reset Password Form & Page (`/reset-password`):**
  - Displays `reset-password-form.tsx` with new password and confirm password fields.
  - Validates matching passwords on client side.
  - Invokes `updatePassword` server action and redirects to `/login` upon success.
- [ ] **User Navigation Header Menu (`user-nav.tsx`):**
  - Displays user avatar/initials and email address.
  - Includes interactive dropdown menu with Profile, Settings, and "Sign Out" button.
  - "Sign Out" button triggers `signOut` server action and redirects to `/login`.
- [ ] **Playwright E2E Test Suite (`tests/e2e/auth.spec.ts`):**
  - E2E test suite covering sign up, login validation errors, successful login, password reset request, and sign out flow.
- [ ] **Code Quality & Validation:**
  - `pnpm check` (typecheck + lint + unit tests) passes with 0 errors.

---

## 4. File Creation & Modification Matrix

| Target File | Action | Purpose | Primary Dependencies |
| :--- | :--- | :--- | :--- |
| `components/ui/input.tsx` | Create | Text input primitive component | `radix-ui`, `cn()` |
| `components/ui/label.tsx` | Create | Form label primitive component | `radix-ui`, `cva` |
| `components/ui/alert.tsx` | Create | Banner error/success alert primitive | `cva`, `lucide-react` |
| `components/ui/avatar.tsx` | Create | User avatar fallback component | `radix-ui` |
| `components/ui/dropdown-menu.tsx` | Create | Header user menu dropdown primitive | `radix-ui` |
| `app/(auth)/layout.tsx` | Create | Centered card layout shell for auth routes | Next.js App Router, `Card` |
| `components/auth/login-form.tsx` | Create | Login client form with Zod validation | `zod`, `react-hook-form` / `useActionState`, `lucide-react` |
| `app/(auth)/login/page.tsx` | Create | Login route page rendering `LoginForm` | Next.js Page, `LoginForm` |
| `components/auth/signup-form.tsx` | Create | Registration client form with Zod validation | `zod`, `lucide-react`, `Button` |
| `app/(auth)/signup/page.tsx` | Create | Registration route page rendering `SignupForm` | Next.js Page, `SignupForm` |
| `components/auth/forgot-password-form.tsx` | Create | Password recovery request form | `zod`, `lucide-react`, `Alert` |
| `app/(auth)/forgot-password/page.tsx` | Create | Forgot password route page | Next.js Page |
| `components/auth/reset-password-form.tsx` | Create | Password update client form | `zod`, `lucide-react` |
| `app/(auth)/reset-password/page.tsx` | Create | Reset password route page | Next.js Page |
| `components/auth/user-nav.tsx` | Create | Header user dropdown & logout button | `DropdownMenu`, `Avatar`, `@/lib/auth/actions` |
| `tests/e2e/auth.spec.ts` | Create | Playwright E2E test suite for auth flows | `@playwright/test` |

---

## 5. Step-by-Step Component & Page Layout Instructions

### Step 1: UI Primitives Setup (`components/ui/*`)

Verify and install missing shadcn primitives for forms and navigation:
1. Ensure `Input`, `Label`, `Alert`, `Avatar`, and `DropdownMenu` primitives exist in `@/components/ui/`.
2. Ensure components follow project rules:
   - Use `cn()` for class merging.
   - Use OKLCH semantic tokens (`bg-background`, `border-input`, `text-destructive`).
   - Do NOT hardcode colors or use `space-y-*` legacy utilities.

### Step 2: Shared Centered Auth Layout (`app/(auth)/layout.tsx`)

Create the visual framing for authentication routes:
- File: `@/app/(auth)/layout.tsx`
- **Structure:**
  - Full-screen flex container (`min-h-screen flex flex-col items-center justify-center p-4 bg-muted/30`).
  - Subtle radial gradient background pattern or glassmorphic backdrop.
  - Header section featuring the AI Learning Support logo / icon and title ("AI Learning Support").
  - Content container using `w-full max-w-md shadow-xl rounded-2xl border bg-card/90 backdrop-blur-sm p-6 sm:p-8`.
  - Footer links for privacy policy, terms, and help.

```tsx
// Example layout shell structure
export default function AuthLayout({ children }: { children: React.ReactNode }) {
  return (
    <div className="relative min-h-screen flex flex-col items-center justify-center p-4 bg-background">
      <div className="absolute inset-0 bg-gradient-to-br from-primary/5 via-transparent to-primary/10 pointer-events-none" />
      <div className="w-full max-w-md flex flex-col gap-6 z-10">
        <div className="flex flex-col items-center text-center gap-2">
          <div className="size-12 rounded-xl bg-primary flex items-center justify-center text-primary-foreground font-bold text-xl shadow-lg">
            AI
          </div>
          <h1 className="text-2xl font-bold tracking-tight">AI Learning Support</h1>
          <p className="text-sm text-muted-foreground">Document-Grounded Active Learning System</p>
        </div>
        {children}
      </div>
    </div>
  );
}
```

### Step 3: Sign In Form & Login Page (`login-form.tsx`, `login/page.tsx`)

1. **`components/auth/login-form.tsx`**:
   - Uses `"use client"`.
   - Imports Zod `loginSchema` from `@/lib/auth/validation` (or defines inline fallback matching requirements).
   - Manages form submission using Server Action `signIn` from `@/lib/auth/actions`.
   - Displays inline client-side validation errors when email is invalid or password is empty.
   - Features input icons (`Mail`, `Lock`).
   - Handles submit state: when `isPending` / `submitting` is true, submit button shows `<Loader2 className="animate-spin" data-icon="inline-start" /> Signing in...` and is disabled.
   - Displays an `Alert` with `variant="destructive"` if server returns error message (e.g. invalid credentials).
   - Includes a link to `/forgot-password` and a link to `/signup`.

2. **`app/(auth)/login/page.tsx`**:
   - Next.js Server Component rendering `LoginForm`.
   - Passes `searchParams.redirectTo` to `LoginForm` to handle post-login redirects.

### Step 4: Sign Up Form & Signup Page (`signup-form.tsx`, `signup/page.tsx`)

1. **`components/auth/signup-form.tsx`**:
   - Uses `"use client"`.
   - Includes fields for Full Name, Email, Password, and Confirm Password.
   - Validates client-side:
     - Full Name is required.
     - Email is valid format.
     - Password is at least 8 characters.
     - Confirm Password matches Password.
   - Submits to `signUp` server action.
   - On success: renders a confirmation card state showing `<CheckCircle2 className="size-12 text-emerald-500" />` informing user to verify their email address.
   - Includes link back to `/login`.

2. **`app/(auth)/signup/page.tsx`**:
   - Next.js Server Component rendering `SignupForm`.

### Step 5: Password Recovery Components (`forgot-password-form.tsx`, `reset-password-form.tsx`)

1. **`components/auth/forgot-password-form.tsx`**:
   - Collects user's email address.
   - Submits to `requestPasswordReset` server action.
   - Shows confirmation alert when password reset email has been dispatched.

2. **`app/(auth)/forgot-password/page.tsx`**:
   - Page wrapper rendering `ForgotPasswordForm`.

3. **`components/auth/reset-password-form.tsx`**:
   - Collects New Password and Confirm Password.
   - Submits to `updatePassword` server action.
   - On success, redirects user to `/login?message=password-updated`.

4. **`app/(auth)/reset-password/page.tsx`**:
   - Page wrapper rendering `ResetPasswordForm`.

### Step 6: Navigation User Menu (`user-nav.tsx`)

- File: `@/components/auth/user-nav.tsx`
- **Features:**
  - Client component receiving `user: { email: string; fullName?: string; avatarUrl?: string } | null`.
  - Uses `DropdownMenu`, `DropdownMenuTrigger`, `DropdownMenuContent`, `DropdownMenuItem`, `Avatar`.
  - Trigger renders user's initials avatar (e.g., "JD") or generic `User` icon.
  - Dropdown content displays:
    - User's full name and email in header.
    - Link to `/dashboard`.
    - Link to `/settings`.
    - Separator line.
    - "Sign Out" menu item with `LogOut` icon, executing `signOut()` server action.

```tsx
// Example skeleton for user-nav.tsx
"use client";

import { Avatar, AvatarFallback } from "@/components/ui/avatar";
import { Button } from "@/components/ui/button";
import {
  DropdownMenu,
  DropdownMenuContent,
  DropdownMenuGroup,
  DropdownMenuItem,
  DropdownMenuLabel,
  DropdownMenuSeparator,
  DropdownMenuTrigger,
} from "@/components/ui/dropdown-menu";
import { signOut } from "@/lib/auth/actions";
import { LogOut, Settings, User } from "lucide-react";

interface UserNavProps {
  user: {
    email: string;
    fullName?: string;
  } | null;
}

export function UserNav({ user }: UserNavProps) {
  if (!user) return null;

  const initials = user.fullName
    ? user.fullName.split(" ").map((n) => n[0]).join("").toUpperCase().slice(0, 2)
    : user.email.slice(0, 2).toUpperCase();

  return (
    <DropdownMenu>
      <DropdownMenuTrigger asChild>
        <Button variant="ghost" className="relative size-9 rounded-full">
          <Avatar className="size-9">
            <AvatarFallback>{initials}</AvatarFallback>
          </Avatar>
        </Button>
      </DropdownMenuTrigger>
      <DropdownMenuContent className="w-56" align="end" forceMount>
        <DropdownMenuLabel className="font-normal">
          <div className="flex flex-col gap-1">
            <p className="text-sm font-medium leading-none">{user.fullName || "User"}</p>
            <p className="text-xs leading-none text-muted-foreground">{user.email}</p>
          </div>
        </DropdownMenuLabel>
        <DropdownMenuSeparator />
        <DropdownMenuGroup>
          <DropdownMenuItem asChild>
            <a href="/settings" className="flex items-center gap-2 cursor-pointer">
              <Settings className="size-4" />
              Settings
            </a>
          </DropdownMenuItem>
        </DropdownMenuGroup>
        <DropdownMenuSeparator />
        <DropdownMenuItem
          className="text-destructive focus:text-destructive cursor-pointer"
          onClick={() => signOut()}
        >
          <LogOut className="size-4 mr-2" />
          Log Out
        </DropdownMenuItem>
      </DropdownMenuContent>
    </DropdownMenu>
  );
}
```

### Step 7: Playwright E2E Tests (`tests/e2e/auth.spec.ts`)

- File: `@/tests/e2e/auth.spec.ts`
- Grounded in `test-writer` skill guidelines.
- Test Scenarios:
  1. **Validation Checks:** Navigating to `/login`, entering invalid email format, attempting submit, verifying validation error message.
  2. **Sign Up Flow:** Navigating to `/signup`, filling registration form, submitting, verifying success message.
  3. **Sign In & Sign Out Flow:** Navigating to `/login`, entering valid credentials, submitting, asserting redirect to `/dashboard`, opening `UserNav` dropdown, clicking "Sign Out", asserting redirect to `/login`.
  4. **Forgot Password Flow:** Navigating to `/forgot-password`, entering registered email, submitting, verifying confirmation notice.

---

## 6. Verification & Validation Commands

To verify implementation correctness at each stage:

```bash
# 1. Dev Server Runtime Check
pnpm dev

# 2. Next Dev Loop Compilation & Error Check
# (Inside agent session: use next-dev-loop skill commands)

# 3. Full Static & Type Validation
pnpm check

# 4. Biome Code Linter Check
pnpm lint

# 5. Playwright E2E Authentication Suite
pnpm test:e2e tests/e2e/auth.spec.ts
```

---

## 7. Execution Checklist

- [ ] Install missing UI primitives (`input`, `label`, `alert`, `avatar`, `dropdown-menu`).
- [ ] Implement centered layout shell in `app/(auth)/layout.tsx`.
- [ ] Implement `LoginForm` in `components/auth/login-form.tsx` and route in `app/(auth)/login/page.tsx`.
- [ ] Implement `SignupForm` in `components/auth/signup-form.tsx` and route in `app/(auth)/signup/page.tsx`.
- [ ] Implement `ForgotPasswordForm` in `components/auth/forgot-password-form.tsx` and route in `app/(auth)/forgot-password/page.tsx`.
- [ ] Implement `ResetPasswordForm` in `components/auth/reset-password-form.tsx` and route in `app/(auth)/reset-password/page.tsx`.
- [ ] Implement header `UserNav` in `components/auth/user-nav.tsx`.
- [ ] Create E2E test suite in `tests/e2e/auth.spec.ts`.
- [ ] Run `pnpm check` and ensure 0 lint or type errors.
