---
name: pr-review
description: Analyzes an open GitHub Pull Request for common issues, missing tests, and style violations. Use to perform an automated first-pass review of a PR.
---

# PR Review

This skill performs an automated review of a Pull Request.

## Workflow

1.  **Fetch PR Details**: Use `gh pr view <pr-number>` and `gh pr diff <pr-number>` to get the context and code changes.
2.  **Analyze Diff**:
    *   Check for anti-patterns (e.g., `any` usage).
    *   Verify test coverage for new logic.
    *   Ensure adherence to `GEMINI.md` standards.
    *   Look for common bugs or logical errors.
3.  **Summarize Findings**: Provide a clear report of issues found.
4.  **Feedback**: Offer to post the findings as a review comment on GitHub.

## Tool Usage

### GitHub CLI Commands

*   View PR details:
    ```bash
    gh pr view <pr-number> --json title,body
    ```
*   View PR diff:
    ```bash
    gh pr diff <pr-number>
    ```
*   Add review comment:
    ```bash
    gh pr review <pr-number> --comment --body "<body>"
    ```

### Validation

Before starting, always run:
```bash
make check-github
```
