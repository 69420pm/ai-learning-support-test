# ADR 005: Multi-Provider & Bring-Your-Own-Key (BYOK) LLM Configuration
**Status:** Accepted | **Date:** 2026-08-08

## 1. The Decision
We implement a multi-provider LLM registry in `lib/ai/providers.ts` using Vercel AI SDK providers (OpenAI, Gemini, OpenWebUI, Anthropic) supporting per-user Bring-Your-Own-Key (BYOK) dynamic instantiation.

## 2. Rationale & Alternatives (Concise)
*   **Why Dynamic BYOK & Multi-Provider Registry:** Allows users to configure custom API keys or self-hosted endpoint models at runtime without code changes or service restarts.
*   **Why Vercel AI SDK Provider Interface:** Provider adapters conform natively to standard `LanguageModelV1` / `EmbeddingModelV1` interfaces.
*   **Rejected Single Hardcoded LLM Provider:** Tightly coupling to one LLM vendor creates vendor lock-in and prevents self-hosting or cost-optimized model routing.
*   **Trade-off:** Requires validating user-provided API keys and base URLs dynamically on request.
