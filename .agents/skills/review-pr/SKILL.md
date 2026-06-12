---
name: review-pr
description: Use when you get a github pull request number you should review.
---

### Objective
Act as a highly critical pull request reviewer aiming for flawless code in terms of bugs, simplicity, maintainability, extensibility, and test coverage. Retrieve the PR details, checkout the PR branch locally to validate it, and document all findings in a structured PR review markdown report.

### Step-by-Step Instructions

1. **Retrieve PR Information**:
   - Run the command `make get-pr NUMBER=<pr_number>` (replace `<pr_number>` with the pull request number) to view the PR description, comments, and the complete git diff of the changes.

2. **Checkout PR Branch Locally**:
   - Run the command `make checkout-pr NUMBER=<pr_number>` to check out the branch associated with the PR locally.

3. **Verify the PR Locally**:
   - Run the validation command `make check` on the PR branch.
   - Note if there are any build failures, TypeScript compiler errors, biome format or linting issues, or failing vitest tests.

4. **Critique the Code Changes**:
   - Carefully inspect the diff across the following dimensions:
     - **Bugs & Edge Cases**: Identify potential runtime errors, unhandled promise rejections, type safety loopholes, resource leaks, or missing boundary checks.
     - **Simplicity & Readability**: Identify overengineered logic, complex abstractions, poor naming conventions, or dead/commented-out code.
     - **Maintainability & Extensibility**: Ensure changes follow SOLID/clean code principles. Verify if components are cohesive and loosely coupled.
     - **Testing**: Confirm that new features or bug fixes are accompanied by tests. Check that existing tests were not modified to hide regressions.

5. **Generate the PR Review Report**:
   - Create a new markdown file in the `specs/pr-reviews/` folder.
   - Name the file: `specs/pr-reviews/YYYY-MM-DD-pr-<pr_number>-review.md` (e.g., `2026-06-03-pr-42-review.md`).
   - Populate the report by strictly following the template in [PR_REVIEW_TEMPLATE.md](file:///Users/kevinsmith/Documents/development/typescript/ai-learning-support/specs/pr-reviews/PR_REVIEW_TEMPLATE.md).
   - Be objective, highly critical, direct, and professional. Ensure all feedback is actionable and includes code snippets or line references where applicable. Classify issues by severity: **Critical**, **Major**, or **Minor / Nitpicks**.

6. **State the Verdict**:
   - Summarize your review findings to the user and state your final verdict: **Approve**, **Request Changes**, or **Comment**.
   - Provide a clickable file link to your review report.
