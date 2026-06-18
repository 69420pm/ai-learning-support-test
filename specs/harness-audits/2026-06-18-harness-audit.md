# Agent Harness Audit: 2026-06-18

## 1. Audit Metadata

| Field | Value |
|-------|-------|
| **Date** | 2026-06-18 |
| **Mode** | Proactive |
| **Log source** | N/A — proactive audit |
| **Harness files analyzed** | 27 files: GEMINI.md, CONTRIBUTING.md, .geminiignore, Makefile, lefthook.yml, biome.json, 9× SKILL.md, 4× agent.json, git-workflow.sh, ci.yml, release.yml, pull_request_template.md, atomic_issue.md, config.yml, PLAN_TEMPLATE.md, PR_REVIEW_TEMPLATE.md, HARNESS_AUDIT_TEMPLATE.md, PRD, system_architecture.md, docs/context/GEMINI.md |
| **Articles consulted** | [stop-using-init-for-agents.md](../../docs/context/stop-using-init-for-agents.md), [agent-skills.md](../../docs/context/agent-skills.md), [good-specs.md](../../docs/context/good-specs.md), [intent-debt.md](../../docs/context/intent-debt.md), [agent-harness-engineering.md](../../docs/context/agent-harness-engineering.md), [agentic-engine-optimization.md](../../docs/context/agentic-engine-optimization.md), [loop-engineering.md](../../docs/context/loop-engineering.md), [self-improving-agents.md](../../docs/context/self-improving-agents.md) |

## 2. Executive Summary

**This harness is genuinely good.** The `GEMINI.md` file is textbook — minimal, self-aware about its own purpose, and zero discoverable bloat. The skill library covers the full SDLC lifecycle with a well-designed orchestration layer (`full-issue-implementation` coordinating subagents via TDD). The Makefile is an excellent agent API with self-documenting targets. Biome rules encode most coding conventions in tooling rather than prose. Lefthook enforces quality at commit time. This is a harness built by someone who has read the articles, and it shows.

**However, the harness has two structural holes that undermine the quality it's trying to enforce.** First, `system_architecture.md` — the single most-referenced file across skills — contains stale tooling references (Prettier/ESLint instead of Biome) that will actively misdirect agents. Second, the knowledge layer (`docs/context/`) is invisible: no skill, no config file, and no routing mechanism tells agents it exists. Sixteen carefully prepared articles sit unused because the harness never points to them. The single highest-impact change is adding a routing line to `GEMINI.md` and fixing the stale architecture doc.

**The secondary theme is intent debt.** Templates and skills consistently capture WHAT but not WHY — no "Alternatives Considered" in plans, no "Decision Rationale" in issues. Per `intent-debt.md`, every agent session that produces undocumented decisions compounds the cost for every future session.

## 3. Findings

### 🔴 Critical (Actively causing agent failures or quality loss)

#### C1: system_architecture.md contains stale tooling references

