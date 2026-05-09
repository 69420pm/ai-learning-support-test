---
name: implement-issue
description: End-to-end workflow for resolving GitHub issues. Use this skill when a user provides a GitHub issue number or URL and asks to implement a fix or feature. It automates fetching issue details, branch creation, planning, implementation, verification, and PR creation.
---

# Implement Issue

## Overview
This skill provides a structured, automated workflow for the entire lifecycle of resolving a GitHub issue. It ensures consistency in branch naming, thorough planning in Plan Mode, rigorous verification through the project's verification loop, and standardized pull request creation.

## Workflow

### 1. Fetch Issue Information
Begin by retrieving the full details of the issue.
- **Tool**: `mcp_github_issue_read`
- **Method**: `get`
- **Goal**: Understand the requirements, acceptance criteria, and any context provided in the issue description and comments.

### 2. Prepare Workspace
Create a dedicated branch for the issue.
- **Branch Naming**: `fix/<issue-number>-<short-description>` or `feat/<issue-number>-<short-description>`.
- **Command**: `git checkout -b <branch-name>` (via `run_shell_command`).

### 3. Research & Design (Plan Mode)
Enter Plan Mode to safely research the codebase and design the solution.
- **Tool**: `enter_plan_mode`
- **Tasks**:
    - Locate relevant files and symbols.
    - Understand existing patterns and dependencies.
    - Identify necessary changes and potential side effects.
    - **Outcome**: A comprehensive implementation plan approved by the user.

### 4. Implementation
Execute the approved plan iteratively.
- **Tools**: `replace`, `write_file`, `run_shell_command`.
- **Standards**: Adhere to `GEMINI.md` and project style guides.
- **Iterative Cycle**: For each component:
    1. Apply code changes.
    2. Write/update unit tests.
    3. Verify locally.

### 5. Verification Loop
Before finalizing, run the complete project verification suite.
- **Commands**:
    - `make format`
    - `make lint`
    - `make typecheck`
    - `make test`
- **Requirement**: All checks must pass. Address any diagnostics or failures before proceeding.

### 6. Create Pull Request
Once verified, create a pull request to share the changes.
- **Tool**: `mcp_github_create_pull_request`
- **Content**:
    - **Title**: `[Issue #<number>] <Short Summary>`
    - **Body**: Link to the issue (`Closes #<number>`), summarize changes, and list verified tasks.

## Guidelines
- **Commits**: If the user requests commits during implementation, follow the project's commit message style (checked via `git log`).
- **Plan Mode**: Always use Plan Mode for any non-trivial change to ensure a holistic design.
- **Security**: Never expose secrets or credentials in the code or PR description.
