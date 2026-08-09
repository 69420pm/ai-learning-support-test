# Tech Stack Reference

This rule is the **single source of truth** for the project's key dependencies and their primary documentation sources (both in-project local sources and official web documentation). All AI agents MUST consult this before planning technical architecture or writing implementation code.

---

## Core Framework & Runtime

| Package | Version | Documentation Sources |
|:--------|:--------|:----------------------|
| **Next.js** (`next`) | `^16.3.0` | **Local**: `node_modules/next/dist/docs/`, `next-devtools` MCP server (`nextjs_docs`, `nextjs_call`), `next-dev-loop` skill<br>**Web**: [Next.js Documentation](https://nextjs.org/docs) |
| **React** (`react`) | `^19.2.8` | **Local**: `node_modules/react/README.md`<br>**Web**: [React Documentation](https://react.dev) |
| **React DOM** (`react-dom`) | `^19.2.8` | **Local**: `node_modules/react-dom/README.md`<br>**Web**: [React DOM Documentation](https://react.dev/reference/react-dom) |
| **TypeScript** (`typescript`) | `^7.0.2` | **Local**: `node_modules/typescript/README.md`, [`rules/coding-style.md`](file:///workspaces/secure-ai-learning-support/rules/coding-style.md)<br>**Web**: [TypeScript Documentation](https://www.typescriptlang.org/docs/) |

## AI & LLM Integration

| Package | Version | Documentation Sources |
|:--------|:--------|:----------------------|
| **Vercel AI SDK** (`ai`) | `^7.0.58` | **Local**: `ai-sdk` skill ([`SKILL.md`](file:///workspaces/secure-ai-learning-support/.agents/skills/ai-sdk/SKILL.md)), `node_modules/ai/docs/`<br>**Web**: [Vercel AI SDK Docs](https://sdk.vercel.ai/docs) |
| **`@ai-sdk/openai`** | `^4.0.36` | **Local**: `ai-sdk` skill ([`SKILL.md`](file:///workspaces/secure-ai-learning-support/.agents/skills/ai-sdk/SKILL.md)), `node_modules/@ai-sdk/openai/docs/03-openai.mdx`<br>**Web**: [AI SDK OpenAI Provider](https://sdk.vercel.ai/providers/ai-sdk-providers/openai) |
| **`@ai-sdk/google`** | `^4.0.39` | **Local**: `ai-sdk` skill ([`SKILL.md`](file:///workspaces/secure-ai-learning-support/.agents/skills/ai-sdk/SKILL.md)), `node_modules/@ai-sdk/google/docs/15-google.mdx`<br>**Web**: [AI SDK Google Provider](https://sdk.vercel.ai/providers/ai-sdk-providers/google-generative-ai) |
| **`@ai-sdk/anthropic`** | `^4.0.36` | **Local**: `ai-sdk` skill ([`SKILL.md`](file:///workspaces/secure-ai-learning-support/.agents/skills/ai-sdk/SKILL.md)), `node_modules/@ai-sdk/anthropic/docs/05-anthropic.mdx`<br>**Web**: [AI SDK Anthropic Provider](https://sdk.vercel.ai/providers/ai-sdk-providers/anthropic) |

## Styling & UI Components

| Package | Version | Documentation Sources |
|:--------|:--------|:----------------------|
| **Tailwind CSS** (`tailwindcss`, `@tailwindcss/postcss`) | `^4.3.3` | **Local**: [`rules/styling.md`](file:///workspaces/secure-ai-learning-support/rules/styling.md), `node_modules/tailwindcss/README.md`, `node_modules/@tailwindcss/postcss/README.md`<br>**Web**: [Tailwind CSS Documentation](https://tailwindcss.com/docs) |
| **shadcn/ui / Radix Primitives** (`radix-ui`) | `^1.6.7` | **Local**: `shadcn` skill ([`SKILL.md`](file:///workspaces/secure-ai-learning-support/.agents/skills/shadcn/SKILL.md)), [`components/ui/`](file:///workspaces/secure-ai-learning-support/components/ui/), `node_modules/radix-ui/README.md`<br>**Web**: [shadcn/ui Docs](https://ui.shadcn.com), [Radix Primitives Docs](https://www.radix-ui.com/primitives/docs) |
| **`tailwindcss-animate`** | `^1.0.7` | **Local**: [`rules/styling.md`](file:///workspaces/secure-ai-learning-support/rules/styling.md), `node_modules/tailwindcss-animate/README.md`<br>**Web**: [tailwindcss-animate Repository](https://github.com/jamiebuilds/tailwindcss-animate) |
| **`lucide-react`** | `^1.30.0` | **Local**: `node_modules/lucide-react/README.md`<br>**Web**: [Lucide Icons Reference](https://lucide.dev) |
| **`class-variance-authority`** | `^0.7.1` | **Local**: `node_modules/class-variance-authority/README.md`<br>**Web**: [CVA Documentation](https://cva.style/docs) |
| **`clsx`** | `^2.1.1` | **Local**: `node_modules/clsx/README.md`<br>**Web**: [clsx Repository](https://github.com/lukeed/clsx) |
| **`tailwind-merge`** | `^3.6.0` | **Local**: `node_modules/tailwind-merge/README.md`<br>**Web**: [tailwind-merge Repository](https://github.com/dcastil/tailwind-merge) |

## Database, Vector & Queue Infrastructure

| Package / System | Version | Documentation Sources |
|:-----------------|:--------|:----------------------|
| **Drizzle ORM** (`drizzle-orm`) | `^0.45.2` | **Local**: [`specs/adrs/002-postgresql-pgvector-drizzle.md`](file:///workspaces/secure-ai-learning-support/specs/adrs/002-postgresql-pgvector-drizzle.md), [`lib/db/`](file:///workspaces/secure-ai-learning-support/lib/db/), `node_modules/drizzle-orm/README.md`<br>**Web**: [Drizzle ORM Documentation](https://orm.drizzle.team/docs/overview) |
| **`drizzle-kit`** | `^0.31.10` | **Local**: [`specs/adrs/002-postgresql-pgvector-drizzle.md`](file:///workspaces/secure-ai-learning-support/specs/adrs/002-postgresql-pgvector-drizzle.md), `node_modules/drizzle-kit/README.md`<br>**Web**: [Drizzle Kit Documentation](https://orm.drizzle.team/docs/kit-overview) |
| **`pg`** | `^8.22.0` | **Local**: `node_modules/pg/README.md`<br>**Web**: [node-postgres Documentation](https://node-postgres.com) |
| **`postgres`** | `^3.4.9` | **Local**: `node_modules/postgres/README.md`<br>**Web**: [Postgres.js Repository](https://github.com/porsager/postgres) |
| **PostgreSQL + pgvector** | System | **Local**: [`specs/adrs/002-postgresql-pgvector-drizzle.md`](file:///workspaces/secure-ai-learning-support/specs/adrs/002-postgresql-pgvector-drizzle.md)<br>**Web**: [PostgreSQL Documentation](https://www.postgresql.org/docs/), [pgvector Repository](https://github.com/pgvector/pgvector) |
| **`pg-boss`** | `^12.27.0` | **Local**: [`specs/adrs/003-postgres-backed-job-queue.md`](file:///workspaces/secure-ai-learning-support/specs/adrs/003-postgres-backed-job-queue.md), [`lib/queue/`](file:///workspaces/secure-ai-learning-support/lib/queue/), `node_modules/pg-boss/README.md`<br>**Web**: [pg-boss Repository](https://github.com/timgit/pg-boss) |

## Validation, Testing & Dev Tooling

| Package | Version | Documentation Sources |
|:--------|:--------|:----------------------|
| **Zod** (`zod`) | `^4.4.3` | **Local**: `node_modules/zod/README.md`<br>**Web**: [Zod Documentation](https://zod.dev) |
| **Biome** (`@biomejs/biome`) | `^2.5.7` | **Local**: `node_modules/@biomejs/biome/README.md`<br>**Web**: [Biome Documentation](https://biomejs.dev) |
| **Vitest** (`vitest`) | `^4.1.10` | **Local**: [`rules/testing.md`](file:///workspaces/secure-ai-learning-support/rules/testing.md), `test-writer` skill ([`SKILL.md`](file:///workspaces/secure-ai-learning-support/.agents/skills/test-writer/SKILL.md)), `node_modules/vitest/README.md`<br>**Web**: [Vitest Documentation](https://vitest.dev) |
| **`agent-browser`** | `^0.33.2` | **Local**: `next-dev-loop` skill ([`SKILL.md`](file:///workspaces/secure-ai-learning-support/.agents/skills/next-dev-loop/SKILL.md)), `node_modules/agent-browser/README.md`<br>**Web**: [agent-browser Repository](https://github.com/vercel-labs/agent-browser) |
| **`lefthook`** | `^2.1.10` | **Local**: [`rules/git-workflow.md`](file:///workspaces/secure-ai-learning-support/rules/git-workflow.md), `node_modules/lefthook/README.md`<br>**Web**: [Lefthook Repository](https://github.com/evilmartians/lefthook) |
| **`tsx`** | `^4.23.11` | **Local**: `node_modules/tsx/README.md`<br>**Web**: [tsx Documentation](https://tsx.is) |

---

## Skill Cross-Reference

When planning or implementing features that touch these domains, the responsible agent MUST read the linked skill before writing code:

| Domain | Skill to Read |
|:-------|:-------------|
| AI features (generateText, streamText, tools, useChat, embeddings) | `ai-sdk` skill |
| Adding/composing UI components (buttons, cards, dialogs, sidebars) | `shadcn` skill |
| Verifying runtime behavior after code changes | `next-dev-loop` skill |
| Writing E2E or unit tests | `test-writer` skill |
| Designing features / writing epics | `spec-writer` skill |
| Implementing a plan step | `plan-implementer` skill |

