# Conversation Review: {{TITLE}}

## 1. Review Metadata

| Field | Value |
|-------|-------|
| **Conversation ID** | `{{CONVERSATION_ID}}` |
| **Title / Objective** | {{TITLE_SHORT}} |
| **Date of Review** | {{REVIEW_DATE}} |
| **Total Steps** | {{TOTAL_STEPS}} |
| **Tool Execution Summary** | {{TOOL_SUMMARY}} |

## 2. Programmatic Analysis & Heuristics (Stated Problems)

> [!IMPORTANT]
> This section lists identified problems, loops, and inefficiencies in tool usage. It does NOT suggest solutions, adhering strictly to the review guidelines.

### 🔄 Looping & Repetition
{{LOOP_ANALYSIS}}

### ⚠️ Excessive Tool Usage
{{EXCESSIVE_TOOL_ANALYSIS}}

### 🚫 Irrelevant Actions / Scope Deviations
{{SCOPE_DEVIATION_ANALYSIS}}

### ❌ Tool Failures & Stuck States
{{FAILURES_ANALYSIS}}

### ⚠️ Bash Command Misuse & Unnecessary Sandbox Bypass
> Add any observations of bash command misuse (e.g., using `ls` instead of `make list-files`) or unnecessary sandbox bypass (e.g., bypassing the sandbox to read a file that could have been accessed with a standard tool). This is important for ensuring agents use standardized commands and only bypass the sandbox when strictly necessary.


## 3. Chronology of Events

{{CHRONOLOGY_LIST}}
