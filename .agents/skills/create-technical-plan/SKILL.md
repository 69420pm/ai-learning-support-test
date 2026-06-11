---
name: create-technical-plan
description: Use when the user wants to create a detailed technical implementation plan for a feature.
---

### Objective
Translate a proposed feature or idea into a highly thorough, step-by-step technical plan that leaves no room for ambiguity. The plan should be detailed enough that a junior developer could implement it successfully without additional guidance.

### Step-by-Step Instructions

1. **Ingest the Feature Request**:
   - Retrieve the idea or feature description from the user's prompt or the designated idea file (located in `specs/ideas/`).
   - Read the system architecture file (located at `specs/system_architecture.md`) to know the (planned) architecture of the application
   - Do not challenge the validity of the idea (unlike the stress-test skill); focus entirely on *how* to implement it optimally.

2. **Clarify Ambiguities**:
   - If there are multiple viable technical approaches or unclear requirements, ask the user specific technical questions to make a decision.

3. **Define Scope and Boundaries**:
   - Specify exactly what is in scope (Goals) and what is out of scope (Non-Goals).
   - Identify which files will be created or modified.

4. **Draft the Plan**:
   - Break down the idea into a clear technical implementation plan
   - Outline the architecture, data flow and clear interfaces.
   - Define clear acceptance criteria and testing strategies (both automated and manual).

5. **Output the Plan**:
   - Write the final plan into [PLAN_TEMPLATE.md](file:///Users/kevinsmith/Documents/development/typescript/ai-learning-support/specs/plan/PLAN_TEMPLATE.md).
   - Alternatively, write to a custom file like `specs/plan/YYYY-MM-DD-feature-name.md` using the template format if specified by the user.
