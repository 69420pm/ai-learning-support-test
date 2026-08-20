# Testing Strategy & Guidelines

This document outlines the testing architecture, Playwright E2E standards, Page Object Model (POM) conventions, and mock strategies for **AI Learning Support**.

---

## 🎯 Core Philosophy: Objective-Driven Testing

* **Test Higher-Level Objectives, Not Implementation Code:** Tests must be written against the **Definition of Done (DoD) and user goals** defined in the plan—NEVER against the specific internal implementation functions.
* **Avoid Testing Bad Code:** If implementation code is flawed or over-engineered, writing tests that strictly mirror that code locks in bad architecture ("testing code that doesn't make sense"). If a test fails because the code misses the high-level objective, fix the code to meet the standard.
* **Test-First & Regression Workflow:** Features and fixes are driven test-first using the `tdd` skill (`.agents/skills/tdd/SKILL.md`), verified via `next-dev-loop` / `agentic-ui-verification`, and validated against the full test suite before opening a PR.

---

## ⚡ Agent Test Execution Protocol (Inner Loop vs. Outer Gate)

To keep context windows lean, feedback loops sub-second, and prevent context bloat:

### 1. Inner Loop (Active Development & TDD Cycles)
* **Target Single Test File Only:** Run Vitest only against the active file under test:
  ```bash
  pnpm vitest run path/to/file.test.ts
  ```
* **Fast Typechecking:** Use `pnpm typecheck` to verify TypeScript diagnostics.
* **Strictly Prohibited in the Inner Loop:**
  * ❌ Do NOT run `pnpm test` (full Vitest suite) during red-green iteration.
  * ❌ Do NOT run `pnpm test:e2e` or `playwright test` in the inner loop. E2E tests are slow, spin up Next.js servers and browser instances, and pollute conversation context with massive log output.

### 2. Outer Gate (Ticket / Feature Completion)
* **Run Full Suite Once:** Execute full checks only once after completing the vertical slices for the ticket:
  ```bash
  pnpm check      # Full lint + typecheck + Vitest suite
  pnpm test:e2e   # Full E2E suite (run only at completion)
  ```

---

## 1. Playwright E2E Framework

* **Framework:** Primary end-to-end testing is powered by Playwright (`@playwright/test`).
* **Configuration:** Centralized in `playwright.config.ts` (configured for dev server target `pnpm dev`, parallel execution, trace retention on failure).
* **Directory Structure & Naming:**
  ```text
  tests/
  ├── e2e/                  # End-to-end test suites (*.test.ts)
  │   ├── api.test.ts
  │   ├── auth.test.ts
  │   └── chat.test.ts
  ├── pages/                # Page Object Model classes
  │   └── chat.ts
  ├── fixtures.ts           # Custom Playwright test extensions
  └── helpers.ts            # Test data generators & utilities
  ```

---

## 2. Page Object Model (POM) Pattern

Encapsulate page locators and interaction logic inside POM classes in `tests/pages/`. Never inline complex locator queries inside test files.

```typescript
// tests/pages/chat.ts
import type { Page } from "@playwright/test";

export class ChatPage {
  constructor(public page: Page) {}

  async goto() {
    await this.page.goto("/");
  }
  getInput() {
    return this.page.getByTestId("multimodal-input");
  }
  async sendUserMessage(message: string) {
    await this.getInput().fill(message);
    await this.page.getByTestId("send-button").click();
  }
}
```

---

## 3. Custom Fixtures & Helper Utilities

* **Test Extensions:** Extend Playwright `test` in `tests/fixtures.ts` to automatically inject pre-configured POM instances into tests:
  ```typescript
  import { test as baseTest } from "@playwright/test";
  import { ChatPage } from "./pages/chat";

  export const test = baseTest.extend<{ chatPage: ChatPage }>({
    chatPage: async ({ page }, use) => {
      const chatPage = new ChatPage(page);
      await use(chatPage);
    },
  });
  ```
* **Isolated Data Generators:** Use functions in `tests/helpers.ts` to create dynamic, collision-free test credentials and messages (e.g. `generateRandomTestUser()`).

