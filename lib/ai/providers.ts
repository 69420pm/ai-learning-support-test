import { createGoogle, google } from '@ai-sdk/google';
import { createOpenAI, openai } from '@ai-sdk/openai';
import type { LanguageModel } from 'ai';

export type ProviderName = 'google' | 'openai' | 'openrouter';

export type GetLanguageModelOptions = {
  provider?: ProviderName;
  modelId?: string;
  apiKey?: string;
};

export const DEFAULT_PROVIDER: ProviderName = 'google';
export const DEFAULT_MODEL_ID = 'gemini-2.5-flash';

export function getLanguageModel({
  provider = DEFAULT_PROVIDER,
  modelId = DEFAULT_MODEL_ID,
  apiKey,
}: GetLanguageModelOptions = {}): LanguageModel {
  switch (provider) {
    case 'google': {
      if (apiKey) {
        return createGoogle({ apiKey })(modelId);
      }
      return google(modelId);
    }
    case 'openai': {
      if (apiKey) {
        return createOpenAI({ apiKey })(modelId);
      }
      return openai(modelId);
    }
    case 'openrouter': {
      const key = apiKey || process.env.OPENROUTER_API_KEY;
      return createOpenAI({
        baseURL: 'https://openrouter.ai/api/v1',
        apiKey: key,
      })(modelId);
    }
    default: {
      throw new Error(`Unsupported AI provider: ${provider}`);
    }
  }
}

export function getTitleModel(options: GetLanguageModelOptions = {}): LanguageModel {
  return getLanguageModel({
    provider: options.provider ?? DEFAULT_PROVIDER,
    modelId: options.modelId ?? DEFAULT_MODEL_ID,
    apiKey: options.apiKey,
  });
}
