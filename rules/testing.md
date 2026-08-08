# Testing Strategy & Guidelines

This document outlines the testing architecture, Playwright E2E standards, Page Object Model (POM) conventions, and mock strategies for **AI Learning Support**.

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

## 6. Unit & Integration Testing with Vitest

All pure domain logic in `lib/` is tested with Vitest. Unit tests are co-located next to source files.

### 6.1 File Naming & Location

- Unit tests live next to their source: `lib/learning/fsrs.ts` → `lib/learning/fsrs.test.ts`
- Test files use the `.test.ts` or `.test.tsx` extension.
- Run all tests: `pnpm test` (executes `vitest run`).
- Run in watch mode: `pnpm vitest` (for local development).

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
