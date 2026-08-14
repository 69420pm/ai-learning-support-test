---
name: agent-run-auditor
description: >-
  Analyze past AI agent runs, conversation logs, subagent transcripts, and multi-plan executions. Collects conversation logs into a verbose execution trace file, then runs a harness-aware diagnostic audit to identify skill misuse, context tunnel vision, failed tool loops, and harness improvement recommendations. Use whenever the user asks to analyze past runs, evaluate agent performance, audit a conversation run, check how subagents performed, inspect transcript logs, or optimize agent skills based on past runs.
---

# Agent Run Auditor Skill

This skill provides an automated workflow to harvest, compile, and audit past AI agent executions (single conversation runs, subagent tasks, or multi-plan feature implementations). It produces a verbose execution trace file and runs a comprehensive harness audit to identify actionable improvements for skills, rules, and tooling.

---

## Workflow Overview

```
 ┌─────────────────────────────────────────────────────────┐
 │ 1. Identify Conversation ID(s) & Target Run Context      │
 └────────────────────────────┬────────────────────────────┘
                              │
                              ▼
 ┌─────────────────────────────────────────────────────────┐
 │ 2. Harvest Logs (scripts/collect_run_logs.py)           │
 │    Recursively parses parent + subagents into trace.md  │
 └────────────────────────────┬────────────────────────────┘
                              │
                              ▼
 ┌─────────────────────────────────────────────────────────┐
 │ 3. Launch Auditor Subagent (agent-run-auditor)          │
 │    Audits trace vs skills, rules, loops & git state    │
 └────────────────────────────┬────────────────────────────┘
                              │
                              ▼
 ┌─────────────────────────────────────────────────────────┐
 │ 4. Deliver Audit Report & Harness Optimizations         │
 └────────────────────────────┴────────────────────────────┘
```

---

## Detailed Step-by-Step Instructions

### Step 1: Identify Conversation IDs & Run Scope

1. Determine the root conversation ID(s) for the run to audit.
   - If the user provides a conversation ID or refers to a recent session, check available conversation IDs from history or log directories (`/home/vscode/.gemini/antigravity-cli/brain/`).
   - Handles single conversation sessions, subagent runs, or multi-plan runs.

### Step 2: Harvest & Compile Verbose Trace Log

Run the bundled log harvester script to parse parent and subagent `transcript.jsonl` files and generate a structured Markdown execution trace:

```bash
python3 .agents/skills/agent-run-auditor/scripts/collect_run_logs.py \
  --root-id <CONVERSATION_ID_1> [<CONVERSATION_ID_2> ...] \
  --run-name "<Descriptive_Run_Name>" \
  --output specs/audits/<run_name>_trace.md
```

Options:
- `--full`: Optional flag to parse `transcript_full.jsonl` for untruncated content.
- `--brain-dir`: Path to brain logs directory (defaults to `/home/vscode/.gemini/antigravity-cli/brain`).

Verify that `specs/audits/<run_name>_trace.md` was created successfully and report the count of parsed conversations to the user.

### Step 3: Launch Harness Audit Subagent

Invoke the `agent-run-auditor` subagent (defined in `.agents/agents/agent-run-auditor/agent.md`) using `invoke_subagent`:

```json
{
  "TypeName": "agent-run-auditor",
  "Role": "Agent Run Auditor",
  "Prompt": "Audit the compiled execution trace at specs/audits/<run_name>_trace.md for run '<Descriptive_Run_Name>'. Perform a deep diagnostic audit of skill adherence, reading patterns, tool loops, and repository state against project rules in AGENTS.md and .agents/skills/. Generate a detailed report at specs/audits/<run_name>_audit_report.md following the template in .agents/skills/agent-run-auditor/references/audit_template.md."
}
```

*Note: If subagents cannot be launched, perform the audit inline following the audit methodology below.*

#### Audit Lenses to Check:
1. **Skill Usage & Compliance**:
   - Were available skills (`plan-implementer`, `test-writer`, `shadcn`, `next-dev-loop`, `ai-sdk`, `spec-writer`) triggered appropriately?
   - Did agents follow skill steps or skip mandatory checks?
   - Identify undertriggered skills and propose improved `description` frontmatter.
2. **Context & Reading Integrity**:
   - Detect "Snippet Tunnel Vision" (editing files after reading only partial lines).
   - Detect unread lints or ignored error stack traces.
3. **Execution Loops & Friction**:
   - Identify repeated failing tool calls (e.g. `replace_file_content` mismatches, bash syntax errors).
   - Evaluate subagent delegation clarity and subagent prompt effectiveness.
4. **Ground-Truth Repository Check**:
   - Run `git status` / `git diff` / `pnpm test` to verify if claimed completion matches reality.

### Step 4: Deliver Final Audit Report & Optimizations

Once the audit report is generated at `specs/audits/<run_name>_audit_report.md`:
1. Provide a concise summary of the key audit findings to the user.
2. Highlight high-priority recommendations for:
   - Skill frontmatter description updates or missing steps.
   - Updates to [`AGENTS.md`](file:///workspaces/secure-ai-learning-support/AGENTS.md) project rules.
   - Automation script additions to reduce agent steps.
3. Link the user to the generated audit artifacts:
   - Trace File: `[specs/audits/<run_name>_trace.md](file:///workspaces/secure-ai-learning-support/specs/audits/<run_name>_trace.md)`
   - Audit Report: `[specs/audits/<run_name>_audit_report.md](file:///workspaces/secure-ai-learning-support/specs/audits/<run_name>_audit_report.md)`

---

## Bundled Resources

- **`scripts/collect_run_logs.py`**: Automated harvester script for recursively building execution traces.
- **`references/audit_template.md`**: Standardized Markdown layout for post-mortem audit reports.
- **`.agents/agents/agent-run-auditor/agent.md`**: Dedicated post-mortem analyzer subagent.
