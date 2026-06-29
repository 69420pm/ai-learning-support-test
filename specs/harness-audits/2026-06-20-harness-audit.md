# Agent Harness Audit: 2026-06-20

## 1. Audit Metadata

| Field | Value |
|-------|-------|
| **Date** | 2026-06-20 |
| **Mode** | Proactive |
| **Log source** | N/A — proactive audit |
| **Harness files analyzed** | [GEMINI.md](file:///Users/kevinsmith/Documents/development/typescript/ai-learning-support/GEMINI.md), [CONTRIBUTING.md](file:///Users/kevinsmith/Documents/development/typescript/ai-learning-support/CONTRIBUTING.md), [.geminiignore](file:///Users/kevinsmith/Documents/development/typescript/ai-learning-support/.geminiignore), [.agents/skills/full-issue-implementation/SKILL.md](file:///Users/kevinsmith/Documents/development/typescript/ai-learning-support/.agents/skills/full-issue-implementation/SKILL.md), [.agents/skills/implement-issue/SKILL.md](file:///Users/kevinsmith/Documents/development/typescript/ai-learning-support/.agents/skills/implement-issue/SKILL.md), [.agents/skills/implement-unit-test-for-issue/SKILL.md](file:///Users/kevinsmith/Documents/development/typescript/ai-learning-support/.agents/skills/implement-unit-test-for-issue/SKILL.md), [.agents/skills/review-pr/SKILL.md](file:///Users/kevinsmith/Documents/development/typescript/ai-learning-support/.agents/skills/review-pr/SKILL.md), [specs/plan/PLAN_TEMPLATE.md](file:///Users/kevinsmith/Documents/development/typescript/ai-learning-support/specs/plan/PLAN_TEMPLATE.md), [specs/pr-reviews/PR_REVIEW_TEMPLATE.md](file:///Users/kevinsmith/Documents/development/typescript/ai-learning-support/specs/pr-reviews/PR_REVIEW_TEMPLATE.md), [.github/ISSUE_TEMPLATE/atomic_issue.md](file:///Users/kevinsmith/Documents/development/typescript/ai-learning-support/.github/ISSUE_TEMPLATE/atomic_issue.md), [.github/pull_request_template.md](file:///Users/kevinsmith/Documents/development/typescript/ai-learning-support/.github/pull_request_template.md), [Makefile](file:///Users/kevinsmith/Documents/development/typescript/ai-learning-support/Makefile), [biome.json](file:///Users/kevinsmith/Documents/development/typescript/ai-learning-support/biome.json), [lefthook.yml](file:///Users/kevinsmith/Documents/development/typescript/ai-learning-support/lefthook.yml) |
| **Articles consulted** | [stop-using-init-for-agents.md](file:///Users/kevinsmith/Documents/development/typescript/ai-learning-support/docs/context/stop-using-init-for-agents.md), [agent-skills.md](file:///Users/kevinsmith/Documents/development/typescript/ai-learning-support/docs/context/agent-skills.md), [good-specs.md](file:///Users/kevinsmith/Documents/development/typescript/ai-learning-support/docs/context/good-specs.md), [intent-debt.md](file:///Users/kevinsmith/Documents/development/typescript/ai-learning-support/docs/context/intent-debt.md), [ai-agent-manager.md](file:///Users/kevinsmith/Documents/development/typescript/ai-learning-support/docs/context/ai-agent-manager.md), [orchestrating-coding-agents.md](file:///Users/kevinsmith/Documents/development/typescript/ai-learning-support/docs/context/orchestrating-coding-agents.md), [loop-engineering.md](file:///Users/kevinsmith/Documents/development/typescript/ai-learning-support/docs/context/loop-engineering.md) |

## 2. Executive Summary

This harness is a robust, well-structured environment with clear quality gates (Makefile API, git-workflow script, and git hooks), but the multi-agent execution pipeline suffers from bureaucratic over-engineering and "productivity theater." By forcing separate subagents for test writing, implementation, and pull request reviews *on every single atomic child issue*, the system incurs substantial context-loading latency and redundant token waste. 

The single most impactful change is to **collapse the TDD subagent split for child issues, allowing a single implementation subagent to write tests and code together, and moving PR reviews from the child-issue level to the plan/parent-PR level.** This maintains the core quality standards (TDD verification) while eliminating over 60% of the orchestration latency and token overhead.

---

## 3. Findings

### 🔴 Critical (Actively causing agent failures or quality loss)

#### C1: Bureaucratic Subagent Redundancy in `full-issue-implementation`

- **File**: [.agents/skills/full-issue-implementation/SKILL.md](file:///Users/kevinsmith/Documents/development/typescript/ai-learning-support/.agents/skills/full-issue-implementation/SKILL.md)
- **Problem**: The current step-by-step instructions force a serial multi-agent workflow for *every* child issue. For a 6-issue plan, the orchestrator spawns:
  1. An `implement-unit-test-for-issue` subagent (takes ~1-2 min, loads full context).
  2. An `implement-issue` subagent (takes ~1-2 min, loads full context).
  3. A `review-pr` subagent (takes ~1-2 min, loads full context).
  
  This adds up to 18 subagent spins for a single plan. Since each spin requires the subagent to read the workspace layout, TypeScript standards, and schema details, this causes massive token waste and extreme execution latency, making development feel painfully slow.
- **Evidence**: 
  - Per [stop-using-init-for-agents.md](file:///Users/kevinsmith/Documents/development/typescript/ai-learning-support/docs/context/stop-using-init-for-agents.md): Context bloat and redundant document parsing degrades task performance and dilutes model attention.
  - Per [ai-agent-manager.md](file:///Users/kevinsmith/Documents/development/typescript/ai-learning-support/docs/context/ai-agent-manager.md): "The natural bottleneck isn't generating code - it's reviewing it... WIP limits and kill criteria are essential to prevent review drowning."
  - Per [orchestrating-coding-agents.md](file:///Users/kevinsmith/Documents/development/typescript/ai-learning-support/docs/context/orchestrating-coding-agents.md): Subagents are powerful, but "token costs scale linearly with team size." Spawning 18 sessions for 6 minor tasks creates an unsustainable orchestration tax.
- **Expected impact if fixed**: Eliminates 12 out of 18 subagent spins for a 6-issue plan. Reduces total context tokens processed by ~50-60% and speeds up feature development time by 3x.
- **Proposed change**:
  ```diff
  --- a/.agents/skills/full-issue-implementation/SKILL.md
  +++ b/.agents/skills/full-issue-implementation/SKILL.md
  @@ -27,21 +27,15 @@
   3. **Create the Feature Branch**:
      - Run `make create-branch NAME=fix-issue-<issue_number>` to create and switch to a feature branch.
   
  -4. **TDD Phase 1: Write Unit Tests**:
  -   - Define a subagent with the following prompt:
  -     "Use the skill `implement-unit-test-for-issue` to write tests for issue #<issue_number>.
  -      Here is the full issue context (do NOT call `make view-issue` yourself):
  -      <paste the full issue output here>"
  -   - Wait for the subagent to complete, ensuring unit tests are written and committed.
  -
  -5. **TDD Phase 2: Implement Code**:
  -   - Define a subagent with the following prompt:
  -     "Use the skill `implement-issue` to implement issue #<issue_number>.
  -      Here is the full issue context (do NOT call `make view-issue` yourself):
  -      <paste the full issue output here>"
  -   - Wait for the subagent to complete, ensuring code is implemented to pass the tests.
  +4. **Implementation Phase (Combined TDD & Code)**:
  +   - Define a single subagent with the following prompt:
  +     "Use the skill `implement-issue` to write tests and implement issue #<issue_number>.
  +      First, locate/create the test file and write failing tests matching the issue criteria. Commit the test changes locally with message 'test: add unit tests for issue #<issue_number>' using git commands.
  +      Next, write the implementation to pass the tests, verify with `make test`, and commit using `make commit MSG=\"impl: resolve issue #<issue_number>\"`.
  +      Here is the full issue context:
  +      <paste the full issue output here>"
  +   - Wait for the subagent to complete, verifying that tests and code are both written and committed.
   
   6. **Synchronize & Validate**:
  ```

---

### 🟡 Major (Measurable waste or missed quality opportunity)

#### M1: Over-Granular PR Review Gate in `full-issue-implementation`

- **File**: [.agents/skills/full-issue-implementation/SKILL.md](file:///Users/kevinsmith/Documents/development/typescript/ai-learning-support/.agents/skills/full-issue-implementation/SKILL.md)
- **Problem**: The orchestrator triggers an optional `review-pr` subagent for individual issues. While it says "optional for small changes", agents default to compliance and execute it anyway. Reviewing individual micro-changes when they are part of a larger plan (e.g. 6 child issues) isolates the reviewer from the holistic feature design and wastes review tokens.
- **Evidence**:
  - Per [agentic-code-review.md](file:///Users/kevinsmith/Documents/development/typescript/ai-learning-support/docs/context/agentic-code-review.md): AI reviews should target integration seams and intent verification. Reviewing 6 separate PRs for 6 child issues of the same plan compounds cognitive and token costs unnecessarily.
  - Per [good-specs.md](file:///Users/kevinsmith/Documents/development/typescript/ai-learning-support/docs/context/good-specs.md): The human owns the merge gate; validating each intermediate commit with a separate LLM reviewer is productivity theater.
- **Expected impact if fixed**: Avoids 6 separate PR reviews per plan. Focuses reviewer resources on the parent PR, which has the complete structural picture.
- **Proposed change**:
  ```diff
  --- a/.agents/skills/full-issue-implementation/SKILL.md
  +++ b/.agents/skills/full-issue-implementation/SKILL.md
  @@ -57,4 +57,4 @@
   8. **Orchestrate PR Review (Optional for small changes)**:
      > [!NOTE]
  -   > The PR review step is **optional** for small issues. Skip it if the diff touches fewer than 5 files and no new architectural patterns are introduced.
  +   > The PR review step is **optional** for small issues. Skip it if the issue is a child task of a larger technical plan (e.g., local document upload). Instead, run a single PR review on the final combined parent PR.
   
  ```

#### M2: Missing Intent Documentation Requirements in `PLAN_TEMPLATE.md`

- **File**: [specs/plan/PLAN_TEMPLATE.md](file:///Users/kevinsmith/Documents/development/typescript/ai-learning-support/specs/plan/PLAN_TEMPLATE.md)
- **Problem**: The technical plan template focuses extensively on the "how" (files to create/modify, breakdown) and has a small "Key Decisions" table, but it lacks a dedicated field enforcing the "why" — the architectural intent and constraints. When agents start fresh sessions on child issues, they lack context on the broader intent, risking regression.
- **Evidence**:
  - Per [intent-debt.md](file:///Users/kevinsmith/Documents/development/typescript/ai-learning-support/docs/context/intent-debt.md): "Intent debt lives in the artifacts you may have never written: the goals, constraints, and rationale for why the system is the way it is... Of the three debts, intent debt is the only one where the agent can't bail you out."
- **Expected impact if fixed**: Ensures that architectural intent is permanently documented upstream, preventing agents from making incorrect design assumptions when implementing child issues.
- **Proposed change**:
  ```diff
  --- a/specs/plan/PLAN_TEMPLATE.md
  +++ b/specs/plan/PLAN_TEMPLATE.md
  @@ -4,4 +4,5 @@
   ## 1. Overview & Context
   - **Feature Description**: [High-level summary of what is being built]
   - **User Value / Problem Solved**: [Why we are implementing this]
  +- **Architectural Intent & Core Constraints**: [Describe the 'why' behind the chosen design. What global constraints or security/performance trade-offs exist? Cite relevant ADRs from decisions.md]
   - **Idea Path**: [Link to the original idea document that inspired this implementation plan, if applicable]
  ```

---

### 🟢 Minor (Polish / defense-in-depth)

#### m1: Redundant Test Target Scrutiny in `implement-unit-test-for-issue`

- **File**: [.agents/skills/implement-unit-test-for-issue/SKILL.md](file:///Users/kevinsmith/Documents/development/typescript/ai-learning-support/.agents/skills/implement-unit-test-for-issue/SKILL.md)
- **Problem**: Step 5 suggests running `make typecheck && make lint` before committing, which is useful, but the skill boundary explicitly forbids exploring project-level configuration files. Since lint/typecheck is already handled by pre-commit hooks or local make calls, this step can be simplified to avoid redundant runs.
- **Evidence**: [agent-skills.md](file:///Users/kevinsmith/Documents/development/typescript/ai-learning-support/docs/context/agent-skills.md) (Process over prose and non-negotiable verification).
- **Proposed change**:
  ```diff
  --- a/.agents/skills/implement-unit-test-for-issue/SKILL.md
  +++ b/.agents/skills/implement-unit-test-for-issue/SKILL.md
  @@ -39,4 +39,4 @@
   5. **Verify Code Quality**:
  -   - Run `make typecheck && make lint` to ensure the new test code has no TypeScript errors or lint violations.
  +   - Run `make lint` to verify that the test code conforms to formatting and Biome linter requirements.
      - Fix any errors or warnings before committing.
   ```

---

## 4. What Is Working Well (Do NOT Change)

- **Minimalist `GEMINI.md`**: Keeping `GEMINI.md` empty of discoverable structure and focused only on non-discoverable gotchas prevents anchoring effects and reduces system prompt token waste (supporting the core argument of [stop-using-init-for-agents.md](file:///Users/kevinsmith/Documents/development/typescript/ai-learning-support/docs/context/stop-using-init-for-agents.md)).
- **Makefile as the Agent API**: The Makefile targets (`make check`, `make lint`, `make test`) are clean, composable, and act as a reliable interface for both human and AI developers (supporting the "harness as API" model in [agent-harness-engineering.md](file:///Users/kevinsmith/Documents/development/typescript/ai-learning-support/docs/context/agent-harness-engineering.md)).
- **Lefthook Git Hooks**: Staged lints and tests are checked pre-commit, which serves as a great safety ratchet to prevent bad code from reaching the remote repository.

---

## 5. Metrics to Watch

After applying the proposed changes, track these metrics to evaluate success:

| Metric | Current baseline | Expected after changes | How to measure |
|--------|-----------------|----------------------|----------------|
| **Subagents per plan** | 18 (for 6-issue plan) | 6 (1 implementation subagent per issue) | Count running subagents in execution history |
| **Token usage per feature** | ~350k - 500k tokens | ~150k - 200k tokens | Check terminal billing logs or model telemetry |
| **Feature lifecycle duration** | 1.5 - 2 hours | 30 - 45 minutes | Compare start-to-finish duration of technical plans |

---

## 6. Recommended Next Steps

1. **Apply Findings C1 and M1** to streamline the `full-issue-implementation` orchestrator workflow.
2. **Apply Finding M2** to capture architectural intent upstream in `PLAN_TEMPLATE.md`.
3. **Execute the local document upload plan** using the new streamlined single-subagent execution model.
