---
name: repository-configuration
description: Use when you need to set up the repository structure, configuration files, ci/cd, anything related to devops or the development environment
---

### Objective
This skill is invoked when modifying the configuration files, tooling configs, CI/CD pipelines, package dependencies, workspaces, compiler settings, or the overall repository structure. The objective is to maintain configuration simplicity, preserve high pipeline performance, and ensure absolute monorepo build stability.

---

### Step-by-Step Instructions

1. **Assess the Configuration Request**:
   - Determine which files are impacted (e.g., `package.json`, `pnpm-workspace.yaml`, `turbo.json`, `tsconfig.json`, `biome.json`, `lefthook.yml`, `Makefile`, `.github/workflows/*`).
   - Determine if the change introduces new dependencies. If yes, evaluate if the dependency is strictly necessary and if there is a lighter or built-in alternative (Simplicity > Complexity).

2. **Modify Configuration Files**:
   - Apply edits to the configuration files.
   - Do not edit the lockfile (`pnpm-lock.yaml`) manually.

3. **Synchronize & Rebuild**:
   - If dependencies or workspaces were altered, immediately run `pnpm install` at the repository root. This updates the pnpm store and regenerates the lockfile.
   - Run `make clean` followed by `make build` to verify the workspace compiles properly with the new configuration.

4. **Verify Linter, Format, and compiler configs**:
   - If linter configs (`biome.json`) or compiler configs (`tsconfig.base.json`, `tsconfig.json`) were altered, run `make check` to verify there are no syntax or style violations.
   - Verify that formatting and imports are organized: run `make format`.

5. **Test Git Hooks (Lefthook)**:
   - If hooks (`lefthook.yml`) were changed, test them locally to ensure they do not block standard commits:
     - Run `npx lefthook run pre-commit`
     - Run `npx lefthook run pre-push`

6. **Validate CI/CD Workflows**:
   - If modifying `.github/workflows/ci.yml` or `.github/workflows/release.yml`, inspect for syntactical correctness and verify that Node caching schemas (`pnpm`) remain optimal.

7. **Commit the Changes**:
   - All repository configuration changes must be committed using the correct Conventional Commit scopes:
     - CI/CD changes: `ci: <description>`
     - Build/Tooling configurations: `chore(repo): <description>` or `chore(deps): <description>`
     - Makefile/Task updates: `chore(make): <description>`
   - Use `make commit MSG="..."` to run final checks and commit.

---

### Engineering Guidelines & Guardrails

* **Monorepo Workspace Bounds**: Keep root-level dependencies limited strictly to dev tools (linters, task runners, workspace managers). All packages (`packages/*`, `apps/*`) must declare their own dependencies in their respective `package.json` files.
* **Keep Cache Active**: When modifying `turbo.json` or `tsconfig.json`, ensure you do not break the caching rules. Build and test outputs should remain cached to ensure rapid execution.
* **Do Not Bypass Git Hooks**: Lefthook is configured to prevent dirty formatting or broken pipelines from entering the branch. If a hook blocks your push, correct the root issue; do not disable or bypass the hooks.
