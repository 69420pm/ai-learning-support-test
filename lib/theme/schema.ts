import { z } from 'zod';
import { type Theme, themeEnum } from '@/lib/db/schema/profiles';

export { type Theme, themeEnum };

export const themeSchema = z.enum(themeEnum);

export const updateThemeSchema = z.object({
  theme: themeSchema,
});

export type ThemeInput = z.infer<typeof updateThemeSchema>;
