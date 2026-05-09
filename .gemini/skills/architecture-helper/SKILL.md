---
name: architecture-helper
description: Takes an existing GitHub issue or basic user input and drafts a high-level technical design or specification. Use when a plan is needed before starting implementation. Strictly forbids writing implementation code.
---

# Architecture Helper

This skill helps you design a solution for a GitHub issue or direct user input without jumping into code.

## Workflow

1.  **Fetch Issue**: Use `gh issue view <issue-number>` if an issue is provided, or just the user input to understand the requirements.
2.  **Explore Codebase**: Use `codebase_investigator` or `grep_search` to find relevant components, types, and services.
3.  **Analyze Dependencies**: Identify how the change affects other parts of the monorepo.
4.  **Draft Design**:
    *   **Architecture Changes**: New classes, functions, or modules.
    *   **Data Flow**: How data moves through the new system.
    *   **Type Definitions**: Proposed TypeScript types/interfaces.
    *   **Testing Strategy**: How the changes will be verified.
5.  **Output Specification**: Present the design as a Markdown document. You may also offer to post it as a comment on the issue.

## Constraints

*   **NO CODE**: Do not write actual implementation code (logic, business rules, etc.). Focus on structure and interfaces.
*   **Adhere to Standards**: Follow the guidelines in `GEMINI.md`.

## Tool Usage

### GitHub CLI Commands

*   View issue details:
    ```bash
    gh issue view <issue-number> --json title,body,comments
    ```
*   Comment on issue:
    ```bash
    gh issue comment <issue-number> --body "<body>"
    ```

### Validation

Before fetching data, always run:
```bash
make check-github
```
