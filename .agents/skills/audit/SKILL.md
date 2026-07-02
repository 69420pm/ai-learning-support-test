---
name: audit
description: Audit codebase for meta-quality (missing tests, missing docs, coverage gaps, stale deps).
---

Audit the codebase for meta-quality issues, without making code changes.

1. Scope: Everything *around* the code — missing tests, missing documentation, outdated dependencies, stale TODOs, and test coverage gaps.
2. This skill produces a report artifact. It does NOT make code changes. (For refactoring, use the `cleanup` skill).
3. Output findings grouped by category and prioritized by impact.
4. Suggestion: The report may recommend follow-ups like "run `cleanup` to address these refactoring targets" or "add tests for these files via `tdd-implement`".
