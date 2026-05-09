---
name: pr-creator
description: Bundles the current branch's changes into a GitHub Pull Request. Use when implementation is complete and ready for review.
---

# PR Creator

This skill helps you open a high-quality Pull Request.

## Workflow

1.  **Check Status**: Ensure all changes are committed.
2.  **Identify Issue**: Determine which issue this PR addresses (ask the user or infer from context).
3.  **Generate Description**:
    *   Summarize the changes made.
    *   Link the issue (e.g., "Closes #123").
    *   Explain the testing performed.
4.  **Create PR**: Use `gh pr create` with the generated title and body.
5.  **Notify User**: Provide the PR URL.

## Tool Usage

### GitHub CLI Commands

*   Create a PR:
    ```bash
    gh pr create --title "<title>" --body "<body>" --base main
    ```

### Validation

Before creating the PR, always run:
```bash
make check-github
```

Ensure the codebase is valid:
```bash
make check
```
