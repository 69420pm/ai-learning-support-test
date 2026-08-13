import { describe, expect, it, vi } from 'vitest';
import {
  DEFAULT_MODEL_ID,
  DEFAULT_PROVIDER,
  getLanguageModel,
  getTitleModel,
  SUPPORTED_MODELS,
} from './providers';

describe('AI Providers Registry', () => {
  it('exports DEFAULT_MODEL_ID as gemini-2.5-flash', () => {
    expect(DEFAULT_MODEL_ID).toBe('gemini-2.5-flash');
    expect(DEFAULT_PROVIDER).toBe('google');
  });

  it('exports SUPPORTED_MODELS list with Google and OpenAI models', () => {
    expect(SUPPORTED_MODELS).toBeDefined();
    expect(Array.isArray(SUPPORTED_MODELS)).toBe(true);
    expect(SUPPORTED_MODELS.length).toBe(4);

    const modelIds = SUPPORTED_MODELS.map((m) => m.id);
    expect(modelIds).toContain('gemini-2.5-flash');
    expect(modelIds).toContain('gemini-1.5-pro');
    expect(modelIds).toContain('gpt-4o-mini');
    expect(modelIds).toContain('gpt-4o');
  });

  it('resolves OpenAI model gpt-4o-mini without throwing', () => {
    const model = getLanguageModel({ modelId: 'gpt-4o-mini' });
    expect(model).toBeDefined();
  });

  it('resolves Google model gemini-1.5-pro without throwing', () => {
    const model = getLanguageModel({ modelId: 'gemini-1.5-pro' });
    expect(model).toBeDefined();
  });

  it('falls back to DEFAULT_MODEL_ID and logs warning when given invalid modelId', () => {
    const warnSpy = vi.spyOn(console, 'warn').mockImplementation(() => {});

    const model = getLanguageModel({ modelId: 'non-existent-model' });

    expect(model).toBeDefined();
    expect(warnSpy).toHaveBeenCalledWith(
      expect.stringContaining('Unrecognized modelId "non-existent-model"'),
    );

    warnSpy.mockRestore();
  });

  it('resolves title model using default configuration', () => {
    const model = getTitleModel();
    expect(model).toBeDefined();
  });
});
