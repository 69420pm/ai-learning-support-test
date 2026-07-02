# Git Workflow

- **Branch Naming**: 
  - For features: `plan-<description>-<slug>`
  - For standalone fixes: `fix-issue-<issue_number or description>`
- **Commits**: Follow Conventional Commits format (e.g., `feat(core): ...`, `fix(web): ...`).
- **Parallel Work**: Use `git worktree` when running multiple agents in parallel to isolate their working directories.
- **PR Process**: Create PRs via `gh pr create`. Review via `gh pr review`.
- **Merge Strategy**: We use Squash and Merge for PRs to keep the main history clean.
- **Pre-Push Check**: Lefthook handles pre-commit linting/testing and pre-push typechecking automatically. Run `pnpm check` for full monorepo validation.
