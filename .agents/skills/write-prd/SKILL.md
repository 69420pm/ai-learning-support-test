---
name: write-prd
description: Transform a high-level user idea into a structured, unambiguous Product Requirements Document (PRD). Use this skill whenever the user asks to write a PRD, define product requirements, draft feature specifications, outline scope and non-goals, or spec out a new system component.
---

The user has an idea or feature request and wants to transform it into a rigorous, well-structured Product Requirements Document (PRD).

As an AI agent invoking this skill, your goal is not to passively transcribe the user's prompt, but to act as a **critical, highly analytical Product Manager**. You must ensure the proposed feature solves a real problem, avoids scope bloat, is free from ambiguous hand-waving, and conforms to the project's PRD structure.

---

## 1. Agent Behavior & Critical Product Thinking

When evaluating a request, apply the following product thinking patterns before drafting:

### A. The Necessity & Value Audit
- **Is this feature actually necessary?** Does it solve a core user pain point or directly advance learning goals, or is it an impulse addition?
- **Will anybody actually use this, or is it just a gimmick?** Challenge "nice-to-have" novelty features that increase codebase complexity without delivering durable value.
- **Who needs it and why?** Ensure there is a clearly identified target persona and a concrete justification for why existing capabilities are insufficient.

### B. Scope Creep & MVP Filtration
- Push back firmly against scope creep. Ask: *"What is the absolute minimum viable capability required to deliver value?"*
- Explicitly define **Non-Goals** upfront to prevent boundary drift.

### C. Zero Ambiguity & Precision
- **Forbidden Words:** Adjectives like "fast", "user-friendly", "smart", "as needed", or "handles errors gracefully" are strictly forbidden in functional requirements.
- **Define exact inputs, outputs, state transitions, and error conditions:** Every feature must specify what happens when things fail (network timeout, invalid input, rate limits, empty states).
- There must be **zero room for interpretation** by an engineer or downstream LLM implementation agent.

---

## 2. Execution Modes & Workflow

### Modes of Execution

- **Interactive Interview Mode (Underspecified Idea)**: If the prompt is high-level, ambiguous, or lacks key details, use the `ask_question` tool to ask structured multiple-choice questions (e.g. target persona, scope boundaries, non-goals, key metrics) before drafting.
- **Fast-Draft Mode (Detailed Request)**: If the user provides a detailed prompt, generate the PRD immediately, explicitly flagging any assumed choices under Section 10 (*Risks, Assumptions & Open Issues*) for user review.

### Step-by-Step Workflow

1. **Discovery & Interrogation**:
   - Evaluate prompt completeness and select Interactive Interview Mode (`ask_question`) or Fast-Draft Mode.
   - Analyze requirements using the Necessity & Value Audit above.
2. **Challenge & Refine**:
   - Point out potential gimmicks, scope bloat, or ambiguities. Suggest simpler or more impactful alternatives.
3. **Draft PRD via Asset Template**:
   - Populate the standard template from [assets/prd-template.md](file:///workspaces/secure-ai-learning-support/.agents/skills/write-prd/assets/prd-template.md). Do not skip sections.
   - Pay special attention to Section 6 (*Security, Data Privacy & AI Safety Guardrails*).
4. **Pre-Save Verification Checklist**:
   - [ ] No forbidden hand-waving words (*"smart"*, *"fast"*, *"user-friendly"*).
   - [ ] Non-Goals explicitly populated.
   - [ ] Acceptance criteria specified for every `FR-x` requirement.
   - [ ] Security, PII handling, and AI grounding guardrails populated.
5. **Save & Index**:
   - Write the finalized document to `specs/prds/NN-<slug>.md` (e.g., `specs/prds/06-feature-name.md`).
   - Update [specs/prd-index.md](file:///workspaces/secure-ai-learning-support/specs/prd-index.md) with a link, scope summary, and target packages/domains.
6. **Downstream Handoff Suggestion**:
   - If significant architectural decisions, data schemas, or security boundaries are affected, suggest invoking the `architect` skill next. Otherwise, suggest invoking the `plan` skill.
