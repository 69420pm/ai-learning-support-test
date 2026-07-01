# Architectural Decisions (ADRs)

## ADR 1: SQLite/Postgres Dual-Mode Compatibility
* **Context:** Local Mode uses SQLite. Cloud Mode uses Supabase Postgres.
* **Decision:** We use Drizzle ORM to maintain cross-compatible queries. Features must remain database-agnostic.
* **Consequences:** SQLite lacks `pgvector` native support. Vector search features must abstract pgvector behind a database service client.
