# Epic: Extensible LLM Chat Engine & Provider Abstraction

## 1. Overview & Vision
Build a clean, vendor-agnostic chat interface powered by Vercel AI SDK and connected via a pluggable LLM provider factory. OpenWebUI is implemented as the first provider adapter, backed by dual-mode database persistence (SQLite for local, PostgreSQL for cloud). 

This architecture guarantees zero vendor lock-in, enabling seamless future switching to Google Gemini API, Anthropic, or local models, while exposing a clean orchestrator for future agentic tools and workflows.

### User Experience Vision
- **Clean & Distraction-Free:** A modern, single-chat view focused on the conversation.
- **Rich Formatting:** Full markdown rendering, including syntax highlighting for code blocks.
- **Responsive & Resilient:** Graceful error handling (e.g., if the OpenWebUI backend is down or the API key is missing) with clear user feedback.

## 2. Technical Architecture
Following our 4-tier modular monolith architecture ([ADR 003](file:///workspaces/secure-ai-learning-support/specs/adrs/003-modular-monolith-package-structure.md), [ADR 004](file:///workspaces/secure-ai-learning-support/specs/adrs/004-llm-provider-abstraction.md), and [ADR 005](file:///workspaces/secure-ai-learning-support/specs/adrs/005-pluggable-llm-providers.md)):

- **`packages/shared` (`@shared`)**:
  - Domain entity types: `ChatMessage`, `ChatThread`, `LLMProviderConfig`.
  - Repository and Provider interfaces: `IChatRepository`, `ILlmProviderFactory`, and `IToolRegistry` (for future agents).
  - *Note: `@shared` must remain zero-dependency. Interfaces referencing external types (like `LanguageModel`) must use `import type`.*

- **`packages/infrastructure` (`@infrastructure`)**:
  - **Database Layer**: Drizzle schemas for both SQLite (Local Mode) and PostgreSQL (Cloud Mode) for `chat_threads` and `chat_messages` + `DrizzleChatRepository`.
  - **LLM Driver Layer (`@infrastructure/src/llm`)**: Vercel AI SDK integration (`ai`, `@ai-sdk/openai`), `LlmProviderFactory`, and `OpenWebUIProviderAdapter` (configured with `OPENWEBUI_BASE_URL` & `OPENWEBUI_API_KEY`).

- **`packages/core` (`@core`)**:
  - LEAN `ChatOrchestrator` service receiving a Vercel AI SDK `LanguageModel` via constructor injection, handling thread history formatting, system prompts, and stream generation.
  - *Note: Core services must NOT import from `@infrastructure`. Concrete models are wired and injected via composition root factory files.*

- **`apps/web` (`apps/web`)**:
  - Thin API route `/api/chat/route.ts` delegating execution to `@core` `ChatOrchestrator`.
  - Clean single-chat presentation component.

## 3. Vercel AI SDK Integration Strategy
This epic heavily leverages the Vercel AI SDK to standardize our LLM interactions and prepare for tool-calling capabilities.

- **Frontend (`apps/web`)**: We will rely on the `@ai-sdk/react` `useChat` hook to manage the lifecycle of the chat. This includes message state, loading states, error handling, and the `stop` generation mechanism. We will not build custom React state for chat messages.
- **Backend Orchestrator (`@core`)**: The `ChatOrchestrator` will utilize the `streamText` function from the `ai` package to generate text. It interacts with providers entirely through the agnostic `LanguageModel` interface.
- **API Delivery (`apps/web`)**: The Next.js API route will format the output of `streamText` using `toDataStreamResponse()` (or equivalent Data Stream Protocol implementation) to ensure perfect compatibility with the frontend `useChat` hook.
- **Future-proofing**: The `streamText` function accepts a `tools` parameter, which perfectly sets up our architecture to integrate the `IToolRegistry` in subsequent epics.

## 4. Out of Scope
- Multi-agent orchestration UI components (reserved for subsequent epics).
- Advanced document parsing / GraphRAG vector indexing (handled by separate domain features).
- Complex sidebar thread management UI (UI is focused on clean single-chat view in this milestone, while backend fully supports multi-thread DB storage).

## 5. High-Level Implementation Steps (For Planning)
*(Detailed file-by-file implementation plans will be generated from this epic in a later step.)*

- **Step 1: Shared Interfaces & Infrastructure Factory:** Define the core domain entities and interfaces in `@shared` (maintaining zero-dependency). Implement the OpenWebUI adapter and factory in `@infrastructure/src/llm/`.
- **Step 2: Database Persistence:** Implement the Drizzle schemas (both SQLite and PostgreSQL) and the `DrizzleChatRepository` to fulfill the Dual-Mode architecture.
- **Step 3: Core Orchestrator:** Build the `ChatOrchestrator` in `@core` that accepts a `LanguageModel` and handles the `streamText` pipeline.
- **Step 4: Frontend UI & API Route:** Wire the frontend `useChat` hook to the `/api/chat/route.ts` endpoint, rendering the streaming markdown.

---

## 🤖 Agent Guidelines & Toolkit
*(Instructions for AI agents generating plans or executing code for this Epic)*

1. **Leverage the AI SDK Skill:** Before creating implementation plans or writing code, trigger your `ai-sdk` skill (read `/.agents/skills/ai-sdk/SKILL.md`). You must understand the latest Vercel AI SDK paradigms for `streamText`, `useChat`, and the Data Stream Protocol.
2. **Strict Protocol Adherence:** Do not hallucinate custom WebSocket streaming solutions or custom JSON streaming payloads. Strictly use the standard Vercel AI SDK Data Stream protocol in the API route.
3. **Architecture Boundaries:** Enforce the boundaries defined in `rules/package-architecture.md`. If you are wiring the `ChatOrchestrator` in `apps/web/api/chat/route.ts`, remember that concrete infrastructure classes must be injected there (or via a factory), keeping `@core` completely unaware of the concrete `OpenWebUIProviderAdapter`.
4. **Zero-Dependency Shared Layer:** When defining `ILlmProviderFactory` or `IToolRegistry` in `@shared`, only use `import type { LanguageModelV1 } from 'ai'` (if supported without adding to package.json) or define generic equivalent interfaces to prevent runtime dependencies in the shared layer.
