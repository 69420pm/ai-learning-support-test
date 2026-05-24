# Features — CLAUDE.md

Feature specs describe user-facing functionality: what it does, why, and how it should be built.
Read `../CLAUDE.md` before this file.

## Naming
`kebab-case-feature-name.md` — descriptive, no versions in the name (`auth-refresh.md` not `auth-v2-FINAL.md`)

## Template
Copy exactly. Do not remove sections; write `N/A` if a section doesn't apply.

---

```markdown
# [Feature Name]

**Status:** Draft | Review | Approved | Implemented | Deprecated
**Owner:** @name
**Updated:** YYYY-MM-DD
**Ticket:** [LIN-000](link)

## Context
Why does this need to exist? What problem does it solve?
2–4 sentences. No padding.

## Goals
- [ ] Concrete, testable outcome
- [ ] Each goal maps to a success metric below

## Non-Goals
- Explicitly what this will NOT do
- Prevents scope creep — be specific

## AI Context
- Primary file(s): `src/`
- Related files: `src/`
- Do not modify: `src/` (reason)
- Tests: `tests/`
- Replaces: `specs/features/old-spec.md` or N/A

## Proposed Solution
High-level approach in plain language. No implementation detail yet.

## Detailed Design

### Data Model
Define new or changed fields. Use a table or typed block.

### API Contract
Provide full request/response examples for every endpoint.

\```
POST /api/v1/example

Request:  { "field": "value" }
Response 200: { "result": "value" }
Response 4xx: { "error": "code", "message": "..." }
\```

### Edge Cases & Error States
List every known failure mode and expected behavior.

### Security Considerations
Auth requirements, data exposure, rate limits, etc. Write N/A if none.

## Constraints
- RULE_NAME = value (e.g. MAX_RETRIES = 3)
- List all hard limits as typed constants, not prose

## Alternatives Considered
| Option | Why rejected |
|--------|-------------|
| ... | ... |

## Open Questions
- [ ] Unresolved decision with owner: @name

## Success Metrics
How do we know this shipped successfully? (error rate, latency, conversion, etc.)

## References
- Figma: [link]
- Related spec: `../architecture/related.md`
- Resources: `../resources/diagrams/name.png`
```
