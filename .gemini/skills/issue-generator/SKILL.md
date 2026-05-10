---
name: issue-generator
description: Translates vague user requests or chat discussions into a structured GitHub issue with clear acceptance criteria. Use when the user wants to start work on a new feature or fix but hasn't created a formal issue yet.
---

# Issue Generator

This skill guides you through the process of creating a high-quality GitHub issue from an informal request.

## Workflow

1.  **Extract Intent**: Identify the core goal from the user's request.
2.  **Verify Context**: Ensure you understand the part of the codebase affected. If unsure, use `codebase_investigator` or `grep_search`.
3.  **Draft the Issue**:
    *   **Title**: Clear and concise (e.g., "feat: add authentication to API").
    *   **Description**: Explain the "why" and "what".
    *   **Acceptance Criteria**: Provide a bulleted list of specific, testable requirements.
    *   **Context/Hints**: Mention relevant files or architectural constraints.
    *   **Labels**: Suggest appropriate labels (e.g., `enhancement`, `bug`, `help wanted`).
4.  **User Approval**: Present the draft to the user and ask for approval or edits.
5.  **Create Issue**: Once approved, run `make check-github` to ensure environment is ready, then use `gh issue create`.

## Tool Usage

### GitHub CLI Commands

*   Create an issue:
    ```bash
    gh issue create --title "<title>" --body "<body>"
    ```

### Validation

Before creating the issue, always run:
```bash
make check-github
```

## Example Issue Template

```markdown
## Description
[Briefly describe the feature or bug]

## Acceptance Criteria
- [ ] Requirement 1
- [ ] Requirement 2
- [ ] Requirement 3

## Technical Context
- Affected area: [e.g., packages/core]
- Related files: [e.g., src/auth.ts]
```
