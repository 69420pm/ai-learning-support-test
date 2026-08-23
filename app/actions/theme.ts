'use server';

import { getCurrentUser } from '@/lib/auth/session';
import { updateProfileTheme } from '@/lib/db/queries/profile';
import { type Theme, type ThemeInput, updateThemeSchema } from '@/lib/theme/schema';

export type { Theme, ThemeInput };

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
