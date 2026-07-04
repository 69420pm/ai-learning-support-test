---
name: audit
description: Exhaustive, unhurried diagnostic inspection of the entire repository. Scans codebase against architectural specs, active ADRs, PRDs, workspace coding rules, test coverage, agent harness integrity, tech debt, and dependencies. Use whenever the user asks to audit the codebase, check project health, analyze architectural drift, check specs alignment, review tech debt, or run a repo audit.
---

# Audit Skill: Exhaustive System-Wide Inspection Engine

> **Operational Profile**: Long-running, unhurried, deep diagnostic engine. Running an audit is an expensive operation that examines **the entire repository** without modifying files. The primary objective is absolute thoroughness: leave no stone unturned, detect macro architectural drift, verify workspace rule compliance, evaluate agent harness health, and output a highly granular `audit_report.md` artifact.

---

## High-Level Execution Flow

```
1. Initialize Audit Session & Load Reference Specs (architecture, ADRs, PRDs, rules)
2. Domain 1: Macro Architectural Conformance & ADR Drift Analysis
3. Domain 2: PRD Traceability & Product Spec Alignment
4. Domain 3: Workspace Rules & Coding Style Evaluation
5. Domain 4: Test Co-Location & Coverage Gap Scan
6. Domain 5: Agent Harness & Skill Integrity Inspection
7. Domain 6: Technical Debt & Code Smell Deep Scan
8. Domain 7: Dependency & CI/CD Health Assessment
9. Generate & Present Detailed audit_report.md Artifact
10. Recommend Downstream Skill Handoffs
```

---

## Mode Invariant: 100% Read-Only

The `audit` skill is **strictly read-only**. It MUST NOT modify, refactor, or delete any codebase files, specification documents, or configuration settings. All findings MUST be documented in the output report artifact `audit_report.md`.

---

## Exhaustive 7-Domain Inspection Checklist

Execute a comprehensive inspection across all 7 domains below. Use file reading, grep, semantic search, and terminal execution tools (`pnpm check`, `pnpm outdated`) to perform deep checks.

### Domain 1: Macro Architectural Conformance & ADR Drift Analysis

*Objective: Provide a birds-eye view evaluation of the codebase against canonical architecture specs and active ADR decisions to catch structural drift early.*

