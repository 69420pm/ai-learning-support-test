# ADR 004: Standardizing LLM Streaming & Driver Placement via Vercel AI SDK
**Status:** Accepted | **Date:** 2026-07-23

## 1. The Decision
We adopt the Vercel AI SDK (`ai`) as the application-wide standard for LLM streaming and tool execution, placing all concrete SDK provider drivers in `packages/infrastructure/src/llm/` while exposing an abstract port interface to `@core`.

## 2. Rationale & Alternatives (Concise)
*   **Why Vercel AI SDK:** Provides standardized stream parsing transformers (`toDataStreamResponse()`), React UI hooks (`useChat`), and structured tool schema validation out of the box.
*   **Why Drivers in packages/infrastructure:** Adheres to package architecture (ADR 003) by isolating external API clients from `@core`, keeping domain orchestrators 100% testable without network side-effects.
*   **Rejected Custom SSE Stream Wrappers:** Building custom SSE stream parsers and event handlers for multi-turn chat and tool calls is error-prone and high maintenance.
*   **Rejected Placing SDK Drivers in core:** Importing provider SDK packages directly into `@core` leaks vendor details into domain orchestration logic.
*   **Trade-off:** Introduces slight abstraction overhead by wrapping Vercel AI SDK model instances behind factory ports.
