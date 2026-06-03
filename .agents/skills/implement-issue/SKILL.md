---
name: implement-issue
description: Use when a given issue name or number needs to get implemented.
---

### Objective
Implement the requested feature or fix based strictly on the provided issue definition and existing unit tests. Focus on writing the simplest, cleanest implementation that passes the existing test suite, and commit your work using the repository pipeline.

### Step-by-Step Instructions

1. **Retrieve the Issue Details**:
   - Run the command `make get-issue NUMBER=<issue_number>` (replace `<issue_number>` with the target issue number) to load the issue description, context, and requirements.
   - If only an issue name was provided, search the repository issues or query the user to find the issue number.

2. **Understand the Requirements & Existing Tests**:
   - Review the issue details carefully, identifying the list of files to modify and the specific tasks.
   - Inspect the existing test files related to the issue (e.g., `*.test.ts` or `*.spec.ts`). These tests serve as your contract and guidance. Do not modify the test code itself unless the issue explicitly specifies doing so.

3. **Implement the Code**:
   - Implement the code changes in the files identified by the issue.
   - Write the simplest, most boring, and straightforward solution. Avoid speculative coding, overcomplication, or adding features not requested.
   - Adhere strictly to clean code principles: proper naming, type-safety, and biome styling standards.

4. **Verify the Implementation**:
   - Run `make test` to run the test suite and verify that the tests for this issue are now passing.
   - If any test fails, analyze the test failure and adjust your implementation. Repeat this step until all tests pass.

5. **Run Monorepo Quality Checks**:
   - Run `make check` to verify linting, formatting, building, and type-safety across all packages in the monorepo.
   - Fix any type errors, linting issues, or formatting issues.

6. **Commit and Save Your Work**:
   - Run `make commit MSG="impl: resolve issue #<issue_number>"` to validate and commit your changes.
   - If the commit fails due to validation errors, fix the issues in your code and run the command again.
