# Git Workflow

- **Branch Naming Taxonomy**: 
  - **Epics / Multi-Plan Work**: `epic-<slug>` (managed in `.worktrees/epic-<slug>`)
  - **Feature Plans & Tickets**: `plan-<description>-<slug>` (from `/to-tickets` and `/implement`)
  - **Standalone Fixes**: `fix-issue-<issue_number or description>` (from `/diagnosing-bugs` and `/triage`)
  - **Throwaway Prototypes**: `prototype/<name>` (from `/prototype` skill, branched out of `main`)
  - **Throwaway Research**: `research/<name>` (from `/wayfinder` research tickets & `/research` skill)
- **Commits**: Follow Conventional Commits format (e.g., `feat(ui): ...`, `fix(db): ...`, `refactor(lib): ...`).
- **Parallel Work & Epic Execution**: Use `git worktree` (under `.worktrees/`) for epic orchestration and multi-agent runs so the root workspace remains clean on `main`.
- **PR Process**: Create PRs via `gh pr create` with Conventional Commits titles (`<type>(scope): description`). Review via `gh pr review`.
- **Merge Strategy**: Squash and Merge for PRs to keep the main history clean.
- **Pre-Commit / Pre-Push Checks (Lefthook)**: Lefthook automatically handles pre-commit validation (`branch-health`, `biome check --write` on staged files, and `vitest related {staged_files}`) and pre-push validation (`typecheck`). Do NOT run redundant chained test commands repeatedly; running `pnpm check` once before PR creation is sufficient.
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

## Issue Tracker & Skill Integration

All issue management runs through GitHub Issues via the `gh` CLI as documented in [`docs/agents/issue-tracker.md`](file:///workspaces/secure-ai-learning-support/docs/agents/issue-tracker.md) and [`docs/agents/triage-labels.md`](file:///workspaces/secure-ai-learning-support/docs/agents/triage-labels.md):

* **Wayfinding (`/wayfinder`)**:
  - Map issue created with `--label wayfinder:map`.
  - Child tickets created with `--label wayfinder:<research|prototype|grilling|task>`.
  - Dependency blocking uses GitHub's native issue dependencies (`gh api ... /dependencies/blocked_by`).
  - Unblocked frontier queries filter for `issue_dependencies_summary.blocked_by == 0` and unassigned tickets.
* **Vertical Slices (`/to-tickets` & `/implement`)**:
  - Publishes tracer-bullet issues with `ready-for-agent` label.
  - Links blocking edges blockers-first.
* **Triage (`/triage`)**:
  - Evaluates incoming raw requests and assigns canonical roles (`needs-triage`, `needs-info`, `ready-for-agent`, `ready-for-human`, `wontfix`).
* **PR Linkage**:
  - Always link the corresponding issue in the PR summary using `Closes #<number>` or `Part of #<number>`.

---

## Agent Pre-Commit & PR Checklist

Before creating a commit or PR, agents MUST follow this checklist:

1. **Review changes:** Run `git status` and `git diff` to confirm only intended files are modified.
2. **Run validation gate (once):** Execute `pnpm check` once before committing (or rely on Lefthook hooks on commit). Avoid chaining repeated manual format/lint/test commands.
3. **Stage & Commit:** Stage intended files (`git add <files>`) and commit with Conventional Commits format (`git commit -m "..."`). Lefthook automatically formats staged files and tests related files.
4. **Push and create PR:**
   ```bash
   git push origin <branch-name>
   gh pr create --title "<type>(scope): description" --body "<use PR template below>"
   ```
5. **Ensure Root is on Main:** If not in a worktree, switch back to `main` (`git checkout main`) after PR creation and notify the user.

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
