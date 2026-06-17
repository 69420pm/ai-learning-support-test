---
name: implement-unit-test-for-issue
description: Use when for a given issue name or number unit tests need to get implemented.
---

### Objective
Write comprehensive, behavior-driven unit tests for a specific issue. Author the tests before the actual logic is implemented, ensuring they verify the correct contracts and behavior rather than implementation details.

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
   - Focus on testing *behavior* (contracts, inputs, outputs, errors) rather than implementation details (avoid unnecessary mocking of internal module functions).
   - Cover the following scenarios:
     - **Happy path**: Standard valid usage and input.
     - **Edge cases**: Empty inputs, boundary values, unexpected types.
     - **Error handling**: Proper exceptions or error values returned under failure states.

4. **Verify Test Failure (TDD Phase)**:
   - Run `make test` to verify that your new tests fail as expected (since the target code is not yet implemented).
   - Ensure the tests fail specifically due to missing functionality, not because of compilation or syntax errors.

5. **Verify Code Quality**:
   - Run `make typecheck && make lint` to ensure the new test code has no TypeScript errors or lint violations.
   - Fix any errors or warnings before committing.

6. **Commit and Save Your Work**:
   - Since tests are expected to fail at this stage (TDD red phase), do NOT use `make commit` (it runs `make check` internally which will fail on the failing tests).
   - Instead, stage and commit directly:
     ```bash
     git add . && git commit -m "test: add unit tests for issue #<issue_number>" --no-verify
     ```
   - Before committing, ensure step 5 (typecheck & lint) passed. Only test failures are expected and acceptable.
