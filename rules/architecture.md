# Application Architecture & Directory Layout Rule (`rules/architecture.md`)

This document is the **single source of truth** for the Single Next.js Application Architecture, directory structure, co-location principles, and layer boundary rules for **AI Learning Support**. All developers and AI agents MUST follow these architectural constraints.

---

## 1. Core Mental Model: Single Next.js Application Architecture

The project is structured as a unified, single Next.js application (App Router). All code is co-located in standard Next.js directory boundaries (`app/`, `components/`, `lib/`).

```text
secure-ai-learning-support/
├── app/                        # Presentation shell (App Router pages, API routes, layout)
│   ├── api/                    # Thin HTTP route handlers
│   ├── globals.css             # Styling & CSS utilities
│   ├── layout.tsx              # Root layout
│   └── page.tsx                # Home page
├── components/                 # React UI components
│   ├── ui/                     # Primitives (buttons, inputs, dialogs)
│   ├── chat/                   # Interactive LLM chat components
│   └── document/               # Material & document viewer components
├── lib/                        # Core Application Modules & Infrastructure
│   ├── ai/                     # Vercel AI SDK providers, prompts, & tools
│   ├── db/                     # Drizzle ORM schema, migrations, & DB client
│   ├── learning/               # FSRS spaced repetition & Feynman audit algorithms
│   ├── queue/                  # Background job queue (pg-boss / Postgres queue)
│   └── utils.ts                # General utilities
├── public/                     # Static assets
├── CONTEXT.md                  # Ubiquitous domain language & terminology
├── docs/                       # Project documentation (ADRs in docs/adr/, agent setup in docs/agents/)
├── tests/                      # Playwright E2E test suites
└── rules/                      # Pointed-at architecture, coding, and testing rules
```

---

## 2. Directory Layer Responsibilities

### Presentation Layer (`app/` & `components/`)
* **`app/`**: Next.js App Router pages, layouts, error boundaries, and thin HTTP API route handlers (`app/api/*`).
* **`components/`**: React UI components divided by domain (`ui/`, `chat/`, `document/`).
* **Rules:**
  - UI components must remain focused on rendering and user interaction.
  - Server Actions and API routes must remain thin controllers: validate inputs (using Zod), perform authorization checks, and delegate execution to `lib/` modules.
  - Never embed raw SQL or Drizzle queries directly in page components or API routes.

### Domain & Infrastructure Modules (`lib/`)
* **`lib/db/`**: Single source of truth for database schema definitions (Drizzle ORM), migrations, and database client connections (PostgreSQL + `pgvector`).
* **`lib/ai/`**: Vercel AI SDK integrations, LLM provider instances (OpenAI, Gemini, BYOK), prompt templates, and tool calls.
* **`lib/learning/`**: Pure pedagogical science algorithms and engines (FSRS spaced repetition calculation, Feynman explanation audit scoring, guided encoding).
* **`lib/queue/`**: Background worker state machines and job processors for long-running operations (PDF parsing, chunking, GraphRAG compilation).
* **`lib/utils.ts`**: Shared utility functions.

---

## 3. Path Aliases & Import Matrix

Import path alias `@/*` maps to `./*` at the workspace root:

| Import Syntax | Targeted Location | Usage Guidelines |
| :--- | :--- | :--- |
| `@/app/*` | `app/*` | Layouts, pages, API routes |
| `@/components/*` | `components/*` | Reusable React UI components |
| `@/lib/db/*` | `lib/db/*` | Database client & Drizzle schema |
| `@/lib/ai/*` | `lib/ai/*` | AI SDK models & prompt tools |
| `@/lib/learning/*` | `lib/learning/*` | FSRS & Feynman domain logic |
| `@/lib/queue/*` | `lib/queue/*` | Background worker queue handlers |

---

## 4. Architectural Rules & Gotchas

1. **Thin Controller Rule:** `app/api/*` and Server Actions must only handle HTTP/request concerns (parsing input, checking auth) and delegate business logic to `@/lib/*`.
2. **Domain Co-location:** Keep related features co-located in `lib/` subfolders (`lib/ai`, `lib/db`, `lib/learning`, `lib/queue`). Avoid creating unnecessary abstraction layers or sub-packages.
3. **Database Client Encapsulation:** Always import DB schema and client from `@/lib/db`. Do not instantiate raw PG or Drizzle clients in route handlers or components.
4. **Async Worker Isolation:** Any process taking >5 seconds (PDF ingestion, GraphRAG graph building) MUST be dispatched to `@/lib/queue` for background execution.
