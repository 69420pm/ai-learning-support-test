---
name: review-pr
description: Review a GitHub Pull Request against standards and the implementation plan.
---

Review a Pull Request strictly without making code changes.

1. Access the PR via the GitHub CLI: `gh pr diff <number>` and `gh pr view <number>`.
2. Review against: The original implementation plan, `CONTRIBUTING.md`, `rules/coding-style.md`, `rules/testing.md`, and architectural rules (feature isolation).
3. Check for:
   - Type safety (no `any`)
   - Test coverage and co-location
   - Architectural compliance
   - Import hygiene
4. Provide findings directly on GitHub using `gh pr review <number> --comment --body "..."` or `gh pr comment`.
5. Classify severity: 🔴 Blocking / 🟡 Suggestion / 🟢 Nitpick.
6. Do NOT auto-approve, auto-merge, or attempt to make code changes yourself.
