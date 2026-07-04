---
name: tdd-implement
description: Primary execution and coding skill. Implements feature plans, technical specs, PRDs, ADRs, or bug fixes step-by-step using strict Test-Driven Development (TDD). Automatically runs local test runner, Biome linter, TypeScript compiler, handles git hooks, commits atomically per task, verifies full monorepo via pnpm check, updates session history, and opens PR via gh CLI. Trigger whenever the user asks to implement code, execute a plan, write a feature, fix code via TDD, or build tasks from specs/plans/.
---

# TDD Implementation Skill

> **Role & Mindset**: You are acting as a **Senior Full-Stack Software Engineer**. Your objective is to transform technical specifications, implementation plans, or bug reports into robust, clean, high-performance production code. You MUST execute all work using strict Test-Driven Development (TDD: Red $\rightarrow$ Green $\rightarrow$ Refactor), respect monorepo layer boundaries, enforce zero `any` types, and guarantee that all automated checks pass before opening a Pull Request.

---

## High-Level Execution Workflow

```
1. Pre-Execution Context & Tooling Scan (Load rules, specs, plan, verify branch)
2. Task-by-Task Strict TDD Cycle (RED -> GREEN -> REFACTOR)
3. Automated Quality & Pre-Commit Commit Cadence (Biome, Vitest, Conventional Commits)
4. Circuit Breaker & Error Recovery (3-strike reset, revert dirty state, debug handoff)
5. Full Monorepo Pipeline Verification (Run pnpm check across all packages)
6. PR Creation, Memory Logging & Review Handoff (gh pr create, update session history)
```

---

## Phase 1: Pre-Execution Context & Tooling Scan

Before touching or editing any files, complete the pre-execution discovery step:

