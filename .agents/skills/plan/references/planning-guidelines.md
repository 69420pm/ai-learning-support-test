# Technical Planning & Task Breakdown Guidelines

This reference guide outlines the technical rules, architectural principles, and task sizing strategies required when creating implementation plans for this repository.

> **Rule Decoupling Principle**: Do not hardcode static rule values inside skills or plans. Always inspect and link directly to the workspace's canonical rule and spec files ([rules/project-rules.md](file:///workspaces/secure-ai-learning-support/rules/project-rules.md), [rules/coding-style.md](file:///workspaces/secure-ai-learning-support/rules/coding-style.md), [rules/testing.md](file:///workspaces/secure-ai-learning-support/rules/testing.md), [rules/git-workflow.md](file:///workspaces/secure-ai-learning-support/rules/git-workflow.md), [specs/architecture-index.md](file:///workspaces/secure-ai-learning-support/specs/architecture-index.md)).

---

## 1. Task Sizing & Scope Boundaries

### The Atomic Task Rule
Every task in an implementation plan MUST be sized to **roughly one logical commit** ($\le$ 1 unit of work). 

- **Maximum Files per Task**: 1–4 files (typically 1 source file, 1 co-located test file, and 1-2 shared type/export files).
- **Rule of Thumb**: If a single task requires modifying more than 5 distinct files or writing more than 250 lines of logic, **it MUST be split into multiple atomic tasks**.
- **Multi-PR Threshold**: If a plan exceeds **8 to 10 tasks**, evaluate splitting the feature into multiple sequential Pull Requests (e.g. Phase 1: Core Domain & Data Models, Phase 2: Orchestration & Services, Phase 3: Frontend UI Shell).

---

## 2. Monorepo Layering & Architecture Invariants

When mapping file changes, enforce strict layer boundaries as defined in [architecture-index.md](file:///workspaces/secure-ai-learning-support/specs/architecture-index.md) and [project-rules.md](file:///workspaces/secure-ai-learning-support/rules/project-rules.md):

- **Unidirectional Orchestration**: UI and API routes in `apps/web/` invoke core orchestrator services in `packages/core/src/services/`.
- **Feature Isolation**: Modules in `packages/core/src/features/*` must never cross-import each other.
- **Adapter Abstractions**: Storage and database operations abstract behind pluggable interfaces allowing hot-swapping between Local and Cloud modes.

---

## 3. TDD Integration & Verification Strategy

Every task in an implementation plan must specify exact, executable TDD instructions complying with [rules/testing.md](file:///workspaces/secure-ai-learning-support/rules/testing.md):

### The TDD Cycle Specification
For each task:
1. **Red (Failing Test)**: Specify the exact co-located test file path (e.g. `foo.test.ts`).
2. **Run Command**: Instruct execution of the targeted test runner command: `pnpm vitest related <test_file_path> --run`
3. **Green (Implementation)**: Specify the exact source file path (e.g. `foo.ts`).
4. **Refactor & Check**: Verify clean refactoring without breaking assertions.

### Database Testing & Isolation Rule
When planning database-related tasks, isolate SQLite databases during parallel tests using `DATABASE_PATH`:
`DATABASE_PATH=:memory: pnpm vitest related <test_file> --run`

---

## 4. Naming Conventions & Code Style Guidelines

All proposed file paths, variables, and function contracts must adhere to active rules in [coding-style.md](file:///workspaces/secure-ai-learning-support/rules/coding-style.md):

- **Filenames**: Always `kebab-case.ts`.
- **Naming & Types**: Follow naming conventions, explicit TypeScript parameter/return types, early returns, and zero `any` specified in [rules/coding-style.md](file:///workspaces/secure-ai-learning-support/rules/coding-style.md).

---

## 5. Branch Naming & Git Conventions

Specify git expectations in every plan according to active rules in [git-workflow.md](file:///workspaces/secure-ai-learning-support/rules/git-workflow.md):

- **Branch Naming**: Follow feature/fix branch formats defined in [rules/git-workflow.md](file:///workspaces/secure-ai-learning-support/rules/git-workflow.md) (e.g., `plan-<description>-<slug>`).
- **Commit Messages**: Enforce Conventional Commits for each atomic task.
- **Pre-Push Validation**: Specify monorepo validation check: `pnpm check`.
