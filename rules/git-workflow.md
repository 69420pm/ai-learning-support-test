# Git Workflow

- **Branch Naming**: 
  - For features: `plan-<issue_number>-<slug>`
  - For standalone fixes: `fix-issue-<issue_number>`
- **Commits**: Follow Conventional Commits format (e.g., `feat(core): ...`, `fix(web): ...`).
- **Parallel Work**: Use `git worktree` when running multiple agents in parallel to isolate their working directories.
- **PR Process**: Create PRs via `gh pr create`. Review via `gh pr review`.
- **Merge Strategy**: We use Squash and Merge for PRs to keep the main history clean.
- **Pre-Push Check**: Always run `make check` before pushing to ensure linters and tests pass.
