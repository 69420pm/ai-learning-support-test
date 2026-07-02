---
name: tdd-implement
description: Implement a feature or plan using Test-Driven Development (TDD) and open a PR.
---

Implement a feature following an implementation plan in TDD style. This is your primary coding skill.

1. Mandatory Pre-reads: `CONTRIBUTING.md`, `rules/coding-style.md`, `rules/testing.md`, `rules/git-workflow.md`, and the implementation plan. If touching `apps/web/`, also read `rules/styling.md`. Respect the architecture (`specs/architecture-index.md`).
2. TDD Cycle: 
   - Write the test (ensure it fails).
   - Run test: `pnpm vitest related <file> --run`.
   - Implement the code.
   - Run test (ensure it passes).
   - Refactor if necessary.
3. Commit Cadence: Commit after each completed task using conventional commits.
4. Error Recovery: If tests fail 3+ times in a row, STOP and report to the user instead of spiraling into hallucinations.
5. End State: Run `pnpm check`. If all checks pass, open a PR using `gh pr create`.
6. Update `.agents/memory/session-history.md` on completion.
7. Suggestion: After the PR is open, it can be reviewed using `review-pr`.
