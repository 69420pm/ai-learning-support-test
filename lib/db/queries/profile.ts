import { eq } from 'drizzle-orm';
import { db } from '@/lib/db';
import { type Profile, profiles, type Theme } from '@/lib/db/schema/profiles';
import { ChatbotError } from '@/lib/errors';

export async function updateProfileTheme({
  userId,
  theme,
}: {
  userId: string;
  theme: Theme;
}): Promise<Profile> {
  try {
    const [updated] = await db
      .update(profiles)
      .set({
        theme,
        updatedAt: new Date(),
      })
      .where(eq(profiles.id, userId))
      .returning();

    if (!updated) {
      throw new ChatbotError('not_found:database', `Profile with user id ${userId} not found`);
    }

    return updated;
  } catch (error) {
    if (error instanceof ChatbotError) throw error;
    throw new ChatbotError('bad_request:database', { cause: error });
  }
}

export async function getProfileByUserId({ userId }: { userId: string }): Promise<Profile | null> {
  try {
    const [profile] = await db.select().from(profiles).where(eq(profiles.id, userId));

    return profile ?? null;
  } catch (error) {
    throw new ChatbotError('bad_request:database', { cause: error });
  }
}
