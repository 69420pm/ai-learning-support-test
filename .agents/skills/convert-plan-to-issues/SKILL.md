---
name: convert-plan-to-issues
description: Use when you need to convert an implementation plan into individual, atomic GitHub issues.
---

### Objective
Deconstruct a high-level technical implementation plan into a series of independent, atomic, and actionable GitHub issues. One large parent issue is created for the plan itself, and all individual task issues are created as native subissues (child issues) of this parent. Establish native dependencies (blocking/blocked-by relationships) between the subissues.

### Step-by-Step Instructions

1. **Locate the Plan**:
   - Read the target implementation plan from the `specs/plan/` directory.

2. **Create the Parent Issue**:
   - Create one large parent issue to represent the implementation plan. The title should be `Plan: [Plan Name]`.
   - The body of this parent issue should summarize the overall plan goals and link to or contain the plan document.
   - Run the command to create it using the [Makefile](file:///Users/kevinsmith/Documents/development/typescript/ai-learning-support/Makefile):
     ```bash
     make create-issue TITLE="Plan: [Plan Name]" BODY_FILE="specs/plan/[plan-file].md" LABEL="epic"
     ```
   - Capture the issue number or URL of the created parent issue from the command output.

3. **Deconstruct the Plan into Atomic Issues**:
   - Divide the plan into sequential, manageable parts.
   - **IMPORTANT**: Every issue must be an atomic unit of work that has all relevant context contained within it. It must be completely understandable what to do without requiring external search or referencing other non-code files. This means you MUST explicitly copy/define all relevant data contracts, API signatures, Drizzle schemas, file layouts, and visual rules directly into the implementation details of the issue body.
   - **Mandatory First Issue (Issue 1)**: You MUST define the first subissue as `Issue 1: API Contracts, Stubs & Skipped Test Suites for [Plan Name]`. This issue covers:
     - Creating all necessary shared type and interface files.
     - Scaffolding all stub classes/functions (methods must return dummy data or throw a "Not implemented" error) to guarantee the codebase compiles without type-check errors.
     - **Explicit Type & Stub Contracts**: The issue body of Issue 1 MUST include the exact code blocks for the interfaces, types, class properties, and stub method signatures (with dummy return structures or throws) that need to be created. Do not leave the implementation of contracts/stubs up to guesswork.
     - Creating all test files containing the planned test suites, with every test block marked as **skipped or todo** (e.g. `describe.skip`, `it.skip`, or `it.todo` in Vitest/Jest) so that test runners pass (exit code 0) and do not block build pipelines or pre-commit hooks (`lefthook`).
   - **Subsequent Issues (Issues 2..N)**: For each subsequent child issue, write a clear title and draft the body following [atomic_issue.md](.github/ISSUE_TEMPLATE/atomic_issue.md).
     - **Complete Implementation Details**: The body of subsequent issues must specify the exact technical expectations, database columns, path formulas, API response formats, and architectural decisions, so they can be implemented independently.
     - **Mandatory First Task in Issues 2..N**: You MUST list the first task of every implementation issue as un-skipping the relevant test block: *"1. Un-skip the relevant tests in `[test-file-path]` (remove `.skip` or `.todo` modifiers) and verify they fail locally."*
   - All subsequent implementation issues (Issues 2..N) MUST be blocked by `Issue 1: API Contracts, Stubs & Skipped Test Suites` and any other direct technical dependencies.

4. **Define Relationships**:
   - Identify parent/child and sequence dependencies:
     - **Parent/Child**: All task issues must have the plan's parent issue as their native parent.
     - **Subissue Dependencies**: Ensure all implementation issues are blocked by Issue 1. Identify any additional dependencies among Issues 2..N.
   - Capture the issue numbers of previously created subissues to link dependencies natively.

**Checkpoint**: Before proceeding to submit the issues to GitHub, present the list of proposed issues to the user (showing their titles, files to modify, dependencies, and rationale summaries). Do NOT call any issue creation commands until the user reviews and confirms they are correct.

5. **Submit the Subissues**:
   - For each subissue, call the `make create-issue` command passing the parent and any dependency parameters:
     ```bash
     make create-issue TITLE="Issue Title" BODY_FILE="path/to/issue_body.md" PARENT="[parent-number-or-url]" [BLOCKED_BY="[issue-number-or-url]"] [BLOCKING="[issue-number-or-url]"] [LABEL="optional-label"]
     ```
   - Ensure you pass the exact title, the path to a temporary file containing the populated template body, and the correct parameters for blocked_by (`Depends On` section in issue template) and blocking (`Blocks` section in issue template) relationships, as well as the parent issue defined before.
     For implementation issues, ensure `BLOCKED_BY` includes the test suite issue number.