- **File**: [system_architecture.md](file:///Users/kevinsmith/Documents/development/typescript/ai-learning-support/specs/system_architecture.md) — Section 5 "Engineering Guidelines"
- **Problem**: Section 5 states: "**Prettier** for consistent code formatting" and "**ESLint** with standard React/TypeScript rules." The project actually uses **Biome** (confirmed by `biome.json` v2.4.14 with comprehensive rules including `noExplicitAny: error`, `useNamingConvention: error`, `noNonNullAssertion: error`). Five skills instruct agents to "Read `specs/system_architecture.md` for architectural context" — any agent reading Section 5 will either try to use ESLint/Prettier, or waste time reconciling the contradiction with the actual biome.json.
- **Evidence**: [agent-harness-engineering.md](file:///Users/kevinsmith/Documents/development/typescript/ai-learning-support/docs/context/agent-harness-engineering.md) — "Context rot: When harness files contain outdated information, agents follow it and produce wrong output. Context rot is worse than no context — wrong context is actively harmful." Also [stop-using-init-for-agents.md](file:///Users/kevinsmith/Documents/development/typescript/ai-learning-support/docs/context/stop-using-init-for-agents.md) — "Instructions written for last month's codebase don't get updated. The agent follows outdated guidance, produces code that conflicts with current patterns, and the human has to fix it."
- **Expected impact if fixed**: Eliminates a source of agent confusion in every implementation and review task. Agents will correctly use `make lint` / `make format` (Biome) instead of attempting ESLint/Prettier commands.
- **Proposed change**:
  ```diff
  ## 5. Engineering Guidelines
  
  To match high-performance industry standards:
  
  1. **Strict TypeScript:** `strict: true` enabled in all `tsconfig.json` configurations.
  2. **Formatting & Quality:**
  -  - **Prettier** for consistent code formatting.
  -  - **ESLint** with standard React/TypeScript rules.
  +  - **Biome** for linting and formatting (replaces ESLint and Prettier).
  +  - `noExplicitAny`, `noNonNullAssertion`, `useNamingConvention`, and `noExcessiveCognitiveComplexity` enforced as errors.
  3. **Automated Testing:**
     - Core mathematical and logical modules (specifically the FSRS spaced repetition algorithm and PDF parsing engine) must have unit tests written using **Vitest**.
  4. **CI/CD:**
     - GitHub Actions configured to run lint checks, type compiler checks, and tests on every pull request.
  + 5. **Git Hooks:**
  +    - **Lefthook** pre-commit hooks run Biome auto-fix and related tests on staged files.
  +    - **Lefthook** pre-push hooks run TypeScript type checking.
  ```

---

#### C2: Branch naming convention is contradictory across harness files

- **File**: [CONTRIBUTING.md](file:///Users/kevinsmith/Documents/development/typescript/ai-learning-support/CONTRIBUTING.md) — Section 3.1, and multiple skill files
- **Problem**: Three different branch naming conventions coexist:
  - `CONTRIBUTING.md` instruction: `"Name it fix/issue-<num>"`
  - `CONTRIBUTING.md` example: `"git checkout -b feature/issue-42-pdf-chunking"`
  - Skills (implement-issue, full-issue-implementation): `"make create-branch NAME=fix-issue-<issue_number>"`
  
  The first uses a slash separator, the example uses a different prefix entirely, and the skills use hyphen-only. An agent will follow whichever it reads first, creating inconsistent branch names across the project.
- **Evidence**: [stop-using-init-for-agents.md](file:///Users/kevinsmith/Documents/development/typescript/ai-learning-support/docs/context/stop-using-init-for-agents.md) — "The Contradiction Machine: Instructions that conflict with each other because nobody prunes stale entries." Also [good-specs.md](file:///Users/kevinsmith/Documents/development/typescript/ai-learning-support/docs/context/good-specs.md) — specs with contradictory instructions guarantee agent failure because the agent must choose which instruction to follow, and the choice is arbitrary.
- **Expected impact if fixed**: Consistent branch naming across all agent-created branches. Eliminates a class of confusion where agents pick the wrong convention.
- **Proposed change** — align CONTRIBUTING.md with the Makefile/skill convention:
  ```diff
  ### 3.1 Step-by-Step Implementation Lifecycle
  1. **Assign / Choose an Issue**: All work must correspond to an open GitHub issue.
  2. **Create a Feature Branch**:
     - Create your branch from `main`.
  -  - Name it `fix/issue-<num>`.
  -  - Example: `git checkout -b feature/issue-42-pdf-chunking`.
  +  - Name it using the Makefile: `make create-branch NAME=fix-issue-<num>`
  +  - Example: `make create-branch NAME=fix-issue-42`
  ```

---

### 🟡 Major (Measurable waste or missed quality opportunity)

#### M1: Knowledge layer is invisible — no harness file routes agents to docs/context/

- **File**: [GEMINI.md](file:///Users/kevinsmith/Documents/development/typescript/ai-learning-support/GEMINI.md), all 9 SKILL.md files
- **Problem**: The project has 16 carefully authored articles in `docs/context/` with an excellent knowledge map at `docs/context/GEMINI.md`. But **zero harness files mention this layer exists**. No skill says "read docs/context/X for deeper context." GEMINI.md doesn't route to it. CONTRIBUTING.md doesn't mention it. Agents following skills will never discover this knowledge unless they happen to explore the `docs/` directory autonomously — which is unreliable per the agentic-engine-optimization article.
- **Evidence**: [agentic-engine-optimization.md](file:///Users/kevinsmith/Documents/development/typescript/ai-learning-support/docs/context/agentic-engine-optimization.md) — "Level 1 (Routed): Knowledge map / index file — tells agents where to find specific topics... Guided discovery [is far better than] Autonomous discovery: Agent explores file tree, reads configs → expensive, unreliable." Also [stop-using-init-for-agents.md](file:///Users/kevinsmith/Documents/development/typescript/ai-learning-support/docs/context/stop-using-init-for-agents.md) — routing instructions ("For authentication patterns, read docs/auth-architecture.md") are one of the things that DOES belong in AGENTS.md.
- **Expected impact if fixed**: Agents gain access to domain expertise that improves decision quality. Skills that benefit from deeper context (e.g., review-pr could reference agentic-code-review.md) produce better output.
- **Proposed change** — add a routing entry to GEMINI.md:
  ```diff
  ## Active Gotchas & Landmines
  *(None currently. Keep this file minimal to save token budget and prevent anchoring effects.)*
  +
  + ## Knowledge Routing
  + For deeper context on agentic engineering patterns, harness design, spec writing, and code review methodology, consult the knowledge map at `docs/context/GEMINI.md`. It routes to the right article for any given problem.
  ```

---

#### M2: Several skills missing explicit checkpoints between phases

- **File**: [implement-issue/SKILL.md](file:///Users/kevinsmith/Documents/development/typescript/ai-learning-support/.agents/skills/implement-issue/SKILL.md), [implement-unit-test-for-issue/SKILL.md](file:///Users/kevinsmith/Documents/development/typescript/ai-learning-support/.agents/skills/implement-unit-test-for-issue/SKILL.md), [convert-plan-to-issues/SKILL.md](file:///Users/kevinsmith/Documents/development/typescript/ai-learning-support/.agents/skills/convert-plan-to-issues/SKILL.md)
- **Problem**: These three skills proceed from reading the issue straight to implementation/creation without a checkpoint for the agent (or user) to verify understanding. `implement-issue` reads the issue and immediately starts coding. `implement-unit-test-for-issue` reads the issue and immediately starts writing tests. `convert-plan-to-issues` reads the plan and immediately starts creating GitHub issues. If the agent misunderstands the requirements, the error compounds through all subsequent steps.
- **Evidence**: [agent-skills.md](file:///Users/kevinsmith/Documents/development/typescript/ai-learning-support/docs/context/agent-skills.md) — "Agents given a long sequence of instructions will plow through all steps without stopping, even when early steps produced wrong results. By the time they finish, the error has propagated through everything and the entire output is unusable." Also: "Checkpoints serve two purposes: Error detection (catch mistakes before they compound) and Human oversight (give the human a chance to course-correct). At minimum: after research, after implementation, after testing."
- **Expected impact if fixed**: Catches misunderstood requirements before they become wrong code or wrong issues. Reduces rework from requirement misalignment.
- **Proposed change** — example for implement-issue (similar pattern for the other two):
  ```diff
  2. **Understand the Requirements & Existing Tests**:
     - Review the issue details carefully, identifying the list of files to modify and the specific tasks.
     - Inspect the existing test files related to the issue (e.g., `*.test.ts` or `*.spec.ts`).
  +
  + **Checkpoint**: Summarize your understanding of the issue and your planned approach (which files to modify, what pattern to follow). If running interactively, confirm with the user before proceeding. If running as a subagent, state your plan in your message back to the orchestrator.
  
  3. **Implement the Code**:
  ```

---

#### M3: Templates and skills do not capture intent (WHY decisions were made)

- **File**: [PLAN_TEMPLATE.md](file:///Users/kevinsmith/Documents/development/typescript/ai-learning-support/specs/plan/PLAN_TEMPLATE.md), [atomic_issue.md](file:///Users/kevinsmith/Documents/development/typescript/ai-learning-support/.github/ISSUE_TEMPLATE/atomic_issue.md)
- **Problem**: The PLAN_TEMPLATE has no section for "Alternatives Considered" or "Decision Rationale." The atomic_issue.md template has no "Why this approach?" field. The implement-issue skill doesn't require documenting decisions. This means every agent-implemented feature produces code with zero recorded rationale, and every future agent session that touches that code starts from zero understanding of WHY.
- **Evidence**: [intent-debt.md](file:///Users/kevinsmith/Documents/development/typescript/ai-learning-support/docs/context/intent-debt.md) — "When an AI agent writes code, there is no 'why' anywhere. The agent doesn't have persistent memory. The rationale existed briefly in the context window and then vanished. The result: code that works, but nobody knows why it's written that way. This makes every future change a gamble." Also: "Intent debt compounds like financial debt... Eventually the module becomes a 'don't touch it' zone."
- **Expected impact if fixed**: Future agents (and humans) can understand why decisions were made without re-deriving from scratch. Prevents the "deleted guard clause nobody can explain" failure mode.
- **Proposed change** — add to PLAN_TEMPLATE.md:
  ```diff
  ## 4. Acceptance Criteria
  - [ ] [Criterion 1: Concrete, verifiable behavior]
  - [ ] [Criterion 2]
  
  + ## 4.5 Key Decisions & Rationale
  + | Decision | Why this approach | Alternatives rejected | Constraints |
  + |----------|------------------|----------------------|-------------|
  + | [Decision 1] | [Rationale] | [What else was considered] | [What forced this choice] |
  +
  ## 5. Testing Strategy
  ```
  And add to atomic_issue.md:
  ```diff
  ## Implementation Details
  > [!IMPORTANT]
  > This issue must be an atomic unit of work.

  + - **Rationale**: [Why this approach was chosen, what alternatives were considered]
  - **Files to Modify**:
  ```

---

#### M4: CONTRIBUTING.md contains ~60% discoverable content inflating agent context

- **File**: [CONTRIBUTING.md](file:///Users/kevinsmith/Documents/development/typescript/ai-learning-support/CONTRIBUTING.md)
- **Problem**: The file is ~7000 bytes. Approximately 60% consists of information agents can discover from existing files:
  - **Directory structure** (Section 1): discoverable via `ls` / `find`
  - **Available Make commands** (Section 5): discoverable via `make help`
  - **TypeScript config details** (Section 2.1, partially): discoverable from `tsconfig.json`
  - **Biome config details** (Section 2.2, partially): discoverable from `biome.json`
  - **Commit convention details** (Section 4): standard Conventional Commits format
  
  The genuinely non-discoverable content is excellent: Section 2.1's `noUncheckedIndexedAccess` gotcha, Section 6's agent-specific guidelines. But these high-value entries are buried in ~4000 tokens of noise.
- **Evidence**: [stop-using-init-for-agents.md](file:///Users/kevinsmith/Documents/development/typescript/ai-learning-support/docs/context/stop-using-init-for-agents.md) — "Things that do NOT belong: Tech stack description (agent can read package.json), Directory structure (agent can run ls), Available commands (agent can read Makefile)." And: "Every token spent on boilerplate content is a token NOT available for actual code, error messages, or task-relevant information."
- **Expected impact if fixed**: ~4000 fewer tokens consumed when agents read this file. The genuinely valuable guidelines get more attention weight.
- **Proposed change**: This is a substantial refactor — not a single diff. The recommendation is to:
  1. Move Section 6 "Guidelines for Autonomous AI Agents" into GEMINI.md (this IS non-discoverable and high-impact)
  2. Remove the directory structure section entirely (agents can `ls`)
  3. Remove the Make commands table (agents can `make help`)
  4. Keep Section 2 coding standards — but trim to only non-discoverable gotchas (e.g., `noUncheckedIndexedAccess` behavior)
  5. Keep Section 3 workflow and Section 4 commit conventions (these serve human contributors too)

---

### 🟢 Minor (Polish / defense-in-depth)

#### m1: CI workflow missing concurrency control

- **File**: [ci.yml](file:///Users/kevinsmith/Documents/development/typescript/ai-learning-support/.github/workflows/ci.yml)
- **Problem**: The CI workflow has no `concurrency` group. When multiple commits are pushed quickly (common with agent workflows), redundant CI runs execute simultaneously, wasting GitHub Actions minutes.
- **Evidence**: [agent-harness-engineering.md](file:///Users/kevinsmith/Documents/development/typescript/ai-learning-support/docs/context/agent-harness-engineering.md) — Quality gates should provide fast feedback. Redundant parallel runs slow the feedback loop.
- **Proposed change**:
  ```diff
  on:
    push:
      branches: [main]
    pull_request:
      branches: [main]
  
  + concurrency:
  +   group: ${{ github.workflow }}-${{ github.ref }}
  +   cancel-in-progress: true
  +
  jobs:
  ```

---

#### m2: PRD self-references itself in Section 2.1

- **File**: [product_requirements_document.md](file:///Users/kevinsmith/Documents/development/typescript/ai-learning-support/specs/product_requirements_document.md) — Section 2.1
- **Problem**: The text says: "You can read more about the vision and motivation in the product requirement document at `specs/product_requirements_document.md`." This IS the product requirement document — the sentence references itself. An agent reading this will waste a tool call re-reading the same file.
- **Evidence**: [stop-using-init-for-agents.md](file:///Users/kevinsmith/Documents/development/typescript/ai-learning-support/docs/context/stop-using-init-for-agents.md) — Stale or circular instructions waste agent time and tokens.
- **Proposed change**:
  ```diff
  - You can read more about the vision and motivation in the product requirement document at `specs/product_requirements_document.md`.
  ```

---

#### m3: Agent definitions (agent.json) are thin wrappers that don't add value

- **File**: `.agents/agents/*/agent.json` (all 4)
- **Problem**: Each agent.json contains a single system prompt sentence like "You are a specialized agent. Follow the [skill] skill." These add an indirection layer without providing additional context, boundaries, or configuration beyond what the SKILL.md already contains. Per the skill design principles, the skill IS the workflow — a thin wrapper that just says "follow the skill" is redundant.
- **Evidence**: [agent-skills.md](file:///Users/kevinsmith/Documents/development/typescript/ai-learning-support/docs/context/agent-skills.md) — Skills should be self-contained with boundaries and context. If the agent definition adds nothing beyond "follow the skill," it's pure indirection.
- **Proposed change**: Not urgent. Consider enriching agent definitions with model-specific tuning, or removing them if skills are invoked directly via the skill system rather than these agent definitions.

---

#### m4: No failure journal or learnings file

- **File**: `.agents/logs/` (empty directory)
- **Problem**: The `.agents/logs/` directory exists but is empty. No failure journal or learnings file captures past agent mistakes and their resolutions. Each new session starts from zero without benefit of prior failures.
- **Evidence**: [self-improving-agents.md](file:///Users/kevinsmith/Documents/development/typescript/ai-learning-support/docs/context/self-improving-agents.md) — "Failure Journals: Record agent failures and their resolutions... the harness accumulates the project's collective learning. Each session starts smarter than the last — not because the agent remembers, but because the harness prevents known failure modes." Also [agent-harness-engineering.md](file:///Users/kevinsmith/Documents/development/typescript/ai-learning-support/docs/context/agent-harness-engineering.md) — "The ratchet principle: When an agent makes a mistake, turn it into a permanent rule."
- **Proposed change**: Start recording failures when they occur. Create a lightweight template:
  ```diff
  + # .agents/logs/failure-journal.md
  + # Agent Failure Journal
  + Record failures here to prevent repetition. Each entry should lead to a harness change (lint rule, skill boundary, or GEMINI.md gotcha).
  +
  + | Date | Task | Failure | Root Cause | Prevention (harness change) |
  + |------|------|---------|------------|----------------------------|
  ```

---

## 4. What Is Working Well (Do NOT Change)

1. **GEMINI.md is exemplary**: At ~200 tokens with zero discoverable content, explicit meta-rules about its own purpose, and a commitment to shrinking over time — this is exactly what [stop-using-init-for-agents.md](file:///Users/kevinsmith/Documents/development/typescript/ai-learning-support/docs/context/stop-using-init-for-agents.md) prescribes. Resist the temptation to add to it beyond the routing entry recommended in M1.

2. **Biome encodes conventions in tooling, not prose**: `noExplicitAny: error`, `noNonNullAssertion: error`, `useNamingConvention: error`, `noExcessiveCognitiveComplexity: error`, `noUnusedVariables: error`, `noUnusedImports: error` — these are all rules that would otherwise bloat GEMINI.md. This follows the ratchet principle perfectly: enforce via deterministic tooling, not agent attention.

3. **Lefthook pre-commit hooks run both lint AND related tests**: The `pre-commit` hook runs Biome auto-fix on staged files AND runs `vitest related` for only the tests affected by staged files. This is a tight, fast feedback loop that catches issues before they enter the commit history. The `pre-push` hook adds typecheck as a second gate. Excellent layered enforcement.

4. **The `full-issue-implementation` skill is well-architected**: It correctly separates orchestration from implementation, defines clear subagent boundaries ("You are a sequencing agent only. Do NOT read source files"), uses TDD workflow (tests first → implementation), and has explicit fallback behavior for failures. One of the strongest skills in the harness.

5. **`implement-issue` skill has a test-run ratchet**: "Do NOT run `make test` more than 3 times total. If tests still fail after 3 attempts, stop and report the failure." This is an anti-looping mechanism derived from the principles in [loop-engineering.md](file:///Users/kevinsmith/Documents/development/typescript/ai-learning-support/docs/context/loop-engineering.md) — concrete kill criteria that prevent retry loops.

6. **`implement-unit-test-for-issue` skill correctly handles TDD constraints**: It acknowledges that tests will fail during TDD red phase and provides a workaround (`git commit --no-verify`) while still requiring typecheck and lint pass. Thoughtful skill design that accounts for real workflow constraints.

7. **Makefile as a comprehensive agent API**: The Makefile provides a complete CRUD interface for git branches, GitHub issues, and PRs — all via well-named targets with clear parameter passing. `make help` is self-documenting. `make commit` enforces `make check` before committing. Exactly the "Makefile as agent API" pattern recommended in [agent-harness-engineering.md](file:///Users/kevinsmith/Documents/development/typescript/ai-learning-support/docs/context/agent-harness-engineering.md).

8. **The knowledge map (docs/context/GEMINI.md) is excellent**: Categories, depth tags, "Read when" routing hints, cross-references between articles, and a quick reference table. A model knowledge map per [agentic-engine-optimization.md](file:///Users/kevinsmith/Documents/development/typescript/ai-learning-support/docs/context/agentic-engine-optimization.md). The only problem is nothing routes agents TO it (addressed in M1).

9. **Skill boundaries are specific and actionable**: Skills like `implement-issue` and `review-pr` have explicit "Do NOT" lists targeting known failure modes (don't read infrastructure files, don't run exploratory commands, don't run make check independently). Boundaries born from real problems, not hypothetical concerns.

10. **Issue template disables blank issues**: `config.yml` with `blank_issues_enabled: false` forces all issues through the atomic_issue template. A ratchet that prevents low-quality issues from entering the system.

## 5. Metrics to Watch

After applying the proposed changes, track these to know if they worked:

| Metric | Current baseline | Expected after changes | How to measure |
|--------|-----------------|----------------------|----------------|
| Agent tool confusion (wrong linter/formatter) | Unknown — likely occurs when agents read system_architecture.md | Zero occurrences | Search session logs for "eslint", "prettier" commands attempted |
| Branch naming consistency | Mixed (`fix/`, `feature/`, `fix-`) | 100% consistent pattern | `git branch -a` to verify naming patterns |
| Knowledge article reads per session | ~0 (articles are invisible) | 1-2 relevant articles per complex task | Count `docs/context/` file reads in session logs |
| Intent documentation in plans | 0 plans with "Alternatives Considered" | 100% of new plans include rationale section | Review specs/plan/ files for the new section |
| Rework from misunderstood requirements | Unknown | Measurable reduction | Track checkpoint corrections where user redirects agent |

## 6. Recommended Next Steps

1. **Fix C1 immediately**: Update `system_architecture.md` Section 5 to reference Biome instead of Prettier/ESLint. A 2-minute edit that prevents a class of active failures.
2. **Fix C2 immediately**: Align branch naming in CONTRIBUTING.md with the Makefile/skill convention. Another 2-minute edit.
3. **Apply M1**: Add the knowledge routing entry to GEMINI.md. One line that unlocks 16 articles for every agent session.
4. **Apply M3**: Add the intent capture sections to PLAN_TEMPLATE.md and atomic_issue.md. Small template changes with compounding returns.
5. **Apply M2 selectively**: Add checkpoints to `implement-issue` and `implement-unit-test-for-issue`.
6. **Defer M4**: The CONTRIBUTING.md refactor is the largest change and lowest urgency. Schedule for a dedicated cleanup session.
7. **Start the failure journal (m4)**: Create the template now so it's ready when the next failure occurs.
