# Agent Failure Journal

This journal records agent execution failures, loops, and quality issues. It is used by humans and harness audit agents to identify patterns, debug the agent harness, and update automated enforcement rules (linters, pre-commit checks, tests, or skills) to prevent repetition.

> [!NOTE]
> This file is a historical log. normal workforce agents do NOT read this file to avoid context bloat and anchoring. Instead, failures recorded here must be compiled into the codebase or harness configs/skills (the Ratchet Principle).

## Active Failure Log

| Date | Task / Issue | Failure Description | Root Cause | Prevention (Harness / Code Change) | Status |
| :--- | :--- | :--- | :--- | :--- | :--- |
| YYYY-MM-DD | e.g., #123 (implement scheduler) | e.g., Agent entered infinite loop running vitest and making code edits. | e.g., No retry limit or exit condition was defined for failing tests. | e.g., Added maximum 3-run test boundary to `implement-issue` skill. | **Resolved** |

---

## Log Entry Template

Use the following section structure when adding a new failure analysis entry:

```markdown
### YYYY-MM-DD: [Brief Failure Title]

- **Context & Task**: [Link to issue or description of task]
- **Symptoms & Failure**: [What the agent did, error messages, loop behavior]
- **Root Cause Analysis**: [Why the agent failed; missing tools, ambiguous prompt, context rot, etc.]
- **Harness Ratchet (Mitigation)**: [What changes were made to the harness (e.g., config, lint rule, git hook, skill boundary) to permanently prevent this failure]
- **Status**: [Pending / In Progress / Resolved]
```
