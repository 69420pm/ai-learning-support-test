import { createGoogle, google } from '@ai-sdk/google';
import { createOpenAI, openai } from '@ai-sdk/openai';
import type { LanguageModel } from 'ai';
import { ChatbotError } from '@/lib/errors';
import { createMockLanguageModel, isTestOrMockEnvironment } from './models.mock';

let mockLanguageModelOverride: LanguageModel | null = null;

export function setMockLanguageModel(model: LanguageModel | null): void {
  mockLanguageModelOverride = model;
}

export type ProviderName = 'google' | 'openai' | 'openrouter' | 'ollama';

export type ModelOption = {
  id: string;
  name: string;
  provider: ProviderName;
  description: string;
  badge?: string;
};

export type GetLanguageModelOptions = {
  provider?: ProviderName;
  modelId?: string;
  apiKey?: string;
};

export const DEFAULT_PROVIDER: ProviderName = 'google';
export const DEFAULT_MODEL_ID = 'gemini-3.5-flash-lite';

export const SUPPORTED_MODELS: ModelOption[] = [
  {
    id: 'gemini-3.5-flash-lite',
    name: 'Gemini 3.5 Flash-Lite',
    provider: 'google',
    description: 'Ultra-fast, lightweight model for high-throughput tasks',
    badge: 'Default',
  },
  {
    id: 'gemini-3.7-flash',
    name: 'Gemini 3.7 Flash',
    provider: 'google',
    description: 'Fast & versatile model for multimodal tasks',
  },
  {
    id: 'qwen2.5-vl',
    name: 'Qwen 2.5 VL (Local)',
    provider: 'ollama',
    description: 'High-accuracy local vision language model via Ollama',
  },
  {
    id: 'llama3.2-vision',
    name: 'Llama 3.2 Vision (Local)',
    provider: 'ollama',
    description: 'Multimodal vision model running locally via Ollama',
  },
];

function resolveModelAndProvider(
  modelId: string = DEFAULT_MODEL_ID,
  provider?: ProviderName,
): { resolvedModelId: string; resolvedProvider: ProviderName } {
  let targetModel = SUPPORTED_MODELS.find((m) => m.id === modelId);
  let resolvedModelId = modelId;

  if (!targetModel) {
    if (process.env.NODE_ENV !== 'production') {
      console.warn(
        `Unrecognized modelId "${modelId}". Falling back to default model: ${DEFAULT_MODEL_ID}`,
      );
    }
    targetModel = SUPPORTED_MODELS.find((m) => m.id === DEFAULT_MODEL_ID);
    resolvedModelId = DEFAULT_MODEL_ID;
  }

  const resolvedProvider: ProviderName =
    provider ?? (targetModel ? targetModel.provider : DEFAULT_PROVIDER);

  return { resolvedModelId, resolvedProvider };
}

function shouldUseMock(apiKey?: string): boolean {
  const hasKey =
    Boolean(apiKey) ||
    Boolean(process.env.GOOGLE_GENERATIVE_AI_API_KEY) ||
    Boolean(process.env.OPENAI_API_KEY) ||
    Boolean(process.env.OPENROUTER_API_KEY);

  return isTestOrMockEnvironment(hasKey);
}

export function getLanguageModel({
  provider,
  modelId = DEFAULT_MODEL_ID,
  apiKey,
}: GetLanguageModelOptions = {}): LanguageModel {
  const { resolvedModelId, resolvedProvider } = resolveModelAndProvider(modelId, provider);

  if (mockLanguageModelOverride) {
    return mockLanguageModelOverride;
  }

  if (shouldUseMock(apiKey)) {
    return createMockLanguageModel({
      modelId: resolvedModelId,
      provider: resolvedProvider,
    });
  }

  switch (resolvedProvider) {
    case 'google': {
      if (apiKey) {
        return createGoogle({ apiKey })(resolvedModelId);
      }
      return google(resolvedModelId);
    }
    case 'openai': {
      if (apiKey) {
        return createOpenAI({ apiKey })(resolvedModelId);
      }
      return openai(resolvedModelId);
    }
    case 'openrouter': {
      const key = apiKey || process.env.OPENROUTER_API_KEY;
      return createOpenAI({
        baseURL: 'https://openrouter.ai/api/v1',
        apiKey: key,
      })(resolvedModelId);
    }
    case 'ollama': {
      const baseURL = process.env.OLLAMA_BASE_URL
        ? `${process.env.OLLAMA_BASE_URL.replace(/\/$/, '')}/v1`
        : 'http://localhost:11434/v1';
      return createOpenAI({
        baseURL,
        apiKey: apiKey || 'ollama',
      })(resolvedModelId);
    }
    default: {
      throw new ChatbotError('bad_request:chat', `Unsupported AI provider: ${resolvedProvider}`);
    }
  }
}

export function getTitleModel(options: GetLanguageModelOptions = {}): LanguageModel {
  return getLanguageModel({
    provider: options.provider,
    modelId: options.modelId ?? DEFAULT_MODEL_ID,
    apiKey: options.apiKey,
  });
}
