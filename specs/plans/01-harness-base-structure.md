# Implementation Plan: Gemini Suitable Harness Base Structure

## 1. Context & Rationale
We are restructuring the AI agent harness to conform to the `gemini-suitable-harness-plan.md`. This involves removing the old, bureaucratic file structure, establishing a flat, lean hierarchy, and preparing the foundation for a small set of robust, wide-ranging core workflows (skills).

## 2. Architectural Impact & Constraints
- **Lean Memory & Rules**: We will remove the old static routing files and rely on dynamic semantic search (`mgrep`).
- **Separation of Concerns**: Human-facing specs (`specs/`) are strictly separated from agent-only memory (`.agents/memory/`).
- **Core Workflows**: We will replace the existing 9 skills with the 7 new core workflows defined in the architectural plan.

## 3. Atomic Tasks

### Task 1: Clean Up Old Harness Files
- **Goal & Rationale**: Remove the legacy skills, memory files, and specs to establish a clean slate.
- **Target Commands**:
  - `rm -rf .agents/skills/*`
  - `rm -rf .agents/memory/*`
  - `rm -rf rules/*`
  - `rm -rf specs/*` (preserving this plan file)
- **Acceptance Criteria**: The directories are emptied of old content.

### Task 2: Scaffold New Base Directories
- **Goal & Rationale**: Create the precise folder structure mandated by the new harness plan without creating gitkeep files.
- **Target Directories**:
  - `rules/`
  - `specs/templates/`, `specs/prds/`, `specs/adrs/`, `specs/plans/`
  - `.agents/memory/resources/`, `.agents/memory/rsi/`
  - `.agents/skills/orchestrator/`, `.agents/skills/researcher/`, `.agents/skills/architect/`, `.agents/skills/tdd-implementer/`, `.agents/skills/reviewer/`, `.agents/skills/challenger/`, `.agents/skills/retrospective/`
- **Acceptance Criteria**: All required directories exist. Empty directories are not forced into git with `.gitkeep` files.

### Task 3: Setup Dynamic Entrypoint (AGENTS.md)
- **Goal & Rationale**: Rewrite the root `AGENTS.md` file to act as the single entrypoint that instructs agents to use dynamic semantic exploration (`mgrep`).
- **Target File**: `AGENTS.md`
- **Instructions**: Replace the current content with instructions for the agent to rely on semantic search instead of static routing tables. Highlight the new folder structure.
- **Acceptance Criteria**: `AGENTS.md` contains clear instructions for the agent to search for rules and resources dynamically.

### Task 4: Commit Changes
- **Goal & Rationale**: Track the new clean slate in git.
- **Target Commands**:
  - `git add .`
  - `git commit -m "chore(harness): clean up legacy files and establish new base structure"`
