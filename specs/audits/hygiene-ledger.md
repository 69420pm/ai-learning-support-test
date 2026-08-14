# Codebase Hygiene & Audit Ledger

This ledger tracks the health, dead code scans, duplication analysis, architectural boundaries, and chaos tests for the **AI Learning Support** repository. It serves as the single source of truth for periodic maintenance and ensures expensive audits are run at optimal frequencies.

---

## 1. Health Status Matrix

| Diagnostic Domain | Tier | Tool / Engine | Frequency | Last Run (Commit & Date) | Status | Key Metrics / Findings |
| :--- | :--- | :--- | :--- | :--- | :--- | :--- |
| **Lint & Style Compliance** | Tier 1 | Biome 2.5.7 | Every run | `HEAD` (2026-08-14) | 🟢 Clean | 0 errors, 0 warnings across 93 files |
| **Type Integrity** | Tier 1 | `tsc --noEmit` | Every run | `HEAD` (2026-08-14) | 🟢 Clean | 0 compiler errors |
| **Spec & Index Sync** | Tier 1 | `scripts/check-specs.ts` | Every run | `HEAD` (2026-08-14) | 🟢 100% In Sync | All 21 plans, ADRs, & epics indexed |
| **Architectural Boundaries** | Tier 1 | `scripts/check-architecture.ts` | Every run | `HEAD` (2026-08-14) | 🟢 0 Violations | Presentation cleanly uncoupled from direct db imports |
| **Unit Test Suite** | Tier 1 | Vitest 4.x | Every run | `HEAD` (2026-08-14) | 🟢 100% Green | 52 / 52 tests passing (9 test suites) |
| **E2E Test Suite** | Tier 1 | Playwright 1.62.x | Every release/run | `HEAD` (2026-08-14) | 🟢 100% Green | 15 / 15 tests passing |
| **Dead Code & Exports** | Tier 1 | Knip 6.x | Pre-quota / Bi-weekly | `HEAD` (2026-08-14) | 🟢 Clean | 0 dead files, 0 unused exports |
| **Code Duplication (DRY)** | Tier 1/2 | `jscpd` (tokens >= 50) | Pre-quota / Milestone | `HEAD` (2026-08-14) | 🟢 22 clones (4.97%) | Consolidated session resolution & history group mapping |
| **Chaos & Runtime Breakage** | Tier 3 | Playwright / Dev-Loop | Pre-Release / Monthly | `HEAD` (2026-08-14) | ⚪ Not Started | Adversarial fuzzing & fault injection |

---

## 2. Execution Log

### Run: Autonomous Maintenance & DRY Consolidation (2026-08-14)
* **Trigger**: `/codebase-gardener run` invocation.
* **Commit**: `HEAD`
* **Actions Taken & Findings**:
  1. **Formatting & Linter Fix**:
     - Fixed Biome format alignment in `components/header.tsx`.
  2. **DRY Session Consolidation**:
     - Created unified session retrieval helper [`lib/auth/session.ts`](file:///workspaces/secure-ai-learning-support/lib/auth/session.ts) (`getCurrentUser()`), consolidating redundant Supabase auth and Playwright mock cookie resolution from `app/chat/layout.tsx`, `components/header.tsx`, and `app/page.tsx`.
     - Added comprehensive unit test suite [`tests/unit/auth-session.test.ts`](file:///workspaces/secure-ai-learning-support/tests/unit/auth-session.test.ts).
  3. **Sidebar History JSX Consolidation**:
     - Refactored repeating history section markup in [`components/chat/sidebar-history.tsx`](file:///workspaces/secure-ai-learning-support/components/chat/sidebar-history.tsx) using array map iteration.
  4. **Quality Gates Verified**:
     - `pnpm lint`: PASS (0 errors, 0 warnings across 93 files).
     - `pnpm typecheck`: PASS (0 errors).
     - `pnpm scan:specs`: PASS (21/21 indexed).
     - `pnpm scan:arch`: PASS (0 layer boundary violations).
     - `pnpm scan:dead`: PASS (0 issues found by Knip).
     - `pnpm scan:duplicates`: Clones reduced from 28 to 22 (duplication rate lowered to 4.97%).
     - `pnpm test`: PASS (52/52 unit tests green).
     - `pnpm test:e2e`: PASS (15/15 Playwright E2E tests green).

### Run: Baseline Test Run & Setup (2026-08-14)
* **Trigger**: Initial setup and baseline verification of the Codebase Gardener & Health Orchestrator system.
* **Commit**: `HEAD`
* **Actions Taken & Findings**:
  1. **Linting Rules Tightened**: Configured strict Biome rules (`useConsistentTypeDefinitions` enforcing `type` over `interface`, promise safety, switch clause checks).
  2. **Violations Fixed**:
     - Converted `ModelSelectorProps` and `ModelOption` from `interface` to `type`.
     - Fixed `DEFAULT_MODEL_ID` discrepancy (`gemini-3.7-flash`) in `lib/ai/providers.ts` and `lib/ai/providers.test.ts`.
     - Eliminated duplicate epic file `specs/epics/chat-interface-foundation.md` and synced `specs/plan-index.md`.
     - Decoupled `components/chat/sidebar-history*.tsx` from `@/lib/db/schema` via `@/lib/types`.
  3. **Quality Gates Verified**:
     - `pnpm lint`: PASS (0 errors, 0 warnings).
     - `pnpm typecheck`: PASS (0 errors).
     - `pnpm scan:specs`: PASS (21/21 indexed).
     - `pnpm scan:arch`: PASS (0 violations).
     - `pnpm test`: PASS (47/47 tests green).
  4. **Identified Optimization Opportunities**:
     - `components/auth/*` forms share repetitive container, submit button, and error alert markup (28 clones, 6.45% duplication). Can be consolidated into a reusable `<AuthCard>` / `<AuthSubmitButton>` pattern.

---

## 3. Tier & Cost Guidance

* **Tier 1 (Fast & Programmatic - 0 LLM Tokens)**: `pnpm scan:all` (knip, jscpd, depcruise, check-specs, check-architecture, biome, tsc). Run frequently or before any refactoring.
* **Tier 2 (Targeted LLM Subagents - Low/Moderate Tokens)**: Deploys `code-gardener` subagent to resolve detected dead code, DRY duplications, or update stale specs.
* **Tier 3 (Deep Architectural & Chaos - High Tokens)**: Deploys `chaos-tester` and `arch-auditor` for fuzzing, runtime failure injection, and end-to-end resilience validation.
