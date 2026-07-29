# Architectural Decision Records (ADRs)

Overview of the architectural decisions made for the project. Each decision is documented in `specs/adrs/`.

## Foundation & Core Invariants (Must-Read for All Architectural Changes)
Architectural decisions that define active, repository-wide invariants and code design patterns.

- [ADR 002: Dual-Mode Architecture (Local Self-Hosted vs. Cloud SaaS)](adrs/002-dual-mode-architecture.md) — *Pluggable adapter architecture (Local SQLite/FS vs Cloud Supabase PG/S3)*
- [ADR 003: Modular Monolith Architecture & Layering](adrs/003-modular-monolith-package-structure.md) — *Virtual package structure (`shared`, `infrastructure`, `features`, `core`), repository data access abstractions, and 3-tier doc governance*

## Domain & Feature Infrastructure (Read When Modifying Related Subsystems)
Decisions specific to sub-domains, background workers, or future scaling plans.

- [ADR 001: Cloud Scale-Up Strategy](adrs/001-cloud-scale-up-strategy.md) — *Future cloud scaling roadmap (Cloudflare R2 storage migration, background queue/worker options)*
- [ADR 004: Standardizing LLM Streaming & Driver Placement via Vercel AI SDK](adrs/004-llm-provider-abstraction.md) — *Vercel AI SDK stream standard with provider drivers isolated in `@infrastructure/src/llm`*
- [ADR 005: Pluggable Multi-Provider LLM Strategy](adrs/005-pluggable-llm-providers.md) — *Zero vendor lock-in pluggable LLM provider factory (OpenWebUI, Gemini, BYOK)*

