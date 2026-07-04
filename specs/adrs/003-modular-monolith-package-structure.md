# ADR 003: Modular Monolith Package-Like Structure without pnpm Workspaces

**Status:** Accepted  
**Date:** 2026-07-03  

## Context
As the codebase grows, application features and agent capabilities (e.g., pedagogical engines, LLM provider adapters, tool executors, memory subsystems) require strict encapsulation, clean separation of concerns, and defined input/output boundaries. 

The traditional approach of creating separate `pnpm` workspace packages (with individual `package.json` files, compilation pipelines, and cross-package linking) for every internal sub-feature introduces substantial overhead:
* Increased build and hot-reload latency.
* Configuration proliferation (`package.json`, `tsconfig.json`, `build` scripts per folder).
* Version sync and workspace dependency linking friction for code that executes within the same runtime process.

Conversely, a flat, unorganized codebase leads to high coupling, leaky abstractions, and spaghetti dependencies across features.

## Decision
We adopt a **Modular Monolith ("Virtual Package") Architecture**. Internal features are structured into independent, package-like directories within a unified runtime target, avoiding unnecessary pnpm package overhead.

### Key Architectural Principles

1. **Independent "Virtual Package" Directories:**
   * Each feature resides in its own isolated directory (e.g., `modules/<feature-name>` or `features/<feature-name>`).
   * Every feature directory acts as an independent module: it receives typed inputs, executes local logic, and returns explicit output contracts (or async streams).

2. **Strict Public API Boundaries (`index.ts` Exports):**
   * Features export their public interface strictly via a top-level `index.ts`.
   * Direct imports into private sub-files of another feature (e.g., `import { internalUtil } from '../other-feature/utils/private'`) are strictly prohibited and enforced via linter/TypeScript path rules.

3. **Core Orchestration (`core`):**
   * A lean `core` module manages application state, execution loops, state machines, and pipeline composition.
   * Core orchestrates features by embedding or calling their public interfaces without taking on their domain responsibilities.

4. **Lean Shared Domain Models (`shared` / `domain`):**
   * Shared entities (e.g., core message types, execution results, event signatures) are stored in a centralized, minimal shared module accessible to both `core` and feature modules.

5. **Path Alias Mapping:**
   * Module boundaries are cleanly referenced using TypeScript `paths` aliases (e.g., `@core/*`, `@modules/*`, `@shared/*`), eliminating relative path clutter (`../../..`).

## Consequences

### What Becomes Easier
* **Fast Developer Loop:** Instant hot-reloading and zero extra compilation/bundling steps during development.
* **Low Friction Refactoring:** High cohesion within modules with simple input/output contracts makes testing and refactoring straightforward.
* **Clean Code Boundaries:** Clear architectural mental model matching top-tier AI agent harnesses (Claude Code CLI, Aider, OpenHands).

### What Becomes Harder
* **Boundary Enforcement:** Because TypeScript will physically allow importing across directories in the same project, linter rules (e.g., Biome or ESLint import boundaries) must be configured and enforced to prevent boundary leaks.

## Alternatives Considered

1. **Granular pnpm Monorepo Workspaces for Every Sub-Feature:**  
   *Creating separate pnpm packages under `packages/*` for every internal module.*  
   *Rejected* due to excessive configuration overhead, build pipeline complexity, and slow dev loops for code executing in a single Node.js runtime.

2. **Unstructured Layered Architecture (Global `services/`, `utils/`, `controllers/`):**  
   *Grouping code by technical layer rather than feature boundaries.*  
   *Rejected* because it leads to high coupling, scattered feature logic, and poor module isolation.
