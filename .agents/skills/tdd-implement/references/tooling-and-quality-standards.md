# Tooling & Quality Standards Reference

This reference document details the workspace developer tools, linting/formatting rules, git hooks, and validation commands enforced during implementation with the `tdd-implement` skill.

---

## 1. Biome Linter & Formatter (`biome.json`)

Biome is the single source of truth for code formatting and static analysis in this repository.

### Key Rules & Thresholds
- **Indentation**: Tabs (width: 2).
- **Line Width**: 100 characters.
- **Quotes & Semis**: Double quotes (`"`), trailing commas (`all`), semicolons (`always`).
- **Cognitive Complexity**: Max allowed complexity per function is **15** (`noExcessiveCognitiveComplexity`). Split complex functions into smaller helper functions.
- **Strict Naming Conventions**:
  - `camelCase` for variables and functions.
  - `PascalCase` for classes, interfaces, and types.
  - `UPPER_SNAKE_CASE` for global constants.
- **Forbidden Patterns**:
  - `noExplicitAny`: **ERROR**. Explicit `any` is strictly prohibited. Use generic bounds, `unknown`, or explicit interfaces.
  - `noNonNullAssertion`: **ERROR**. Non-null assertions (`foo!`) are prohibited. Use guard clauses or explicit null checks.
  - `noUnusedVariables` & `noUnusedImports`: **ERROR**. Unused code must be removed.

### Execution Commands
```bash
# Format and lint specific staged or modified files
pnpm biome check --write packages/core/src/features/parser/pdf-parser.ts

# Format all files in package
pnpm format
```

---

## 2. Vitest Test Runner (`vitest.config.ts`)

Vitest handles unit and integration testing across workspace projects (`tsconfig`, `core`, `web`).

### Execution Commands
```bash
# Fast execution for specific target source or test files
pnpm vitest related packages/core/src/features/parser/pdf-parser.test.ts --run

# Run tests with SQLite in-memory database isolation
DATABASE_PATH=":memory:" pnpm vitest related packages/core/src/database/schema.test.ts --run
```

---

## 3. Lefthook Git Hooks (`lefthook.yml`)

Lefthook automatically validates files on git lifecycle events:

- **Pre-Commit Hook**:
  - Automatically runs `pnpm biome check --write {staged_files}`.
  - Automatically runs `pnpm vitest related {staged_files} --run --passWithNoTests`.
  - *If Biome formatting alters staged files, Lefthook re-stages them automatically.*
  - *If a test or lint error occurs, the commit is aborted.*
- **Pre-Push Hook**:
  - Automatically runs `pnpm run typecheck`.

### Handling Hook Failures
If `git commit` fails due to a pre-commit hook failure:
1. Do NOT force commit with `--no-verify`.
2. Inspect the Lefthook error output.
3. Fix the linting, formatting, or test failure manually.
4. Re-add the file (`git add <file>`) and re-run the commit command.

---

## 4. Turborepo Monorepo Pipeline (`turbo.json`)

Turborepo orchestrates monorepo builds and checks across all packages.

### Commands
| Command | Action |
| :--- | :--- |
| `pnpm dev` | Start development servers across apps. |
| `pnpm build` | Build production bundles via Turbo. |
| `pnpm lint` | Run Biome lint checks across packages. |
| `pnpm typecheck` | Run TypeScript type checking across packages. |
| `pnpm test` | Run full test suite across packages. |
| **`pnpm check`** | **Mandatory full validation pipeline** (`turbo build lint typecheck test`). |

---

## 5. GitHub CLI (`gh`) Integration

Pull Requests MUST be created using the GitHub CLI after `pnpm check` passes:

```bash
# Create feature branch if not already on one
git checkout -b plan-ingestion-parser-pdf

# Open PR using structured template file
gh pr create \
  --title "feat(core): implement PDF document parser with TDD" \
  --body-file .agents/skills/tdd-implement/assets/pr-body-template.md
```
