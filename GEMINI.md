# Gemini.md

This file provides project-specific guidance for Gemini CLI (and other AI agents).

## Project Overview
AI Learning Support is a monorepo for building intelligent tutoring and learning tools.

## Development Workflow
Use the `Makefile` as the primary interface for all tasks.

1. **Make changes**
2. **Validate**: Run `make check`. This runs build, lint, typecheck, and tests.
3. **Commit**: Use Conventional Commits.

## Agent Directives
- **Discovery**: Always read `CONTEXT_MAP.md` and `Makefile` first to understand the workspace.
- **Commands**: Prefer `make <target>` over direct `npm` or `pnpm` commands.
- **Style**: Adhere strictly to the Biome configuration. Use `make format` to fix styling issues.
- **Types**: Use strict TypeScript patterns. Avoid `any` and non-null assertions.
- **Errors**: Handle errors explicitly. Provide meaningful context in error messages.

## Commands Reference
- `make setup`: Install dependencies.
- `make build`: Build all packages.
- `make check`: Run all validations (lint, typecheck, test).
- `make test`: Run unit tests.

## Things to AVOID
- Do NOT use `any` without a strong architectural reason.
- Do NOT skip the validation loop before suggesting a commit.
- Do NOT use `interface` when `type` is sufficient.
- Do NOT use `enum` (use string literal unions instead).

---
*This file is a living document. Update it with new lessons learned.*
