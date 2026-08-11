# Implementation Plan 009: Page Routing, App Proxy Guard & Sidebar Thread History

**Parent Epic**: [`specs/epics/chat-interface-foundation.md`](file:///workspaces/secure-ai-learning-support/specs/epics/chat-interface-foundation.md)

---

## 1. Context & Architecture Overview

The goal of this step is to implement page routing (`/chat` and `/chat/[id]`), Next.js proxy route protection in `proxy.ts`, and sidebar thread history with dynamic title updates and thread deletion within **AI Learning Support**.

This step strictly adheres to the **Single Next.js Application Architecture** ([`ADR 001`](file:///workspaces/secure-ai-learning-support/specs/adrs/001-single-app-architecture.md)), **PostgreSQL + Drizzle ORM** ([`ADR 002`](file:///workspaces/secure-ai-learning-support/specs/adrs/002-postgresql-pgvector-drizzle.md)), and **Supabase Auth** ([`ADR 005`](file:///workspaces/secure-ai-learning-support/specs/adrs/005-supabase-auth-integration.md)).

### Framework & Major Library Pinned Versions
- **Next.js**: `^16.3.0` (App Router, Server Actions, Next.js 16 `proxy.ts` session middleware)
- **React**: `^19.2.8` (React 19 Server & Client Components)
- **Authentication**: `@supabase/ssr@^0.12.4`, `@supabase/supabase-js@^2.112.2`
- **Styling & UI Components**: `lucide-react@^1.30.0`, `tailwindcss@^4.3.3`

### Directory Layer Categorization

```text
secure-ai-learning-support/
├── proxy.ts                       # Next.js 16 proxy route guard (updated to include /chat)
├── app/
│   └── chat/
│       ├── page.tsx               # Server component rendering client Chat container
│       └── [id]/page.tsx          # Chat viewport page for specified thread ID
└── components/
    └── chat/                      # Reusable chat React components
        ├── chat-sidebar.tsx       # Sidebar container with thread navigation
        └── sidebar-history.tsx    # Paginated/listed chat items with delete action
```

---

## 2. External Reference Codebase Mapping (`/workspaces/chatbot`)

Consult Vercel's official Chatbot reference codebase at [`/workspaces/chatbot`](file:///workspaces/chatbot) when implementing components and pages:

| Subsystem / Feature | Reference File in `../chatbot` | Target Path in `secure-ai-learning-support` | Implementation Notes |
| :--- | :--- | :--- | :--- |
| **Sidebar Thread History** | [`components/chat/sidebar-history.tsx`](file:///workspaces/chatbot/components/chat/sidebar-history.tsx)<br>[`components/chat/sidebar-history-item.tsx`](file:///workspaces/chatbot/components/chat/sidebar-history-item.tsx) | [`components/chat/sidebar-history.tsx`](file:///workspaces/secure-ai-learning-support/components/chat/sidebar-history.tsx) | Thread history item listing, active selection styling, and deletion menu. |

---

## 3. Step Specification & Definition of Done

### Step 4: Page Routing, App Proxy Guard & Sidebar Thread History (`app/chat/`, `components/chat/chat-sidebar.tsx`)

- **Objective**: Implement App Router pages for `/chat` (initializer redirect) and `/chat/[id]` (active thread). Update `proxy.ts` to protect `/chat` routes. Build the responsive sidebar (`chat-sidebar.tsx`, `sidebar-history.tsx`) displaying user thread history, active thread selection, dynamic title updates, and thread deletion.
- **Key Packages**: `next`, `@supabase/ssr`, `lucide-react`
- **Required Reading**:
  - Internal: `test-writer` skill ([`SKILL.md`](file:///workspaces/secure-ai-learning-support/.agents/skills/test-writer/SKILL.md)), [`rules/testing.md`](file:///workspaces/secure-ai-learning-support/rules/testing.md), [`proxy.ts`](file:///workspaces/secure-ai-learning-support/proxy.ts)
  - External Reference: [`/workspaces/chatbot/components/chat/sidebar-history.tsx`](file:///workspaces/chatbot/components/chat/sidebar-history.tsx), [`/workspaces/chatbot/components/chat/sidebar-history-item.tsx`](file:///workspaces/chatbot/components/chat/sidebar-history-item.tsx)

```mermaid
flowchart TD
    UserNav[User navigates to /chat] --> ProxyGuard{proxy.ts Check}
    ProxyGuard -- No Session --> RedirectLogin[Redirect to /login?redirectTo=/chat]
    ProxyGuard -- Valid Session --> LoadSidebar[Fetch getChatsByUserId in Server Component]
    
    LoadSidebar --> RenderSidebar[Render Sidebar History List]
    RenderSidebar --> ClickThread[User Clicks Existing Thread]
    ClickThread --> NavThread[Router navigates to /chat/[id]]
    NavThread --> LoadMessages[Server Component fetches getMessagesByChatId]
    LoadMessages --> Hydrate[Hydrate Chat Viewport with historical messages]
    
    RenderSidebar --> ClickDelete[User Clicks Delete Thread]
    ClickDelete --> ConfirmModal[Show Confirmation & call deleteChatById]
    ConfirmModal --> RemoveUI[Remove thread from Sidebar & redirect /chat if current]
```

- **Definition of Done (DoD)**:
  1. **Proxy Route Guard**: `proxy.ts` (at the project root) is updated to include `'/chat'` in the `PROTECTED_ROUTES` array (alongside existing entries `/dashboard`, `/learn`, `/review`, `/settings`). Requests to `/chat` or `/chat/[id]` without a valid Supabase session are automatically redirected to `/login?redirectTo=/chat`.
  2. **Page Routing**:
     - `app/chat/page.tsx`: Server Component that renders the client-side `<Chat>` container component. The `<Chat>` client component handles UUID generation and `router.replace()` to `/chat/[id]` upon first prompt submission.
     - `app/chat/[id]/page.tsx`: Server Component that validates `id` belongs to authenticated user via `getChatById`, pre-fetches `getMessagesByChatId`, and passes historical messages as props to the client-side `<Chat>` component for hydration.
  3. **Sidebar Thread History**: `components/chat/sidebar-history.tsx` lists past user threads ordered by `updatedAt DESC`. Highlights the currently active thread. Offers a delete dropdown action that calls `deleteChatById` and updates sidebar state instantly.
  4. **Playwright E2E Test Suite**: A new Playwright test suite `tests/e2e/chat.spec.ts` automates and asserts the complete user flow:
     - Log in as test user.
     - Navigate to `/chat`.
     - Send prompt "Hello, introduce yourself".
     - Assert URL changes to `/chat/[uuid]`.
     - Assert assistant response streams and finishes.
     - Assert auto-generated title appears in the sidebar.
     - Click "New Chat", send second prompt.
     - Switch back to first chat via sidebar and assert past messages are hydrated correctly.
     - Delete the first chat thread from sidebar and assert it is removed from DOM and DB.
  5. **Full Pipeline Quality Gate**: `pnpm check && pnpm test:e2e` passes with 100% green status.

---

## 4. Security & Data Isolation Architecture

To ensure strict multi-tenant data isolation and prevent unauthorized access to user chat threads:

1. **Proxy Layer Guard**: `proxy.ts` rejects unauthenticated HTTP requests to `/chat*` before reaching App Router page components or API route handlers.
2. **Server-Side Authorization**: `app/api/chat/route.ts` and App Router page components (`app/chat/[id]/page.tsx`) call `@supabase/ssr` `createClient()` to resolve `user.id` from session cookies.
3. **Database Query Boundaries**: All Drizzle ORM query functions in `lib/db/queries/chat.ts` (`getChatById`, `getChatsByUserId`, `deleteChatById`) enforce `where(and(eq(chats.id, chatId), eq(chats.userId, userId)))`. An authenticated user cannot read, stream, or delete another user's chat thread even if they guess or modify the `chatId` URL parameter.
4. **PostgreSQL Foreign Keys**: `chats.userId` references `auth.users.id` with `onDelete: 'cascade'`. Deleting a user automatically purges all associated chat threads and messages at the database level.
