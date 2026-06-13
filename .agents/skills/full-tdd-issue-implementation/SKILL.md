---
name: full-tdd-issue-implementation
description: Use when an issue defined on github needs to get implemented from start to finish (pr) using test-driven development (TDD) principles.
---
### Objective
Manage the end-to-end lifecycle of implementing an issue using Test-Driven Development (TDD). You will create a feature branch, orchestrate unit test creation, code implementation, verification, and open a Pull Request for review.

### Step-by-Step Instructions

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
