# Agent Harness Audit: [YYYY-MM-DD]

## 1. Audit Metadata

| Field | Value |
|-------|-------|
| **Date** | [YYYY-MM-DD] |
| **Mode** | [Proactive / Log-driven] |
| **Log source** | [Path to log file, or "N/A — proactive audit"] |
| **Harness files analyzed** | [List all files read during the audit] |
| **Articles consulted** | [List all docs/context/ articles read, with links] |

## 2. Executive Summary

[3-5 sentences. Is this harness producing measurably better agent output, or is it productivity theater? What is the single most impactful change? What is working well and should not be touched?]

## 3. Findings

### 🔴 Critical (Actively causing agent failures or quality loss)

#### C1: [Finding Title]
- **File**: [path to file, with link]
- **Problem**: [What is wrong and what failure mode it causes]
- **Evidence**: [Cite specific article, principle, or data point — e.g. "Per stop-using-init-for-agents.md: ETH Zurich found AI-generated AGENTS.md reduced success by 2-3%"]
- **Log evidence** *(if log-driven)*: [Quote or reference the specific log lines showing the failure]
- **Expected impact if fixed**: [Measurable outcome — e.g. "~400 fewer tokens per session", "eliminates the looping pattern seen in log lines 42-78"]
- **Proposed change**:
  ```diff
  - [old content]
  + [new content]
  ```

### 🟡 Major (Measurable waste or missed quality opportunity)

#### M1: [Finding Title]
- **File**: [path to file, with link]
- **Problem**: [What is suboptimal]
- **Evidence**: [Article citation]
- **Expected impact if fixed**: [Measurable outcome]
- **Proposed change**:
  ```diff
  - [old content]
  + [new content]
  ```

### 🟢 Minor (Polish / defense-in-depth)

#### m1: [Finding Title]
- **File**: [path to file, with link]
- **Problem**: [What could be improved]
- **Evidence**: [Article citation]
- **Proposed change**:
  ```diff
  - [old content]
  + [new content]
  ```

## 4. What Is Working Well (Do NOT Change)

[Explicitly list harness elements that are effective and should be preserved. This prevents overcorrection.]

- [Element 1]: [Why it's good — cite article principle if applicable]
- [Element 2]: [Why it's good]

## 5. Metrics to Watch

After applying the proposed changes, track these to know if they worked:

| Metric | Current baseline | Expected after changes | How to measure |
|--------|-----------------|----------------------|----------------|
| [e.g., Agent loop count] | [e.g., "3-5 retries per task"] | [e.g., "1-2 retries"] | [e.g., "Count retry patterns in next 5 session logs"] |

## 6. Recommended Next Steps

1. [Prioritized action 1]
2. [Prioritized action 2]
3. [Prioritized action 3]
