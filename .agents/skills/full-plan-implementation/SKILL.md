---
name: full-plan-implementation
description: Use when a technical plan defined on GitHub needs to get implemented from start to finish via a single branch and PR.
---
### Objective
Manage the end-to-end lifecycle of implementing an entire plan using a streamlined, interface-first Test-Driven Development (TDD) workflow. You are the orchestrator agent responsible for coordinating the execution of multiple subagents on a single plan branch, starting with API contracts, stubs, and skipped test suites (Issue 1) and iteratively implementing code for subsequent child issues (Issues 2..N). Your role is sequencing, validation, and PR creation.

### Orchestrator Boundaries
- You are a **sequencing agent only**. Do NOT read source files, config files, or debug compilation errors yourself.
- After each task is committed, run `make check`. If `make check` fails:
  1. Capture the error output.
  2. Re-invoke the `implement-issue` subagent with the error output and ask it to fix the issue.
  3. Do NOT attempt to read files or edit code directly.
- Limit your own tool calls to: `make` commands, `DefineSubagent`, `InvokeSubagent`, and reading subagent messages.

### Step-by-Step Instructions

1. **Verify Environment**:
   - Run `make check-env` to ensure Git is active and the GitHub CLI is authenticated.

2. **Retrieve the Plan details**:
   - Run `make view-issue NUMBER=<parent_plan_issue_number>` to read the parent plan context and child issue numbers.
   - Save the full output.

3. **Create the Plan Branch**:
   - Create a branch named `plan-<parent_plan_issue_number>-<slug>` (e.g., `plan-42-local-document-upload`).
   - Run: `make create-branch NAME=plan-<parent_plan_issue_number>-<slug>`.

4. **Phase 1: API Contracts, Stubs & Skipped Test Suites (Issue 1)**:
   - Identify the Test Suite issue (Issue 1, which blocks all other issues).
   - Define a subagent with the following prompt:
     "Use the skill `implement-unit-test-for-issue` to write types, interfaces, stubs, and skipped unit tests for issue #<test_issue_number>.
      Here is the issue context:
      <paste the test issue details here>"
   - Wait for the subagent to complete. Verify that the unit tests are committed.
   - **Verification**: Human developer can pause to review the interfaces and test cases at this stage.

5. **Phase 2: Iterative Sequential Implementation (Issues 2..N)**:
   - For each remaining child issue in the plan, in blocking/sequence order:
     - Define a subagent with the following prompt:
       "Use the skill `implement-issue` to implement code for issue #<child_issue_number>.
        First un-skip the tests related to this issue, verify they fail locally, and write the simplest logic to make the tests pass.
        Verify with `make test`. Commit the changes locally using `make commit MSG=\"impl: resolve issue #<child_issue_number>\"`.
        Here is the issue context:
        <paste child issue details here>"
     - Wait for the subagent to complete.
     - **Verification**: Run `make check` locally. If `make check` fails, re-invoke the `implement-issue` subagent with the error log and ask it to correct the code. Do not proceed until `make check` is green.

6. **Phase 3: Push and Open One PR**:
   - Run `make push` to push the unified branch to the remote repository.
   - Create a single parent Pull Request linking the plan and child issues:
     ```bash
     make create-pr TITLE="plan: resolve issue #<parent_plan_issue_number>" BODY="Resolves #<parent_plan_issue_number>"
     ```
   - Capture the PR number returned in the command output.

7. **Phase 4: Unified PR Review**:
   - Define a subagent with the following prompt:
     "Use the skill `review-pr` with this PR number: <pr_number>."
   - Wait for the review to complete. If the reviewer identifies **Critical** severity issues, re-invoke the `implement-issue` subagent to fix them.
