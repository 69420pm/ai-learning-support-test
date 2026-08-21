import { createGoogle, google } from '@ai-sdk/google';
import { createOpenAI, openai } from '@ai-sdk/openai';
import { type EmbeddingModel, embedMany } from 'ai';
import { MockEmbeddingModelV4 } from 'ai/test';

export const EMBEDDING_DIMENSIONS = 768;
export const DEFAULT_EMBEDDING_MODEL_ID = 'gemini-embedding-001';

export type GetEmbeddingModelOptions = {
  provider?: 'google' | 'openai';
  modelId?: string;
  apiKey?: string;
};

export function getEmbeddingModel(options: GetEmbeddingModelOptions = {}): EmbeddingModel {
  const { provider = 'google', modelId = DEFAULT_EMBEDDING_MODEL_ID, apiKey } = options;

  const hasKey = apiKey || process.env.GOOGLE_GENERATIVE_AI_API_KEY || process.env.OPENAI_API_KEY;

  if (!hasKey || process.env.PLAYWRIGHT_TEST === 'true' || process.env.NODE_ENV === 'test') {
    return new MockEmbeddingModelV4({
      doEmbed: async ({ values }) => ({
        embeddings: values.map((val) => {
          const vec = new Array(EMBEDDING_DIMENSIONS).fill(0);
          let hash = 0;
          for (let i = 0; i < val.length; i++) {
            hash = (hash << 5) - hash + val.charCodeAt(i);
            hash |= 0;
          }
          for (let i = 0; i < EMBEDDING_DIMENSIONS; i++) {
            vec[i] = Number((Math.sin(hash + i) * 0.05).toFixed(6));
          }
          return vec;
        }),
        warnings: [],
      }),
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

  throw new Error(`Unsupported embedding provider: ${provider}`);
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
