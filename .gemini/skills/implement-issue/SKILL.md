---
name: implement-issue
description: Takes a well-defined GitHub issue and implements the necessary code changes. Use when the design is clear and it's time to write code.
---

# Implement Issue

This skill guides you through the implementation phase of a task.

## Workflow

1.  **Understand Requirements**: Use `gh issue view <issue-number>` to read the issue and any architectural plans in the comments.
2.  **Research & Plan**: Analyze the code and define your surgical changes.
3.  **Execute & Commit Incrementally**:
    *   Break down the task into logical sub-tasks.
    *   For each sub-task:
        1.  Implement the code changes.
        2.  Run local tests/validations (e.g., `make test` or `make check`).
        3.  **Commit changes**: Use `git commit -m "<meaningful message>"` to save your progress. This allows for easy rollbacks if a subsequent step fails.
4.  **Final Validation**: Run `make check` to ensure the entire workspace is stable.

## Git Standards

*   Use Conventional Commits (e.g., `feat:`, `fix:`, `refactor:`).
*   Provide clear, concise commit messages.
*   Do NOT push to remote unless explicitly asked.

## Tool Usage

### GitHub CLI Commands

*   View issue details:
    ```bash
    gh issue view <issue-number>
    ```

### Validation

Before starting, always run:
```bash
make check-github
```

During implementation, use:
```bash
make check
```
