import { and, asc, desc, eq, gt, lt, type SQL } from 'drizzle-orm';
import { db } from '@/lib/db';
import { type Chat, chats, type DBMessage, messages, type NewDBMessage } from '@/lib/db/schema';
import { ChatbotError } from '@/lib/errors';

export async function saveChat({
  id,
  userId,
  projectId,
  title,
  visibility = 'private',
}: {
  id: string;
  userId: string;
  projectId: string;
  title: string;
  visibility?: 'public' | 'private';
}): Promise<Chat> {
  try {
    const [insertedChat] = await db
      .insert(chats)
      .values({
        id,
        userId,
        projectId,
        title,
        visibility,
        createdAt: new Date(),
      })
      .onConflictDoNothing()
      .returning();
    return insertedChat;
  } catch (error) {
    throw new ChatbotError('bad_request:database', { cause: error });
  }
}

export async function getChatById({
  id,
  userId,
}: {
  id: string;
  userId?: string;
}): Promise<Chat | null> {
  try {
    const conditions = [eq(chats.id, id)];
    if (userId) {
      conditions.push(eq(chats.userId, userId));
    }
    const [selectedChat] = await db
      .select()
      .from(chats)
      .where(and(...conditions));

    return selectedChat ?? null;
  } catch (error) {
    throw new ChatbotError('bad_request:database', { cause: error });
  }
}

export async function getChatsByUserId({
  userId,
  projectId,
  limit,
  startingAfter,
  endingBefore,
}: {
  userId: string;
  projectId?: string;
  limit?: number;
  startingAfter?: string | null;
  endingBefore?: string | null;
}): Promise<{ chats: Chat[]; hasMore?: boolean }> {
  try {
    const userConditions = [eq(chats.userId, userId)];
    if (projectId) {
      userConditions.push(eq(chats.projectId, projectId));
    }
    const baseCondition = and(...userConditions);

    if (!limit) {
      const userChats = await db
        .select()
        .from(chats)
        .where(baseCondition)
        .orderBy(desc(chats.createdAt));
      return { chats: userChats, hasMore: false };
    }

    const extendedLimit = limit + 1;

    const query = (whereCondition?: SQL<unknown>) =>
      db
        .select()
        .from(chats)
        .where(whereCondition ? and(whereCondition, baseCondition) : baseCondition)
        .orderBy(desc(chats.createdAt))
        .limit(extendedLimit);

    let filteredChats: Chat[] = [];

    if (startingAfter) {
      const [selectedChat] = await db
        .select()
        .from(chats)
        .where(eq(chats.id, startingAfter))
        .limit(1);

      if (!selectedChat) {
        throw new ChatbotError('not_found:database', `Chat with id ${startingAfter} not found`);
      }

      filteredChats = await query(gt(chats.createdAt, selectedChat.createdAt));
    } else if (endingBefore) {
      const [selectedChat] = await db
        .select()
        .from(chats)
        .where(eq(chats.id, endingBefore))
        .limit(1);

      if (!selectedChat) {
        throw new ChatbotError('not_found:database', `Chat with id ${endingBefore} not found`);
      }

      filteredChats = await query(lt(chats.createdAt, selectedChat.createdAt));
    } else {
      filteredChats = await query();
    }

    const hasMore = filteredChats.length > limit;
    const items = hasMore ? filteredChats.slice(0, limit) : filteredChats;

    return {
      chats: items,
      hasMore,
    };
  } catch (error) {
    if (error instanceof ChatbotError) throw error;
    throw new ChatbotError('bad_request:database', { cause: error });
  }
}

export async function updateChatTitleById({
  chatId,
  title,
}: {
  chatId: string;
  title: string;
}): Promise<Chat> {
  try {
    const [updatedChat] = await db
      .update(chats)
      .set({ title })
      .where(eq(chats.id, chatId))
      .returning();

    if (!updatedChat) {
      throw new ChatbotError('not_found:database', `Chat with id ${chatId} not found`);
    }

    return updatedChat;
  } catch (error) {
    if (error instanceof ChatbotError) throw error;
    throw new ChatbotError('bad_request:database', { cause: error });
  }
}

export async function deleteChatById({
  id,
  userId,
}: {
  id: string;
  userId: string;
}): Promise<Chat | null> {
  try {
    const [deletedChat] = await db
      .delete(chats)
      .where(and(eq(chats.id, id), eq(chats.userId, userId)))
      .returning();

    return deletedChat ?? null;
  } catch (error) {
    throw new ChatbotError('bad_request:database', { cause: error });
  }
}

export async function saveMessages({
  messages: newMessages,
}: {
  messages: (NewDBMessage | DBMessage)[];
}): Promise<DBMessage[]> {
  try {
    if (newMessages.length === 0) return [];
    return await db.insert(messages).values(newMessages).onConflictDoNothing().returning();
  } catch (error) {
    throw new ChatbotError('bad_request:database', { cause: error });
  }
}

export async function getMessagesByChatId({ chatId }: { chatId: string }): Promise<DBMessage[]> {
  try {
    return await db
      .select()
      .from(messages)
      .where(eq(messages.chatId, chatId))
      .orderBy(asc(messages.createdAt));
  } catch (error) {
    throw new ChatbotError('bad_request:database', { cause: error });
  }
}
