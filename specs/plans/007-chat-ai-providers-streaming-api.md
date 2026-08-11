# Implementation Plan 007: Multi-LLM Provider & Streaming API Controller

**Parent Epic**: [`specs/epics/chat-interface-foundation.md`](file:///workspaces/secure-ai-learning-support/specs/epics/chat-interface-foundation.md)

---

## 1. Context & Architecture Overview

The goal of this step is to build the multi-LLM provider configuration and real-time streaming SSE API route handler within **AI Learning Support**, establishing the streaming and persistence foundations required for downstream AI features and future AI agents.

This step strictly adheres to the **Single Next.js Application Architecture** ([`ADR 001`](file:///workspaces/secure-ai-learning-support/specs/adrs/001-single-app-architecture.md)), **Vercel AI SDK Integration & BYOK Strategy** ([`ADR 004`](file:///workspaces/secure-ai-learning-support/specs/adrs/004-vercel-ai-sdk-byok.md)), and **Supabase Auth** ([`ADR 005`](file:///workspaces/secure-ai-learning-support/specs/adrs/005-supabase-auth-integration.md)).

### Framework & Major Library Pinned Versions
- **Next.js**: `^16.3.0` (App Router, Server Actions, Next.js 16 `proxy.ts` session middleware)
- **Vercel AI SDK**: `ai@^7.0.58`, `@ai-sdk/google@^4.0.39`, `@ai-sdk/openai@^4.0.36`
- **Database & ORM**: `drizzle-orm@^0.45.2`, `postgres@^3.4.9`, `pg@^8.22.0`
- **Authentication**: `@supabase/ssr@^0.12.4`, `@supabase/supabase-js@^2.112.2`

### Directory Layer Categorization

```text
secure-ai-learning-support/
├── app/
│   └── api/chat/route.ts          # Thin HTTP SSE stream controller
└── lib/
    ├── ai/
    │   ├── providers.ts           # Multi-provider resolution (Gemini, OpenAI, OpenRouter, BYOK)
    │   ├── prompts.ts             # System prompts and title generation prompts
    │   └── stream.ts              # Vercel AI SDK createUIMessageStream pipeline builder
    └── db/
        └── queries/chat.ts        # Encapsulated Drizzle queries for chats & messages
```

---

## 2. External Reference Codebase Mapping (`/workspaces/chatbot`)

Consult Vercel's official Chatbot reference codebase at [`/workspaces/chatbot`](file:///workspaces/chatbot) when implementing components and functions:

| Subsystem / Feature | Reference File in `../chatbot` | Target Path in `secure-ai-learning-support` | Implementation Notes |
| :--- | :--- | :--- | :--- |
| **Title Generator & Prompts** | [`lib/ai/prompts.ts`](file:///workspaces/chatbot/lib/ai/prompts.ts)<br>[`lib/ai/models.ts`](file:///workspaces/chatbot/lib/ai/models.ts) | [`lib/ai/prompts.ts`](file:///workspaces/secure-ai-learning-support/lib/ai/prompts.ts)<br>[`lib/ai/providers.ts`](file:///workspaces/secure-ai-learning-support/lib/ai/providers.ts) | Adapt `titlePrompt` and fast model instantiation for async title generation. |
| **Streaming Route Controller** | [`app/(chat)/api/chat/route.ts`](file:///workspaces/chatbot/app/\(chat\)/api/chat/route.ts) | [`app/api/chat/route.ts`](file:///workspaces/secure-ai-learning-support/app/api/chat/route.ts) | Maintain thin controller structure. Authenticate via `@supabase/ssr`. |

---

## 3. Step Specification & Definition of Done

### Step 2: Multi-LLM Provider & Streaming API Controller (`lib/ai/`, `app/api/chat/route.ts`)

- **Objective**: Implement LLM provider configuration in `lib/ai/providers.ts` supporting Google Gemini, OpenAI, OpenRouter, and custom OpenAI-compatible endpoints with BYOK key management. Build a thin SSE API route in `app/api/chat/route.ts` that verifies Supabase Auth sessions, calls `streamText` via a `createUIMessageStream` + `createUIMessageStreamResponse` pipeline (matching the AI SDK v7 pattern), and triggers non-blocking title generation on prompt #1.
- **Key Packages**: `ai`, `@ai-sdk/google`, `@ai-sdk/openai`, `@supabase/ssr`
- **Required Reading**:
  - Internal: `ai-sdk` skill ([`SKILL.md`](file:///workspaces/secure-ai-learning-support/.agents/skills/ai-sdk/SKILL.md)), [`specs/adrs/004-vercel-ai-sdk-byok.md`](file:///workspaces/secure-ai-learning-support/specs/adrs/004-vercel-ai-sdk-byok.md), [`lib/supabase/server.ts`](file:///workspaces/secure-ai-learning-support/lib/supabase/server.ts)
  - External Reference: [`/workspaces/chatbot/app/(chat)/api/chat/route.ts`](file:///workspaces/chatbot/app/\(chat\)/api/chat/route.ts), [`/workspaces/chatbot/lib/ai/prompts.ts`](file:///workspaces/chatbot/lib/ai/prompts.ts), [Vercel AI SDK streamText Docs](https://sdk.vercel.ai/docs/api-reference/stream-text)
- **Sources**: Verified Vercel AI SDK `streamText` and provider abstractions from `node_modules/ai/docs/` and `node_modules/@ai-sdk/google/docs/15-google.mdx`.

```mermaid
flowchart TD
    POST[POST /api/chat] --> Auth[Check Supabase Auth Session]
    Auth -- Unauthenticated (401) --> Err[Return 401 Unauthorized Response]
    Auth -- Authenticated --> Parse[Validate Body with Zod]
    Parse --> Fetch[Fetch existing chat or save new chat]
    Fetch --> SaveUser[Save User Message to DB]
    SaveUser --> Stream[Call streamText with selected model]
    
    par Stream to Client
        Stream --> SSE[createUIMessageStreamResponse]
    and Non-Blocking Title Gen
        Stream -- First Message? --> GenTitle[Call generateText for Title]
        GenTitle --> UpdateDB[Update Chat Title in DB]
        GenTitle --> StreamTitleChunk[Write chat-title event via createDataStream]
    end
    
    Stream -- On Finish --> SaveAssistant[Save Assistant Message with parts to DB]
```

- **Definition of Done (DoD)**:
  1. **Provider Resolution**: `lib/ai/providers.ts` exports `getLanguageModel({ provider, modelId, apiKey? })` supporting `'google'`, `'openai'`, and `'openrouter'`.
  2. **API Guard & Validation**: `app/api/chat/route.ts` parses incoming request body `{ id, messages, model }` using Zod. Requests without a valid Supabase session return HTTP `401 Unauthorized`.
  3. **Streaming & DB Persistence**: When called by an authenticated user:
     - User message is stored in PostgreSQL via `saveMessages`.
     - `streamText` result is wrapped in `createUIMessageStream` and returned via `createUIMessageStreamResponse` (the AI SDK v7 structured streaming pipeline).
     - Upon stream completion (`onEnd`), assistant message and its full `parts` structure are saved to PostgreSQL.
  4. **Title Generation**: If `id` is a newly created chat, an async background task calls `generateText` with `titlePrompt` and sends a `chat-title` event via the data stream (using `createDataStream` / `writeData`), updating the database record. The client consumes this via a `DataStreamHandler` component (following the chatbot reference pattern).
  5. **API Integration Test**: A Vitest integration test in `app/api/chat/route.test.ts` mocks the LLM provider and verifies that `POST /api/chat` returns a 200 SSE stream response and writes messages to the DB.
  6. **Type Safety & Code Quality**: Running `pnpm check` passes with zero errors.

---

## 4. Security & Data Isolation Architecture

To ensure strict multi-tenant data isolation and prevent unauthorized access to user chat threads:

1. **Proxy Layer Guard**: `proxy.ts` rejects unauthenticated HTTP requests to `/chat*` before reaching App Router page components or API route handlers.
2. **Server-Side Authorization**: `app/api/chat/route.ts` and App Router page components (`app/chat/[id]/page.tsx`) call `@supabase/ssr` `createClient()` to resolve `user.id` from session cookies.
3. **Database Query Boundaries**: All Drizzle ORM query functions in `lib/db/queries/chat.ts` (`getChatById`, `getChatsByUserId`, `deleteChatById`) enforce `where(and(eq(chats.id, chatId), eq(chats.userId, userId)))`. An authenticated user cannot read, stream, or delete another user's chat thread even if they guess or modify the `chatId` URL parameter.
4. **PostgreSQL Foreign Keys**: `chats.userId` references `auth.users.id` with `onDelete: 'cascade'`. Deleting a user automatically purges all associated chat threads and messages at the database level.
