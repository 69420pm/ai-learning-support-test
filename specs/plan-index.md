# AI Learning Support — Implementation Plans Index

This directory contains technical implementation plans for feature development, system refactoring, and infrastructure updates in the AI Learning Support repository.

All plans are generated using the [plan](file:///.agents/skills/plan/SKILL.md) skill, adhering to TDD task breakdown rules and monorepo architectural invariants.

---

## Index of Implementation Plans

- [Plan 01: Core Virtual Package Layering Refactoring](plans/01-virtual-package-layering-refactoring.md) — *Refactor packages/core/src/ into 4-tier virtual package layers (deprecated by Plan 03)*
- [Plan 02: Database Repository Pattern & Core Service Factory](plans/02-database-repository-factory-refactoring.md) — *Decouple core from raw drivers (deprecated by Plan 03)*
- [Plan 03: Single-App Architecture Overhaul & Repository Restructuring](plans/03-single-app-architecture-overhaul.md) — *Collapse 4-tier monorepo into Vercel-style single Next.js app, Postgres job queue, and Vercel AI SDK*
- [Epic: OpenWebUI Chat Interface & Core LLM Orchestrator](epics/chat-interface-openwebui.md) — *Extensible ChatGPT-style interface powered by Vercel AI SDK*




