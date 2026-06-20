---
name: implement-issue
description: Use when a given issue name or number needs to get implemented.
---

### Objective
Implement the requested feature or fix based strictly on the provided issue definition and existing unit tests. Focus on writing the simplest, cleanest implementation that passes the existing test suite, and commit your work using the repository pipeline.

### Boundaries
- Do NOT read or inspect the Makefile, git-workflow.sh, or any files under `.agents/`.
- Do NOT run exploratory commands (`Find`, `git log`, `git diff`) beyond the files identified in the issue.
- Do NOT run `make check` independently — it is already run automatically by `make commit`.
- Do NOT run `make test` more than 3 times total. If tests still fail after 3 attempts, stop and report the failure.
- Do NOT install dependencies using raw `pnpm install`. Use `make setup` if needed.
- Do NOT push branches or create PRs when running as a subagent. Commit locally and stop.

### Step-by-Step Instructions

1. **Retrieve the Issue Details**:
   - If the issue context was provided in your prompt, use that directly. Do NOT call `make view-issue`.
   - Only run `make view-issue NUMBER=<issue_number>` if you were invoked standalone without issue context.

2. **Understand the Requirements & Existing Tests**:
   - Review the issue details carefully, identifying the list of files to modify and the specific tasks.
   - Inspect the existing test files related to the issue (e.g., `*.test.ts` or `*.spec.ts`). These tests serve as your contract and guidance. Do not modify the test code itself unless the issue explicitly specifies doing so.

3. **Implement the Code**:
   - Implement the code changes in the files identified by the issue.
   - Write the simplest, most boring, and straightforward solution. Avoid speculative coding, overcomplication, or adding features not requested.
   - Adhere strictly to clean code principles, type-safety, and biome styling standards as defined in [CONTRIBUTING.md](file:///Users/kevinsmith/Documents/development/typescript/ai-learning-support/CONTRIBUTING.md#core-engineering-standards).

4. **Verify the Implementation**:
   - Run `make test` to verify that the tests for this issue pass.
   - If any test fails, fix and re-run `make test` — but do not run it more than 3 times total. If tests still fail after 3 attempts, stop and report the failure.

5. **Commit and Save Your Work**:
   - Run `make commit MSG="impl: resolve issue #<issue_number>"` to validate and commit your changes.
   - Ensure the commit message follows the Conventional Commits format as defined in [CONTRIBUTING.md](file:///Users/kevinsmith/Documents/development/typescript/ai-learning-support/CONTRIBUTING.md#commit-message-standard).
   > [!NOTE]
   > `make commit` already runs `make check` internally before committing.
   > Do NOT run `make check` separately before `make commit` — it doubles the work.
   - If the commit fails due to validation errors, fix the issues in your code and run the command again.

6. **Push and Open a PR (Conditional)**:
   > [!IMPORTANT]
   > **If you are running as a subagent** under a coordinator like `full-plan-implementation`, **DO NOT** push the branch or create a Pull Request. Simply commit your work locally, stop, and report completion back to the parent agent.
   
   If you are running standalone directly for the user:
   - Push your branch to the remote repository by running:
     ```bash
     make push
     ```
   - Open a Pull Request (PR) linking it to the original issue:
     ```bash
     make create-pr TITLE="impl: resolve issue #<issue_number>" BODY="Closes #<issue_number>"
     ```
