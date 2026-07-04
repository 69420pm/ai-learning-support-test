---
name: plan
description: Create a highly detailed, TDD-ready implementation plan from a PRD, ADR, user request, or feature spec. Use this skill whenever the user asks to plan a feature, break down a task, draft an implementation plan, prep work for TDD, outline code changes across monorepo packages, or prepare a step-by-step technical spec.
---

# Plan Skill: High-Precision Implementation Planning

> **Role & Mindset**: You are acting as a **Principal Staff Architect and Technical Lead**. When producing implementation plans, your primary goal is to eliminate ambiguity, enforce active monorepo architectural invariants, and break features down into TDD-ready atomic tasks. Bad plans lead to trash code; exceptional plans make execution deterministic, modular, and robust.

---

## High-Level Workflow

Creating an implementation plan involves 7 structured phases:

```
1. Discovery & Context Scan (Load live rules, specs, ADRs, existing code)
2. Execution Modes (Pragmatic PRD/ADR proposal vs fast shortcut planning)
3. Architectural & Monorepo Impact Mapping (Validate against rules/ & specs/)
4. Atomic Task Decomposition (Sized to ~1 commit, TDD instructions, criteria)
5. Pre-Save Verification Checklist (Zero hand-waving, rule compliance)
6. Hybrid Persistence (Save to specs/plans/NN-<slug>.md AND present as artifact)
7. Handoff to tdd-implement (Clear downstream instructions)
```

---

## Phase 1: Codebase & Context Discovery (Mandatory Pre-Read)

Before drafting any plan, you MUST inspect the workspace's canonical specification and rule files to ensure your plan reflects the latest system state:

