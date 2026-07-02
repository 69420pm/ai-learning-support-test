---
name: plan
description: Create a highly detailed implementation plan from a PRD, ADR, or a direct user request.
---

Create an implementation plan for a given feature or request.

1. Pre-reads: Relevant PRD, ADRs, `specs/architecture-index.md`, `CONTRIBUTING.md`, and any relevant `GEMINI.md`.
2. Produce the plan as an AGY artifact.
3. The plan should contain:
   - Overview
   - Pre-conditions
   - Ordered Task Breakdown (atomic tasks)
   - File Impact Map (which files each task will touch)
   - Testing Strategy
   - Risk Assessment
   - Definition of Done
4. Each task should be sized to roughly one logical commit and must include acceptance criteria.
5. If the plan exceeds ~10 tasks, suggest splitting it into multiple PRs.
6. Suggestion: Before planning, if key technical decisions are unresolved, consider `architect`/`write-adr`. After planning, hand off to `tdd-implement`.
