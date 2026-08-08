# ADR 004: Vercel AI SDK Integration & Multi-LLM BYOK Strategy
**Status:** Accepted | **Date:** 2026-08-08

## 1. The Decision
Standardize all LLM streaming, structured output generation, and tool calls on the Vercel AI SDK (`ai`) encapsulated within `@/lib/ai`, supporting multi-provider selection (OpenAI, Gemini, Anthropic) and Bring-Your-Own-Key (BYOK) user execution.

## 2. Rationale & Alternatives (Concise)
* **Why Vercel AI SDK:** Offers unified model provider abstractions (`streamText`, `generateObject`), built-in streaming protocol compatibility with React UI hooks (`useChat`), and clean tool invocation.
* **Why BYOK Support:** Enables flexible model provider switching and user-provided API keys without altering backend application code.
* **Rejected LangChain / LlamaIndex:** High framework overhead, bloated dependencies, and brittle abstractions compared to Vercel AI SDK.
* **Rejected Direct Provider SDKs (Raw OpenAI / Gemini SDKs):** Locks business logic into vendor APIs and duplicates SSE streaming infrastructure across models.
* **Trade-off:** Provider-specific unique API extensions require waiting for Vercel AI SDK provider ecosystem updates or implementing custom model middleware.
