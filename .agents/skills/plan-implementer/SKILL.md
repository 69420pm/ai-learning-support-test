---
name: plan-implementer
description: >-
  Implement a feature plan end-to-end: read a plan document from specs/plans/,
  implement the code changes, self-check with lint and typecheck, verify with
  next-dev-loop, write tests with test-writer, and open a PR. Trigger this
  skill when a plan document exists and you need to execute it autonomously.
  Also trigger when the user says "implement plan", "execute plan", "build plan
  step", "implement step", "work on plan", "execute step", "do plan step",
  "code the changes", or references a specific plan file or epic step.
---

# Plan Implementer

You are an autonomous Implementation Agent. Your job is to take a single plan document and drive it to a **merged-ready PR** by orchestrating implementation, verification, testing, and PR creation.

---

## Inputs

You will receive one of:
- A path to a plan document (e.g., `specs/plans/001-feature-name.md`)
- A reference to a plan step inside an epic (e.g., "Step 3 of epic X")

If given an epic step reference without a standalone plan file, treat the epic's step description and DoD as your plan.

---

## Phase 0 — Pre-flight

Before writing any code:

1. **Read the plan document.** Extract:
   - Scope of changes (which files/modules are affected)
   - Definition of Done (DoD) — the acceptance criteria
   - Referenced ADRs (if any)
   - Whether this plan touches UI (determines if `agentic-ui-verification` is needed)