1. **Load Canonical Rules**:
   - Inspect [AGENTS.md](file:///workspaces/secure-ai-learning-support/AGENTS.md) for active root gotchas.
   - Inspect [rules/project-rules.md](file:///workspaces/secure-ai-learning-support/rules/project-rules.md) for feature isolation, adapter patterns, and simplicity.
   - Inspect [rules/coding-style.md](file:///workspaces/secure-ai-learning-support/rules/coding-style.md) for file naming (`kebab-case.ts`), casing rules, and error handling patterns.
   - Inspect [rules/testing.md](file:///workspaces/secure-ai-learning-support/rules/testing.md) for Vitest co-location (`foo.test.ts` next to `foo.ts`) and SQLite `DATABASE_PATH` isolation.
   - Inspect [rules/git-workflow.md](file:///workspaces/secure-ai-learning-support/rules/git-workflow.md) for branch naming (`plan-<description>-<slug>` or `fix-issue-<description>`) and Conventional Commits format.
   - Inspect [rules/styling.md](file:///workspaces/secure-ai-learning-support/rules/styling.md) if modifying frontend code in `apps/web/`.

2. **Load Target Plan or Requirements**:
   - Read the implementation plan (e.g. `specs/plans/NN-<slug>.md`) or feature spec. Identify the sequence of atomic tasks.

3. **Verify Git Branch**:
   - Run `git status` to verify working tree cleanliness.
   - If currently on `main`, create and checkout the target feature branch per [rules/git-workflow.md](file:///workspaces/secure-ai-learning-support/rules/git-workflow.md):
     ```bash
     git checkout -b plan-<description>-<slug>
     ```

---

## Phase 2: Task-by-Task Strict TDD Cycle (Red $\rightarrow$ Green $\rightarrow$ Refactor)

Execute implementation sequentially, task by task. For detailed mechanics, refer to [references/tdd-workflow-guide.md](file:///workspaces/secure-ai-learning-support/.agents/skills/tdd-implement/references/tdd-workflow-guide.md).

For each atomic task:

### 1. RED Phase (Write Failing Test First)
- Create or update the co-located test file adjacent to the target code file (e.g., `packages/core/src/features/parser/pdf-parser.test.ts` next to `pdf-parser.ts`).
- Write unit test assertions defining expected interface contracts, return structures, error conditions, and edge cases.
- Run the targeted test runner:
  ```bash
  pnpm vitest related <test-file-path> --run
  ```
- **CRITICAL VERIFICATION**: The test **MUST FAIL** on the first run. Confirm it fails for the expected contract reason (e.g. function missing or unhandled state). **NEVER skip the RED phase.**

### 2. GREEN Phase (Implement Minimum Code to Pass)
- Implement the minimal code required to satisfy the failing test.
- Respect feature isolation: features in `packages/core/src/features/` MUST NOT cross-import between features, and MUST NOT import database instances (`drizzle`) or infrastructure directly.
- Re-run the test runner:
  ```bash
  pnpm vitest related <test-file-path> --run
  ```
- **VERIFICATION**: Confirm test passes cleanly (**GREEN**).

### 3. REFACTOR Phase (Clean & Optimize under Green Safety)
- Refactor implementation code to improve readability, use early returns/guard clauses, remove code duplication, and enforce strict TypeScript typing (zero `any`).
- Re-run test runner to ensure tests remain **GREEN**.

---

## Phase 3: Automated Quality & Pre-Commit Commit Cadence

Before committing task changes, align with workspace developer tools per [references/tooling-and-quality-standards.md](file:///workspaces/secure-ai-learning-support/.agents/skills/tdd-implement/references/tooling-and-quality-standards.md):

1. **Format & Lint**:
   - Run Biome format and lint check on modified files:
     ```bash
     pnpm biome check --write <changed-files>
     ```
2. **Type Check**:
   - Run typecheck to verify zero TypeScript errors:
     ```bash
     pnpm typecheck
     ```
3. **Atomic Task Commit**:
   - Stage task files and commit using Conventional Commits format:
     ```bash
     git add <changed-files>
     git commit -m "feat(core): implement pdf parsing algorithm"
     ```
   - *Note*: Lefthook pre-commit hooks will automatically re-verify Biome formatting and Vitest related tests. If the commit is rejected by Lefthook, fix the reported errors and re-commit. Do NOT use `--no-verify`.

---

## Phase 4: Circuit Breaker & Error Recovery

To prevent infinite hallucination loops, dirty state contamination, or runaway code modifications:

- **3-Strike Failure Circuit Breaker**: If tests or typechecks fail **3 consecutive times** on a single task:
  1. **STOP execution immediately**.
  2. Revert uncommitted dirty changes for the failing task to return to the last clean commit state:
     ```bash
     git checkout -- <failing-files>
     ```
  3. Analyze the exact failure root cause (broken assertion contract, missing dependency, or typing issue).
  4. If the failure stems from an ambiguous architectural decision or bug in existing baseline code, delegate to the [debug](file:///workspaces/secure-ai-learning-support/.agents/skills/debug/SKILL.md) skill or prompt the user with clear diagnostic details.

---

## Phase 5: Full Monorepo Pipeline Verification

Once all tasks in the implementation plan are completed:

1. **Execute Full Monorepo Pipeline**:
   ```bash
   pnpm check
   ```
2. **Pipeline Requirements**:
   - `pnpm check` executes `turbo build lint typecheck test`.
   - All package builds (`apps/web`, `packages/core`, `packages/tsconfig`) must succeed.
   - Zero Biome linting/formatting errors.
   - Zero TypeScript compilation errors.
   - 100% of unit and integration test suites passing.

---

## Phase 6: PR Creation, Session Memory Logging & Review Handoff

When `pnpm check` passes cleanly:

1. **Open Pull Request via GitHub CLI**:
   - Submit the PR using `gh pr create` and populate the PR body using the template at [assets/pr-body-template.md](file:///workspaces/secure-ai-learning-support/.agents/skills/tdd-implement/assets/pr-body-template.md):
     ```bash
     gh pr create --title "feat(scope): short description" --body-file .agents/skills/tdd-implement/assets/pr-body-template.md
     ```

2. **Update Session Memory**:
   - Record completed work in [.agents/memory/session-history.md](file:///workspaces/secure-ai-learning-support/.agents/memory/session-history.md) with date, task summary, outcome, and PR URL.

3. **Downstream Review Handoff**:
   - Recommend using the [review-pr](file:///workspaces/secure-ai-learning-support/.agents/skills/review-pr/SKILL.md) skill to review the newly created PR against workspace standards.