1. **Read Active Architectural Specs & Invariants**:
   - Inspect [specs/architecture-index.md](file:///workspaces/secure-ai-learning-support/specs/architecture-index.md) for current monorepo layer boundaries and unidirectional flow rules.
   - Inspect [specs/adr-index.md](file:///workspaces/secure-ai-learning-support/specs/adr-index.md) and load all active *Foundation & Core Invariants* ADRs as well as contextual domain ADRs.
   - Inspect [specs/prd-index.md](file:///workspaces/secure-ai-learning-support/specs/prd-index.md) and load the feature's PRD if applicable.

2. **Read Active Workspace Rules**:
   - Inspect [rules/project-rules.md](file:///workspaces/secure-ai-learning-support/rules/project-rules.md) for active philosophy and architectural constraints (e.g., feature isolation, adapters, simplicity).
   - Inspect [rules/coding-style.md](file:///workspaces/secure-ai-learning-support/rules/coding-style.md) for file naming, typing, and pattern constraints.
   - Inspect [rules/testing.md](file:///workspaces/secure-ai-learning-support/rules/testing.md) for test placement, framework specifications, and test isolation.
   - Inspect [rules/git-workflow.md](file:///workspaces/secure-ai-learning-support/rules/git-workflow.md) for branch conventions, commit formats, and validation checks.
   - Inspect [rules/styling.md](file:///workspaces/secure-ai-learning-support/rules/styling.md) if modifying frontend code in `apps/web/`.

3. **Perform Codebase Exploration**:
   - Use `grep_search` or `mgrep` to scan existing code for existing types, interfaces, reusable helpers, and service patterns before introducing new files or structures.
   - Verify exact file paths of modules you intend to touch.

---

## Phase 2: Execution Modes (Clarification vs Fast-Plan)

Evaluate prompt and spec completeness, as well as feature scope:

- **Interactive Clarification & Upstream Spec Proposal (Underspecified Feature/Spec)**:
  - Assess feature scale and complexity:
    - **Large or Architecturally Complex Features**: If the request involves major structural changes, new core capabilities, or open technical trade-offs where upfront alignment is critical, propose drafting a PRD via [write-prd](file:///workspaces/secure-ai-learning-support/.agents/skills/write-prd/SKILL.md) or ADR via [architect](file:///workspaces/secure-ai-learning-support/.agents/skills/architect/SKILL.md) / [write-adr](file:///workspaces/secure-ai-learning-support/.agents/skills/write-adr/SKILL.md) first.
    - **Small, Localized, or Obvious Features**: If the feature or fix is small, self-contained, or straightforward, do NOT force heavy ceremonial spec boilerplate. Taking the "shortcut" directly to planning (or using `ask_question` for quick 1-minute clarifications) is valid and preferred to prevent slowing down development velocity.
- **Fast-Plan Mode (Comprehensive Request/Spec)**:
  - If a detailed PRD, ADR, or clear prompt provides complete requirements, proceed directly to drafting the plan, explicitly listing any minor assumptions under Section 5 (*Risk Assessment & Fallback Plan*).

---

## Phase 3: Architectural & Monorepo Impact Mapping

Validate the proposed changes directly against the canonical rule files loaded in Phase 1:

1. **Layer Boundary Verification**:
   - Verify that planned code placements respect the unidirectional flow rules defined in [specs/architecture-index.md](file:///workspaces/secure-ai-learning-support/specs/architecture-index.md).
2. **Project Invariants Verification**:
   - Verify compliance with active core principles in [rules/project-rules.md](file:///workspaces/secure-ai-learning-support/rules/project-rules.md) (e.g. feature isolation boundaries, adapter interfaces).
3. **Reference Planning Guidelines**:
   - Consult [planning-guidelines.md](file:///workspaces/secure-ai-learning-support/.agents/skills/plan/references/planning-guidelines.md) for detailed task sizing heuristics and multi-PR splitting thresholds.

---

## Phase 4: Atomic Task Decomposition & TDD Design

Populate the plan using the asset template at [assets/plan-template.md](file:///workspaces/secure-ai-learning-support/.agents/skills/plan/assets/plan-template.md).

### Task Sizing Requirements
- Each task MUST be sized to **roughly one logical commit** ($\le$ 1 unit of work).
- Touch at most **1–4 files per task** (typically 1 source file, 1 co-located test file, and shared exports).
- If a task exceeds ~250 lines or touches 5+ files, split it into smaller tasks.
- If the entire plan exceeds **8–10 tasks**, explicitly suggest splitting into sequential PR phases.

### TDD Task Elements
Every task in Section 4 of the plan MUST contain:
- **Goal & Rationale**: Why this task exists.
- **Target Files**: Absolute/relative paths to source file and co-located test file.
- **Interfaces & Data Contracts**: Concrete TypeScript type/function signatures adhering to [rules/coding-style.md](file:///workspaces/secure-ai-learning-support/rules/coding-style.md).
- **TDD Instructions**: Explicit 5-step Red/Green/Refactor instructions including the test command specified in [rules/testing.md](file:///workspaces/secure-ai-learning-support/rules/testing.md).
- **Acceptance Criteria**: Checkable list of verifiable outcomes.
- **Git Commit Command**: Commit string formatted per [rules/git-workflow.md](file:///workspaces/secure-ai-learning-support/rules/git-workflow.md).

---

## Phase 5: Pre-Save Verification Checklist

Before saving or presenting the plan, verify against canonical rule files:

- [ ] **No Forbidden Hand-Waving**: Zero forbidden adjectives (*"smart"*, *"fast"*, *"as needed"*, *"handle errors appropriately"*).
- [ ] **Co-located Tests Specified**: Every code file modified/created has a paired `.test.ts` file listed per [rules/testing.md](file:///workspaces/secure-ai-learning-support/rules/testing.md).
- [ ] **Explicit Commands**: Every task contains an executable test command per [rules/testing.md](file:///workspaces/secure-ai-learning-support/rules/testing.md).
- [ ] **Architectural Compliance**: Verified against [specs/architecture-index.md](file:///workspaces/secure-ai-learning-support/specs/architecture-index.md) and [rules/project-rules.md](file:///workspaces/secure-ai-learning-support/rules/project-rules.md).
- [ ] **Code Style & Naming Standards**: All proposed files and signatures adhere to [rules/coding-style.md](file:///workspaces/secure-ai-learning-support/rules/coding-style.md).
- [ ] **Target Branch & Git Workflow**: Specified branch name and commit format adhere to [rules/git-workflow.md](file:///workspaces/secure-ai-learning-support/rules/git-workflow.md).

---

## Phase 6: Hybrid Persistence & Output

Save and present the plan using the **Hybrid Approach**:

1. **Determine Plan Path**:
   - Assign a sequential number and kebab-case slug: `specs/plans/NN-<slug>.md` (e.g. `specs/plans/01-document-ingestion-parser.md`).
2. **Write File to Workspace**:
   - Write the completed plan to `specs/plans/NN-<slug>.md`.
   - Update `specs/plan-index.md` (or create if missing) with the new plan link and status summary.
3. **Present as AGY Artifact**:
   - Simultaneously output the plan as an AGY artifact so the user can interactively review and monitor execution in the IDE panel.

---

## Phase 7: Downstream Handoff

After presenting the plan, recommend the next logical step:
- **Immediate Execution**: Suggest invoking the [tdd-implement](file:///workspaces/secure-ai-learning-support/.agents/skills/tdd-implement/SKILL.md) skill to execute the plan step-by-step using TDD.
- **Architectural Review**: If unresolved technical trade-offs were identified, suggest invoking the [architect](file:///workspaces/secure-ai-learning-support/.agents/skills/architect/SKILL.md) or [write-adr](file:///workspaces/secure-ai-learning-support/.agents/skills/write-adr/SKILL.md) skill.
