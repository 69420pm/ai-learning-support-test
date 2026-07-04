import * as fs from 'node:fs';
import * as path from 'node:path';
import Database from 'better-sqlite3';
import { drizzle } from 'drizzle-orm/better-sqlite3';
import * as documentsSchema from './schema/documents.js';

function findWorkspaceRoot(): string {
  let currentDir = process.cwd();
  while (currentDir !== path.parse(currentDir).root) {
    if (fs.existsSync(path.join(currentDir, 'pnpm-workspace.yaml'))) {
      return currentDir;
    }
    currentDir = path.dirname(currentDir);
  }
  return process.cwd();
}

const rootDir = findWorkspaceRoot();
const dbDir = path.join(rootDir, '.data');
// biome-ignore lint/complexity/useLiteralKeys: process.env indexing is required by tsconfig noUncheckedIndexedAccess
const dbPath = process.env['DATABASE_PATH']
  ? // biome-ignore lint/complexity/useLiteralKeys: process.env indexing is required by tsconfig noUncheckedIndexedAccess
    path.resolve(process.env['DATABASE_PATH'])
  : path.join(dbDir, 'app.db');

const targetDbDir = path.dirname(dbPath);
if (!fs.existsSync(targetDbDir)) {
  fs.mkdirSync(targetDbDir, { recursive: true });
}

const sqlite = new Database(dbPath);

sqlite.exec(`
  CREATE TABLE IF NOT EXISTS documents (
    id TEXT PRIMARY KEY,
    user_id TEXT NOT NULL,
    name TEXT NOT NULL,
    storage_path TEXT NOT NULL,
    file_size INTEGER NOT NULL,
    status TEXT NOT NULL,
    created_at INTEGER NOT NULL,
    updated_at INTEGER NOT NULL
  );
  CREATE INDEX IF NOT EXISTS idx_documents_user_id ON documents (user_id);
  CREATE INDEX IF NOT EXISTS idx_documents_created_at ON documents (created_at);
`);

export const db = drizzle(sqlite, { schema: { ...documentsSchema } });
