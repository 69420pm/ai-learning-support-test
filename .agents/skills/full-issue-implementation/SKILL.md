---
name: full-issue-implementation
description: Use when an issue defined on github needs to get implemented from start to finish (pr).
---
### Objective
Manage the end-to-end lifecycle of implementing an issue using Test-Driven Development (TDD). You are the orchestrator agent responsible for coordinating the calling of multiple subagents to handle different phases of the implementation process, including unit test creation, code implementation, opening a pull request, and managing the review process. However you are not responsible for directly implementing code or writing tests or understanding issue details, or understanding the project structure. Your role is to ensure the correct sequence of steps are followed, and to call the appropriate subagents with the correct parameters at each phase of the process.

### Orchestrator Boundaries
- You are a **sequencing agent only**. Do NOT read source files, config files, or debug compilation errors yourself.
- If `make check` fails after the subagents complete:
  1. Capture the error output.
  2. Re-invoke the `implement-issue` subagent with the error output and ask it to fix the issue.
  3. Do NOT attempt to read files or edit code directly.
- If `make sync-branch` introduces merge conflicts or new errors, delegate resolution to a subagent — do not resolve it yourself.
- Limit your own tool calls to: `make` commands, `DefineSubagent`, `InvokeSubagent`, and reading subagent messages.

### Step-by-Step Instructions
IMPORTANT: FOLLOW THESE STEPS CLOSELY AND IN ORDER, NO DIGGING AROUND IN THE PROJECT OR GIT. EVERY MAKE COMMAND EXISTS CORRECTLY AS DEFINED IN THE STEPS BELOW, AND ALL SUBAGENTS ARE FULLY CAPABLE OF HANDLING THEIR TASKS WITHOUT YOUR INTERVENTION. YOUR ROLE IS PURELY ORCHESTRATION AND SEQUENCING.

1. **Verify Environment**:
   - Run `make check-env` to ensure Git is active and the GitHub CLI is authenticated.

2. **Retrieve the Issue Details**:
   - Run `make view-issue NUMBER=<issue_number>` to read the issue context and requirements.
   - Save the full output — you will pass it to subagents verbatim.

3. **Create the Feature Branch**:
   - Run `make create-branch NAME=fix-issue-<issue_number>` to create and switch to a feature branch.

4. **TDD Phase 1: Write Unit Tests**:
   - Define a subagent with the following prompt:
     "Use the skill `implement-unit-test-for-issue` to write tests for issue #<issue_number>.
      Here is the full issue context (do NOT call `make view-issue` yourself):
      <paste the full issue output here>"
   - Wait for the subagent to complete, ensuring unit tests are written and committed.

5. **TDD Phase 2: Implement Code**:
   - Define a subagent with the following prompt:
     "Use the skill `implement-issue` to implement issue #<issue_number>.
      Here is the full issue context (do NOT call `make view-issue` yourself):
      <paste the full issue output here>"
   - Wait for the subagent to complete, ensuring code is implemented to pass the tests.

6. **Synchronize & Validate**:
   - Run `make sync-branch` to fetch and merge changes from the remote base branch.
   - Run `make check` to run tests and linters to verify everything passes locally.
   - If `make check` fails, delegate the fix to a subagent (re-invoke `implement-issue` with the error output). Do NOT debug it yourself.

7. **Push and Open PR**:
   - Run `make push` to push the branch to the remote repository.
   - Create a Pull Request by running:
     ```bash
     make create-pr TITLE="fix: resolve issue #<issue_number>" BODY="Closes #<issue_number>"
     ```
   - Capture the PR number returned in the command output.

8. **Orchestrate PR Review (Optional for small changes)**:
   > [!NOTE]
   > The PR review step is **optional** for small issues. Skip it if the diff touches fewer than 5 files and no new architectural patterns are introduced.

   - If a review is warranted, define a subagent with the following prompt:
     "Use the skill `review-pr` with this PR number: <pr_number>."
   - Wait for the review to complete. If the reviewer identifies **Critical** severity issues, re-invoke the `implement-issue` subagent to fix them. Do not fix issues yourself.
