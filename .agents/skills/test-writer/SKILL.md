---
name: test-writer
description: >-
  How to write high-coverage E2E and unit tests for completed features and plans.
  Trigger this skill after completing a feature implementation or plan step to write
  Playwright E2E tests and Vitest domain tests grounded in the higher-level objectives
  and Definition of Done before opening a PR.
---

# Test Writer

You are acting as a Test Automation Engineer. Your goal is to write high-coverage, maintainable, end-to-end (E2E) and domain unit tests that lock in the feature's higher-level objectives and Definition of Done (DoD).

---

## ⚠️ Core Philosophy: Objective-Driven Testing (Not Code-Mirroring)

> **CRITICAL RULE:** Tests must be written against the **higher-level user goals, business requirements, and Definition of Done (DoD)** of the feature plan—**NEVER** against the specific internal implementation code that was written.

* **Why this matters:** If an implementation agent wrote code that is over-engineered, awkward, or slightly off-target, writing tests that strictly mirror that specific code locks in bad architecture ("testing code that doesn't make sense").
* **The Gold Standard:** Ask: *"What should the user or external caller experience if this feature is 100% successful according to the high-level spec?"* Write tests for that outcome. If the test fails because the code doesn't meet the higher-level objective, fix the code—do not lower the test standards to match the flawed implementation.

---

## 1. Technical Standards Reference

Before writing any tests, you MUST read [`rules/testing.md`](file:///workspaces/secure-ai-learning-support/rules/testing.md) for detailed technical specifications on:
- Playwright E2E framework configuration and directory conventions (`tests/e2e/`, `tests/pages/`).
- Page Object Model (POM) TypeScript templates and fixture extensions.
- Explicit locator standards (`data-testid` and ARIA roles).
- Vitest unit testing standards for pure domain algorithms in `lib/learning/`.
- AI SDK streaming provider mocks (`lib/ai/models.mock.ts`) and Guest Auth middleware bypass (`/api/auth/guest`).

---

## 2. Test Scope Decision Matrix

| Scope | Location | Framework | When to Use |
| :--- | :--- | :--- | :--- |
| **End-to-End (E2E)** | `tests/e2e/*.test.ts` | Playwright (`@playwright/test`) | All user flows, UI components, page navigation, and streaming LLM chat features. |
| **Domain Unit** | `lib/learning/*.test.ts` | Vitest (`vitest`) | Pure algorithms, math formulas, and deterministic domain engines (e.g., FSRS spaced repetition, Feynman scoring heuristics, text splitters). |
| **Forbidden** | N/A | N/A | **Do NOT** write shallow unit tests for React components, raw API route wrappers, or simple utility functions. Test those via E2E. |

---

## 3. Step-by-Step Test Creation Workflow

Follow these steps strictly when converting a completed plan into automated tests:

### Step 1: Extract Higher-Level Objectives
Read the Epic / Plan specification document and identify the core DoD requirements:
- What user actions are performed?
- What visual/state changes must occur?
- What data must be persisted?

### Step 2: Read Project Testing Rules
Read [`rules/testing.md`](file:///workspaces/secure-ai-learning-support/rules/testing.md) to follow project POM patterns and locator standards.

### Step 3: Write POM & Test Files
1. Create or update the relevant Page Object in `tests/pages/`.
2. Write the test suite in `tests/e2e/<feature>.test.ts` focusing on the end-to-end user goal.
3. If pure domain math was changed, add co-located unit tests in `lib/learning/<engine>.test.ts`.

### Step 4: Execute Local Verification
Run the test suites using `run_command`:
```bash
# Run Vitest unit tests
pnpm test

# Run Playwright E2E tests
pnpm test:e2e
```

### Step 5: Validate Objective Coverage
Confirm that all DoD items from the plan have corresponding E2E assertions and that all tests pass before declaring the step complete.
