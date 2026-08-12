# AI Learning Support — Implementation Plans Index

This directory contains technical implementation plans for feature development, system refactoring, and infrastructure updates in the AI Learning Support repository.

---

## Index of Epics & Plans

- **[Epic 001: Basic Email & Password Authentication](epics/001-email-password-auth.md)**
  - Status: Completed
  - Provider: Supabase Auth (`@supabase/ssr`) with Drizzle ORM Profile linkage
  - **[Plan 001: Supabase SSR Clients & Drizzle Profiles Schema](plans/001-supabase-ssr-drizzle-schema.md)** — Completed ([PR #46](https://github.com/69420pm/ai-learning-support-test/pull/46))
  - **[Plan 002: Next.js Proxy Session Refresh & Protected Route Guards](plans/002-proxy-session-refresh-route-guards.md)** — Completed ([PR #47](https://github.com/69420pm/ai-learning-support-test/pull/47))
  - **[Plan 003: Auth Server Actions & Auth Callback Route](plans/003-auth-server-actions-callback.md)** — Completed ([PR #48](https://github.com/69420pm/ai-learning-support-test/pull/48))
  - **[Plan 004: Auth UI Components & Pages](plans/004-auth-ui-components-pages.md)** — Completed ([PR #49](https://github.com/69420pm/ai-learning-support-test/pull/49))
  - **[Plan 005: Header User Navigation Dropdown & Playwright E2E Auth Test Suite](plans/005-user-nav-e2e-tests.md)** — In Review

- **[Epic: Chat Interface & Extensible AI Message Foundation](epics/chat-interface-foundation.md)**
  - Status: In Progress
  - Provider: Vercel AI SDK v7 (`streamText`), Drizzle ORM, Supabase Auth
  - **[Plan 006: Chat Database Schema & Query Encapsulation](plans/006-chat-database-schema-queries.md)** — Completed ([PR #51](https://github.com/69420pm/ai-learning-support-test/pull/51))
  - **[Plan 007: Multi-LLM Provider & Streaming API Controller](plans/007-chat-ai-providers-streaming-api.md)** — Completed ([PR #52](https://github.com/69420pm/ai-learning-support-test/pull/52))
  - **[Plan 008: Interactive Chat UI & Code Syntax Highlighting](plans/008-chat-ui-components.md)** — Completed ([PR #53](https://github.com/69420pm/ai-learning-support-test/pull/53))
  - **[Plan 009: Page Routing, App Proxy Guard & Sidebar Thread History](plans/009-chat-routing-proxy-sidebar.md)** — Completed ([PR #54](https://github.com/69420pm/ai-learning-support-test/pull/54))

- **[Epic 002a: Chat UI Refinements, Interactive Model Selection & Unified Dashboard Routing](epics/002a-chat-ui-refinements-model-selection.md)**
  - Status: In Review
  - Provider: Vercel AI SDK v7, Radix UI Popover, Supabase Auth
  - **[Plan 010: Chat UI Refinements, Model Selection & Unified Dashboard Routing](plans/010-chat-ui-refinements-model-selection-unified-dashboard-routing.md)** — In Review ([PR #55](https://github.com/69420pm/ai-learning-support-test/pull/55))

