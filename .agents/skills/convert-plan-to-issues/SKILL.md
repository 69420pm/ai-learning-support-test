---
name: convert-plan-to-issue
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
   - Run the command to create it using the [Makefile]:
     ```bash
     make generate-issue TITLE="Plan: [Plan Name]" BODY_FILE="specs/plan/[plan-file].md" LABEL="epic"
     ```
   - Capture the issue number or URL of the created parent issue from the command output.

3. **Deconstruct the Plan into Atomic Issues**:
   - Divide the plan into sequential, manageable parts. Each part must represent a single, atomic unit of work that can be implemented and tested independently.
   - For each issue, write a clear title and draft the body following [atomic_issue.md](.github/ISSUE_TEMPLATE/atomic_issue.md).

4. **Define Relationships**:
   - Identify parent/child and sequence dependencies:
     - **Parent/Child**: All task issues must have the plan's parent issue as their native parent.
     - **Subissue Dependencies**: Identify which subissues block or are blocked by other subissues (e.g., Subissue B cannot start until Subissue A is done).
   - Capture the issue numbers of previously created subissues to link dependencies natively.

5. **Submit the Subissues**:
   - For each subissue, call the `make generate-issue` command passing the parent and any dependency parameters:
     ```bash
     make generate-issue TITLE="Issue Title" BODY_FILE="path/to/issue_body.md" PARENT="[parent-number-or-url]" [BLOCKED_BY="[issue-number-or-url]"] [BLOCKING="[issue-number-or-url]"] [LABEL="optional-label"]
     ```
   - Ensure you pass the exact title, the path to a temporary file containing the populated template body, and the correct relationship parameters.
