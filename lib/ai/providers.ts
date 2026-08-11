import { createGoogle, google } from '@ai-sdk/google';
import { createOpenAI, openai } from '@ai-sdk/openai';
import type { LanguageModel } from 'ai';
import { MockLanguageModelV4 } from 'ai/test';

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
  const hasKey = apiKey || process.env.GOOGLE_GENERATIVE_AI_API_KEY || process.env.OPENAI_API_KEY;

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
