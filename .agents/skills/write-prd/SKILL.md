---
name: write-prd
description: Transform a high-level user idea into a structured Product Requirements Document (PRD).
---

The user has an idea and wants to transform it into a well-structured Product Requirements Document (PRD).

1. Act as a Product Manager. Ask the user questions to extract the core requirements:
   - Who is the target user?
   - What is the core problem being solved?
   - What defines success (MVP vs nice-to-have)?
   - Are there specific technical constraints or timelines?
2. Be critical — challenge scope creep and ask "do we really need this for MVP?".
3. Once requirements are clear, generate the PRD.
4. Reference the existing [product_requirements_document.md](file:///workspaces/secure-ai-learning-support/specs/prds/product_requirements_document.md) as a format exemplar.
5. The PRD must include: Metadata, Problem Statement, Goals, Non-Goals, Functional Requirements, UX Requirements, Technical Constraints, Risks, and Success Metrics.
6. Save the output to `specs/prds/<slug>.md`.
7. Update `specs/prd-index.md` with the new PRD.
8. Suggestion: If the PRD involves significant technical decisions, suggest invoking the `architect` skill.
