---
name: cleanup
description: Refactor code to elevate code quality, eliminate technical debt, fix DRY violations, simplify complex logic, enforce coding style rules, add missing JSDoc, and polish code elegance without altering runtime behavior. Use whenever the user asks to clean up code, refactor a module, polish code quality, fix code style evals, remove dead code, or simplify nested logic.
---

# Cleanup Skill: Code-Polishing & Style Refactoring Engine

> **Operational Profile**: Narrow, high-precision code polishing and maintenance engine. The `cleanup` skill evaluates code against workspace style evals and refactoring rules, transforming raw or technical-debt-laden code into lean, elegant, production-grade TypeScript—**without changing any external API behavior or feature functionality**.

---

## High-Level Execution Workflow

```
1. Phase 1: Code Quality & Style Evals Assessment (Scan against rules/coding-style.md)
2. Phase 2: Refactoring Plan Proposal (Generate cleanup proposal using template)
3. Phase 3: Non-Breaking Code & Harness Transformation (Apply atomic refactorings)
4. Phase 4: Mandatory Automated Verification (Run pnpm check & Vitest tests)
```

---

## Refactoring Invariants (Non-Negotiable)

1. **Zero Behavioral Changes**: Refactoring MUST NOT change runtime logic, API response formats, database queries, or external contracts. Existing unit test assertions must remain 100% valid.
2. **Strict Workspace Rules Compliance**: All transformations MUST adhere directly to workspace rule files:
   - [rules/coding-style.md](file:///workspaces/secure-ai-learning-support/rules/coding-style.md) (Naming, types, pattern rules, error handling).
   - [rules/project-rules.md](file:///workspaces/secure-ai-learning-support/rules/project-rules.md) (Lean & simple, feature isolation, pure data processor features).
   - [rules/documentation-standards.md](file:///workspaces/secure-ai-learning-support/rules/documentation-standards.md) (JSDoc `/** ... */` on all exported symbols).
   - [rules/styling.md](file:///workspaces/secure-ai-learning-support/rules/styling.md) (Vanilla CSS tokens, responsive design, WCAG AA accessibility).
3. **Mandatory Automated Verification**: Every cleanup turn MUST conclude with running `pnpm check` (build, lint, typecheck, tests) to prove zero regressions.

---

## Code-Polishing Catalog & Refactoring Patterns

When polishing code, systematically apply the following transformations:

### 1. Guard Clauses & Control Flow Flattening
- **Anti-Pattern**: Deeply nested `if/else` chains or nested ternaries.
- **Refactored**: Flatten using guard clauses and early returns. Replace nested ternaries with clean `switch` or multi-line `if` statements.

```typescript
// BEFORE (Hard to read)
export function processUser(user?: User) {
  return user ? (user.isActive ? (user.hasAccess ? grant() : deny()) : deny()) : deny();
}

// AFTER (Clean & readable)
/**
 * Processes access permission for a given user.
 */
export function processUser(user?: User): AccessResult {
  if (!user || !user.isActive || !user.hasAccess) {
    return deny();
  }
  return grant();
}
```

### 2. Type Hygiene & Elimination of `any`
- **Anti-Pattern**: Using `any` type casts, implicit `any` parameters, or missing return type annotations.
- **Refactored**: Replace `any` with precise interface definitions, union types, or generics. Explicitly type all function arguments and return types.

```typescript
// BEFORE
export function calculateScore(data: any) {
  return data.value * 1.5;
}

// AFTER
/**
 * Calculates weighted score for assessment payload.
 */
export function calculateScore(data: MetricPayload): number {
  return data.value * 1.5;
}
```

### 3. Naming Standardizations
- File names: Rename non-compliant files to `kebab-case.ts`.
- Functions and variables: Enforce `camelCase`.
- Types, interfaces, and classes: Enforce `PascalCase`.
- Global constants: Enforce `UPPER_SNAKE_CASE`.

### 4. DRY Logic Consolidation
- Identify repeated code blocks within a feature or package.
- Extract common helper functions into co-located utility modules or `packages/core/src/types/` (for cross-cutting domain entities).
- Ensure feature isolation boundaries are maintained: do NOT cross-import between features in `packages/core/src/features/`.

### 5. JSDoc & Documentation Hygiene
- Add JSDoc comments (`/** ... */`) to all exported functions, classes, interfaces, types, and constants per [rules/documentation-standards.md](file:///workspaces/secure-ai-learning-support/rules/documentation-standards.md).
- Ensure inline comments explain *why* non-obvious logic exists rather than restating *what* the code does.

---

## 4-Phase Execution Workflow

### Phase 1: Code Quality & Style Evals Assessment
- Read target files and scan for violations of workspace rules (`rules/coding-style.md`, `rules/project-rules.md`, `rules/documentation-standards.md`).
- Identify target functions, types, and files requiring cleanup.

### Phase 2: Refactoring Plan Proposal
- For multi-file or structural refactorings, create a proposal using [assets/cleanup-plan-template.md](file:///workspaces/secure-ai-learning-support/.agents/skills/cleanup/assets/cleanup-plan-template.md).
- Outline the targeted files, rules addressed, and expected non-breaking transformations.

### Phase 3: Non-Breaking Code & Harness Transformation
- Apply atomic code edits using code modification tools (`replace_file_content` or `multi_replace_file_content`).
- Keep edits localized, focused, and clean.

### Phase 4: Mandatory Automated Verification
- Execute `pnpm check` (or the local workspace test runner).
- Verify that TypeScript compilation, Biome linting, and all Vitest unit tests pass 100%.
- If any test fails, immediately fix the regression or revert the edit.
