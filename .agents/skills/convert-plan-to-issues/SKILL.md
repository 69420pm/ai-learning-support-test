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
   - **Mandatory First Issue (Issue 1)**: You MUST define the first subissue as `Issue 1: Test Suite & Scaffolding for [Plan Name]`. This issue covers creating all the necessary test files, interface definitions, and failing test blocks for the plan.
   - For each subsequent child issue (Issues 2..N), write a clear title and draft the body following [atomic_issue.md](.github/ISSUE_TEMPLATE/atomic_issue.md).
   - All subsequent implementation issues (Issues 2..N) MUST be blocked by `Issue 1: Test Suite & Scaffolding`.

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
