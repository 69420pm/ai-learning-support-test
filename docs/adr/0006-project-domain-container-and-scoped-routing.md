# Project Domain Container and Scoped Routing Architecture

**Status:** Accepted | **Date:** 2026-08-20

## The Decision

We establish **`Project`** as the top-level organizational domain entity in AI Learning Support. Every `Chat` (and future learning artifact, such as materials, flashcards, knowledge graphs, and Feynman audits) must strictly belong to exactly one `Project`.

1. **Domain Model**: Projects represent subjects, courses, or distinct learning topic partitions (e.g. *Linear Algebra*, *Organic Chemistry*). Names must be unique per user.
2. **Data Model**: `projects` table holds user ownership, timestamps, and name. The `chats` table requires a foreign key `project_id` with `ON DELETE CASCADE`.
3. **Routing Hierarchy**: Scoped App Router nesting is used:
   - `/` -> Projects dashboard for authenticated users (list, create, rename, delete).
   - `/chat` -> Redirects to `/`.
   - `/projects/[projectId]/chat` -> Start a new chat thread within the project.
   - `/projects/[projectId]/chat/[id]` -> Individual chat thread within the project.
4. **Chat Sidebar**: Displays only chats belonging to the active project, providing a "← All Projects" link to return to the project dashboard.

## Rationale & Alternatives

* **Why Root Domain Entity `Project`**: Provides clear boundary isolation for distinct learning topics, preventing context contamination across subjects while preparing for future multi-material GraphRAG ingestion.
* **Why Nested Routes (`/projects/[projectId]/chat`)**: Eliminates query-parameter ambiguity, provides clean bookmarkable URLs, and leverages Next.js App Router layout nesting for scoped chat history.
* **Rejected Global Unscoped Chat List**: Unscoped chats allow conversations from completely different academic subjects to mix together, degrading focus and making topic-level GraphRAG grounding impossible.
* **Trade-off**: Requires users to select or create a project before chatting, adding one initial step before reaching the chat interface.
