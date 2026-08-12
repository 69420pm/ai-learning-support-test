import {
  convertToModelMessages,
  createUIMessageStream,
  createUIMessageStreamResponse,
  generateText,
  streamText,
  toUIMessageStream,
} from 'ai';
import { systemPrompt, titlePrompt } from '@/lib/ai/prompts';
import {
  DEFAULT_MODEL_ID,
  getLanguageModel,
  getProviderForModel,
  getTitleModel,
  type ProviderName,
} from '@/lib/ai/providers';
import {
  deleteChatById,
  getChatById,
  getMessagesByChatId,
  saveChat,
  saveMessages,
  updateChatTitleById,
} from '@/lib/db/queries/chat';
import { ChatbotError } from '@/lib/errors';
import { createClient } from '@/lib/supabase/server';
import type { ChatMessage } from '@/lib/types';
import { convertToUIMessages, generateUUID, getTextFromMessage } from '@/lib/utils';
import { type PostRequestBody, postRequestBodySchema } from './schema';

export const maxDuration = 60;

function ensureUUID(id: string): string {
  return /^[0-9a-f]{8}-[0-9a-f]{4}-[0-9a-f]{4}-[0-9a-f]{4}-[0-9a-f]{12}$/i.test(id)
    ? id
    : generateUUID();
}

async function prepareChatState({
  id,
  userId,
  userMessage,
  provider,
  apiKey,
}: {
  id: string;
  userId: string;
  userMessage?: PostRequestBody['message'];
  provider?: ProviderName;
  apiKey?: string;
}) {
  const chat = await getChatById({ id, userId });
  let titlePromise: Promise<string> | null = null;
  let messagesFromDb: Awaited<ReturnType<typeof getMessagesByChatId>> = [];

  if (chat) {
    if (chat.userId !== userId) {
      throw new ChatbotError('forbidden:chat');
    }
    messagesFromDb = await getMessagesByChatId({ chatId: id });
  } else {
    await saveChat({ id, title: 'New chat', userId });

    if (userMessage) {
      titlePromise = generateText({
        model: getTitleModel({ provider, apiKey }),
        instructions: titlePrompt,
        prompt: getTextFromMessage(userMessage as ChatMessage),
      }).then(({ text }) =>
        text
          .replace(/^[#*"\s]+/, '')
          .replace(/["]+$/, '')
          .trim(),
      );
    }
  }

  if (userMessage && userMessage.role === 'user') {
    await saveMessages({
      messages: [
        {
          id: ensureUUID(userMessage.id),
          chatId: id,
          role: 'user',
          parts: userMessage.parts,
          createdAt: new Date(),
        },
      ],
    });
  }

  const uiMessages: ChatMessage[] = userMessage
    ? [...convertToUIMessages(messagesFromDb), userMessage as ChatMessage]
    : convertToUIMessages(messagesFromDb);

  return { titlePromise, uiMessages };
}

// biome-ignore lint/style/useNamingConvention: Next.js HTTP method export
export async function POST(request: Request) {
  let requestBody: PostRequestBody;

  try {
    const json = await request.json();
    requestBody = postRequestBodySchema.parse(json);
  } catch {
    return new ChatbotError('bad_request:api').toResponse();
  }

  try {
    const { id, message, messages, model, selectedChatModel, provider, apiKey } = requestBody;

    const supabase = await createClient();
    const {
      data: { user },
    } = await supabase.auth.getUser();

    if (!user) {
      return new ChatbotError('unauthorized:chat').toResponse();
    }

    const modelId = model ?? selectedChatModel ?? DEFAULT_MODEL_ID;
    const resolvedProvider = provider ?? getProviderForModel(modelId);
    const userMessage =
      message ?? (messages && messages.length > 0 ? messages[messages.length - 1] : undefined);

    const { titlePromise, uiMessages } = await prepareChatState({
      id,
      userId: user.id,
      userMessage,
      provider: resolvedProvider,
      apiKey,
    });

    const modelMessages = await convertToModelMessages(uiMessages);

    const stream = createUIMessageStream({
      execute: async ({ writer: dataStream }) => {
        const languageModel = getLanguageModel({
          provider: resolvedProvider,
          modelId,
          apiKey,
        });

        const result = streamText({
          model: languageModel,
          instructions: systemPrompt,
          messages: modelMessages,
        });

        dataStream.merge(
          toUIMessageStream({
            stream: result.stream,
          }),
        );

        if (titlePromise) {
          try {
            const title = await titlePromise;
            dataStream.write({ data: title, type: 'data-chat-title' });
            await updateChatTitleById({ chatId: id, title });
          } catch {
            /* non-fatal title generation error */
          }
        }
      },
      onEnd: async ({ messages: finishedMessages }) => {
        if (finishedMessages.length > 0) {
          await saveMessages({
            messages: finishedMessages.map((msg) => ({
              id: ensureUUID(msg.id),
              chatId: id,
              role: msg.role as 'user' | 'assistant' | 'system',
              parts: msg.parts,
              createdAt: new Date(),
            })),
          });
        }
      },
    });

    return createUIMessageStreamResponse({ stream });
  } catch (error) {
    if (error instanceof ChatbotError) {
      return error.toResponse();
    }
    console.error('Unhandled error in POST /api/chat:', error);
    return new ChatbotError('bad_request:api').toResponse();
  }
}

// biome-ignore lint/style/useNamingConvention: Next.js HTTP method export
export async function DELETE(request: Request) {
  try {
    const url = new URL(request.url);
    const id = url.searchParams.get('id');

    if (!id) {
      return new ChatbotError('bad_request:api').toResponse();
    }

    const supabase = await createClient();
    const {
      data: { user },
    } = await supabase.auth.getUser();

    if (!user) {
      return new ChatbotError('unauthorized:chat').toResponse();
    }

    const chat = await getChatById({ id, userId: user.id });

    if (!chat) {
      return new ChatbotError('not_found:chat').toResponse();
    }

    if (chat.userId !== user.id) {
      return new ChatbotError('forbidden:chat').toResponse();
    }

    await deleteChatById({ id, userId: user.id });

    return new Response('Chat deleted successfully', { status: 200 });
  } catch (error) {
    if (error instanceof ChatbotError) {
      return error.toResponse();
    }
    console.error('Unhandled error in DELETE /api/chat:', error);
    return new ChatbotError('bad_request:api').toResponse();
  }
}
