# ADR — CLAUDE.md

Architecture Decision Records capture *why* a significant technical decision was made.
They are immutable once Accepted — never edit a past ADR, write a new one that supersedes it.
Read `../CLAUDE.md` before this file.

## Naming
`NNN-short-decision-title.md` — zero-padded sequence number + lowercase kebab title
Example: `004-use-redis-for-session-storage.md`

## When to Write an ADR
- A technology, library, or service is adopted or replaced
- A cross-cutting architectural pattern is established
- A significant trade-off was made that future devs will question

## Template
Copy exactly.

---

```markdown
# ADR-NNN: [Short Decision Title]

**Status:** Proposed | Accepted | Deprecated | Superseded by ADR-NNN
**Owner:** @name
**Date:** YYYY-MM-DD

## Context
What situation forced this decision?
Include constraints, scale, team considerations, and any prior state.
Be factual — no advocacy here.

## Decision
State the decision in one clear sentence.
> We will use X for Y.

Then explain the approach in 2–4 sentences if needed.

## Consequences

**Positive**
- Concrete benefit
- Concrete benefit

**Negative / Trade-offs**
- Concrete cost or risk
- Concrete cost or risk

## Alternatives Considered
| Option | Why rejected |
|--------|-------------|
| ... | ... |

## References
- Related spec: `../architecture/related.md`
- Ticket: [LIN-000](link)
```

---

## Rules
- **Never modify** an Accepted ADR — create a new one with `Superseded by ADR-NNN` status on the old one
- Keep it short — an ADR longer than one screen is too long
- Consequences must include both positives and negatives — one-sided ADRs are not trusted
- Update `../CLAUDE.md` index table when adding a new ADR
