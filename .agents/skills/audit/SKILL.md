---
name: audit
description: Audit codebase for meta-quality (missing tests, doc gaps, broken skill paths, stale deps, CI validity).
---

Audit the entire repository and agent harness for technical debt, meta-quality issues, and broken references without making code changes.

### 1. Verification Checklist
Execute standard checks across 6 main audit domains:

1. **Agent Skills & Harness Integrity**:
   - Check all `.agents/skills/*/SKILL.md` files for dead file links, obsolete memory file references, or outdated commands (`make check` vs `pnpm check`).
   - Verify alignment with active rules in `AGENTS.md` and `.agents/memory/`.

2. **CI & Tooling Consistency**:
   - Check `.github/workflows/` and git hooks (`lefthook.yml`) against actual scripts in `package.json`.
   - Verify `CONTRIBUTING.md` and documentation match available commands.

3. **Specification & Documentation Alignment**:
   - Check `specs/prd-index.md`, `specs/adr-index.md`, and `specs/architecture-index.md` to ensure all spec files are correctly linked.
   - Verify `README.md` files in `apps/` and `packages/` are up to date.

4. **Code Quality & Test Coverage**:
   - Run `pnpm check` to confirm build, linting, typechecking, and tests pass.
   - Identify files lacking corresponding `.test.ts` or `.test.tsx` test suites.

5. **Stale Code & Debt Annotations**:
   - Search for `TODO`, `FIXME`, `HACK`, or deprecated logic across all packages.
   - Check `git status` for untracked scratch files or uncommitted deletions.

6. **Dependency Freshness**:
   - Run `pnpm outdated` to catalog outdated production and development dependencies.

### 2. Output & Artifact Generation
- Produce a structured Markdown report artifact titled `audit_report.md`.
- Prioritize findings using standard severity badges:
  - 🔴 **Critical**: Broken build/CI, invalid skill instructions, broken file references.
  - 🟡 **Medium**: Outdated docs, unindexed ADRs/PRDs, missing tests for core modules.
  - 🟢 **Low**: Minor dependency updates, formatting/style nits, stale TODOs.

### 3. Recommended Handoffs
Suggest follow-up actions and appropriate skills to resolve findings:
- Use `cleanup` for refactoring code debt or fixing broken links/scripts.
- Use `tdd-implement` for adding missing tests.
- Use `write-adr` / `write-prd` for updating documentation.
