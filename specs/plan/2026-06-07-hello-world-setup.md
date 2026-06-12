# Technical Implementation Plan: Hello World Setup

## 1. Overview & Context
- **Feature Description**: Align the monorepo structure with the target system architecture by introducing `apps/web` as a minimal Next.js application, introducing a shared TypeScript configuration package `@ai-learning-support/tsconfig` in `packages/tsconfig`, linking `apps/web` to the `@ai-learning-support/core` package, and displaying a "Hello World" message fetched from the core package.
- **User Value / Problem Solved**: Validates the end-to-end development cycle (workspace links, build system, TypeScript config references, development server startup) with a minimal, zero-bloat "Hello World".
- **Idea Path**: N/A (Direct user request for boilerplate verification)

---

## 2. Scope Boundaries (Goals & Non-Goals)
- **Goals (In Scope)**:
  - Configure the monorepo workspace to include `apps/*` and `packages/*`.
  - Introduce a shared TypeScript config package in `packages/tsconfig/` containing the base and Next.js presets.
  - Delete the empty `packages/app` directory.
  - Create `apps/web` as a minimal Next.js app using TypeScript and Vanilla CSS (no Tailwind CSS, per styling rules).
  - Structure `apps/web` with the App Router files located directly under `apps/web/app/` (no `src/` folder) to align with the directory layout in [specs/system_architecture.md](file:///Users/kevinsmith/Documents/development/typescript/ai-learning-support/specs/system_architecture.md).
  - Add `@ai-learning-support/core` as a workspace dependency of `apps/web`.
  - Render a greeting from both `apps/web` and `@ai-learning-support/core` on the main page.
  - Update root configurations (`tsconfig.json`, `pnpm-workspace.yaml`) and ensure `pnpm run check` (which runs lint, format, typecheck, and test) passes successfully.
- **Non-Goals (Out of Scope)**:
  - Creating any complex UI components, layouts, or stylesheets.
  - Setting up routing, API routes, or databases.
  - Setting up the dashboard page (`apps/web/app/dashboard`) or any backend adapters.

---

## 3. Architecture & Components

### Target Repository Layout
```text
├── apps/
│   └── web/                   # Next.js web application
│       ├── app/               # Next.js App Router (pages, layouts)
│       │   ├── layout.tsx
│       │   ├── page.tsx
│       │   └── globals.css
│       ├── components/        # UI components (initially empty)
│       ├── next.config.js
│       ├── package.json
│       └── tsconfig.json
├── packages/
│   ├── core/                  # Core Business Logic package
│   │   ├── src/
│   │   │   ├── index.ts
│   │   │   └── index.test.ts
│   │   ├── package.json
│   │   └── tsconfig.json
│   └── tsconfig/              # Shared TypeScript configurations
│       ├── package.json
│       ├── base.json
│       └── nextjs.json
├── pnpm-workspace.yaml        # Workspace configuration
├── tsconfig.json              # Solution-style root tsconfig references
└── package.json
```

### New Files to Create

1. **`packages/tsconfig/package.json`**:
   Declares `@ai-learning-support/tsconfig` as a local workspace package.
   ```json
   {
     "name": "@ai-learning-support/tsconfig",
     "version": "1.0.0",
     "private": true,
     "files": [
       "base.json",
       "nextjs.json"
     ]
   }
   ```

2. **`packages/tsconfig/base.json`**:
   Shared base compiler options migrated from the root `tsconfig.base.json`.
   ```json
   {
     "compilerOptions": {
       "target": "ES2022",
       "module": "NodeNext",
       "moduleResolution": "NodeNext",
       "strict": true,
       "skipLibCheck": true,
       "declaration": true,
       "declarationMap": true,
       "sourceMap": true,
       "composite": true,
       "esModuleInterop": true,
       "outDir": "dist",
       "ignoreDeprecations": "6.0",
       "noImplicitOverride": true,
       "noPropertyAccessFromIndexSignature": true,
       "noUncheckedIndexedAccess": true,
       "exactOptionalPropertyTypes": true,
       "noFallthroughCasesInSwitch": true,
       "noImplicitReturns": true,
       "noUnusedLocals": true,
       "noUnusedParameters": true
     }
   }
   ```

3. **`packages/tsconfig/nextjs.json`**:
   TypeScript preset for Next.js applications in the monorepo.
   ```json
   {
     "extends": "./base.json",
     "compilerOptions": {
       "module": "Preserve",
       "moduleResolution": "Bundler",
       "lib": ["dom", "dom.iterable", "esnext"],
       "allowJs": true,
       "noEmit": true,
       "incremental": true,
       "jsx": "preserve",
       "plugins": [
         {
           "name": "next"
         }
       ]
     }
   }
   ```

4. **`apps/web/package.json`**:
   Declares Next.js dependencies, React dependencies, and local workspace links.
   ```json
   {
     "name": "web",
     "version": "1.0.0",
     "private": true,
     "scripts": {
       "dev": "next dev",
       "build": "next build",
       "start": "next start",
       "lint": "biome lint app",
       "format": "biome format app --write",
       "typecheck": "tsc --noEmit"
     },
     "dependencies": {
       "@ai-learning-support/core": "workspace:*",
       "next": "^15.1.0",
       "react": "^19.0.0",
       "react-dom": "^19.0.0"
     },
     "devDependencies": {
       "@ai-learning-support/tsconfig": "workspace:*",
       "@types/node": "^25.6.0",
       "@types/react": "^19.0.0",
       "@types/react-dom": "^19.0.0",
       "typescript": "^6.0.3"
     }
   }
   ```

5. **`apps/web/tsconfig.json`**:
   Next.js TypeScript configuration extending the shared config.
   ```json
   {
     "extends": "@ai-learning-support/tsconfig/nextjs.json",
     "include": ["next-env.d.ts", "**/*.ts", "**/*.tsx", ".next/types/**/*.ts"],
     "exclude": ["node_modules"]
   }
   ```

6. **`apps/web/next.config.js`**:
   Configures Next.js to transpile workspace package imports.
   ```javascript
   /** @type {import('next').NextConfig} */
   const nextConfig = {
     transpilePackages: ["@ai-learning-support/core"],
   };

   module.exports = nextConfig;
   ```

7. **`apps/web/app/globals.css`**:
   Clean, modern global styles using Vanilla CSS variables.
   ```css
   :root {
     --background: #0d0f12;
     --foreground: #f4f6f8;
     --primary: #3b82f6;
     --font-family: system-ui, -apple-system, sans-serif;
   }

   body {
     background-color: var(--background);
     color: var(--foreground);
     font-family: var(--font-family);
     margin: 0;
     display: flex;
     justify-content: center;
     align-items: center;
     height: 100vh;
   }

   main {
     text-align: center;
     padding: 2rem;
     border: 1px solid #2d3139;
     border-radius: 8px;
     background: rgba(255, 255, 255, 0.02);
   }

   h1 {
     color: var(--primary);
     margin-bottom: 0.5rem;
   }
   ```

8. **`apps/web/app/layout.tsx`**:
   Root layout structure.
   ```tsx
   import "./globals.css";

   export const metadata = {
     title: "AI Learning Support",
     description: "Next-generation learning companion",
   };

   export default function RootLayout({
     children,
   }: {
     children: React.ReactNode;
   }) {
     return (
       <html lang="en">
         <body>{children}</body>
       </html>
     );
   }
   ```

9. **`apps/web/app/page.tsx`**:
   Invokes the core business logic function and renders the message.
   ```tsx
   import { core } from "@ai-learning-support/core";

   export default function HomePage() {
     const coreValue = core();

     return (
       <main>
         <h1>Hello World from Web App</h1>
         <p>Value from Core Package: <strong>{coreValue}</strong></p>
       </main>
     );
   }
   ```

### Existing Files to Modify

1. **`packages/core/tsconfig.json`**:
   Update it to extend `@ai-learning-support/tsconfig/base.json`.
   ```json
   {
     "extends": "@ai-learning-support/tsconfig/base.json",
     "compilerOptions": {
       "outDir": "./dist",
       "rootDir": "./src"
     },
     "include": ["src"],
     "exclude": ["node_modules", "dist"]
   }
   ```

2. **`packages/core/package.json`**:
   Add `@ai-learning-support/tsconfig` as a devDependency.
   ```json
   "devDependencies": {
     "@ai-learning-support/tsconfig": "workspace:*",
     "typescript": "^6.0.3"
   }
   ```

3. **`tsconfig.json` (root)**:
   Add `./apps/web` to references list if not already present.
   ```json
   {
     "files": [],
     "references": [{ "path": "./packages/core" }, { "path": "./apps/web" }]
   }
   ```

4. **`tsconfig.base.json` (root)**:
   Delete this file as its configuration is now centralized in `packages/tsconfig/base.json`.

---

## 4. Acceptance Criteria
- [ ] Running `pnpm install` successfully links the local monorepo packages.
- [ ] Running `pnpm --filter @ai-learning-support/core build` compiles the core package successfully.
- [ ] Running `pnpm --filter web dev` starts the Next.js dev server on port 3000.
- [ ] Opening `http://localhost:3000` displays `"Hello World from Web App"` and `"Value from Core Package: core"`.
- [ ] Running `pnpm run check` (build, lint, typecheck, test) passes without errors across all packages.

---

## 5. Testing Strategy
- **Manual Verification**: Launch the development server and verify the page loads, uses the custom CSS design system, and retrieves/renders data from `@ai-learning-support/core` correctly.
- **Static Validation**: Verify that Biome formatting and linting checks run cleanly on `apps/web` and `packages/core`. Verify that TypeScript typecompilation passes.
