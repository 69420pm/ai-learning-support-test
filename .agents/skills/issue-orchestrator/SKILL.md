---
name: issue-orchestrator
description: "Orchestrate the sequential implementation of multiple issues across isolated git worktrees with automated subagents and consolidated PRs."
disable-model-invocation: true
---

# Issue Orchestrator

Sequentially orchestrates the end-to-end implementation of GitHub issues by grouping related issues into epic worktrees, building dependency DAGs, invoking the [`implementer`](.agents/agents/implementer/agent.md) subagent along the unblocked frontier, and opening consolidated pull requests.

## Workflow

### 1. Issue Discovery & Clustering

1. **Discover target issues:**
   - **Explicit input:** If the user provides issue numbers, a parent spec, or a Wayfinder map (e.g. `/issue-orchestrator 12 14 15` or `/issue-orchestrator #40`), fetch details via:
     ```bash
     gh issue view <id> --json number,title,body,labels,state,parent,subIssues,subIssuesSummary,blockedBy,blocking
     ```
     If the target issue has native sub-issues (`subIssues`), automatically resolve all open child sub-issues for orchestration.
   - **Autonomous discovery:** If invoked with no arguments in a fresh tab, query open unassigned issues with the `ready-for-agent` triage label:
     ```bash
     gh issue list --state open --label ready-for-agent --json number,title,body,labels,assignees,parent,blockedBy,blocking
     ```
   - If no actionable issues exist, inform the user and exit cleanly.

2. **Cluster into cohesive batches:**
   - **Parent epic / map:** Group issues sharing a native parent (`parent.number` / `parent.title` or Wayfinder map) under `epic-<map-or-parent-slug>`.
   - **Domain tags / scopes:** Group loose issues sharing a domain label (e.g. `domain:*`) or title scope (`feat(kg):`) under `epic-<domain-slug>`.
   - **Standalone:** Treat isolated, unrelated tickets as individual batches (`fix-issue-<id>` or `feat-<slug>`).

---

### 2. Dependency Resolution & Ordering

For each batch:

1. **Parse dependency edges:**
   - Inspect native GitHub blockers (`blockedBy` list from `--json blockedBy`) and fall back to explicit `Blocked by: #...` lines in the issue body for legacy tickets.
2. **Construct Topological DAG:**
   - Sort tickets blockers-first.
   - Identify the **unblocked frontier** (tickets whose `blockedBy` issues are all closed/completed).
   - Sequence independent tickets in logical order.

---

### 3. Worktree Isolation Setup

For each epic/domain batch:

1. **Check existing worktree/branch state:**
   - Check if `.worktrees/epic-<slug>` or branch `epic-<slug>` already exists.
   - If it exists with clean uncompleted state, resume from the uncompleted frontier. If dirty/conflicted, confirm with user before proceeding.
2. **Create fresh worktree:**
   ```bash
   git fetch origin main
   git worktree add -b epic-<slug> .worktrees/epic-<slug> origin/main
   ```
3. **Initialize dependencies:**
   - Run `pnpm install` inside `.worktrees/epic-<slug>` to ensure `node_modules/` are populated and ready for subagent test/typecheck runs.

---

### 4. Sequential Implementer Subagent Execution

Process tickets along the topological frontier one by one:

1. **Claim the ticket:**
   ```bash
   gh issue edit <issue_number> --add-assignee @me --remove-label ready-for-agent
   gh issue comment <issue_number> --body "🚀 Orchestrator starting implementation in branch \`epic-<slug>\`"
   ```

2. **Spawn [`implementer`](.agents/agents/implementer/agent.md) Subagent:**
   - Invoke the `implementer` subagent with:
     - Issue number, title, and body acceptance criteria.
     - Working directory targeting `.worktrees/epic-<slug>`.
     - Instructions to follow `/tdd`, write tests, commit Conventional Commits directly to `epic-<slug>`, and run typechecks.

3. **Handle completion or failure (Fail-Fast Gate):**
   - **On Success:** Proceed to the next unblocked ticket in the batch queue.
   - **On Failure:** 
     - Halt the current batch immediately. Do not proceed to downstream dependent tickets.
     - Add `needs-info` or `ready-for-human` label:
       ```bash
       gh issue edit <issue_number> --add-label ready-for-human --remove-assignee @me
       gh issue comment <issue_number> --body "❌ Implementation halted: <reason/test failure details>"
       ```
     - Notify the user with exact failure diagnostics.

---

### 5. Epic Validation Gate & Pull Request

Once all tickets in a batch succeed:

1. **Run Epic Validation Gate:**
   - Run `pnpm check` once inside `.worktrees/epic-<slug>` to verify end-to-end build, linting, typechecks, and tests across all integrated commits.

2. **Push & Create Consolidated Pull Request:**
   ```bash
   cd .worktrees/epic-<slug>
   git push origin epic-<slug>
   gh pr create --title "feat(<scope>): <epic description>" --body "<PR body template>"
   ```

3. **PR Body Format (per `rules/git-workflow.md`):**
   ```markdown
   ## Summary

   Consolidated implementation for epic <slug>.
   Closes #<issue_1>
   Closes #<issue_2>

   ## Changes

   - <Summary of changes from ticket 1>
   - <Summary of changes from ticket 2>

   ## Definition of Done

   - [x] All acceptance criteria for #<issue_1> verified
   - [x] All acceptance criteria for #<issue_2> verified

   ## Verification

   - [x] `pnpm check` passes (lint + typecheck + test)
   - [x] Subagent code reviews completed
   ```

4. **Teardown & Cleanup:**
   - Remove the temporary worktree:
     ```bash
     git worktree remove .worktrees/epic-<slug>
     ```
   - Confirm root workspace remains cleanly on `main`.

5. **Proceed to Next Batch:** If multiple independent epic batches were queued, repeat from Step 3 for the next batch.
