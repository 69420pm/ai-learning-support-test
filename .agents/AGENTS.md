# Workspace Rules for AI Learning Support

These rules apply to all agent operations in this workspace.

## 1. Modular Rules Routing
When performing specific tasks, you must read and adhere to the relevant rules:
* Coding/Implementation: Read [.agents/rules/coding-standards.md](file:///workspaces/secure-ai-learning-support/.agents/rules/coding-standards.md)
* Styling/UI: Read [.agents/rules/styling.md](file:///workspaces/secure-ai-learning-support/.agents/rules/styling.md)
* Specs/Docs: Read [.agents/rules/documentation-standards.md](file:///workspaces/secure-ai-learning-support/.agents/rules/documentation-standards.md)
* Git/Commits: Read [.agents/rules/git-workflow.md](file:///workspaces/secure-ai-learning-support/.agents/rules/git-workflow.md)

## 2. Autonomous Memory Loop (Read-First, Write-Last)
* **READ FIRST:** At the start of any task, check [.agents/memory/milestones-todos.md](file:///workspaces/secure-ai-learning-support/.agents/memory/milestones-todos.md) and [.agents/memory/architectural-decisions.md](file:///workspaces/secure-ai-learning-support/.agents/memory/architectural-decisions.md).
* **WRITE LAST:** Before finishing, update [.agents/memory/session-history.md](file:///workspaces/secure-ai-learning-support/.agents/memory/session-history.md) with session outcomes, and update architectural files if new decisions were finalized.

## 3. Local Verification Loop (The Ratchet)
* After any code change and before declaring a task complete, run `make check` (runs build, lint, typecheck, and test). Do not request user review or commit if `make check` fails.

## 4. Code Search Protocol
* Use `mgrep` for code search if `MXBAI_API_KEY` is present. Otherwise, fall back to native `grep_search`.
