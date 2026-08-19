# Git Workflow

- **Branch Naming**: 
  - For epics: `epic-<slug>`
  - For features / plans: `plan-<description>-<slug>`
  - For standalone fixes: `fix-issue-<issue_number or description>`
- **Commits**: Follow Conventional Commits format (e.g., `feat(ui): ...`, `fix(db): ...`).
- **Parallel Work & Epic Execution**: Use `git worktree` (under `.worktrees/`) for epic orchestration and multi-agent runs so the root workspace remains clean on `main`.
- **PR Process**: Create PRs via `gh pr create`. Review via `gh pr review`.
- **Merge Strategy**: Squash and Merge for PRs to keep the main history clean.
- **Pre-Commit / Pre-Push Checks**: Lefthook automatically validates branch health, linting, tests, and typechecking. Run `pnpm check` for full validation.
- **Sync & Cleanup**: Use `pnpm git:sync` to return to `main`, pull remote changes, prune deleted remote branches, and remove stale merged local branches.

---

## Epic-Level PR & Worktree Strategy

When an epic is being executed across multiple plans:

- **One PR per epic, not per plan.** Individual plans get their own branches for isolation, but they merge into an epic integration branch. Only the epic branch gets a PR against `main`.
- **Worktree Isolation:** The Epic Orchestrator creates and operates inside a dedicated worktree (`.worktrees/epic-<slug>`). This ensures the user's root editor remains on `main` without disruption or risk of clobbering uncommitted work.
- **Branch structure:**
  ```
  main (root workspace)
  └── .worktrees/epic-<slug>  ← integration branch in worktree (PR target)
      ├── plan-<plan-010-slug> ← merged into epic branch
      ├── plan-<plan-011-slug> ← merged into epic branch
      └── plan-<plan-012-slug> ← merged into epic branch
  ```
- **Post-PR Cleanup:** After `gh pr create` is run:
  1. The orchestrator deletes the temporary worktree: `git worktree remove .worktrees/epic-<slug>`.
  2. The root workspace confirms it is on `main`.
  3. When the PR is merged on GitHub, running `pnpm git:sync` or `pnpm git:pr:finish` pulls the latest changes and cleans up the local branch.

---

## Workspace Sync Commands

| Command | Action |
|---|---|
| `pnpm git:sync` | Switches to `main`, pulls latest `origin/main`, prunes remote refs, and cleans merged local branches |
| `pnpm git:health` | Checks if current branch is stale or already merged into `main` |
| `pnpm git:pr:finish` | Merges current PR via `gh pr merge --squash --delete-branch` and runs `pnpm git:sync` |

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
6. **Ensure Root is on Main:** If not in a worktree, switch back to `main` (`git checkout main`) after PR creation and notify the user.

---

## PR Body Template

Use this template for all PR descriptions. Omit sections that don't apply (e.g., skip "Definition of Done" for standalone fixes without a plan).

```markdown
## Summary

<What changed and why. Link the related issue: `Closes #<number>`>

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
