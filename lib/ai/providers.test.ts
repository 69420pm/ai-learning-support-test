import { describe, expect, it } from 'vitest';
import { getLanguageModel, SUPPORTED_MODELS } from './providers';

describe('AI Provider Resolution', () => {
  it('exports SUPPORTED_MODELS list with Google Gemini 3.x definitions', () => {
    expect(SUPPORTED_MODELS).toBeDefined();
    expect(SUPPORTED_MODELS.length).toBeGreaterThan(0);
    const gemini37 = SUPPORTED_MODELS.find((m) => m.id === 'gemini-3.7-flash');
    const gemini35 = SUPPORTED_MODELS.find((m) => m.id === 'gemini-3.5-flash');
    expect(gemini37?.provider).toBe('google');
    expect(gemini35?.provider).toBe('google');
    expect(SUPPORTED_MODELS.every((m) => m.provider === 'google')).toBe(true);
  });

  it('resolves valid modelId to model instance without throwing', () => {
    const model = getLanguageModel({ modelId: 'gemini-3.7-flash' });
    expect(model).toBeDefined();
  });

  it('falls back to default model for invalid modelId', () => {
    const model = getLanguageModel({ modelId: 'non-existent-model' });
    expect(model).toBeDefined();
  });

  it('streams valid UI message chunks with text-start before text-delta when using fallback mock model', async () => {
    const { streamText, toUIMessageStream } = await import('ai');
    const model = getLanguageModel({ modelId: 'gemini-3.6-flash' });
    const result = streamText({
      model,
      prompt: 'Hello',
    });

    const uiStream = toUIMessageStream({ stream: result.stream });
    const reader = uiStream.getReader();
    const chunks: Array<{ type: string; id?: string }> = [];

    let done = false;
    while (!done) {
      const res = await reader.read();
      done = res.done;
      if (res.value) {
        chunks.push(res.value as { type: string; id?: string });
      }
    }

    const textStartIdx = chunks.findIndex((c) => c.type === 'text-start' && c.id === 'text-1');
    const textDeltaIdx = chunks.findIndex((c) => c.type === 'text-delta' && c.id === 'text-1');
    const textEndIdx = chunks.findIndex((c) => c.type === 'text-end' && c.id === 'text-1');

    expect(textStartIdx).toBeGreaterThan(-1);
    expect(textDeltaIdx).toBeGreaterThan(textStartIdx);
    expect(textEndIdx).toBeGreaterThan(textDeltaIdx);
  });
});
