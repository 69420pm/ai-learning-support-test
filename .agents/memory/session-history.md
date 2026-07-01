# Session History

This is a log of tasks completed, what failed, and what worked. Keep entries brief.

## [2026-07-01] Harness Refactoring
* **Goal:** Upgrade agent harness to support modular memory, rules, and global search.
* **Outcome:** Successfully revamped the agent harness. Decommissioned 10 legacy skills. Configured modular rules under `.agents/rules/` and routed them via `.agents/AGENTS.md`. Established a split memory system under `.agents/memory/`. Configured hierarchical `GEMINI.md` files for core/web. Installed `@mixedbread/mgrep` locally for workspace-wide command availability. Resolved SQLite test database race conditions during parallel Vitest runs by adding support for a customizable `DATABASE_PATH` env var. Run verification and committed changes.