---

## 4. Robust Selectors & Locators

* **Explicit Test IDs:** Use explicit `data-testid` attributes on core interactive UI components (`getByTestId("multimodal-input")`, `getByTestId("send-button")`, `getByTestId("stop-button")`).
* **Accessibility Locators:** Use ARIA role and label locators (`getByRole("heading", { name: "..." })`, `getByLabel("Email")`, `getByText(...)`) for static UI assertions.
* **Forbidden Practices:** Do NOT use volatile CSS class selectors (e.g., `.flex.items-center.p-4`) or deep XPath queries for element targeting.

---

## 5. API Route Interception & Mocking

Test UI error boundaries and edge cases by intercepting network requests with `page.route()`:

```typescript
test("handles API error gracefully", async ({ page }) => {
  await page.route("**/api/chat", async (route) => {
    await route.fulfill({
      status: 500,
      contentType: "application/json",
      body: JSON.stringify({ error: "Internal server error" }),
    });
  });

  await page.goto("/");
  await page.getByTestId("multimodal-input").fill("Hello");
  await page.getByTestId("send-button").click();
  await expect(page.getByText(/error|failed/i).first()).toBeVisible();
});
```

---

## 5.1 AI SDK Provider Mocks & Streaming Simulation

* **Deterministic Stream Mocking:** Never hit real LLM APIs in automated tests.
* **Test Environment Flag:** Set `isTestEnvironment = true` (triggered when running via Playwright).
* **Mock Provider:** Use the mock `LanguageModel` in `lib/ai/models.mock.ts` to stream deterministic `text-delta` chunks with artificial delays to test UI streaming mechanics, stop buttons, and auto-scrolling without API costs.

---

## 5.2 Database & Guest Auth Bypass

* **Unmocked Postgres DB:** Playwright E2E tests run against real local Postgres DB using Drizzle ORM.
* **Guest Auth Bypass:** Middleware (`proxy.ts`) automatically intercepts unauthenticated requests in test mode and provisions a guest session via `/api/auth/guest`. Do not write explicit login UI flows unless testing auth features specifically.

---

## 6. Unit & Integration Testing with Vitest

All pure domain logic in `lib/` is tested with Vitest. Unit tests are co-located next to source files.

### 6.1 File Naming & Location

- Unit tests live next to their source: `lib/learning/fsrs.ts` → `lib/learning/fsrs.test.ts`
- Test files use the `.test.ts` or `.test.tsx` extension.
- **Run targeted test (Inner Loop):** `pnpm vitest run path/to/file.test.ts`
- **Run all tests (Outer Gate only):** `pnpm test` (executes `vitest run`).
- **Run in watch mode:** `pnpm vitest` (for interactive local development).

### 6.2 Test Structure

Use `describe` / `it` blocks with clear, behavior-driven names:

```typescript
import { describe, it, expect } from 'vitest';
import { calculateNextReview } from './fsrs';

describe('calculateNextReview', () => {
  it('schedules easy cards further in the future', () => {
    const result = calculateNextReview({ difficulty: 0.1, stability: 10 });
    expect(result.intervalDays).toBeGreaterThan(20);
  });

  it('returns a minimum interval of 1 day', () => {
    const result = calculateNextReview({ difficulty: 0.9, stability: 0.1 });
    expect(result.intervalDays).toBeGreaterThanOrEqual(1);
  });
});
```

### 6.3 Mocking

- Use `vi.mock()` for module-level mocks.
- Use `vi.fn()` for individual function mocks.
- Prefer dependency injection over mocking where possible.
- Mock external services (AI providers, database) at the boundary — never mock internal domain logic.

```typescript
import { vi, describe, it, expect } from 'vitest';

vi.mock('@/lib/db', () => ({
  db: { select: vi.fn(), insert: vi.fn() },
}));
```

### 6.4 Assertions

- Use `expect().toBe()` for primitives, `expect().toEqual()` for objects.
- Use `expect().toThrow()` or `expect().rejects.toThrow()` for error cases.
- Avoid snapshot tests for domain logic — prefer explicit assertions.
