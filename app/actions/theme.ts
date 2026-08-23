'use server';

import { z } from 'zod';
import { getCurrentUser } from '@/lib/auth/session';
import { updateProfileTheme } from '@/lib/db/queries/profile';
import { type Theme, themeEnum } from '@/lib/db/schema/profiles';

export type { Theme };

export const themeSchema = z.enum(themeEnum);

export const updateThemeSchema = z.object({
  theme: themeSchema,
});

export type ThemeInput = z.infer<typeof updateThemeSchema>;

export type ThemeActionResult = {
  success: boolean;
  error?: string;
  theme?: Theme;
};

export async function updateThemePreference(
  input: ThemeInput | Theme | string,
): Promise<ThemeActionResult> {
  const rawInput = typeof input === 'string' ? { theme: input } : input;
  const parseResult = updateThemeSchema.safeParse(rawInput);
  if (!parseResult.success) {
    return {
      success: false,
      error: parseResult.error.issues[0]?.message || 'Invalid theme input',
    };
  }

  const { theme } = parseResult.data;

  try {
    const user = await getCurrentUser();
    if (!user) {
      return {
        success: false,
        error: 'User is not authenticated',
      };
    }

    await updateProfileTheme({
      userId: user.id,
      theme,
    });

    return {
      success: true,
      theme,
    };
  } catch (error) {
    const message = error instanceof Error ? error.message : 'Failed to update theme preference';
    return {
      success: false,
      error: message,
    };
  }
}
