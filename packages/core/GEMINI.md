# Core Gotchas (packages/core)

* **Local vs Cloud Mode:** Database schema uses SQLite locally and PostgreSQL on Supabase. Drizzle queries must stay cross-compatible. SQLite does not support `pgvector` operators; fall back to local embedding math or mock checks during local tests.
* **Feature Isolation:** Feature modules (e.g., `parser`, `graphrag`) MUST NOT import from one another.
