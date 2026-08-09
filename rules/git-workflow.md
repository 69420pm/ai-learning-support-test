# Git Workflow

- **Branch Naming**: 
  - For features: `plan-<description>-<slug>`
  - For standalone fixes: `fix-issue-<issue_number or description>`
- **Commits**: Follow Conventional Commits format (e.g., `feat(ui): ...`, `fix(db): ...`).
- **Parallel Work**: Use `git worktree` when running multiple agents in parallel to isolate their working directories.
- **PR Process**: Create PRs via `gh pr create`. Review via `gh pr review`.
- **Merge Strategy**: We use Squash and Merge for PRs to keep the main history clean.
- **Pre-Push Check**: Lefthook handles pre-commit linting/testing and pre-push typechecking automatically. Run `pnpm check` for full project validation.

---

## Agent Pre-Commit & PR Checklist

Before creating a commit or PR, agents MUST follow this checklist:

1. **Verify clean state:** Run `git status` to confirm all intended changes are staged.
2. **Run validation gate:** Execute `pnpm check` (lint + typecheck + test). All must pass.
3. **Review diff:** Run `git diff --staged` to verify only intended changes are included.
4. **Write commit message:** Follow Conventional Commits format (see above).
5. **Push and create PR:**
   ```bash
   git push origin <branch-name>
   gh pr create --title "<type>(scope): description" --body "<use PR template below>"
   ```

---

## PR Body Template

Use this template for all PR descriptions. Omit sections that don't apply (e.g., skip "Definition of Done" for standalone fixes without a plan).

```markdown
## Summary

<What changed and why. Link the plan if one exists: `Implements plan: specs/plans/<file>.md`>

## Changes

- <list key changes>

## Definition of Done

- [x] <DoD item 1 — verified>
- [x] <DoD item 2 — verified>

## Verification

- [x] `pnpm check` passes (lint + typecheck + test)
- [x] Runtime verified via next-dev-loop (0 compilation/runtime errors)
- [x] UI verified via agentic-ui-verification (if applicable)
- [x] E2E tests written and passing
- [x] Unit tests written and passing (if applicable)
```
