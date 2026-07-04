import { describe, expect, it } from 'vitest';
import { documents } from '../schema/documents.js';
import { db } from './sqlite-client.js';

describe('SQLite client & schema', () => {
  it('should initialize db and bootstrap documents table', async () => {
    expect(db).toBeDefined();

    const result = await db.select().from(documents).all();
    expect(Array.isArray(result)).toBe(true);
  });
});
