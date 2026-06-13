---
name: full-issue-implementation
description: Use when an issue defined on github needs to get implemented from start to finish (pr).
---
### Objective
Manage the end-to-end lifecycle of implementing an issue using Test-Driven Development (TDD). You are the orchestrator agent responsible for coordinating the calling of multiple subagents to handle different phases of the implementation process, including unit test creation, code implementation, opening a pull request, and managing the review process. However you are not responsible for directly implementing code or writing tests or understanding issue details, or understanding the project structure. Your role is to ensure the correct sequence of steps are followed, and to call the appropriate subagents with the correct parameters at each phase of the process.

### Step-by-Step Instructions 
IMPORTANT: FOLLOW THESE STEPS CLOSELY AND IN ORDER, NO DIGGING AROUND IN THE PROJECT OR GIT. EVERY MAKE COMMAND EXISTS CORRECTLY AS DEFINED IN THE STEPS BELOW, AND ALL SUBAGENTS ARE FULLY CAPABLE OF HANDLING THEIR TASKS WITHOUT YOUR INTERVENTION. YOUR ROLE IS PURELY ORCHESTRATION AND SEQUENCING.

1. **Verify Environment**:
   - Run `make check-env` to ensure Git is active and the GitHub CLI is authenticated.

2. **Retrieve the Issue Details**:
   - Run `make view-issue NUMBER=<issue_number>` to read the issue context and requirements.

3. **Create the Feature Branch**:
   - Run `make create-branch NAME=fix-issue-<issue_number>` to create and switch to a feature branch.

4. **TDD Phase 1: Write Unit Tests**:
   - Define a subagent with the following prompt: "Use the skill `implement-unit-test-for-issue` with this issue number: <issue_number>."
   - Wait for the subagent to complete, ensuring unit tests are written and committed.

5. **TDD Phase 2: Implement Code**:
   - Define a subagent with the following prompt: "Use the skill `implement-issue` with this issue number: <issue_number>."
   - Wait for the subagent to complete, ensuring code is implemented to pass the tests.

6. **Synchronize & Validate**:
   - Run `make sync-branch` to fetch and merge changes from the remote base branch.
   - Run `make check` to run tests and linters to verify everything passes locally.

7. **Push and Open PR**:
   - Run `make push` to push the branch to the remote repository.
   - Create a Pull Request by running:
     ```bash
     make create-pr TITLE="fix: resolve issue #<issue_number>" BODY="Closes #<issue_number>"
     ```
   - Capture the PR number returned in the command output.

8. **Orchestrate PR Review**:
   - Define a subagent with the following prompt: "Use the skill `review-pr` with this PR number: <pr_number>."
   - Wait for the review to complete. Address any critical issues if identified.








- make check
- make test
- unit test is adding by himself and not correclty commiting i think
- implement issue is missing some make commands definitions
  - pnpm install
