import { createGoogle, google } from '@ai-sdk/google';
import { createOpenAI, openai } from '@ai-sdk/openai';
import type { LanguageModel } from 'ai';
import { MockLanguageModelV4 } from 'ai/test';

export type ProviderName = 'google' | 'openai' | 'openrouter';

export type SupportedModel = {
  id: string;
  name: string;
  provider: ProviderName;
  description: string;
};

export type GetLanguageModelOptions = {
  provider?: ProviderName;
  modelId?: string;
  apiKey?: string;
};

export const DEFAULT_PROVIDER: ProviderName = 'google';
export const DEFAULT_MODEL_ID = 'gemini-3.5-flash';

export const SUPPORTED_MODELS: SupportedModel[] = [
  {
    id: 'gemini-3.5-flash-lite',
    name: 'Gemini 3.5 Flash Lite',
    provider: 'google',
    description: 'Fastest model for simple queries',
  },
  {
    id: 'gemini-3.5-flash',
    name: 'Gemini 3.5 Flash',
    provider: 'google',
    description: 'Balanced speed and capability for general tasks',
  },
  {
    id: 'gemini-1.5-pro',
    name: 'Gemini 1.5 Pro',
    provider: 'google',
    description: 'Complex reasoning and detailed explanations',
  },
  {
    id: 'gpt-4o-mini',
    name: 'GPT-4o Mini',
    provider: 'openai',
    description: 'Affordable, fast OpenAI model',
  },
  {
    id: 'gpt-4o',
    name: 'GPT-4o',
    provider: 'openai',
    description: 'High intelligence OpenAI flagship model',
  },
];

export function getProviderForModel(modelId: string): ProviderName {
  const model = SUPPORTED_MODELS.find((m) => m.id === modelId);
  return model ? model.provider : DEFAULT_PROVIDER;
}

export function getLanguageModel({
  provider,
  modelId = DEFAULT_MODEL_ID,
  apiKey,
}: GetLanguageModelOptions = {}): LanguageModel {
  const resolvedProvider = provider ?? getProviderForModel(modelId);
  const hasKey =
    apiKey ||
    process.env.GOOGLE_GENERATIVE_AI_API_KEY ||
    process.env.GEMINI_API_KEY ||
    process.env.OPENAI_API_KEY ||
    process.env.OPENROUTER_API_KEY;

  if (!hasKey || process.env.PLAYWRIGHT_TEST === 'true') {
    return new MockLanguageModelV4({
      doStream: async () => ({
        stream: new ReadableStream({
          start(controller) {
            controller.enqueue({
              type: 'text-delta',
              id: 'text-1',
              delta:
                'Here is a Python quicksort implementation:\n\n```python\ndef quicksort(arr):\n    if len(arr) <= 1:\n        return arr\n    pivot = arr[len(arr) // 2]\n    left = [x for x in arr if x < pivot]\n    middle = [x for x in arr if x == pivot]\n    right = [x for x in arr if x > pivot]\n    return quicksort(left) + middle + right\n```\n\n### Explanation:\n- **Pivot Selection**: Chooses middle element.\n- **Partitioning**: Splits into sub-arrays.',
            });
            controller.enqueue({
              type: 'finish',
              finishReason: { unified: 'stop', raw: 'stop' },
              usage: {
                inputTokens: { total: 10, noCache: 10, cacheRead: 0, cacheWrite: 0 },
                outputTokens: { total: 50, text: 50, reasoning: 0 },
              },
            });
            controller.close();
          },
        }),
        rawCall: { rawPrompt: null, rawOutput: null },
      }),
      doGenerate: async () => ({
        content: [{ type: 'text', text: 'Python Quicksort' }],
        finishReason: { unified: 'stop', raw: 'stop' },
        usage: {
          inputTokens: { total: 10, noCache: 10, cacheRead: 0, cacheWrite: 0 },
          outputTokens: { total: 5, text: 5, reasoning: 0 },
        },
        warnings: [],
        rawCall: { rawPrompt: null, rawOutput: null },
      }),
    });
  }

  switch (resolvedProvider) {
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
      throw new Error(`Unsupported AI provider: ${resolvedProvider}`);
    }
  }
}

export function getTitleModel(options: GetLanguageModelOptions = {}): LanguageModel {
  const modelId = options.modelId ?? DEFAULT_MODEL_ID;
  const provider = options.provider ?? getProviderForModel(modelId);
  return getLanguageModel({
    provider,
    modelId,
    apiKey: options.apiKey,
  });
}
