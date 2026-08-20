import { and, count, desc, eq } from 'drizzle-orm';
import { db } from '@/lib/db';
import { chats, type Project, projects } from '@/lib/db/schema';
import { ChatbotError } from '@/lib/errors';

export async function createProject({
  name,
  userId,
}: {
  name: string;
  userId: string;
}): Promise<Project> {
  try {
    const [inserted] = await db
      .insert(projects)
      .values({
        name: name.trim(),
        userId,
        createdAt: new Date(),
        updatedAt: new Date(),
      })
      .returning();
    return inserted;
  } catch (error) {
    throw new ChatbotError('bad_request:database', { cause: error });
  }
}

export async function getProjectsByUserId({ userId }: { userId: string }): Promise<Project[]> {
  try {
    return await db
      .select()
      .from(projects)
      .where(eq(projects.userId, userId))
      .orderBy(desc(projects.updatedAt));
  } catch (error) {
    throw new ChatbotError('bad_request:database', { cause: error });
  }
}

export async function getProjectById({
  id,
  userId,
}: {
  id: string;
  userId: string;
}): Promise<Project | null> {
  try {
    const [project] = await db
      .select()
      .from(projects)
      .where(and(eq(projects.id, id), eq(projects.userId, userId)));
    return project ?? null;
  } catch (error) {
    throw new ChatbotError('bad_request:database', { cause: error });
  }
}

export async function updateProjectName({
  id,
  userId,
  name,
}: {
  id: string;
  userId: string;
  name: string;
}): Promise<Project> {
  try {
    const [updated] = await db
      .update(projects)
      .set({
        name: name.trim(),
        updatedAt: new Date(),
      })
      .where(and(eq(projects.id, id), eq(projects.userId, userId)))
      .returning();

    if (!updated) {
      throw new ChatbotError('not_found:database', `Project with id ${id} not found`);
    }

    return updated;
  } catch (error) {
    if (error instanceof ChatbotError) throw error;
    throw new ChatbotError('bad_request:database', { cause: error });
  }
}

export async function deleteProjectById({
  id,
  userId,
}: {
  id: string;
  userId: string;
}): Promise<Project | null> {
  try {
    const [deleted] = await db
      .delete(projects)
      .where(and(eq(projects.id, id), eq(projects.userId, userId)))
      .returning();

    return deleted ?? null;
  } catch (error) {
    throw new ChatbotError('bad_request:database', { cause: error });
  }
}

export type ProjectWithChatCount = Project & {
  chatCount: number;
};

export async function getProjectsWithChatCount({
  userId,
}: {
  userId: string;
}): Promise<ProjectWithChatCount[]> {
  try {
    const rows = await db
      .select({
        id: projects.id,
        name: projects.name,
        userId: projects.userId,
        createdAt: projects.createdAt,
        updatedAt: projects.updatedAt,
        chatCount: count(chats.id),
      })
      .from(projects)
      .leftJoin(chats, eq(chats.projectId, projects.id))
      .where(eq(projects.userId, userId))
      .groupBy(projects.id)
      .orderBy(desc(projects.updatedAt));

    return rows as ProjectWithChatCount[];
  } catch (error) {
    throw new ChatbotError('bad_request:database', { cause: error });
  }
}
