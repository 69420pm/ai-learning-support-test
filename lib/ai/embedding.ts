import { createGoogle, google } from '@ai-sdk/google';
import { createOpenAI, openai } from '@ai-sdk/openai';
import { type EmbeddingModel, embedMany } from 'ai';
import { ChatbotError } from '@/lib/errors';
import { createMockEmbeddingModel, isTestOrMockEnvironment } from './models.mock';

export const EMBEDDING_DIMENSIONS = 768;
export const DEFAULT_EMBEDDING_MODEL_ID = 'gemini-embedding-001';

let mockEmbeddingModelOverride: EmbeddingModel | null = null;

export function setMockEmbeddingModel(model: EmbeddingModel | null): void {
  mockEmbeddingModelOverride = model;
}

export function getMockEmbeddingModel(): EmbeddingModel | null {
  return mockEmbeddingModelOverride;
}

export type GetEmbeddingModelOptions = {
  provider?: 'google' | 'openai';
  modelId?: string;
  apiKey?: string;
};

export function getEmbeddingModel(options: GetEmbeddingModelOptions = {}): EmbeddingModel {
  if (mockEmbeddingModelOverride) {
    return mockEmbeddingModelOverride;
  }

  const { provider = 'google', modelId = DEFAULT_EMBEDDING_MODEL_ID, apiKey } = options;

  const hasKey = Boolean(
    apiKey || process.env.GOOGLE_GENERATIVE_AI_API_KEY || process.env.OPENAI_API_KEY,
  );

  if (isTestOrMockEnvironment(hasKey)) {
    return createMockEmbeddingModel({
      modelId,
      provider,
      dimensions: EMBEDDING_DIMENSIONS,
    });
  }

  if (provider === 'google') {
    if (apiKey) {
      return createGoogle({ apiKey }).embedding(modelId);
    }
    return google.embedding(modelId);
  }

  if (provider === 'openai') {
    if (apiKey) {
      return createOpenAI({ apiKey }).embedding(modelId);
    }
    return openai.embedding(modelId);
  }

  throw new ChatbotError('bad_request:chat', `Unsupported embedding provider: ${provider}`);
}

export async function generateEmbeddings(
  texts: string[],
  options: GetEmbeddingModelOptions = {},
): Promise<number[][]> {
  if (texts.length === 0) {
    return [];
  }

  const model = getEmbeddingModel(options);
  const result = await embedMany({
    model,
    values: texts,
    providerOptions: {
      google: {
        outputDimensionality: EMBEDDING_DIMENSIONS,
      },
      openai: {
        dimensions: EMBEDDING_DIMENSIONS,
      },
    },
  });

  return result.embeddings;
}
