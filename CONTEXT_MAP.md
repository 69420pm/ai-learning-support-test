# Context Map

This map provides a high-level overview of the project structure to help agents navigate the codebase efficiently.

## Root Directory
- `Makefile`: Central entry point for all project commands. **Start here.**
- `biome.json`: Strict linting and formatting rules.
- `turbo.json`: Monorepo task orchestration.
- `tsconfig.base.json`: Base strict TypeScript configuration.
- `GEMINI.md`: Project-specific instructions for Gemini CLI.
- `ARCHITECTURE.md`: High-level system design and technology stack.

## Packages
- `packages/core/`: [Core Logic] Contains shared business logic and data models.
  - `src/index.ts`: Main entry point.
- `packages/cli/`: [CLI Interface] Command-line tool for users.
  - `src/index.ts`: CLI entry point using `commander`.
- `packages/library/`: [Library] Reusable components for other apps.
  - `src/`: Library source code.

## Documentation
- `docs/`: Detailed guides and specifications.
  - `learning_plan.md`: Strategy for learning paths.
  - `tutoring.md`: Design for the tutoring sub-system.
