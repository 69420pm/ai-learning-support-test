import type { EmbeddingModel, LanguageModel } from 'ai';
import { MockEmbeddingModelV4, MockLanguageModelV4 } from 'ai/test';

export const DEFAULT_MOCK_MODEL_ID = 'mock-language-model';
export const DEFAULT_MOCK_EMBEDDING_MODEL_ID = 'mock-embedding-model';
export const DEFAULT_MOCK_EMBEDDING_DIMENSIONS = 768;

export function isTestOrMockEnvironment(hasKey = false): boolean {
  if (process.env.PLAYWRIGHT_TEST === 'true' || process.env.NODE_ENV === 'test') {
    return true;
  }
  return !hasKey;
}

export type MockLanguageModelOptions = {
  modelId?: string;
  provider?: string;
  textResponse?: string | (() => string);
  textChunks?: string[];
  objectResponse?: Record<string, unknown> | (() => Record<string, unknown>);
  toolCalls?: Array<{
    toolCallId: string;
    toolName: string;
    args: Record<string, unknown> | string;
  }>;
  simulateError?: Error | string;
};

export type MockEmbeddingModelOptions = {
  modelId?: string;
  provider?: string;
  dimensions?: number;
  simulateError?: Error | string;
};

const DEFAULT_STREAM_DELTA =
  'Here is a Python quicksort implementation:\n\n```python\ndef quicksort(arr):\n    if len(arr) <= 1:\n        return arr\n    pivot = arr[len(arr) // 2]\n    left = [x for x in arr if x < pivot]\n    middle = [x for x in arr if x == pivot]\n    right = [x for x in arr if x > pivot]\n    return quicksort(left) + middle + right\n```\n\n### Explanation:\n- **Pivot Selection**: Chooses middle element.\n- **Partitioning**: Splits into sub-arrays.';

const DEFAULT_OBJECT_RESPONSE = {
  concepts: [
    {
      name: 'Linear Algebra',
      slug: 'linear-algebra',
      pacerCategory: 'conceptual',
      bloomLevel: 3,
      aliases: [],
    },
  ],
  prerequisites: [],
  exercises: [],
};

function resolveError(error: Error | string | undefined): Error | null {
  if (!error) return null;
  return error instanceof Error ? error : new Error(error);
}

function formatToolCall(tc: NonNullable<MockLanguageModelOptions['toolCalls']>[number]) {
  const rawArgs = typeof tc.args === 'string' ? tc.args : JSON.stringify(tc.args);
  return {
    type: 'tool-call' as const,
    toolCallId: tc.toolCallId,
    toolName: tc.toolName,
    input: rawArgs,
    args: rawArgs,
  };
}

function isObjectModeCall(callOptions: unknown): boolean {
  if (!callOptions || typeof callOptions !== 'object') return false;
  const opts = callOptions as {
    mode?: { type?: string };
    responseFormat?: { type?: string };
    schema?: unknown;
  };
  const modeType = opts.mode?.type;
  return (
    modeType === 'object-json' ||
    modeType === 'object-tool' ||
    opts.responseFormat?.type === 'json' ||
    Boolean(opts.schema)
  );
}

function resolveText(textResponse: MockLanguageModelOptions['textResponse']): string {
  if (textResponse === undefined) {
    return 'Python Quicksort';
  }
  return typeof textResponse === 'function' ? textResponse() : textResponse;
}

function emitToolCalls(
  controller: ReadableStreamDefaultController,
  toolCalls?: MockLanguageModelOptions['toolCalls'],
) {
  if (!toolCalls || toolCalls.length === 0) return;
  for (const tc of toolCalls) {
    const rawArgs = typeof tc.args === 'string' ? tc.args : JSON.stringify(tc.args);
    controller.enqueue({
      type: 'tool-call',
      toolCallId: tc.toolCallId,
      toolName: tc.toolName,
      input: rawArgs,
    });
  }
}

function emitTextChunks(controller: ReadableStreamDefaultController, chunks: string[]) {
  for (let i = 0; i < chunks.length; i++) {
    const id = `text-${i + 1}`;
    controller.enqueue({ type: 'text-start', id });
    controller.enqueue({ type: 'text-delta', id, delta: chunks[i] });
    controller.enqueue({ type: 'text-end', id });
  }
}

function emitStreamFinish(controller: ReadableStreamDefaultController) {
  controller.enqueue({
    type: 'finish',
    finishReason: { unified: 'stop', raw: 'stop' },
    usage: {
      inputTokens: { total: 10, noCache: 10, cacheRead: 0, cacheWrite: 0 },
      outputTokens: { total: 50, text: 50, reasoning: 0 },
    },
  });
}

