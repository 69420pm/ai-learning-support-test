# ADR 004: Standardizing AI Operations via Vercel AI SDK 7.x
**Status:** Accepted | **Date:** 2026-08-08

## 1. The Decision
We adopt Vercel AI SDK 7.x (`ai`) as the application-wide standard for LLM text streaming, tool invocation, structured object generation, and embedding generation, co-located in `lib/ai`.

## 2. Rationale & Alternatives (Concise)
*   **Why Vercel AI SDK 7.x:** Provides native unified provider abstractions (`@ai-sdk/openai`, `@ai-sdk/google`, etc.), built-in React UI integration, standardized data streaming (`streamText`, `useChat`), and structured output validation.
*   **Why Co-location in lib/ai:** Keeps AI prompt construction, tool schemas, and provider instances clean and accessible across API routes and server actions.
*   **Rejected Custom SSE Stream Parsers:** Custom streaming and tool-calling abstractions are high-maintenance and error-prone compared to Vercel AI SDK standard utilities.
*   **Trade-off:** Dependency on Vercel AI SDK API evolution.
