import { describe, expect, it } from 'vitest';
import * as schemaExports from './index';
import { authUsers, profiles } from './profiles';

describe('Drizzle Profiles Schema', () => {
  it('exports authUsers and profiles schema objects', () => {
    expect(authUsers).toBeDefined();
    expect(profiles).toBeDefined();
    expect(schemaExports.profiles).toBe(profiles);
    expect(schemaExports.authUsers).toBe(authUsers);
  });

  it('defines correct profiles table structure', () => {
    expect(profiles.id).toBeDefined();
    expect(profiles.email).toBeDefined();
    expect(profiles.fullName).toBeDefined();
    expect(profiles.avatarUrl).toBeDefined();
    expect(profiles.createdAt).toBeDefined();
    expect(profiles.updatedAt).toBeDefined();
  });
});
