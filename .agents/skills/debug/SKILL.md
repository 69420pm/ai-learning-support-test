---
name: debug
description: Investigate and fix a bug report or error.
---

Investigate and fix a bug or error.

1. Workflow: Reproduce → Isolate → Root-cause → Fix → Add regression test.
2. Start by reading the error messages and relevant code. Do not jump to conclusions without reading the context.
3. Once the fix is identified, write the fix and add a test that would have caught the bug.
4. Commit using `fix(scope): description`.
5. Run `make check` to ensure the fix didn't break anything else.