1. **Layer Boundary Verification**:
   - Inspect [specs/architecture-index.md](file:///workspaces/secure-ai-learning-support/specs/architecture-index.md) and all design specs in `specs/architecture/`.
   - Verify **Rule 1 (Unidirectional Orchestration)**: Check that API routes in `apps/web/` act as thin shells and orchestration logic resides in `packages/core/src/services/`.
   - Verify **Rule 2 (Feature Isolation)**: Check `packages/core/src/features/*` to ensure features NEVER import code from sibling features (e.g. `features/graphrag` importing `features/scheduler`). Orchestration must occur in `services/`.
   - Verify **Rule 3 (No Infrastructure in Features)**: Ensure feature modules function as pure data processors without directly importing database clients (`drizzle` instances) or file storage drivers.
   - Verify **Rule 4 (Shared Entities)**: Ensure cross-feature interfaces and types reside in `packages/core/src/types/`.

2. **ADR Invariant Traceability**:
   - Inspect [specs/adr-index.md](file:///workspaces/secure-ai-learning-support/specs/adr-index.md) and load all active ADRs in `specs/adrs/`.
   - Check source code against active architectural decisions (e.g. cloud scale-up adapters, FSRS algorithm parameters, database schema conventions).
   - Document any architectural drift where code implementations diverge from approved ADRs.

---

### Domain 2: PRD Traceability & Product Spec Alignment

*Objective: Ensure implemented features align with Product Requirements Documents (PRDs).*

1. **Spec Requirement Matrix**:
   - Inspect [specs/prd-index.md](file:///workspaces/secure-ai-learning-support/specs/prd-index.md) and all PRDs in `specs/prds/`.
   - Map functional requirements specified in active PRDs to their actual implementations in `apps/` and `packages/`.
2. **Gap Detection**:
   - Flag PRD requirements that are marked complete in specs but missing or incomplete in code.
   - Flag codebase features or API endpoints that lack corresponding PRD specifications.

---

### Domain 3: Workspace Rules & Coding Style Evaluation

*Objective: Verify code quality and styling against workspace rule files.*

1. **Coding Style Rules ([rules/coding-style.md](file:///workspaces/secure-ai-learning-support/rules/coding-style.md))**:
   - File naming: Ensure all `.ts` and `.tsx` source files follow `kebab-case.ts`.
   - Identifier naming: `camelCase` for functions/variables, `PascalCase` for types/interfaces/classes, `UPPER_SNAKE_CASE` for global constants.
   - Type hygiene: Flag any explicit or implicit `any` usage. Ensure explicit function parameter and return types.
   - Pattern anti-patterns: Flag nested ternaries, deeply nested `if` statements (where guard clauses/early returns should be used), and functions exceeding ~50 lines.
   - Error handling: Flag silent catch blocks (`catch (e) {}`) or missing error boundaries.
2. **Project Philosophy ([rules/project-rules.md](file:///workspaces/secure-ai-learning-support/rules/project-rules.md))**:
   - Check for over-engineering, unnecessary abstractions, or premature complexity.
3. **Documentation Standards ([rules/documentation-standards.md](file:///workspaces/secure-ai-learning-support/rules/documentation-standards.md))**:
   - Verify JSDoc comments (`/** ... */`) exist on all exported interfaces, types, functions, and classes.
   - Ensure inline comments explain *why* logic exists rather than restating *what* it does.
4. **Web Styling Standards ([rules/styling.md](file:///workspaces/secure-ai-learning-support/rules/styling.md))**:
   - Check `apps/web/` for proper use of CSS variables/tokens, accessibility (WCAG AA semantic HTML and ARIA attributes), and mobile-first responsiveness.

---

### Domain 4: Test Co-Location & Coverage Gap Scan

*Objective: Verify test infrastructure and identify untested business logic.*

1. **Test Co-Location Check ([rules/testing.md](file:///workspaces/secure-ai-learning-support/rules/testing.md))**:
   - Recursively scan all source files in `apps/` and `packages/`.
   - Ensure every `.ts`/`.tsx` file containing business logic has a co-located `.test.ts`/`.test.tsx` file next to it.
2. **Automated Check Run**:
   - Run `pnpm check` (or workspace test/lint runner) to record current passing/failing state across the monorepo.
   - Catalog failing tests, lint errors, or TypeScript compiler errors.

---

### Domain 5: Agent Harness & Skill Integrity Inspection

*Objective: Guarantee the AI agent harness, skills, memory, and routing remain valid and un-rotted.*

1. **Skill Linkage & Validation**:
   - Inspect all `.agents/skills/*/SKILL.md` files.
   - Verify that all Markdown file links (`file:///...`) point to existing files.
   - Verify YAML frontmatter formatting (`name`, `description`).
   - Confirm bundled scripts in `scripts/` or `assets/` exist and are executable.
2. **Memory & Rules Routing**:
   - Inspect [.agents/memory/session-history.md](file:///workspaces/secure-ai-learning-support/.agents/memory/session-history.md) and [.agents/memory/general-learnings.md](file:///workspaces/secure-ai-learning-support/.agents/memory/general-learnings.md) for obsolete context or broken links.
   - Verify [AGENTS.md](file:///workspaces/secure-ai-learning-support/AGENTS.md) rules routing matches actual files in `rules/` and `specs/`.

---

### Domain 6: Technical Debt & Code Smell Deep Scan

*Objective: Catalog code annotations, anti-patterns, and lingering workspace clutter.*

1. **Code Annotations**:
   - Grep the entire repository for `TODO`, `FIXME`, `HACK`, `DEPRECATED`, `@ts-ignore`, and `@ts-nocheck`.
2. **Dead Code & Unused Exports**:
   - Search for orphaned files, unused export statements, or commented-out code blocks.
3. **Workspace Hygiene**:
   - Check `git status` for untracked scratch files, temporary logs, or uncommitted file deletions.

---

### Domain 7: Dependency & CI/CD Health Assessment

*Objective: Audit external dependencies and CI/CD workflow alignment.*

1. **Dependency Freshness**:
   - Run `pnpm outdated` to catalog outdated production and dev dependencies.
2. **CI/CD Consistency**:
   - Compare `.github/workflows/` and git hooks (`lefthook.yml`) against actual scripts in `package.json`.
   - Ensure documentation (`README.md`, `CONTRIBUTING.md`) matches available CLI scripts.

---

## Output Generation: Granular `audit_report.md`

Upon completing all 7 domains, produce a detailed Markdown artifact titled `audit_report.md` using the standard asset template at [assets/audit-report-template.md](file:///workspaces/secure-ai-learning-support/.agents/skills/audit/assets/audit-report-template.md).

### Report Requirements
- **Executive Summary**: Overall health score (0–100%) and macro summary.
- **Detailed Findings by Domain**: Include exact file paths (`[filename](file:///path#L10-L25)`), line ranges, code snippets, rule/spec citations, and clear explanations.
- **Severity Classification**:
  - 🔴 **Critical**: Broken build/CI, architecture layer violations (e.g. feature cross-imports), direct DB imports in features, broken skill links.
  - 🟡 **Medium**: Missing unit test suites, missing JSDoc comments on exports, nested ternaries, PRD implementation drift, outdated ADR status.
  - 🟢 **Low**: Minor style nits, stale `TODO` comments, non-critical dependency updates.
- **Actionable Remediation Backlog**: Map findings directly to follow-up skills (`cleanup`, `tdd-implement`, `write-adr`, `write-prd`).
