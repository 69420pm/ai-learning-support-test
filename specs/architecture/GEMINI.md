# Architecture — CLAUDE.md

Architecture specs describe system-level design: components, data flow, interfaces, and trade-offs.
They are higher-level than feature specs and lower-level than ADRs.
Read `../CLAUDE.md` before this file.

## Naming
`kebab-case-system-name.md` — name the system or concern, not the change (`event-bus.md` not `event-bus-redesign.md`)

## Template
Copy exactly. Write `N/A` for inapplicable sections.

---

```markdown
# [System / Component Name]

**Status:** Draft | Review | Approved | Implemented | Deprecated
**Owner:** @name
**Updated:** YYYY-MM-DD
**Replaces:** `specs/architecture/old.md` or N/A

## Context
What is this system? What problem does it solve at the architectural level?
Include relevant constraints (scale, latency, team size) that shaped the design.

## AI Context
- Primary files: `src/`
- Related files: `src/`
- Do not modify: `src/` (reason)
- Diagram: `../resources/diagrams/name.svg`

## Goals
- [ ] Architectural outcome (e.g. "decouple service A from service B")

## Non-Goals
- What this design explicitly does not address

## System Design

### Overview
1–2 paragraph description of the approach. Reference the diagram if one exists.
Diagram: `../resources/diagrams/name.svg`

### Components
| Component | Responsibility | Location |
|-----------|---------------|----------|
| ... | ... | `src/` |

### Data Flow
Describe the happy-path flow as a numbered sequence.
1. Client sends X to Service A
2. Service A publishes event Y to queue
3. ...

### Interfaces & Contracts
Define boundaries between components. Include types/schemas where relevant.

\```typescript
// Example: internal service interface
interface EventPayload {
  id: string;
  type: "user.created" | "user.deleted";
  timestamp: number;
}
\```

### Persistence
Data stores used, schema changes, migration strategy.

### Scalability & Performance
Expected load, bottlenecks, caching strategy, limits.

## Constraints
- HARD_LIMIT = value
- SLA_LATENCY_P99 = Xms
- List all as typed constants

## Failure Modes
| Failure | Impact | Mitigation |
|---------|--------|-----------|
| ... | ... | ... |

## Alternatives Considered
| Option | Why rejected |
|--------|-------------|
| ... | ... |

## Open Questions
- [ ] Unresolved item — owner: @name

## References
- ADR: `../adr/000-related-decision.md`
- Related spec: `../features/related.md`
- Resources: `../resources/schemas/name.json`
```
