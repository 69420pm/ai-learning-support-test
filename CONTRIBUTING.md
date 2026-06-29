# Contributing Guidelines

Welcome to **AI Learning Support**. This project is engineered to the highest professional standards, optimized for collaboration among human developers and autonomous AI agents. 

Our core philosophy is **Simplicity > Complexity**. We build software that is robust, heavily validated, and strictly organized, minimizing bureaucratic friction while enforcing absolute code quality.

---

## Core Engineering Standards

To ensure code quality and prevent technical debt, all contributors (human and AI) must adhere to these rules:

### TypeScript & Type Safety
* **Strict Mode Enabled**: The project uses TypeScript `strict: true`, along with `noUncheckedIndexedAccess`.
* **No `any`**: Explicit `any` is strictly prohibited. Use `unknown` or define proper interfaces.
* **No Non-Null Assertions**: Avoid using `!` (non-null assertion operator). Handle `null` and `undefined` states explicitly.
* **Indexed Array Access**: Since `noUncheckedIndexedAccess` is active, accessing elements in an array by index returns `T | undefined`. Always write code that checks or handles the `undefined` case.

### Formatting & Linting (Biome)
* We use **Biome** for all linting and formatting. It replaces ESLint and Prettier.
* Run formatting check: `make lint` or auto-format: `make format`.
* **Imports**: Biome is configured to organize and sort imports. Do not format imports manually.
* **Warnings as Errors**: The CI pipeline treats linting and type warnings as fatal errors.

### Unit Testing & Verification
* We use **Vitest** for testing.
* **Mandatory Coverage**: All new business logic, mathematical algorithms (like the FSRS scheduler), and utilities must have accompanying unit tests.
* **Test Isolation**: Unit tests must reside next to the code they verify (e.g., `src/index.test.ts` next to `src/index.ts`).
* **Test Verification**: Run `make test` before pushing. Do not mock modules unless absolutely necessary.

### Documentation & Comments
* **API Documentation**: Write JSDoc/TSDoc comments for all exported classes, methods, types, and functions. Highlight parameters, return types, and possible errors.
* **Design Rationale**: Keep comments focused on *why* code was written a certain way, not *what* the code does.

---

## Development Workflow

All contributions must follow our structured Git flow.

### Step-by-Step Implementation Lifecycle
1. **Assign / Choose an Issue**: All work must correspond to an open GitHub issue. Issues must be detailed and atomic (refer to the [Atomic Issue template](.github/ISSUE_TEMPLATE/atomic_issue.md)).
2. **Create a Feature Branch**:
   - Create your branch from `main`.
   - For **Plans/Features**: Name it after the parent plan issue: `make create-branch NAME=plan-<plan_issue_num>-<slug>` (e.g., `make create-branch NAME=plan-42-local-document-upload`).
   - For **Standalone Issues/Bugs**: Name it after the issue: `make create-branch NAME=fix-issue-<issue_num>` (e.g., `make create-branch NAME=fix-issue-109`).
3. **Write Code and Tests**:
   - Write tests alongside your logic.
   - Verify code locally: run `make test`.
4. **Commit Changes**:
   - Commit your changes using Conventional Commits (see below).
   - Git hooks (`lefthook`) will automatically format/lint your staged files and run related tests pre-commit, and run TypeScript typechecks pre-push.
5. **Open a Pull Request**:
   - Push your branch and open a PR.
   - Fill out the PR description using the [Pull Request Template](.github/pull_request_template.md).
   - Link the PR to the issue (`Closes #42`).
6. **Code Review & Merge**:
   - Code must be approved by a maintainer.
   - The CI build pipeline must pass successfully.
   - Merge into `main` via Squash and Merge.

---

## Commit Message Standard

We follow the **Conventional Commits** specification. This is used by `changesets` to automate releases and changelogs.

### Format
```text
<type>(<scope>): <description>

[optional body]
```

### Allowed Types
* `feat`: A new feature for the user or a package.
* `fix`: A bug fix.
* `docs`: Documentation updates.
* `style`: Code style changes (formatting, missing semi-colons).
* `refactor`: Code changes that neither fix a bug nor add a feature.
* `test`: Adding missing tests or correcting existing tests.
* `chore`: Updating build tasks, package configurations, or dependencies.
* `ci`: CI configuration files and scripts.

### Examples
* `feat(core): implement sqlite db adapter`
* `fix(app): correct dashboard rendering alignment`
* `test(core): add test suite for fsrs interval calculation`
* `chore(repo): update typescript to v6.0`

---

## Guidelines for Autonomous AI Agents

If you are an AI agent working in this repository:
1. **Never Bypass Checks**: Do not force commits or push code that fails `make check`. If a test is failing, resolve the bug; do not comment out or delete the test.
2. **Be Atomic**: Limit your edits to the exact files defined in the issue. Do not implement unrequested features or refactor unrelated code.
3. **Be Self-Documenting**: Maintain updated TSDoc comments when editing code interfaces. When ending your task, summarize changes clearly in the PR or chat.
4. **Use Pluggable Adapters**: When adding database or storage interactions, write them against the interfaces defined in the core service layer (`packages/core/src/`). Do not write custom raw SQLite or PostgreSQL queries directly inside the frontend.
