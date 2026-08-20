import { describe, expect, it } from 'vitest';
import * as schemaExports from './index';
import { projects } from './projects';

describe('Drizzle Projects Schema', () => {
  it('exports projects schema object', () => {
    expect(projects).toBeDefined();
    expect(schemaExports.projects).toBe(projects);
  });

  it('defines correct projects table structure', () => {
    expect(projects.id).toBeDefined();
    expect(projects.name).toBeDefined();
    expect(projects.userId).toBeDefined();
    expect(projects.createdAt).toBeDefined();
    expect(projects.updatedAt).toBeDefined();
  });

  it('defines projectId on chats schema', () => {
    expect(schemaExports.chats.projectId).toBeDefined();
  });
});
