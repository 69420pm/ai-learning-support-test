import { z } from 'zod';

export const postRequestBodySchema = z.object({
  id: z.string().uuid(),
  message: z
    .object({
      id: z.string(),
      role: z.enum(['user', 'assistant', 'system']),
      parts: z.array(z.record(z.string(), z.unknown())),
    })
    .optional(),
  messages: z
    .array(
      z.object({
        id: z.string(),
        role: z.enum(['user', 'assistant', 'system']),
        parts: z.array(z.record(z.string(), z.unknown())),
      }),
    )
    .optional(),
  model: z.string().optional(),
  selectedChatModel: z.string().optional(),
  provider: z.enum(['google', 'openai', 'openrouter']).optional(),
  apiKey: z.string().optional(),
  projectId: z.string().uuid().optional(),
});

export type PostRequestBody = z.infer<typeof postRequestBodySchema>;