/**
 * Creates a deterministic MockLanguageModel with support for text generation,
 * streaming chunks, structured object generation, tool calling, and error simulation.
 */
export function createMockLanguageModel(options: MockLanguageModelOptions = {}): LanguageModel {
  const {
    modelId = DEFAULT_MOCK_MODEL_ID,
    provider = 'mock-ai',
    textResponse,
    textChunks,
    objectResponse,
    toolCalls,
    simulateError,
  } = options;

  return new MockLanguageModelV4({
    modelId,
    provider,
    doGenerate: (callOptions) => {
      const err = resolveError(simulateError);
      if (err) return Promise.reject(err);

      if (toolCalls && toolCalls.length > 0) {
        return Promise.resolve({
          content: toolCalls.map(formatToolCall),
          finishReason: { unified: 'tool-calls', raw: 'tool_calls' },
          usage: {
            inputTokens: { total: 10, noCache: 10, cacheRead: 0, cacheWrite: 0 },
            outputTokens: { total: 20, text: 0, reasoning: 0 },
          },
          warnings: [],
          rawCall: { rawPrompt: null, rawOutput: null },
        });
      }

      if (objectResponse !== undefined) {
        const obj = typeof objectResponse === 'function' ? objectResponse() : objectResponse;
        return Promise.resolve({
          content: [{ type: 'text' as const, text: JSON.stringify(obj) }],
          finishReason: { unified: 'stop', raw: 'stop' },
          usage: {
            inputTokens: { total: 10, noCache: 10, cacheRead: 0, cacheWrite: 0 },
            outputTokens: { total: 30, text: 30, reasoning: 0 },
          },
          warnings: [],
          rawCall: { rawPrompt: null, rawOutput: null },
        });
      }

      if (isObjectModeCall(callOptions)) {
        return Promise.resolve({
          content: [{ type: 'text' as const, text: JSON.stringify(DEFAULT_OBJECT_RESPONSE) }],
          finishReason: { unified: 'stop', raw: 'stop' },
          usage: {
            inputTokens: { total: 10, noCache: 10, cacheRead: 0, cacheWrite: 0 },
            outputTokens: { total: 30, text: 30, reasoning: 0 },
          },
          warnings: [],
          rawCall: { rawPrompt: null, rawOutput: null },
        });
      }

      return Promise.resolve({
        content: [{ type: 'text' as const, text: resolveText(textResponse) }],
        finishReason: { unified: 'stop', raw: 'stop' },
        usage: {
          inputTokens: { total: 10, noCache: 10, cacheRead: 0, cacheWrite: 0 },
          outputTokens: { total: 10, text: 10, reasoning: 0 },
        },
        warnings: [],
        rawCall: { rawPrompt: null, rawOutput: null },
      });
    },

    doStream: () => {
      const err = resolveError(simulateError);
      if (err) {
        return Promise.reject(err);
      }

      const chunksToStream =
        textChunks ??
        (textResponse === undefined
          ? [DEFAULT_STREAM_DELTA]
          : [typeof textResponse === 'function' ? textResponse() : textResponse]);

      return Promise.resolve({
        stream: new ReadableStream({
          start(controller) {
            emitToolCalls(controller, toolCalls);
            emitTextChunks(controller, chunksToStream);
            emitStreamFinish(controller);
            controller.close();
          },
        }),
        rawCall: { rawPrompt: null, rawOutput: null },
      });
    },
  });
}

/**
 * Creates a deterministic MockEmbeddingModel generating repeatable 768-dimensional
 * vectors based on content hash, with support for custom dimension counts and error simulation.
 */
export function createMockEmbeddingModel(options: MockEmbeddingModelOptions = {}): EmbeddingModel {
  const {
    modelId = DEFAULT_MOCK_EMBEDDING_MODEL_ID,
    provider = 'mock-embedding',
    dimensions = DEFAULT_MOCK_EMBEDDING_DIMENSIONS,
    simulateError,
  } = options;

  return new MockEmbeddingModelV4({
    modelId,
    provider,
    doEmbed: ({ values }) => {
      const err = resolveError(simulateError);
      if (err) {
        return Promise.reject(err);
      }

      const embeddings = values.map((val) => {
        const vec = new Array(dimensions).fill(0);
        let hash = 0;
        for (let i = 0; i < val.length; i++) {
          hash = (hash << 5) - hash + val.charCodeAt(i);
          hash |= 0;
        }
        for (let i = 0; i < dimensions; i++) {
          vec[i] = Number((Math.sin(hash + i) * 0.05).toFixed(6));
        }
        return vec;
      });

      return Promise.resolve({
        embeddings,
        warnings: [],
      });
    },
  });
}
