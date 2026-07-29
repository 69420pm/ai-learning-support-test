# ADR 005: Pluggable Multi-Provider LLM Strategy
**Status:** Proposed | **Date:** 2026-07-23

## 1. The Decision
We implement a pluggable multi-provider factory (`ILlmProviderFactory`) in `packages/infrastructure/src/llm/` that instantiates model adapters (OpenWebUI, Gemini, Anthropic, OpenAI) behind a unified interface to ensure zero vendor lock-in.

## 2. Rationale & Alternatives (Concise)
*   **Why Factory Pattern:** Allows switching LLM providers or enabling Bring-Your-Own-Key (BYOK) via runtime configuration without altering downstream `@core` workflow or UI code.
*   **Why OpenWebUI Adapter as Initial Target:** Provides immediate support for self-hosted OpenAI-compatible deployments while keeping the architecture open to direct Google Gemini or Anthropic integrations.
*   **Rejected Hardcoded Provider Clients:** Tightly coupling code to OpenWebUI or OpenAI APIs creates severe vendor lock-in and high refactoring debt for multi-provider support.
*   **Trade-off:** Requires maintaining small provider adapter wrappers inside `packages/infrastructure/src/llm/adapters/`.
