---
name: improve-agent-harness
description: Use when you want to audit and improve the project's agent harness (GEMINI.md, skills, specs, Makefile, CI, git hooks, templates). Optionally accepts an agent session log to diagnose specific failures. Outputs a structured audit report with severity-tiered findings and proposed diffs — does NOT implement changes.
---

### Objective
Act as a ruthlessly critical harness engineer. Audit the project's entire agent infrastructure — every file that shapes how agents behave — and produce a severity-tiered audit report with concrete, article-backed recommendations. The goal is measurably better agent output (fewer bugs, less looping, better code quality), NOT a nicer-feeling workflow or productivity theater.

### Boundaries
- **Do NOT implement changes.** Output is an audit report with proposed diffs. The user decides what to apply.
- **Do NOT generate generic best-practices advice.** Every recommendation MUST cite a specific finding from a `docs/context/` article. If you cannot cite one, do not recommend it.
- **Do NOT optimize for human comfort.** Evaluate whether each harness element produces real quality improvements in agent output.
- **Do NOT read application source code.** The codebase itself is not the audit target — only harness files are.
- **Be ruthlessly honest.** If the harness is fine, say so. Do not invent findings to justify the audit.

### Step-by-Step Instructions

#### Phase 1: Determine Audit Mode

Check if the user provided an agent session log (conversation ID, file path, or pasted log content).

- **Log-driven audit**: A log was provided. You will analyze it for failure patterns in Phase 4.
- **Proactive audit**: No log provided. Skip log analysis in Phase 4.

State which mode you are operating in before proceeding.

#### Phase 2: Gather Current Harness State

Read ALL of the following harness files. Do not skip any that exist.

**Agent configuration layer:**
- `GEMINI.md` (project root)
- `CONTRIBUTING.md`
- `.geminiignore`
- All files in `.agents/` (agents, scripts, logs, skills)
- Every `SKILL.md` in `.agents/skills/*/`

**Specification & template layer:**
- `specs/product_requirements_document.md`
- `specs/system_architecture.md`
- All templates: `specs/plan/PLAN_TEMPLATE.md`, `specs/pr-reviews/PR_REVIEW_TEMPLATE.md`, `specs/harness-audits/HARNESS_AUDIT_TEMPLATE.md`
- `.github/ISSUE_TEMPLATE/` (all files)
- `.github/pull_request_template.md`

**Build & enforcement layer:**
- `Makefile`
- `.github/workflows/` (all CI workflow files)
- `lefthook.yml` (git hooks)
- `biome.json` (linter config — only to check if agents are told about it)

**Knowledge layer:**
- `docs/context/GEMINI.md` (the knowledge map)
- Skim `docs/` top-level files for any agent-relevant documentation

If a log was provided, read it now and extract:
- Failure patterns (loops, retries, wrong approaches)
- Context misses (agent lacked information it should have had)
- Quality issues (produced code that was buggy, over-engineered, or misaligned)
- Wasted tokens (unnecessary file reads, redundant tool calls)
- Scope violations (agent wandered beyond the task)

#### Phase 3: Read the Articles (MANDATORY)

Read the knowledge map at `docs/context/GEMINI.md` to identify relevant articles.

**Always read these articles (full text, not just the summary):**

1. `docs/context/stop-using-init-for-agents.md` — The discoverability filter, anchoring problem, token cost analysis, what earns a line in AGENTS.md
2. `docs/context/agent-skills.md` — Five load-bearing principles for skill design, checkpoint workflows, anti-rationalization
3. `docs/context/good-specs.md` — Spec quality as upstream lever, the curse of instructions, boundary tiers
4. `docs/context/intent-debt.md` — Intent externalization, why agents can't generate intent, ADRs

**Read these if the log (or harness inspection) shows related problems:**

