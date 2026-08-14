# AI Learning Support

> A document-grounded, active-learning system combining course material ingestion, GraphRAG knowledge structuring, dynamic learning plan synthesis, and pedagogical science engines (FSRS spaced repetition scheduling, Feynman explanation audits, guided encoding).

---

## Table of Contents

- [Overview & Architecture](#overview--architecture)
- [Tech Stack](#tech-stack)
- [Prerequisites](#prerequisites)
- [Quick Start](#quick-start)
- [Environment Configuration](#environment-configuration)
- [Database Setup & Operations](#database-setup--operations)
- [Authentication Setup](#authentication-setup)
- [AI Providers & Key Management](#ai-providers--key-management)
- [Available Scripts](#available-scripts)
- [Project Directory Structure](#project-directory-structure)
- [System Design & Pedagogical Methodology](#system-design--pedagogical-methodology)
  - [1. Motivation & Context](#1-motivation--context)
  - [2. Core System Principles](#2-core-system-principles)
  - [3. Knowledge Representation](#3-knowledge-representation)
  - [4. User Profiling & Live Memory](#4-user-profiling--live-memory)
  - [5. Dual-Phase Learning Process](#5-dual-phase-learning-process)
  - [6. Evaluation & Analytics](#6-evaluation--analytics)

---

## Overview & Architecture

**AI Learning Support** is built to solve the fundamental flaw of AI in education: passive learning and cognitive outsourcing. Instead of providing instant answers that create an illusion of competence, the system facilitates active recall, scaffolding, knowledge graph navigation, and progressive difficulty calibration grounded strictly in uploaded course materials (lecture slides, exercise sheets, and previous exams).

The project follows a **Single Next.js Application Architecture** (App Router):
- **`app/`**: Presentation layer, App Router pages (`layout.tsx`, `page.tsx`), Tailwind CSS styling, route handlers (`app/api/*`), and session proxy (`proxy.ts`).
- **`components/`**: Modular React UI components built with Radix UI and Tailwind CSS (`components/ui`, `components/chat`, `components/document`).
- **`lib/`**: Core domain logic, Drizzle ORM schemas and queries (`lib/db`), Supabase SSR auth helpers (`lib/supabase`), AI SDK providers (`lib/ai`), and background queue workers (`lib/queue`).

---

## Tech Stack

| Category | Technology | Purpose |
| :--- | :--- | :--- |
| **Framework** | [Next.js 16](https://nextjs.org/) (App Router, Turbopack) | Server Components, Server Actions, route handlers, proxy middleware |
| **Language** | [TypeScript 7](https://www.typescriptlang.org/) | End-to-end type safety |
| **UI & Styling** | [React 19](https://react.dev/), [Tailwind CSS v4](https://tailwindcss.com/), [Radix UI](https://www.radix-ui.com/), [Lucide](https://lucide.dev/) | Modern, accessible, responsive user interface |
| **Database & Vector** | [PostgreSQL 17](https://www.postgresql.org/) + [`pgvector`](https://github.com/pgvector/pgvector) | Unified relational data and vector similarity embeddings store |
| **ORM & Migrations** | [Drizzle ORM](https://orm.drizzle.team/) + `drizzle-kit` | Type-safe SQL queries, migrations, and Drizzle Studio GUI |
| **Authentication** | [Supabase Auth](https://supabase.com/docs/guides/auth) (`@supabase/ssr`) | Cookie-based session management, GoTrue auth, route guards, local mock auth mode |
| **AI Integration** | [Vercel AI SDK](https://sdk.vercel.ai/) (`ai`, `@ai-sdk/google`, `@ai-sdk/openai`) | Multi-LLM provider routing (Gemini, OpenAI, OpenRouter), BYOK, SSE streaming |
| **Job Queue** | [`pg-boss`](https://github.com/timgit/pg-boss) | PostgreSQL-backed job queue for background document processing and GraphRAG |
| **Code Quality** | [Biome](https://biomejs.dev/) | Sub-millisecond linting and code formatting |
| **Testing** | [Vitest](https://vitest.dev/) & [Playwright](https://playwright.dev/) | Unit/domain testing and end-to-end browser testing |

---

## Prerequisites

Ensure you have the following installed on your machine:

- **Node.js** >= `20.x` (or `22.x` LTS recommended)
- **pnpm** >= `10.x` (or `11.x`)
- **Docker & Docker Compose** (for running PostgreSQL with `pgvector` or Supabase CLI)

---

## Quick Start

### 1. Clone the repository and install dependencies

```bash
git clone https://github.com/69420pm/ai-learning-support-test.git
cd ai-learning-support
pnpm install
```

### 2. Configure environment variables

Copy the example environment file:

```bash
cp .env.example .env.local
```

Edit `.env.local` to add your AI provider API key (e.g., Google Gemini or OpenAI).

### 3. Start the PostgreSQL database

You can start PostgreSQL either as a local system service (no Docker) or via Docker Compose:

**Option A: Running as a system service (No Docker)**
```bash
# Start PostgreSQL service on Linux / DevContainer
sudo service postgresql start

# Check service status
sudo service postgresql status
```

**Option B: Running via Docker Compose**
```bash
docker compose up -d
```

### 4. Run database migrations

```bash
pnpm db:migrate
```

### 5. Launch the Next.js development server

```bash
pnpm dev
```

Open [http://localhost:3000](http://localhost:3000) in your browser.

---

## Environment Configuration

The application is configured via `.env.local`. Below is the complete list of supported environment variables:

```env
# ==============================================================================
# Database Configuration (PostgreSQL + pgvector)
# ==============================================================================
DATABASE_URL=postgres://postgres:postgres@localhost:5432/ai_learning_support

# ==============================================================================
# Supabase Authentication (@supabase/ssr)
# ==============================================================================
NEXT_PUBLIC_SUPABASE_URL=http://127.0.0.1:54321
NEXT_PUBLIC_SUPABASE_ANON_KEY=eyJhbGciOiJIUzI1NiIsInR5cCI6IkpXVCJ9.eyJpc3MiOiJzdXBhYmFzZSIsInJlZiI6IjEyNy4wLjAuMSIsInJvbGUiOiJhbm9uIiwiaWF0IjoxNjAwMDAwMDAwLCJleHAiOjIwMDAwMDAwMDB9.dummy_anon_key
NEXT_PUBLIC_APP_URL=http://localhost:3000

# ==============================================================================
# Local Development & Mock Auth Mode
# ==============================================================================
# Set to 'true' to instantly bypass Supabase GoTrue calls and log in with a mock user
LOCAL_DEV_AUTH=true

# ==============================================================================
# AI Provider API Keys (Multi-LLM & BYOK Strategy)
# ==============================================================================
# Google Gemini (Default provider: gemini-3.6-flash, gemini-3.5-pro, etc.)
GOOGLE_GENERATIVE_AI_API_KEY=your_google_gemini_api_key_here

# OpenAI (Optional)
OPENAI_API_KEY=your_openai_api_key_here

# OpenRouter (Optional)
OPENROUTER_API_KEY=your_openrouter_api_key_here
```

> **Note:** If no AI provider API keys are configured, the app will automatically fall back to a built-in mock streaming response so UI and flow development can continue without external API keys.

---

## Database Setup & Operations

The application uses **PostgreSQL 17** with the **`pgvector`** extension for unified relational data and vector similarity search. Database schemas and migrations are managed via **Drizzle ORM**.

You can run PostgreSQL in one of three ways:

### Option 1: Running as a System Service (Without Docker)

If you prefer not to use Docker, or are working inside the DevContainer/native Linux/macOS environment where PostgreSQL is installed directly on the host system:

#### Linux / DevContainer (`service` / `systemctl`)

```bash
# Start PostgreSQL service
sudo service postgresql start

# Check status (should report active/running on port 5432)
sudo service postgresql status

# Stop PostgreSQL service when finished
sudo service postgresql stop

# Alternatively, using systemd:
sudo systemctl start postgresql
sudo systemctl status postgresql
```

#### macOS (`brew services`)

```bash
# Start PostgreSQL service via Homebrew
brew services start postgresql

# Check status
brew services list

# Stop PostgreSQL service
brew services stop postgresql
```

#### Initializing the Database & `pgvector` Extension (Host Service)

If starting from a fresh local PostgreSQL installation, create the matching database user, database, and vector extension:

```bash
# 1. Create database user 'postgres' with password 'postgres'
sudo -u postgres psql -c "CREATE USER postgres WITH PASSWORD 'postgres' SUPERUSER;"

# 2. Create the application database
sudo -u postgres createdb -O postgres ai_learning_support

# 3. Enable the pgvector extension
sudo -u postgres psql -d ai_learning_support -c "CREATE EXTENSION IF NOT EXISTS vector;"
```

---

### Option 2: Running PostgreSQL via Docker Compose

If you have Docker running, you can use the pre-configured container image which bundles PostgreSQL 17 with `pgvector` out of the box:

```bash
# Start the container in background mode
docker compose up -d

# View database logs
docker compose logs -f postgres

# Stop the container
docker compose down
```

---

### Option 3: Cloud Managed Database (Supabase / Neon / AWS RDS)

You can also point the application to any managed PostgreSQL instance with `pgvector` enabled:

1. Obtain your PostgreSQL connection string (e.g., from [Supabase](https://supabase.com) or [Neon](https://neon.tech)).
2. Set `DATABASE_URL` in `.env.local`:
   ```env
   DATABASE_URL=postgres://[user]:[password]@[host]:[port]/[database]?sslmode=require
   ```
3. Run `pnpm db:migrate` to push the schema.

---

### Database Migrations & Tooling with Drizzle Kit

Once your database is running (via service, Docker, or cloud):

- **Apply pending migrations to the database:**
  ```bash
  pnpm db:migrate
  ```

- **Generate new SQL migration files after schema edits in `lib/db/schema/`:**
  ```bash
  pnpm db:generate
  ```

- **Open Drizzle Studio (Visual Database Web GUI):**
  ```bash
  pnpm db:studio
  ```
  Opens the interactive schema and record browser at [https://local.drizzle.studio](https://local.drizzle.studio).

---

## Authentication Setup

The authentication layer is built using **Supabase Auth** with `@supabase/ssr`, providing secure cookie-based session handling, Server Action workflows, and route protection via Next.js Proxy (`proxy.ts`).

### Mode 1: Fast Local Development (`LOCAL_DEV_AUTH=true`) (Default)

For instant local frontend and AI workflow development without spinning up the complete Supabase stack:
1. Ensure `LOCAL_DEV_AUTH=true` in your `.env.local`.
2. Logging in or signing up will instantly issue a local development session cookie (`sb-mock-auth`) and provision your profile in the Drizzle database.
3. Protected routes (`/chat`, `/learn`, `/review`, `/settings`) are fully accessible.

### Mode 2: Local Supabase CLI

To run the complete local GoTrue auth microservice, Supabase Studio, and local email sandbox (Inbucket):

```bash
# Start local Supabase containers
npx supabase start
```

1. Copy the output `API URL` and `anon key` to your `.env.local`:
   ```env
   NEXT_PUBLIC_SUPABASE_URL=http://127.0.0.1:54321
   NEXT_PUBLIC_SUPABASE_ANON_KEY=<your_local_anon_key>
   LOCAL_DEV_AUTH=false
   ```
2. Access the local tools:
   - **Supabase Studio GUI:** [http://127.0.0.1:54323](http://127.0.0.1:54323)
   - **Inbucket (Email Sandbox):** [http://127.0.0.1:54324](http://127.0.0.1:54324)

### Mode 3: Supabase Cloud Production

To connect to a managed Supabase Cloud project:
1. Create a project at [supabase.com](https://supabase.com).
2. Set your environment variables in `.env.local`:
   ```env
   NEXT_PUBLIC_SUPABASE_URL=https://<your-project-ref>.supabase.co
   NEXT_PUBLIC_SUPABASE_ANON_KEY=<your-anon-key>
   DATABASE_URL=postgres://postgres.<your-project-ref>:<your-db-password>@aws-0-<region>.pooler.supabase.com:6543/postgres
   LOCAL_DEV_AUTH=false
   ```
3. Run `pnpm db:migrate` to push schemas to your Supabase project.

---

## AI Providers & Key Management

The system uses **Vercel AI SDK** (`ai`) with a flexible multi-provider architecture and Bring-Your-Own-Key (BYOK) support.

### Supported Models

| Provider | Model Identifier | Purpose / Characteristics |
| :--- | :--- | :--- |
| **Google Gemini** *(Default)* | `gemini-3.6-flash` | Flagship default model optimized for multi-step reasoning, speed, and agentic workflows |
| **Google Gemini** | `gemini-3.5-pro` | Advanced high-depth reasoning for complex Feynman explanation audits and GraphRAG synthesis |
| **Google Gemini** | `gemini-3.5-flash-lite` | Ultra-fast, low-latency model for rapid micro-quizzes and flashcards |
| **Google Gemini** | `gemini-3.5-flash` | Multimodal model for slide diagram interpretation |
| **OpenAI** | `gpt-4o`, `gpt-4o-mini` | Supported via `OPENAI_API_KEY` or user BYOK |
| **OpenRouter** | Custom models | Supported via `OPENROUTER_API_KEY` |

### Setting Up API Keys

1. Get an API key from [Google AI Studio](https://aistudio.google.com/) or [OpenAI Platform](https://platform.openai.com/).
2. Add it to `.env.local`:
   ```env
   GOOGLE_GENERATIVE_AI_API_KEY=AIzaSy...
   ```
3. Users can also provide custom keys per session in the app settings (BYOK).

---

## Available Scripts

| Command | Description |
| :--- | :--- |
| `pnpm dev` | Starts the Next.js development server with Turbopack on `http://localhost:3000` |
| `pnpm build` | Compiles the production build |
| `pnpm start` | Runs the compiled production application |
| `pnpm lint` | Runs Biome code analysis and lint checking |
| `pnpm format` | Formats all files using Biome |
| `pnpm typecheck` | Validates TypeScript types across the entire project (`tsc --noEmit`) |
| `pnpm test` | Runs unit and domain tests with Vitest |
| `pnpm test:e2e` | Runs end-to-end browser integration tests with Playwright |
| `pnpm check` | Runs linting, typechecking, and unit tests in sequence |
| `pnpm db:generate` | Generates new SQL migrations based on Drizzle schema changes |
| `pnpm db:migrate` | Applies pending SQL migrations to the PostgreSQL database |
| `pnpm db:studio` | Launches Drizzle Studio database management interface |

---

## Project Directory Structure

```
├── app/                        # Next.js App Router presentation layer
│   ├── (auth)/                 # Authentication pages (login, signup, password reset)
│   ├── api/                    # Thin HTTP route handlers (chat, history, ingestion)
│   ├── chat/                   # Learning chat and active study interface
│   ├── globals.css             # Tailwind CSS v4 design tokens and theme styles
│   ├── layout.tsx              # Root HTML layout and metadata
│   └── page.tsx                # Landing page and active learning dashboard
├── components/                 # Modular React components
│   ├── chat/                   # Chat UI, streaming message list, model picker
│   └── ui/                     # Accessible UI primitives (Radix UI + Tailwind)
├── lib/                        # Core business logic and infrastructure
│   ├── ai/                     # Vercel AI SDK provider routing, prompts, and streaming
│   ├── auth/                   # Auth Server Actions and Zod validation schemas
│   ├── db/                     # Drizzle ORM schema definitions, queries, migrations
│   │   ├── migrations/         # Generated SQL migrations
│   │   └── schema/             # Drizzle table schemas (profiles, chats, materials)
│   ├── learning/               # Pedagogical engines (FSRS scheduler, Feynman evaluator)
│   ├── queue/                  # pg-boss background job processors
│   └── supabase/               # Supabase SSR client, server, and proxy utilities
├── proxy.ts                    # Next.js session refresh and route guard proxy
├── drizzle.config.ts           # Drizzle Kit configuration
├── docker-compose.yml          # PostgreSQL + pgvector container definition
├── biome.json                  # Biome linter and formatter configuration
└── playwright.config.ts        # Playwright E2E testing configuration
```

---

## System Design & Pedagogical Methodology

### 1. Motivation & Context

When students use AI to clarify concepts from lectures or exercises, it often leads to an immediate "click"—especially in STEM, computer science, or economics. However, traditional conversational AI takes on the cognitive load required for true learning, inadvertently creating passive comprehension without retention.

#### The Target Scenario:
A standard university course where a student must master a large volume of complex technical material culminating in a high-stakes final exam:
- **Material:** ~1,000 PDF slides, exercise sheets, and past exams.
- **Timeline:** Material is accessible weeks or months before the exam.

---

### 2. Core System Principles

To ensure genuine education rather than instant answers, the system enforces three strict invariants:

1. **Learning happens in the user's brain:** The AI acts as a scaffolding facilitator and Socratic interrogator, never as a homework substitute.
2. **Preservation of the productive struggle:** The system eliminates administrative friction (organizing notes, searching files) while preserving the cognitive effort required to synthesize and retrieve concepts.
3. **Strict adherence to source material:** All explanations and exercises are grounded strictly in the provided course slides and exams to eliminate hallucinations and prevent out-of-scope confusion.

---

### 3. Knowledge Representation

To handle extensive course material efficiently and cost-effectively, the system processes documents into three interconnected layers:

1. **Master Table of Contents (Map):** A structured hierarchical index generated across all uploaded files to define the exact curriculum boundaries and roadmap.
2. **Vector Database (`pgvector` Semantic Search):** Chunks of course materials embedded in PostgreSQL with HNSW/IVFFlat indexes for high-precision semantic lookup.
3. **Graph Representation (GraphRAG):** A conceptual knowledge graph connecting parent topics, subtopics, definitions, theorems, and specific exercise problems.

---

### 4. User Profiling & Live Memory

- **Initial Knowledge Assessment:** Diagnostic assessment establishing the user's baseline strengths, gaps, and learning goals.
- **Live Markdown Memory:** Dynamic learning profiles stored and updated in Markdown format as the system observes user responses, mastery levels, and recurring misconceptions.

---

### 5. Dual-Phase Learning Process

The learning pipeline is structured into two scientifically grounded phases:

```mermaid
flowchart TD
    subgraph Phase 1: Encoding [Phase 1: Encoding & Scaffolding]
        A[Dynamic Study Plan] --> B[Big Picture Scaffolding & Diagrams]
        B --> C[Step-by-step Grounded Explanation]
        C --> D[Intermediate Comprehension Checks]
    end

    subgraph Phase 2: Active Recall [Phase 2: Retention & Active Recall]
        D --> E[FSRS Spaced Repetition Scheduling]
        E --> F[Progressive Question Difficulty]
        F --> G[Smart Flashcards & Formula Drills]
        G --> H[Old Exam & Exercise Integration]
    end
```

#### Phase 1: Guided Encoding (Understanding)
- **Dynamic Learning Plan:** Collaborative roadmap created in Markdown and validated by the student before beginning.
- **Scaffolding & Conceptual Diagrams:** Visual relationships and Mermaid flowcharts presented before diving into formula derivations.
- **Active Socratic Teaching:** Original slide excerpts paired with step-by-step explanations, interrupted with comprehension checks.

#### Phase 2: Active Recall (Long-Term Retention)
- **FSRS Spaced Repetition Scheduling:** Topic-level mastery tracking and retention scheduling based on cognitive science algorithms.
- **Progressive Difficulty Calibration:** Questions advance from basic definitions to multi-step analytical problems as mastery increases.
- **Smart Flashcards:** Targeted memory cards generated only for facts and formulas that require rote retention.
- **Exam & Exercise Integration:** Original problem sets and past exam questions interspersed at optimal intervals to simulate real test conditions.

---

### 6. Evaluation & Analytics

The platform incorporates continuous telemetry to track user mastery, retention curves, and response quality, enabling data-driven prompt optimization and personalized study recommendations over time.
