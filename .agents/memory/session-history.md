# Session History

This is a log of tasks completed, what failed, and what worked. Keep entries brief.

## [2026-07-01] Harness Refactoring
* **Goal:** Upgrade agent harness to support modular memory, rules, and global search.
* **Outcome:** Successfully revamped the agent harness. Decommissioned 10 legacy skills. Configured modular rules under `.agents/rules/` and routed them via `.agents/AGENTS.md`. Established a split memory system under `.agents/memory/`. Configured hierarchical `GEMINI.md` files for core/web. Installed `@mixedbread/mgrep` locally for workspace-wide command availability. Resolved SQLite test database race conditions during parallel Vitest runs by adding support for a customizable `DATABASE_PATH` env var. Run verification and committed changes.

## [2026-07-01] mgrep Tool Verification
* **Goal:** Test if `mgrep` can be executed.
* **Outcome:** Verified that `mgrep` is installed locally via `@mixedbread/mgrep` in `node_modules/.bin/mgrep`. Confirmed it is not in the system `PATH`. Since `MXBAI_API_KEY` is not set in the environment, running search commands prompts for an interactive login. In accordance with the Workspace Rules, fallback to native `grep_search` is appropriate under these conditions.

## [2026-07-02] Architecture Documentation Restructuring
* **Goal:** Reorganize the massive `specs/system_architecture.md` into a more AI-friendly, modular structure.
* **Outcome:** Created `specs/architecture/` folder. Replaced `system_architecture.md` with a high-level `index.md`, `adapters_and_storage.md`, and `data_models.md`. Moved future cloud transition plans to `specs/adrs/001-cloud-scale-up-strategy.md`. Pushed feature-specific details to local READMEs in `apps/web/README.md` and `packages/core/README.md`.

## [2026-07-02] Direct mgrep Execution Configuration
* **Goal:** Enable running `mgrep` directly from terminal without requiring `pnpm mgrep`.
* **Outcome:** Created an executable wrapper at `/home/vscode/.local/bin/mgrep` (which is in user `$PATH`) that invokes `node_modules/.bin/mgrep` or `npx @mixedbread/mgrep`. Updated `.devcontainer/setup.sh` so future devcontainer environment setups maintain direct `mgrep` command access automatically.

## [2026-07-02] Commit All Current Changes
* **Goal:** Commit all staged and unstaged workspace changes.
* **Outcome:** Logged session history update and committed all refactored harness rules, skills, memory structure, and restructured specs documentation to git. Successfully pushed branch `setup-harness-like-ecc` to remote `origin`.
