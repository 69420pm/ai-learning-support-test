---
name: write-adr
description: Document an architectural decision in a standardized Architectural Decision Record (ADR) format. Use this skill whenever the user asks to write an ADR, record an architectural decision, document a technical trade-off, spec a system design choice, or following an architect skill session.
---

The user or an architectural discussion has reached a technical decision and needs to record it in an Architectural Decision Record (ADR).

As an AI agent invoking this skill, your goal is to act as a **critical Staff Architect**. You must ensure decisions are aligned with core system constraints, objectively evaluate trade-offs without strawman options, verify reversibility, and maintain a strict 3-digit zero-padded document index.

---

## 1. Staff Engineer Architectural Thinking

When evaluating an architectural decision, apply these core principles before drafting:

### A. Dynamic Alignment with Workspace Invariants
- **Foundation ADR Compliance:** Inspect [specs/adr-index.md](file:///workspaces/secure-ai-learning-support/specs/adr-index.md) and load all ADRs under *"Foundation & Core Invariants"*. Proposed decisions MUST NOT violate these system-wide rules (e.g., package isolation, adapter abstractions, local-first privacy).
- **Domain Context Compliance:** Load any relevant ADRs listed under *"Domain & Feature Infrastructure"* in [specs/adr-index.md](file:///workspaces/secure-ai-learning-support/specs/adr-index.md) that touch the specific domains or packages affected.
- **Project Philosophy:** Ensure decisions align with general project principles in [rules/project-rules.md](file:///workspaces/secure-ai-learning-support/rules/project-rules.md) (Lean & Simple, Feature Isolation, Adapter Pattern, Reversibility).

### B. Trade-off Balance & No Strawmen
- **No Fake Alternatives:** Alternatives considered must be realistic, viable technical options that were legitimately weighed. Avoid creating trivial "do nothing" or obviously absurd strawman options.
- **Trade-off Symmetry:** Every architectural choice has a cost. Clearly articulate both *What Becomes Easier* and *What Becomes Harder*.
- **Blast Radius & Reversibility:** Document how easy or costly it will be to change, migrate, or reverse this decision in the future.

---

## 2. Execution Modes & Workflow

### Modes of Execution

- **Post-Architect Handoff (From `architect` Discussion)**: Extract finalized decisions, trade-offs, and rejected options directly from recent conversation context.
- **Interactive Technical Interview (Underspecified Decision)**: If the prompt or context is missing key rationale, trade-offs, or concrete interfaces, use the `ask_question` tool to clarify decisions with the user before drafting.
- **Fast-Draft Mode (Explicit Context Provided)**: If complete architectural context, rationale, and options are provided, draft the ADR immediately.

---

## Step-by-Step Workflow

### Step 1: Context Discovery & Tiered Architectural Pre-Read
Before writing any ADR, perform a mandatory pre-read to verify system compatibility:
1. View [specs/adr-index.md](file:///workspaces/secure-ai-learning-support/specs/adr-index.md) to discover the project's ADR hierarchy.
2. **Mandatory Foundation Read:** Read ALL ADRs listed under *"Foundation & Core Invariants"* in `specs/adr-index.md`.
3. **Contextual Domain Read:** Read any ADRs listed under *"Domain & Feature Infrastructure"* in `specs/adr-index.md` that govern the target packages/domains affected by this decision.
4. View [specs/architecture-index.md](file:///workspaces/secure-ai-learning-support/specs/architecture-index.md) and [rules/project-rules.md](file:///workspaces/secure-ai-learning-support/rules/project-rules.md).

### Step 2: Determine Next ADR Number & Filename
1. List existing files in `specs/adrs/` or inspect `specs/adr-index.md` to find the highest existing ADR number (e.g., `003`).
2. Increment the number by 1 and format it as a 3-digit zero-padded string (e.g., `004`).
3. Construct the filename: `specs/adrs/00X-<kebab-case-slug>.md` (e.g., `specs/adrs/004-biome-import-boundary-enforcement.md`).

### Step 3: Populate Template
Populate the standard template from [assets/adr-template.md](file:///workspaces/secure-ai-learning-support/.agents/skills/write-adr/assets/adr-template.md):
- Fill all metadata fields: Status, Date (YYYY-MM-DD), Deciders, Target Domains / Packages.
- Include concrete code/interface abstractions or Mermaid diagrams where beneficial.
- Document rejection rationales for every alternative option listed.

### Step 4: Pre-Save Verification Checklist
- [ ] ADR number uses 3-digit zero-padded format (`00X`), matching existing repo conventions.
- [ ] Mandatory foundation & contextual domain pre-reads executed via `specs/adr-index.md`.
- [ ] Both positive (*Easier*) and negative (*Harder*) consequences are documented.
- [ ] Alternatives considered are real technical choices with clear rejection rationales.
- [ ] All file links use valid markdown or `file:///` format.

### Step 5: Save ADR & Update Tiered Index
1. Write the completed document to `specs/adrs/00X-<kebab-case-slug>.md`.
2. Update [specs/adr-index.md](file:///workspaces/secure-ai-learning-support/specs/adr-index.md) by adding the new ADR link and summary under the appropriate tier (*Foundation & Core Invariants* OR *Domain & Feature Infrastructure*).

### Step 6: Downstream Handoff Suggestion
- Once the ADR is saved, suggest invoking the `plan` skill to break the architectural decision down into implementation tasks, or `tdd-implement` if execution begins immediately.