5. `docs/context/agent-harness-engineering.md` — Read if: context rot, tool failures, missing ratchet, looping behavior
6. `docs/context/loop-engineering.md` — Read if: autonomous/long-running sessions, sub-agent coordination issues
7. `docs/context/comprehension-debt.md` — Read if: agent produced code nobody on the team understands
8. `docs/context/agentic-code-review.md` — Read if: review process let bad code through, or review workflow is missing
9. `docs/context/factory-model.md` — Read if: evaluating the overall orchestration model or spec-driven workflow
10. `docs/context/self-improving-agents.md` — Read if: compound learning, persistent memory, or overnight agent patterns
11. `docs/context/orchestrating-coding-agents.md` — Read if: multi-agent coordination, subagent patterns, quality gates
12. `docs/context/agentic-engineering.md` — Read if: foundational framing needed for the audit rationale
13. `docs/context/ai-agent-manager.md` — Read if: WIP limits, kill criteria, agent delegation patterns
14. `docs/context/code-review.md` — Read if: solo developer review practices, proof-of-correctness workflows
15. `docs/context/dont-outsource-the-learning.md` — Read if: skill atrophy or learning-hostile patterns in the harness
16. `docs/context/agentic-engine-optimization.md` — Read if: documentation structure, token surfacing, agent discovery

While reading, take notes on specific principles, data points, and frameworks you will cite in your findings. You MUST be able to attribute every recommendation to a specific article passage.

#### Phase 4: Diagnose — The Anti-Rationalization Audit

Evaluate every harness file against these concrete criteria. Check each item and note violations.

**A. GEMINI.md / Agent Config Audit** *(from stop-using-init-for-agents.md)*

- [ ] **Discoverability filter**: Is every line something the agent CANNOT find by reading code, configs, or directory structure? Flag anything discoverable.
- [ ] **Anchoring check**: Does any instruction compete for attention with more critical ones? Are there low-value instructions that dilute focus? (pink elephant problem)
- [ ] **Token cost**: Estimate the token count. Is every token earning its keep? Flag files where >30% of content is discoverable boilerplate.
- [ ] **Staleness**: Are there instructions for friction that has already been fixed in code, configs, or tooling?
- [ ] **Routing**: Does the file direct agents to relevant skill files and knowledge articles, or does it try to contain everything itself?

**B. Skill Files Audit** *(from agent-skills.md, good-specs.md)*

For each `SKILL.md`:
- [ ] **Checkpoints**: Does the skill have explicit checkpoints where the agent must verify work before proceeding? Or is it just a sequence of prose instructions?
- [ ] **Anti-rationalization gates**: Are there points where the agent must produce evidence (test output, diff, concrete artifact) rather than just claiming something is done?
- [ ] **Non-negotiable verification**: Does the skill require running tests, type checks, or lints as mandatory steps — not optional suggestions?
- [ ] **Progressive disclosure**: Does the skill dump all context upfront, or does it load information as needed? Is context loaded proportional to what each phase requires?
- [ ] **Scope discipline**: Are boundaries explicit? Can the agent wander outside the skill's purpose? Are there "do NOT" constraints where needed?
- [ ] **Intent capture**: Does the skill produce artifacts that record WHY decisions were made, not just WHAT was done?

**C. Specification & Template Audit** *(from good-specs.md, intent-debt.md)*

- [ ] **Intent vs. implementation**: Do specs and templates capture WHY (intent, rationale, constraints) or only WHAT (implementation steps)?
- [ ] **Boundary tiers**: Are there explicit Always / Ask first / Never boundaries?
- [ ] **Self-verification**: Do templates include sections that force the agent to prove its work?
- [ ] **Curse of instructions**: Are any specs/templates so long they exceed useful context? (>2000 tokens for a single template is a warning sign)
- [ ] **Consistency**: Do templates across the project follow consistent structure and quality standards?

**D. Build & Enforcement Audit** *(from agent-harness-engineering.md, agent-skills.md)*

