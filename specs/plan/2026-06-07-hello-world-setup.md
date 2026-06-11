# Technical Implementation Plan: Hello World Setup

## 1. Overview & Context
- **Feature Description**: Align the monorepo structure with the target system architecture by introducing `apps/web` as a minimal Next.js application, linking it to the `@ai-learning-support/core` package, and displaying a "Hello World" message fetched from the core package.
- **User Value / Problem Solved**: Validates the end-to-end development cycle (workspace links, build system, TypeScript config references, development server startup) with a minimal, zero-bloat "Hello World".
- **Idea Path**: N/A (Direct user request for boilerplate verification)

---

## 2. Scope Boundaries (Goals & Non-Goals)
- **Goals (In Scope)**:
  - Update [specs/system_architecture.md](file:///Users/kevinsmith/Documents/development/typescript/ai-learning-support/specs/system_architecture.md) if necessary to match the chosen directories (we will align the folder structure to the spec's target of `apps/web`).
  - Configure the monorepo workspace to include `apps/*`.
  - Delete the empty `packages/app` directory.
  - Create `apps/web` as a minimal Next.js app using TypeScript and Vanilla CSS (no Tailwind CSS, per styling rules).
  - Add `@ai-learning-support/core` as a dependency of `apps/web`.
  - Render a greeting from both `apps/web` and `@ai-learning-support/core` on the main page.
  - Update `tsconfig.json` at the root and ensure `pnpm run check` runs successfully.
- **Non-Goals (Out of Scope)**:
  - Creating any complex UI components, layouts, or stylesheets.
  - Setting up routing, API routes, or databases.
  - Deploying the application.

---

## 3. Architecture & Components

### Target Repository Layout
```text
├── apps/
│   └── web/                   # Next.js web application
│       ├── src/
│       │   └── app/
│       │       ├── layout.tsx
│       │       ├── page.tsx
│       │       └── globals.css
│       ├── next.config.js
│       ├── package.json
│       └── tsconfig.json
├── packages/
│   └── core/                  # Core Business Logic package
├── pnpm-workspace.yaml        # Updated to include apps/*
├── tsconfig.json              # Updated to reference apps/web
└── package.json
```

### New Files to Create
1. **`pnpm-workspace.yaml` (Modification)**: Include `apps/*`.
2. **`apps/web/package.json`**: Package descriptor for the Next.js frontend, declaring the dependency on `@ai-learning-support/core`.
3. **`apps/web/tsconfig.json`**: TypeScript configuration extending the base config.
4. **`apps/web/next.config.js`**: Standard Next.js configuration.
5. **`apps/web/src/app/layout.tsx`**: Root layout for Next.js App Router.
6. **`apps/web/src/app/page.tsx`**: Home page importing `core` from `@ai-learning-support/core`.
7. **`apps/web/src/app/globals.css`**: Basic styling rules.

---

## 4. Acceptance Criteria
- [ ] Running `pnpm install` successfully links `@ai-learning-support/core` inside `apps/web`.
- [ ] Running `pnpm --filter @ai-learning-support/core build` compiles the core package.
- [ ] Running `pnpm --filter web dev` starts the Next.js dev server on port 3000.
- [ ] Opening `http://localhost:3000` displays `"Hello World from Web App and Core: core"`.
- [ ] Running `pnpm run check` (build, lint, typecheck, test) passes without errors.

---

## 5. Testing Strategy
- **Manual Verification**: Run `pnpm dev` and verify the webpage loads without console errors and correctly fetches/renders data exported from `packages/core`.
- **Static Validation**: Run `pnpm run check` to ensure Biome lints and formats properly, TypeScript compiles without errors across both workspace projects, and tests pass.
