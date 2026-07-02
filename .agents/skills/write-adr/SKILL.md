---
name: write-adr
description: Document an architectural decision in an ADR format.
---

Write an Architectural Decision Record (ADR) after a decision has been reached.

1. This usually follows an `architect` discussion skill where the decision was finalized.
2. ADR Template:
   - Status (e.g., Draft, Proposed, Accepted, Superceded)
   - Context (What is the problem we are solving?)
   - Decision (What is the decision?)
   - Consequences (What becomes easier? What becomes harder?)
   - Alternatives Considered
3. Keep ADRs concise — maximum 1 page.
4. Output the document to `specs/adrs/NNNN-<slug>.md`.
5. Update `specs/adr-index.md` with a link to the new ADR.