- [ ] **Makefile as agent API**: Are the Make targets that agents use well-named, documented, and composable? Do agents have to guess target names?
- [ ] **CI as quality gate**: Does CI catch what agents miss? Is there a fast-feedback loop (failing CI before merge)?
- [ ] **Git hooks**: Do pre-commit/pre-push hooks enforce formatting, linting, or type checks that prevent low-quality commits?
- [ ] **Ratchet principle**: When an agent makes a mistake, is there a mechanism to turn it into a permanent rule (hook, lint rule, skill boundary)?

**E. Knowledge Layer Audit** *(from agentic-engine-optimization.md, stop-using-init-for-agents.md)*

- [ ] **Knowledge map**: Is `docs/context/GEMINI.md` accurate, up-to-date, and useful for routing agents to the right article?
- [ ] **Article accessibility**: Are articles structured so agents can extract key principles without reading 30k tokens? (progressive disclosure, clear headings, front-loaded summaries)
- [ ] **Cross-referencing**: Do skills and agent configs reference relevant knowledge articles when an agent would benefit from deeper context?

**F. Log-Driven Failure Analysis** *(only if log provided — from agent-harness-engineering.md, loop-engineering.md)*

- [ ] **Context rot**: Did the agent lose important context mid-session? Should harness files surface this context more aggressively?
- [ ] **Looping / retries**: Did the agent repeat the same failed approach? Is there a missing ratchet (hook, rule, or boundary) that would prevent this?
- [ ] **Cold-start failure**: Did the agent lack critical context that should have been in a harness file? What information was missing?
- [ ] **Wrong approach**: Did the agent use an inappropriate tool, pattern, or strategy because no skill guided it? Should a new skill exist?
- [ ] **Scope creep**: Did the agent wander beyond the task because skill boundaries were missing or too permissive?
- [ ] **Token waste**: Did the agent read unnecessary files, make redundant tool calls, or request information it already had?

#### Phase 5: Prescribe — Concrete Recommendations

For each finding from Phase 4, produce a recommendation with ALL of the following:

1. **Severity**: Critical / Major / Minor (use the definitions below)
2. **What to change**: Exact file, exact section, exact edit — proposed as a diff block
3. **Why (article citation)**: The specific principle or data point from a `docs/context/` article that motivates this change. Include the article filename and the key insight.
4. **Expected impact**: What measurable outcome this produces (fewer loops, less token waste, better code quality, fewer regressions)
5. **Risk if ignored**: What failure mode persists if this is not addressed

**Severity definitions:**

| Severity | Criteria | Examples |
|----------|----------|---------|
| 🔴 **Critical** | Actively causing agent failures, quality loss, or significant token waste | Discoverable info bloating GEMINI.md by 500+ tokens; skill missing verification gate that lets broken code through; Makefile target agents depend on is broken |
| 🟡 **Major** | Measurable waste or missed quality opportunity | No anti-rationalization checkpoints in a skill; specs capture implementation but not intent; CI doesn't catch what agents miss |
| 🟢 **Minor** | Polish, defense-in-depth, or forward-looking improvement | Missing cross-references between skills; could add progressive disclosure; template could capture rationale |

#### Phase 6: Write the Audit Report

Create the audit report at `specs/harness-audits/YYYY-MM-DD-harness-audit.md` using the template at `specs/harness-audits/HARNESS_AUDIT_TEMPLATE.md`.

Populate every section. Pay special attention to:

- **Section 2 (Executive Summary)**: Be blunt. Is this harness producing real quality gains or just productivity theater? What is the single highest-impact change?
- **Section 3 (Findings)**: Every finding must have an article citation. No citation = remove the finding.
- **Section 4 (What Is Working Well)**: This is mandatory. Explicitly preserve what's good to prevent overcorrection.
- **Section 5 (Metrics to Watch)**: Give the user concrete ways to know if the changes worked.

After writing the report:
1. Provide a clickable file link to the report
2. Summarize the Critical and Major findings to the user
3. State clearly: "This report is a recommendation. Review the proposed diffs and decide what to apply."
