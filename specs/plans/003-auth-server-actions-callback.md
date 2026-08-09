# Implementation Plan: Auth Server Actions & Auth Callback Route

**Plan ID:** `003-auth-server-actions-callback`  
**Epic Reference:** [Epic 001: Basic Email & Password Authentication](file:///workspaces/secure-ai-learning-support/specs/epics/001-email-password-auth.md) — Step 3  
**Status:** Ready for Implementation  

---

## 1. Overview & Context

This implementation plan covers **Step 3** of Epic 001. It establishes the secure backend action layer and OAuth/PKCE callback handler for Email & Password Authentication in **AI Learning Support**.

Specifically, this step introduces:
1. **Zod Validation Schemas** (`@/lib/auth/validation.ts`): Type-safe runtime schemas for user sign up, login, password recovery, and password updating.
2. **Auth Server Actions** (`@/lib/auth/actions.ts`): Server-side actions for `signUp`, `signIn`, `signOut`, `requestPasswordReset`, and `updatePassword` using `@supabase/ssr` server client and Drizzle ORM identity profile linkage.
3. **PKCE Auth Callback Handler** (`@/app/(auth)/auth/callback/route.ts`): App Router GET API route handler exchanging one-time authorization `code` parameters for user sessions during email confirmation and password reset redirects.
4. **Unit Test Suite** (`tests/unit/auth-actions.test.ts`): Comprehensive Vitest unit tests verifying input validation, error handling, and server action behavior.

---

## 2. Key Packages & Required Reading

### Core Dependencies
- `zod` (`^4.4.3`) — Input validation and schema inference.
- `@supabase/ssr` (`^0.5.2`) & `@supabase/supabase-js` (`^2.48.0`) — Supabase server authentication.
- `drizzle-orm` (`^0.45.2`) — Drizzle profile insertion upon user registration.
- `next` (`16.3.0`) — App Router Server Actions and Route Handlers.
- `vitest` (`^4.1.10`) — Unit testing framework.

### Required Internal Reading
- [Single-App Architecture Rule](file:///workspaces/secure-ai-learning-support/rules/single-app-architecture.md) — Placement of domain logic in `@/lib/auth` and route handlers in `@/app/(auth)/auth/callback/route.ts`.
- [Coding Style & TypeScript Guidelines](file:///workspaces/secure-ai-learning-support/rules/coding-style.md) — Thin controller pattern, explicit return types, named exports, path aliases (`@/*`).
- [Testing Strategy & Guidelines](file:///workspaces/secure-ai-learning-support/rules/testing.md) — Vitest unit testing guidelines, module mocking with `vi.mock()`.
- [Tech Stack Reference](file:///workspaces/secure-ai-learning-support/rules/tech-stack.md) — Package versions and references.
- [Epic 001 Specification](file:///workspaces/secure-ai-learning-support/specs/epics/001-email-password-auth.md) — Step 3 scope and requirements.

### External Documentation
- [Supabase Auth Server Actions Guide](https://supabase.com/docs/guides/auth/server-side/nextjs)
- [Next.js Route Handlers Documentation](https://nextjs.org/docs/app/building-your-application/routing/route-handlers)

---

## 3. Definition of Done (DoD)

- [ ] **Zod Input Validation**: `loginSchema`, `signUpSchema`, `forgotPasswordSchema`, and `resetPasswordSchema` exported from `@/lib/auth/validation.ts` with strict password rules (min 8 chars) and email formatting.
- [ ] **Auth Server Actions**: `signUp`, `signIn`, `signOut`, `requestPasswordReset`, and `updatePassword` implemented in `@/lib/auth/actions.ts` returning structured `{ success: boolean; error?: string }` results.
- [ ] **Profile Linkage**: Successful `signUp` action creates an initial record in the Drizzle `profiles` table (`id` linked to `user.id`).
- [ ] **PKCE Callback Handler**: `GET` route in `@/app/(auth)/auth/callback/route.ts` exchanges `code` parameter via `supabase.auth.exchangeCodeForSession(code)` and redirects to the intended `next` destination (defaulting to `/dashboard`).
- [ ] **Unit Testing**: Vitest test suite in `tests/unit/auth-actions.test.ts` achieves full coverage for validation, success states, and error responses.
- [ ] **Verification**: `pnpm test`, `pnpm check`, and `pnpm lint` run cleanly without errors.

---

## 4. File Creation & Modification Matrix

| File Path | Action | Responsibilities |
| :--- | :--- | :--- |
| `lib/auth/validation.ts` | **Create** | Export Zod schemas and inferred TypeScript types for login, sign-up, password reset request, and password update. |
| `lib/auth/actions.ts` | **Create** | Server Actions (`"use server"`) handling auth operations via `@/lib/supabase/server` client and Drizzle `profiles`. |
| `app/(auth)/auth/callback/route.ts` | **Create** | App Router Route Handler exchanging PKCE auth code for session tokens and redirecting. |
| `tests/unit/auth-actions.test.ts` | **Create** | Vitest unit tests for validation schemas and server action behavior. |

---

## 5. Step-by-Step Implementation Instructions

### Step 5.1: Create Shared Zod Schemas (`lib/auth/validation.ts`)

Create `lib/auth/validation.ts` with strict validation for all authentication flows:

```typescript
import { z } from "zod";

export const loginSchema = z.object({
  email: z.string().trim().email("Please enter a valid email address"),
  password: z.string().min(8, "Password must be at least 8 characters long"),
});

export type LoginInput = z.infer<typeof loginSchema>;

export const signUpSchema = z
  .object({
    fullName: z.string().trim().min(2, "Full name must be at least 2 characters long"),
    email: z.string().trim().email("Please enter a valid email address"),
    password: z.string().min(8, "Password must be at least 8 characters long"),
    confirmPassword: z.string().min(8, "Password confirmation must be at least 8 characters long"),
  })
  .refine((data) => data.password === data.confirmPassword, {
    message: "Passwords do not match",
    path: ["confirmPassword"],
  });

export type SignUpInput = z.infer<typeof signUpSchema>;

export const forgotPasswordSchema = z.object({
  email: z.string().trim().email("Please enter a valid email address"),
});

export type ForgotPasswordInput = z.infer<typeof forgotPasswordSchema>;

export const resetPasswordSchema = z
  .object({
    password: z.string().min(8, "Password must be at least 8 characters long"),
    confirmPassword: z.string().min(8, "Password confirmation must be at least 8 characters long"),
  })
  .refine((data) => data.password === data.confirmPassword, {
    message: "Passwords do not match",
    path: ["confirmPassword"],
  });

export type ResetPasswordInput = z.infer<typeof resetPasswordSchema>;
```

---

### Step 5.2: Implement Auth Server Actions (`lib/auth/actions.ts`)

Create `lib/auth/actions.ts` containing Server Actions with standardized return types:

```typescript
"use server";

import { revalidatePath } from "next/cache";
import { redirect } from "next/navigation";
import { createClient } from "@/lib/supabase/server";
import { db } from "@/lib/db";
import { profiles } from "@/lib/db/schema/profiles";
import {
  loginSchema,
  signUpSchema,
  forgotPasswordSchema,
  resetPasswordSchema,
  type LoginInput,
  type SignUpInput,
  type ForgotPasswordInput,
  type ResetPasswordInput,
} from "@/lib/auth/validation";

export type AuthActionResult = {
  success: boolean;
  error?: string;
};

export async function signIn(input: LoginInput): Promise<AuthActionResult> {
  const parseResult = loginSchema.safeParse(input);
  if (!parseResult.success) {
    return { success: false, error: parseResult.error.issues[0]?.message || "Invalid input" };
  }

  const { email, password } = parseResult.data;
  const supabase = await createClient();

  const { error } = await supabase.auth.signInWithPassword({
    email,
    password,
  });

  if (error) {
    return { success: false, error: error.message };
  }

  revalidatePath("/", "layout");
  return { success: true };
}

export async function signUp(input: SignUpInput): Promise<AuthActionResult> {
  const parseResult = signUpSchema.safeParse(input);
  if (!parseResult.success) {
    return { success: false, error: parseResult.error.issues[0]?.message || "Invalid input" };
  }

  const { email, password, fullName } = parseResult.data;
  const supabase = await createClient();

  const { data, error } = await supabase.auth.signUp({
    email,
    password,
    options: {
      data: {
        full_name: fullName,
      },
    },
  });

  if (error) {
    return { success: false, error: error.message };
  }

  if (data.user) {
    try {
      await db.insert(profiles).values({
        id: data.user.id,
        email: data.user.email ?? email,
        fullName: fullName,
      }).onConflictDoNothing();
    } catch (dbError) {
      console.error("Failed to create user profile in Drizzle:", dbError);
    }
  }

  revalidatePath("/", "layout");
  return { success: true };
}

export async function signOut(): Promise<void> {
  const supabase = await createClient();
  await supabase.auth.signOut();
  revalidatePath("/", "layout");
  redirect("/login");
}

export async function requestPasswordReset(input: ForgotPasswordInput): Promise<AuthActionResult> {
  const parseResult = forgotPasswordSchema.safeParse(input);
  if (!parseResult.success) {
    return { success: false, error: parseResult.error.issues[0]?.message || "Invalid input" };
  }

  const { email } = parseResult.data;
  const supabase = await createClient();

  const origin = process.env.NEXT_PUBLIC_APP_URL || "http://localhost:3000";
  const redirectTo = `${origin}/auth/callback?redirectTo=/reset-password`;

  const { error } = await supabase.auth.resetPasswordForEmail(email, {
    redirectTo,
  });

  if (error) {
    return { success: false, error: error.message };
  }

  return { success: true };
}

export async function updatePassword(input: ResetPasswordInput): Promise<AuthActionResult> {
  const parseResult = resetPasswordSchema.safeParse(input);
  if (!parseResult.success) {
    return { success: false, error: parseResult.error.issues[0]?.message || "Invalid input" };
  }

  const { password } = parseResult.data;
  const supabase = await createClient();

  const { error } = await supabase.auth.updateUser({
    password,
  });

  if (error) {
    return { success: false, error: error.message };
  }

  revalidatePath("/", "layout");
  return { success: true };
}
```

---

### Step 5.3: Create PKCE Callback Route Handler (`app/(auth)/auth/callback/route.ts`)

Create `app/(auth)/auth/callback/route.ts` to handle PKCE auth code exchanges:

```typescript
import { NextResponse } from "next/server";
import { createClient } from "@/lib/supabase/server";

export async function GET(request: Request) {
  const { searchParams, origin } = new URL(request.url);
  const code = searchParams.get("code");
  const next = searchParams.get("redirectTo") ?? "/dashboard";

  if (code) {
    const supabase = await createClient();
    const { error } = await supabase.auth.exchangeCodeForSession(code);
    if (!error) {
      const forwardedHost = request.headers.get("x-forwarded-host");
      const isLocalEnv = process.env.NODE_ENV === "development";

      if (isLocalEnv) {
        return NextResponse.redirect(`${origin}${next}`);
      } else if (forwardedHost) {
        return NextResponse.redirect(`https://${forwardedHost}${next}`);
      } else {
        return NextResponse.redirect(`${origin}${next}`);
      }
    }
  }

  // Return the user to an error page with instructions if auth fails
  return NextResponse.redirect(`${origin}/login?error=auth_callback_failed`);
}
```

---

### Step 5.4: Create Unit Tests (`tests/unit/auth-actions.test.ts`)

Create `tests/unit/auth-actions.test.ts` to test validation and server actions with Vitest:

```typescript
import { describe, it, expect, vi, beforeEach } from "vitest";
import {
  loginSchema,
  signUpSchema,
  forgotPasswordSchema,
  resetPasswordSchema,
} from "@/lib/auth/validation";
import { signIn, signUp, requestPasswordReset, updatePassword } from "@/lib/auth/actions";

// Mock Supabase server client
const mockSignInWithPassword = vi.fn();
const mockSignUp = vi.fn();
const mockResetPasswordForEmail = vi.fn();
const mockUpdateUser = vi.fn();

vi.mock("@/lib/supabase/server", () => ({
  createClient: vi.fn(() => ({
    auth: {
      signInWithPassword: mockSignInWithPassword,
      signUp: mockSignUp,
      resetPasswordForEmail: mockResetPasswordForEmail,
      updateUser: mockUpdateUser,
    },
  })),
}));

// Mock Drizzle DB
vi.mock("@/lib/db", () => ({
  db: {
    insert: vi.fn(() => ({
      values: vi.fn(() => ({
        onConflictDoNothing: vi.fn().mockResolvedValue({}),
      })),
    })),
  },
}));

// Mock Next.js cache and navigation
vi.mock("next/cache", () => ({
  revalidatePath: vi.fn(),
}));

vi.mock("next/navigation", () => ({
  redirect: vi.fn(),
}));

describe("Auth Validation Schemas", () => {
  it("validates login schema correctly", () => {
    const valid = loginSchema.safeParse({ email: "user@example.com", password: "password123" });
    expect(valid.success).toBe(true);

    const invalidEmail = loginSchema.safeParse({ email: "not-an-email", password: "password123" });
    expect(invalidEmail.success).toBe(false);

    const shortPassword = loginSchema.safeParse({ email: "user@example.com", password: "123" });
    expect(shortPassword.success).toBe(false);
  });

  it("validates signup schema and checks password matching", () => {
    const valid = signUpSchema.safeParse({
      fullName: "Jane Doe",
      email: "jane@example.com",
      password: "password123",
      confirmPassword: "password123",
    });
    expect(valid.success).toBe(true);

    const mismatch = signUpSchema.safeParse({
      fullName: "Jane Doe",
      email: "jane@example.com",
      password: "password123",
      confirmPassword: "different123",
    });
    expect(mismatch.success).toBe(false);
  });
});

describe("Auth Server Actions", () => {
  beforeEach(() => {
    vi.clearAllMocks();
  });

  it("returns error on invalid signIn input", async () => {
    const result = await signIn({ email: "invalid", password: "123" });
    expect(result.success).toBe(false);
    expect(result.error).toBeDefined();
    expect(mockSignInWithPassword).not.toHaveBeenCalled();
  });

  it("calls supabase signInWithPassword on valid input", async () => {
    mockSignInWithPassword.mockResolvedValueOnce({ error: null });

    const result = await signIn({ email: "test@example.com", password: "password123" });
    expect(result.success).toBe(true);
    expect(mockSignInWithPassword).toHaveBeenCalledWith({
      email: "test@example.com",
      password: "password123",
    });
  });

  it("creates profile record on successful signUp", async () => {
    mockSignUp.mockResolvedValueOnce({
      data: { user: { id: "user-uuid-123", email: "new@example.com" } },
      error: null,
    });

    const result = await signUp({
      fullName: "Alex Smith",
      email: "new@example.com",
      password: "password123",
      confirmPassword: "password123",
    });

    expect(result.success).toBe(true);
    expect(mockSignUp).toHaveBeenCalledWith({
      email: "new@example.com",
      password: "password123",
      options: { data: { full_name: "Alex Smith" } },
    });
  });
});
```

---

## 6. Verification & Quality Checks

Execute the following commands from the workspace root to verify plan completeness and code health:

```bash
# 1. Run unit test suite
pnpm test

# 2. Perform TypeScript type check
pnpm check

# 3. Run Biome lint & code style checks
pnpm lint
```
