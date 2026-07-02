---
name: cleanup
description: Refactor code to simplify, remove dead code, fix DRY violations, or restructure.
---

Refactor the codebase to address technical debt.

1. Scope: Actual code changes only (simplification, dead code removal, DRY violations, restructuring). For missing docs or tests, use the `audit` skill instead.
2. Two-Phase Approach:
   - Audit the code and propose specific refactoring changes to the user.
   - Implement the changes ONLY after user confirmation.
3. Follow project rules for simplicity and lean code (`rules/project-rules.md`, `rules/coding-style.md`).
4. Must run `pnpm check` after any changes to guarantee nothing is broken.
