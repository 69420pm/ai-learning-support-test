# Agent Run Audit Report: {RUN_NAME}

**Trace File:** `{TRACE_FILE_PATH}`  
**Audit Date:** `{AUDIT_DATE}`  
**Audit Verdict / Efficiency Grade:** `{GRADE}` (A / B / C / D / F)  

---

## 1. Executive Summary

- **Overview:** Brief description of the agent run, conversation session, or epic task.
- **Performance Summary:** Summary of how well the agent(s) executed the task.
- **Primary Highlights:** Core strengths observed during the run.
- **Primary Weaknesses:** Key friction points, wasted steps, or harness violations.

---

## 2. Quantitative Telemetry & Summary

| Telemetry Item | Value |
|---|---|
| Total Conversations (Parent + Subagents) | {TOTAL_CONVERSATIONS} |
| Total Execution Steps | {TOTAL_STEPS} |
| Total Errors / Retries | {TOTAL_ERRORS} |
| Skills Activated | {SKILLS_ACTIVATED} |
| Missed / Undertriggered Skills | {MISSED_SKILLS} |
| Most Used Tools | {TOP_TOOLS} |

---

## 3. In-Depth Diagnostic Findings

### 3.1 Skill Usage & Harness Compliance
- **Activated Skills Evaluation:** Did the agent follow the skill instructions step-by-step?
- **Missed Skills:** Instances where an available skill should have been triggered but wasn't.

### 3.2 Information Gathering & Context Integrity
- **Snippet Tunnel Vision:** Instances of editing files after viewing insufficient content.
- **Log / Traceback Inspection:** Whether errors were properly inspected before attempting fixes.
- **Schema / Signature Verification:** Checks on whether API contracts and types were verified before use.

### 3.3 Execution Loops & Tool Friction
- **Failed Tool Loops:** Repetitive tool failures (e.g. invalid replacement blocks, command timeouts).
- **Subagent Efficiency:** Evaluation of subagent prompts, task clarity, and subagent output quality.
- **Token & Turn Waste:** Excessive or duplicate tool invocations.

### 3.4 Repository State & Verification Check
- **Codebase Verification:** Independent check of git status, diffs, and test suite status vs agent claims.

---

## 4. Actionable Harness & Skill Optimization Plan

### A. Skill Improvements (`.agents/skills/`)
1. **`[skill-name]`**: Update frontmatter description to improve trigger accuracy.
2. **`[skill-name]`**: Add explicit step for [missing behavior].

### B. Project Rules & Directives (`AGENTS.md`)
1. Add rule: `[Rule text]` to prevent [specific failure mode].

### C. Helper Tooling / Scripts
1. Create `[script/tool]` to automate [repetitive task observed in trace].
