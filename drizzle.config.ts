import { defineConfig } from 'drizzle-kit';

export default defineConfig({
  dialect: 'postgresql',
  schema: './lib/db/schema/index.ts',
  out: './lib/db/migrations',
  dbCredentials: {
    url:
      process.env.DATABASE_URL || 'postgres://postgres:postgres@localhost:5432/ai_learning_support',
  },
});
