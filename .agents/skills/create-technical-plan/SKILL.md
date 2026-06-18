---
name: create-technical-plan
description: Use when the user wants to create a detailed technical implementation plan for a feature.
---

### Objective
Translate a proposed feature or idea into a highly thorough, step-by-step technical plan that leaves no room for ambiguity. The plan should be detailed enough that a junior developer could implement it successfully without additional guidance.

### Step-by-Step Instructions

1. **Ingest the Feature Request & Gather Context**:
   - Retrieve the idea or feature description from the user's prompt or the designated idea file (located in `specs/ideas/`).
   - Read the system architecture file (located at `specs/system_architecture.md`) to understand the application structure.
   - Read the established architectural decisions in [specs/decisions.md](file:///Users/kevinsmith/Documents/development/typescript/ai-learning-support/specs/decisions.md) to understand current project constraints and patterns.
   - Consult relevant design guidelines from the knowledge layer: [good-specs.md](file:///Users/kevinsmith/Documents/development/typescript/ai-learning-support/docs/context/good-specs.md) (for writing clean, atomic specifications) and [intent-debt.md](file:///Users/kevinsmith/Documents/development/typescript/ai-learning-support/docs/context/intent-debt.md) (on capturing architectural intent).
   - Do not challenge the validity of the idea (unlike the stress-test skill); focus entirely on *how* to implement it optimally.

2. **Clarify Ambiguities**:
   - If there are multiple viable technical approaches or unclear requirements, ask the user specific technical questions to make a decision.

3. **Define Scope and Boundaries**:
   - Specify exactly what is in scope (Goals) and what is out of scope (Non-Goals).
   - Identify which files will be created or modified.

4. **Draft the Plan**:
   - Break down the idea into a clear technical implementation plan.
   - Outline the architecture, data flow, and clear interfaces.
   - Define clear acceptance criteria and testing strategies (both automated and manual).

5. **Output the Plan**:
   - Write the final plan into a new plan file at `specs/plan/YYYY-MM-DD-feature-name.md` (or modify `specs/plan/PLAN_TEMPLATE.md` if explicitly requested) using the template format.
   - Document any new design decisions introduced in the plan under Section 4.5 ("Key Decisions & Rationale").
   - Once the plan is finalized and approved, append any newly established architectural decisions to the bottom of the central ADR log in [specs/decisions.md](file:///Users/kevinsmith/Documents/development/typescript/ai-learning-support/specs/decisions.md).
