# Specs — GEMINI.md

## Purpose
This folder contains all product and technical specifications for this project.
Read this file first. Then read the CLAUDE.md in the relevant subfolder before reading or writing any spec.

## Structure
```
/specs
  /features       → Feature specs (user-facing functionality)
  /architecture   → System/technical design specs
  /adr            → Architecture Decision Records (immutable, append-only)
  /resources      → Diagrams, schemas, research (referenced by specs, not standalone)
```

## Active Specs
| File | Type | Status | Summary |
|------|------|--------|---------|
| `features/example.md` | Feature | Draft | — |
| `architecture/example.md` | Architecture | Approved | — |
| `adr/001-example.md` | ADR | Accepted | — |

> Keep this table up to date when adding or changing specs.

## Key Terms
Define project-specific terms here to avoid repeating them in every spec.
- **[Term]**: definition

## Rules for All Specs
- Status must be one of: `Draft` · `Review` · `Approved` · `Implemented` · `Deprecated`
- Every spec must have an owner and a last-updated date
- Reference resources by relative path: `../resources/diagrams/auth-flow.png`
- All constraints written as rules, not prose (`MAX_RETRIES = 3`, not "should limit retries")
- Non-Goals section is mandatory — it prevents scope creep
- Link to code by file path + line when possible: `src/services/token.service.ts:L44`
