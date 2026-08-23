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

  it('defines correct profiles table structure including theme preference', () => {
    expect(profiles.id).toBeDefined();
    expect(profiles.email).toBeDefined();
    expect(profiles.fullName).toBeDefined();
    expect(profiles.avatarUrl).toBeDefined();
    expect(profiles.theme).toBeDefined();
    expect(profiles.theme.default).toBe('system');
    expect(profiles.createdAt).toBeDefined();
    expect(profiles.updatedAt).toBeDefined();
  });

  it('exports themeEnum with system, light, and dark modes', () => {
    expect(schemaExports.themeEnum).toEqual(['system', 'light', 'dark']);
  });
});
