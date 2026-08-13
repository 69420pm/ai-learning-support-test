import { describe, expect, it } from 'vitest';
import { getLanguageModel, SUPPORTED_MODELS } from './providers';

describe('AI Provider Resolution', () => {
  it('exports SUPPORTED_MODELS list with Google and OpenAI definitions', () => {
    expect(SUPPORTED_MODELS).toBeDefined();
    expect(SUPPORTED_MODELS.length).toBeGreaterThan(0);
    const gemini = SUPPORTED_MODELS.find((m) => m.id === 'gemini-2.5-flash');
    const gpt = SUPPORTED_MODELS.find((m) => m.id === 'gpt-4o-mini');
    expect(gemini?.provider).toBe('google');
    expect(gpt?.provider).toBe('openai');
  });

  it('resolves valid modelId to model instance without throwing', () => {
    const model = getLanguageModel({ modelId: 'gpt-4o-mini' });
    expect(model).toBeDefined();
  });

  it('falls back to default model for invalid modelId', () => {
    const model = getLanguageModel({ modelId: 'non-existent-model' });
    expect(model).toBeDefined();
  });
});