2. **Read mandatory rules.** You MUST read these before implementation:
   - [`rules/single-app-architecture.md`](file:///workspaces/secure-ai-learning-support/rules/single-app-architecture.md) — directory boundaries and layer placement
   - [`rules/tech-stack.md`](file:///workspaces/secure-ai-learning-support/rules/tech-stack.md) — package versions and primary documentation sources
   - [`rules/coding-style.md`](file:///workspaces/secure-ai-learning-support/rules/coding-style.md) — TypeScript standards, thin controllers, error handling
   - [`rules/styling.md`](file:///workspaces/secure-ai-learning-support/rules/styling.md) — only if plan touches UI/components
   - [`rules/git-workflow.md`](file:///workspaces/secure-ai-learning-support/rules/git-workflow.md) — branch naming, commit format, PR process

3. **Read referenced ADRs.** If the plan or epic links to ADRs in `specs/adrs/`, read them to understand architectural constraints.

4. **Read plan-level skill tags.** If the plan step includes "Required reading" or "Key packages" fields, read those skills and documentation sources before writing any code. These were tagged by the spec-writer to ensure you use current API patterns.

5. **Create the feature branch:**
   ```bash
   git checkout -b plan-<slug> main
   ```
   Derive `<slug>` from the plan filename or title (e.g., `plan-fsrs-scheduling-engine`).

---

## Phase 1 — Implement

Write the code changes described in the plan. Follow these constraints:

- **Layer placement:** Domain logic → `lib/`, UI → `components/` or `app/`, API routes → `app/api/`. Consult `single-app-architecture.md`.
- **Code style:** Named exports, path aliases (`@/...`), Zod validation at boundaries, explicit return types. Consult `coding-style.md`.
- **Styling:** If touching UI, use semantic Tailwind tokens, `cn()` for class merging, `lucide-react` for icons. Consult `styling.md`.
- **Commit incrementally:** Make small, focused commits using Conventional Commits format as you complete logical units of work. Don't batch everything into one giant commit.

### Skill Activation During Implementation

Activate domain-specific skills as needed during this phase:

| Situation | Skill to activate |
|---|---|
| Building AI features (generateText, streamText, tools, useChat) | Read `ai-sdk` skill |
| Adding/composing shadcn UI components | Read `shadcn` skill |
| Need to verify runtime behavior mid-implementation | Read `next-dev-loop` skill |

---

## Phase 1.5 — Self-Check (Before Any Subagent)

Before spinning up ANY verification or testing subagent, run these checks yourself and fix any issues inline:

1. **Lint:**
   ```bash
   pnpm lint
   ```
   Fix all lint errors before proceeding. These are fast, deterministic checks — never delegate them.

2. **Typecheck:**
   ```bash
   pnpm typecheck
   ```
   Fix all type errors before proceeding. Read the full error output, view the relevant files, and resolve each issue.

> ⚠️ **NEVER invoke the `verifier` subagent for lint, typecheck, or build issues.**
> The verifier exists for final, independent, objective validation — not for iterative development feedback.
> Running `pnpm lint` yourself takes 10 seconds. Spawning a verifier subagent to do it wastes minutes and tokens.

Only proceed to Phase 2 when lint and typecheck both pass cleanly.

---

## Phase 2 — Verify

After implementation is functionally complete and Phase 1.5 passes, verify runtime behavior. This phase has two tracks depending on whether the plan touches UI.

### Track A: Runtime Verification (all plans)

Activate the `next-dev-loop` skill to verify the running app:

1. Ensure `next dev` is running.
2. Run `get_compilation_issues` — must return 0 errors.
3. Run `get_errors` — must return 0 runtime errors.
4. If the plan added/modified routes, verify them with `get_routes`.

### Track B: UI Verification (plans with UI changes)

> **When invoked by an `epic-orchestrator`:** Skip Track B entirely. The orchestrator handles UI verification at integration checkpoints after multiple plans are combined. Proceed directly to Phase 3.

When running standalone (not orchestrated), invoke the `agentic-ui-verification` subagent with:
- The exact DoD from the plan document
- The specific URLs/routes to check
- The specific interactions to perform (clicks, form fills, navigation)

**Example invocation prompt:**
```
Verify the following Definition of Done against the running app at http://localhost:3000:

DoD:
- Navigate to /dashboard
- The learning progress card displays a circular progress indicator
- Clicking "Start Review" navigates to /review
- The review page shows a flashcard with front/back flip animation

Take screenshots at each step and report pass/fail for each DoD item.
```

### Retry Loop

If verification fails:
1. Read the failure report carefully (visual failures, compilation errors, runtime errors).
2. Fix the identified issues.
3. Commit the fix (`fix(scope): description`).
4. Re-run the failed verification track.
5. **Maximum 3 retry cycles.** If still failing after 3 retries, stop and report the unresolved issues to the user with actionable detail.

---

## Phase 3 — Test

After verification passes, activate the `test-writer` skill:

1. Read the [`test-writer` skill instructions](file:///workspaces/secure-ai-learning-support/.agents/skills/test-writer/SKILL.md).
2. Write tests grounded in the plan's **DoD and higher-level objectives** — never mirror implementation internals.
3. Scope:
   - **E2E tests** (`tests/e2e/<feature>.test.ts`) for all user-facing flows.
   - **Domain unit tests** (`lib/<module>/<engine>.test.ts`) for pure algorithms only.
   - **Page Objects** (`tests/pages/<feature>.ts`) for reusable locator patterns.
4. Run the test suites:
   ```bash
   pnpm test        # Vitest unit tests
   pnpm test:e2e    # Playwright E2E tests
   ```
5. All tests must pass before proceeding. If tests fail, fix the code (not the tests) unless the test itself has a bug.

---

## Phase 4 — Validation Gate

Run the full project validation:

```bash
pnpm check
```

This runs lint + typecheck + tests. **All must pass.** Fix any issues before proceeding.

---

## Phase 5 — PR Creation

> **When invoked by an `epic-orchestrator`:** Skip Phase 5 entirely. The orchestrator creates a single PR for the entire epic after all plans are integrated. Just ensure your commits are clean and pushed to your plan branch.

When running standalone, follow [`rules/git-workflow.md`](file:///workspaces/secure-ai-learning-support/rules/git-workflow.md):

1. **Verify clean state:**
   ```bash
   git status
   ```

2. **Review the diff:**
   ```bash
   git diff --staged
   ```
   Ensure only intended changes are included. No debug code, no leftover `console.log`, no unrelated files.

3. **Push and create PR** following the PR body template in [`rules/git-workflow.md`](file:///workspaces/secure-ai-learning-support/rules/git-workflow.md):
   ```bash
   git push origin plan-<slug>
   gh pr create --title "<type>(scope): <description>" --body "<use PR body template from git-workflow.md>"
   ```
   Fill in all DoD items from the plan as checked checkboxes in the "Definition of Done" section.

4. **Update the plan index.** Add an entry to [`specs/plan-index.md`](file:///workspaces/secure-ai-learning-support/specs/plan-index.md) recording the plan, its status, and the PR link.

---

## Abort Conditions

Stop execution and report to the user if any of these occur:

- **Ambiguous plan:** The plan document lacks a clear DoD or scope — ask the user to clarify before implementing.
- **Architectural conflict:** The plan requires changes that violate `single-app-architecture.md` or an existing ADR — flag the conflict.
- **Verification loop exceeded:** 3 retry cycles failed without resolution.
- **Blocked dependency:** The plan depends on another unimplemented plan or missing infrastructure — report what's blocking.

---

## Checklist Summary

```
[ ] Phase 0: Read plan, rules, ADRs → create branch
[ ] Phase 1: Implement with incremental commits
[ ] Phase 1.5: Self-check — pnpm lint + pnpm typecheck (fix before proceeding)
[ ] Phase 2: Verify runtime (next-dev-loop; + agentic-ui-verification if standalone)
[ ] Phase 3: Write tests (test-writer skill)
[ ] Phase 4: Run pnpm check — all green
[ ] Phase 5: Push → gh pr create → update plan-index (skip if orchestrated)
```
