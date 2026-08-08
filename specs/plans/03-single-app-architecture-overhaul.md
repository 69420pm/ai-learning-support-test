# Plan 03: Single-App Architecture Scaffolding & Agent Environment Setup

**Status:** Proposed | **Date:** 2026-08-08  
**Target:** Monorepo Purge, Directory Scaffolding, & Specs/Rules Overhaul for AI Agents  

---

## 1. Executive Summary & Decision Context

### Background
The **AI Learning Support** repository was initially set up as a multi-package monorepo (`apps/web`, `packages/core`, `packages/infrastructure`, `packages/shared`). While clean in theory, the legacy implementation suffered from severe premature abstraction, indirection friction, and buggy code.

Rather than writing feature code immediately, this phase focuses on **purging legacy monorepo artifacts, creating the root directory skeleton (with empty folder structures for future code), setting up project tooling, and updating all AI agent guidance documents (`AGENTS.md`, `rules/`, `specs/adrs/`)**.

This ensures future AI agents operate with zero hallucinations, clear single-app boundaries, and valid configuration files without any legacy baggage.

---

### Strategic Constraints & Driving Principles

1. **Scaffold & Guidance First (Zero Feature Code in this Phase):**  
   All feature code (database queries, AI streams, FSRS algorithms, GraphRAG workers) will be left for subsequent feature implementation plans. This plan strictly builds the workspace scaffold, tooling configs, and AI rules.
2. **Clean Slate Scratch Purge:**  
   Buggy legacy code in `apps/web` and `packages/*` and monorepo configs (`pnpm-workspace.yaml`, `turbo.json`) will be deleted entirely.
3. **AI Agent Guidance & Context Optimization:**  
   All project rules (`AGENTS.md`, `rules/`), ADRs (`specs/adrs/`), and index files will be updated to reflect the Single Next.js Application Architecture (`app/`, `lib/`, `components/`), eliminating confusing monorepo references.

---

## 2. Target Directory & Folder Structure (Skeleton)

```text
secure-ai-learning-support/
├── app/                        # Next.js App Router (Minimal Skeleton)
│   ├── api/                    # Route handlers placeholder
│   ├── globals.css             # Tailwind CSS v4 setup
│   ├── layout.tsx              # Root layout skeleton
│   └── page.tsx                # Welcome placeholder page
├── components/                 # UI Components (Empty Skeletons)
│   ├── ui/                     # Primitive components placeholder
│   ├── chat/                   # Chat UI components placeholder
│   └── document/               # Document UI components placeholder
├── lib/                        # Core Application Modules (Empty Skeletons)
│   ├── ai/                     # Vercel AI SDK providers & prompts placeholder
│   ├── db/                     # Drizzle ORM schema & client placeholder
│   ├── learning/               # FSRS & Feynman algorithms placeholder
│   ├── queue/                  # Job queue worker placeholder
│   └── utils.ts                # General utilities placeholder
├── public/                     # Static assets
├── specs/                      # Living specifications & ADRs (Updated)
│   ├── adrs/                   # Overhauled ADRs 001–005 (Single-App, Postgres, Vercel AI SDK)
│   ├── epics/                  # Feature epic specifications
│   └── plans/                  # Implementation plans (Plan 03)
├── rules/                      # Updated agent guidelines (Monorepo rules removed)
│   ├── single-app-architecture.md
│   ├── coding-style.md
│   ├── testing.md
│   └── styling.md
├── AGENTS.md                   # Single source of truth for agent rules & context
├── biome.json                  # Root Biome linter/formatter config
├── docker-compose.yml          # Local Docker setup (Postgres + pgvector)
├── drizzle.config.ts           # Drizzle Kit configuration
├── next.config.ts              # Next.js configuration
├── package.json                # Single unified dependencies manifest
├── tsconfig.json               # Root TypeScript configuration
└── vitest.config.ts            # Vitest testing configuration
```

---

## 3. ADR & Agent Rules Overhaul Scope

The entire `specs/` and `rules/` suite will be updated to guide AI agents effectively:

* **`AGENTS.md`**: Complete rewrite to remove 4-tier monorepo gotchas and establish single Next.js App Router co-location principles (`lib/db`, `lib/ai`, `lib/learning`, `lib/queue`).
* **`rules/single-app-architecture.md`**: Replaces outdated `package-architecture.md`. Outlines co-location rules, server action standards, and directory boundaries.
* **`specs/adrs/001-005`**:
  * **ADR 001 (Cloud Scale-Up Strategy):** Updated to Postgres-backed Job Queue (`pg-boss` / `FOR UPDATE SKIP LOCKED`).
  * **ADR 002 (Dual-Mode Architecture):** Updated to Drizzle ORM with PostgreSQL + `pgvector` (Supabase Cloud & Local Docker).
  * **ADR 003 (Architecture Paradigm):** Updated to Single Next.js Application Architecture.
  * **ADR 004 & 005 (AI SDK & Multi-LLM):** Updated to Vercel AI SDK 7.x native provider abstraction and BYOK model configuration.

---

## 4. Sequential Execution Plan

### Step 1: Legacy Monorepo Purge
* **Goal:** Delete `apps/`, `packages/`, `pnpm-workspace.yaml`, and `turbo.json`. Remove buggy legacy implementations and multi-package boilerplate.
* **Definition of Done (AI-Verifiable):**  
  `apps/`, `packages/`, `pnpm-workspace.yaml`, and `turbo.json` are deleted.

### Step 2: Directory Skeleton Creation
* **Goal:** Create empty folder structures with `.gitkeep` placeholders for `app/`, `components/ui`, `components/chat`, `components/document`, `lib/ai`, `lib/db`, `lib/learning`, `lib/queue`, `public/`.
* **Definition of Done (AI-Verifiable):**  
  Directory paths exist under root `app/`, `components/`, `lib/`, `public/`.

### Step 3: Agent Rules & Specs Overhaul
* **Goal:** Rewrite `AGENTS.md`, replace `rules/package-architecture.md` with `rules/single-app-architecture.md`, and update `specs/adrs/001-005.md` to reflect single-app Next.js architecture.
* **Definition of Done (AI-Verifiable):**  
  `AGENTS.md` and `rules/` contain zero references to deleted `packages/*` or monorepo boundaries.

### Step 4: Root Configuration & Tooling Files Setup
* **Goal:** Write unified root `package.json`, `tsconfig.json`, `next.config.ts`, `biome.json`, `drizzle.config.ts`, `vitest.config.ts`, and `docker-compose.yml`.
* **Definition of Done (AI-Verifiable):**  
  Root configuration files exist and contain valid JSON / TypeScript definitions.

### Step 5: Dependency Lock & Verification
* **Goal:** Run `pnpm install` to generate root `pnpm-lock.yaml` and run `pnpm check` to verify linting and typechecking on the scaffolded project.
* **Definition of Done (AI-Verifiable):**  
  `pnpm install` succeeds and `pnpm check` completes with zero errors.

