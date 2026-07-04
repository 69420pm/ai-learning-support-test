import { describe, expect, it } from 'vitest';
import { db } from './db.js';
import { documents } from './schema/documents.js';

describe('Database client & schema', () => {
  it('should initialize db and bootstrap documents table', async () => {
    expect(db).toBeDefined();

    // Attempt to query the documents table to ensure it exists and bootstrapped successfully
    const result = await db.select().from(documents).all();
    expect(Array.isArray(result)).toBe(true);
  });
});
