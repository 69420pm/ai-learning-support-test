# Testing Guidelines

- **Co-location**: Unit tests must reside next to the code they verify (e.g., `foo.test.ts` next to `foo.ts`).
- **Framework**: We use Vitest. Structure tests using `describe` for grouping and `it` for specific assertions.
- **Mocking**: Minimize mocking. Prefer real implementations or lightweight in-memory fakes unless interacting with heavy external systems.
- **Database Tests**: Use the `DATABASE_PATH` environment variable to isolate SQLite databases during parallel tests.
- **What to Test**: Focus on business logic, math/algorithms (e.g., FSRS), and edge cases. Do not test framework boilerplate (e.g., testing that Next.js routing works).
