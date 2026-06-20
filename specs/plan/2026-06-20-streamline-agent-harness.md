# Technical Implementation Plan: Streamline Agent Harness & Orchestration

## 1. Overview & Context
- **Feature Description**: Restructure the agent harness to transition from a bureaucratic **PR-per-child-issue** model to a streamlined **TDD-blocked, PR-per-plan** loop. This involves replacing the `full-issue-implementation` skill with `full-plan-implementation`, updating issue generation rules in `convert-plan-to-issues`, adapting unit test/issue implementation skills, and updating repository contributing documentation.
- **User Value / Problem Solved**: Eliminates the high human context-switching cost and redundant token overhead of running multiple subagents per minor issue. The developer gets background leverage with a single clean code review at the end of the feature implementation.
- **Idea Path**: N/A (Derived from the agent harness audit on [2026-06-20-harness-audit.md](file:///Users/kevinsmith/Documents/development/typescript/ai-learning-support/specs/harness-audits/2026-06-20-harness-audit.md))

---

## 2. Scope Boundaries (Goals & Non-Goals)
- **Goals (In Scope)**:
  - Create the new `full-plan-implementation` skill file to handle sequential execution of child issues on a single plan feature branch.
  - Delete the obsolete `full-issue-implementation` skill folder and references to prevent context rot.
  - Update `convert-plan-to-issues` to automatically inject an upfront, blocking `Issue 1: Test Suite & Scaffolding` task.
  - Refactor `implement-unit-test-for-issue` to focus on writing tests for the plan interface issue (Issue 1).
  - Update `implement-issue` to handle implementing code on top of pre-written tests.
  - Rename the branch naming policy in `CONTRIBUTING.md` to `plan-<parent_issue_number>-<slug>`.
  - Verify configuration completeness using `make check`.
- **Non-Goals (Out of Scope)**:
  - Modifying the underlying `git-workflow.sh` or the Makefile targets. The existing targets (`create-branch`, `create-issue`, `commit`, etc.) are already generic enough.
  - Implementing the actual Local Document Ingestion feature (which will be run *after* this harness update).

---

## 3. Architecture & Components

### Target Repository Layout
- **Created Skill**: `.agents/skills/full-plan-implementation/SKILL.md` (coordinator)
- **Deleted Skill**: `.agents/skills/full-issue-implementation/` (removed entirely)
- **Updated Skills**: 
  - `.agents/skills/convert-plan-to-issues/SKILL.md` (adds upfront test-suite generation)
  - `.agents/skills/implement-issue/SKILL.md` (references new parent skill name)
  - `.agents/skills/implement-unit-test-for-issue/SKILL.md` (streamlined test boundaries)
- **Updated Documentation**:
  - `CONTRIBUTING.md` (updates branch naming flow)

---

## 4. Acceptance Criteria
- [ ] The folder `.agents/skills/full-issue-implementation` is completely deleted.
- [ ] Running `make check` succeeds with zero linting, type, or build errors across packages and apps.
- [ ] No references to `full-issue-implementation` exist in the active skill library (checked via `grep`).
- [ ] `convert-plan-to-issues/SKILL.md` specifies that the first child issue created must be the plan's test suite, blocking all other child issues.
- [ ] `CONTRIBUTING.md` specifies the branch naming convention as `plan-<parent_issue_number>-<slug>` for plan-driven features.
- [ ] `full-plan-implementation/SKILL.md` outlines the loop that:
  - Reads the parent issue and spawns a branch `plan-<num>-<slug>`.
  - Spawns `implement-unit-test-for-issue` for Issue 1 (blocking).
  - Spawns `implement-issue` sequentially for Issues 2..N, validating each commit with `make check`.
  - Pushes changes and opens a single parent PR with a final review gate.

---

## 4.5 Key Decisions & Rationale

| Decision | Why this approach | Alternatives rejected | Constraints |
| :--- | :--- | :--- | :--- |
| **Delete obsolete skill** | Prevents agent confusion and context rot by ensuring there is only one orchestration orchestrator entrypoint on disk. | Keeping it deprecated inside the folder. | Ensures the agent's `/plugin` router selects the correct workflow. |
| **Interface-First Test Issue (Issue 1)** | Forces the agent to define all data layers and schemas in tests first. The human reviews the interfaces before any implementation code is written. | Letting the implement-issue subagent write code and tests simultaneously. | Prevents architectural drift and ensures human alignment on interface seams. |
| **Parent-PR Review Only** | Running code reviews on individual child issues is too micro and loses the structural big picture. Single PR review at the end is lower friction. | Keeping reviews on every commit/child issue. | Reduces token waste and context-switching overhead for the developer. |

---

## 5. Testing Strategy
- **Verification of Harness Changes**:
  - Manually review the diffs of `.agents/skills/` changes to ensure instructions are clear and unambiguous.
  - Run `make check` to verify linting and formatting conform to Biome.
