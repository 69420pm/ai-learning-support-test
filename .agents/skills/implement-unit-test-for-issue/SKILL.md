---
name: implement-unit-test-for-issue
description: Use when writing test suite scaffolding (Issue 1) for a technical plan.
---

### Objective
Write comprehensive, behavior-driven unit tests and scaffolding for the plan's interface issue (Issue 1). Author the tests before the actual business logic is implemented, defining expected contracts and signatures.

### Boundaries
- Do NOT read or inspect the Makefile, git-workflow.sh, or any files under `.agents/`.
- Do NOT run `Find` commands across the entire workspace. Limit file discovery to the specific package directory mentioned in the issue.
- Do NOT run `make check` — tests are expected to fail at this TDD phase, which would cause `make check` to fail.
- Do NOT explore vitest configuration files, turbo.json, or build tooling. Assume the test runner works.
- Do NOT push branches or create PRs. Commit locally and report completion.

### Step-by-Step Instructions

1. **Retrieve the Issue Details**:
   - If the issue context was provided in your prompt, use that directly. Do NOT call `make view-issue`.
   - Only run `make view-issue NUMBER=<issue_number>` if you were invoked standalone without issue context.

2. **Locate or Create the Test File**:
   - Determine which package and file the code will reside in.
   - Locate the corresponding test file (e.g., `src/path/to/module.test.ts`). If no test file exists, create a new one in the same directory as the source file.

3. **Design and Write Unit Tests**:
   - Write comprehensive tests that map directly to the acceptance criteria defined in the issue.
   - Adhere strictly to the testing standards (test placement, Vitest conventions) defined in [CONTRIBUTING.md](file:///Users/kevinsmith/Documents/development/typescript/ai-learning-support/CONTRIBUTING.md#unit-testing--verification).
   - Focus on testing *behavior* (contracts, inputs, outputs, errors) rather than implementation details (avoid unnecessary mocking of internal module functions).
   - Cover the following scenarios:
     - **Happy path**: Standard valid usage and input.
     - **Edge cases**: Empty inputs, boundary values, unexpected types.
     - **Error handling**: Proper exceptions or error values returned under failure states.
   - **Mark as Skipped/Todo**: You MUST mark all test suites and test cases as skipped or todo (`describe.skip()`, `it.skip()`, or `it.todo()` in Vitest/Jest). This ensures they compile and outline the target contract, but do not fail the build or pre-commit checks (`lefthook`).

4. **Verify Test Failure (TDD Verification)**:
   - To verify the tests compile and run: run `make test`. You should see the tests marked as skipped, with 0 failures.
   - To verify test correctness: temporarily un-skip one test block (remove `.skip`), run `pnpm vitest run [test-file]`, and check that it fails specifically due to the stub's missing functionality (e.g. `"Not implemented"` error).
   - Re-skip the test block before proceeding to commit.

5. **Verify Code Quality**:
   - Run `make lint` to ensure the new test code has no lint violations or formatting issues.
   - Fix any errors or warnings before committing.

6. **Commit and Save Your Work**:
   - Run `make typecheck` and `make lint` to ensure everything compiles and lints correctly.
   - Stage and commit your changes:
     ```bash
     git add . && git commit -m "test: add skipped unit tests and stubs for issue #<issue_number>"
     ```
   - Ensure the commit message follows the Conventional Commits format as defined in [CONTRIBUTING.md](file:///Users/kevinsmith/Documents/development/typescript/ai-learning-support/CONTRIBUTING.md#commit-message-standard).
   - Do NOT use `--no-verify` unless there are environment-specific problems. The pre-commit hook will pass because the tests are skipped.
