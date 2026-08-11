# External Repositories Rule (`rules/external-repos.md`)

This rule provides a quick reference index of pre-existing sibling repositories located under `../` (`/workspaces/`). The `external-repo-analyzer` subagent and primary agents should consult this file before cloning or searching external codebases.

---

## 1. Sibling Directory Policy

1. **Isolation & Read-Only Access:**
   - Pre-existing external repositories reside in sibling directories relative to the project workspace root (i.e. `../<repo-name>` or `/workspaces/<repo-name>`).
   - Treat all sibling repositories as **read-only** reference codebases. Do **NOT** modify files in sibling repositories unless specifically requested.
2. **Pre-existence Check:**
   - Before attempting to `git clone` any external repository, check if the repository is already present in `../<repo-name>`.

---

## 2. Available Public Repositories Index

### A. `../chatbot` (Vercel AI SDK Official Chatbot)
- **Path:** `../chatbot` (`/workspaces/chatbot`)
- **Origin:** Official Vercel Next.js AI Chatbot template (`vercel/ai-chatbot`).
- **Core Tech Stack:**
  - **Framework:** Next.js 16 (App Router with Turbopack), React 19, TypeScript.
  - **AI & LLM:** Vercel AI SDK (`ai` v7, `@ai-sdk/react`, `@ai-sdk/otel`), `streamText`, `useChat`.
  - **Database & Auth:** Drizzle ORM, PostgreSQL (`postgres`), NextAuth v5 (beta), Redis rate-limiting.
  - **UI & Styling:** TailwindCSS v4, Radix UI, Framer Motion / Motion, Lucide icons, Sonner toast.
  - **Content & Editing:** Streamdown, ProseMirror, CodeMirror (Python/theme), KaTeX math rendering, Diff-match-patch.
- **Key Modules & Entrypoints:**
  - [`app/(chat)/api/chat/route.ts`](file:///workspaces/chatbot/app/\(chat\)/api/chat/route.ts): Main chat API handler using Vercel AI SDK `streamText` with tools & artifact handling.
  - [`lib/ai/`](file:///workspaces/chatbot/lib/ai): AI provider wrappers, model configurations, prompts, and tool declarations.
  - [`components/`](file:///workspaces/chatbot/components): Modern UI components including chat messages, prompt inputs, sidebars, and artifact preview containers.
  - [`lib/db/schema.ts`](file:///workspaces/chatbot/lib/db/schema.ts): Drizzle PostgreSQL schema definitions for users, chats, messages, and artifacts.
- **Best Primary Reference For:**
  - Implementing Vercel AI SDK streaming endpoints (`streamText`, tool calling, structured outputs).
  - NextAuth v5 authentication flow in Next.js App Router.
  - Drizzle ORM + Postgres schemas and migrations.
  - Generative UI and live document/code artifact rendering.

---

### B. `../opencode` (OpenCode AI Development Engine)
- **Path:** `../opencode` (`/workspaces/opencode`)
- **Origin:** Anomaly Co (`anomalyco/opencode`) AI-powered development tool & coding assistant engine.
- **Core Tech Stack:**
  - **Framework & Monorepo:** Bun workspace (`bun@1.3.x`), Turborepo, TypeScript.
  - **Architecture & Logic:** Effect TS (`effect`), Hono, Drizzle SQLite (`@effect/sql-sqlite-bun`).
  - **UI Platforms:** OpenTUI (`@opentui/core`, `@opentui/solid`) for Terminal UI, SolidJS (`solid-js`, `@solidjs/start`), TailwindCSS v4, Electron (`packages/desktop`).
  - **AI & Integrations:** Vercel AI SDK (`ai`), custom tool runtime, MCP protocol (`@modelcontextprotocol/sdk`), Node-PTY shell sessions.
- **Key Packages & Entrypoints:**
  - [`packages/core/`](file:///workspaces/opencode/packages/core): Core domain engines, agent loops, tools registry, file context, and session persistence.
  - [`packages/llm/`](file:///workspaces/opencode/packages/llm): LLM provider abstractions, model streaming, and tool execution layer.
  - [`packages/tui/`](file:///workspaces/opencode/packages/tui): Terminal User Interface built with OpenTUI and SolidJS.
  - [`packages/app/`](file:///workspaces/opencode/packages/app) & [`packages/desktop/`](file:///workspaces/opencode/packages/desktop): Web and desktop frontend interfaces.
  - [`packages/cli/`](file:///workspaces/opencode/packages/cli): CLI entrypoint and command parsing.
- **Best Primary Reference For:**
  - Agentic tool-calling loops and multi-step agent orchestration.
  - A large professional coding agent codebase with TypeScript, that gets used in production.
  - Functional domain modeling using Effect TS.
  - Terminal UI construction (OpenTUI) and shell execution management (Node-PTY).
  - Model Context Protocol (MCP) integrations and multi-package TypeScript monorepo setup.

---

## 3. Recommended Analysis Workflow for Subagent

When `external-repo-analyzer` is invoked to study patterns from these repos:
1. Locate target codebase under `../chatbot` or `../opencode`.
2. Inspect the relevant module directory using `list_dir` or `grep_search`.
3. Read relevant source files using `view_file` to extract design patterns, type definitions, and API usage.
4. Summarize insights back to the parent agent with file links (`file:///workspaces/...`).
