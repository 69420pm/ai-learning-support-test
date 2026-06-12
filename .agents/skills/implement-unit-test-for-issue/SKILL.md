---
name: implement-unit-test-for-issue
description: Use when for a given issue name or number unit tests need to get implemented.
---

### Objective
Write comprehensive, behavior-driven unit tests for a specific issue. Author the tests before the actual logic is implemented, ensuring they verify the correct contracts and behavior rather than implementation details.

### Step-by-Step Instructions

1. **Retrieve the Issue Details**:
   - Run the command `make get-issue NUMBER=<issue_number>` (replace `<issue_number>` with the target issue number) to view the issue context, goals, and acceptance criteria.
   - If only an issue name was provided, search the repository issues or query the user to find the issue number.

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

5. **Run Lint and Typecheck**:
   - Run `make check` to ensure the new test code conforms to biome formatting, lint rules, and passes TypeScript typechecking.
   - Fix any errors or warnings.

6. **Commit and Save Your Work**:
   - Save your test suite by running `make commit MSG="test: add unit tests for issue #<issue_number>"`.
   - If the commit fails, resolve any validation errors and rerun the command.
