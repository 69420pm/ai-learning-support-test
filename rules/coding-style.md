# Coding Style

Our coding style is enforced primarily by Biome and TypeScript's strict mode, but some rules cannot be auto-enforced:

- **Naming Conventions**: 
  - `camelCase` for functions and variables.
  - `PascalCase` for types, interfaces, and classes.
  - `UPPER_SNAKE_CASE` for global constants.
- **File Naming**: Use `kebab-case.ts` for all files.
- **Error Handling**: Use explicit `throw` for exceptions, or a Result type approach if defined in the specific package. Avoid silent failures.
- **Patterns**:
  - Prefer early returns and guard clauses over deeply nested `if` statements.
  - Avoid nested ternaries; they are hard to read.
  - Keep functions small and focused on a single responsibility.
- **Types**: No explicit `any`. Rely on inference where possible, but always type function parameters and returns explicitly.
