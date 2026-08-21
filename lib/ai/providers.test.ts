import { describe, expect, it, vi } from 'vitest';
import {
  DEFAULT_MODEL_ID,
  DEFAULT_PROVIDER,
  getLanguageModel,
  getTitleModel,
  SUPPORTED_MODELS,
} from './providers';

describe('AI Providers Registry', () => {
  it('exports DEFAULT_MODEL_ID as gemini-3.5-flash-lite', () => {
    expect(DEFAULT_MODEL_ID).toBe('gemini-3.5-flash-lite');
    expect(DEFAULT_PROVIDER).toBe('google');
  });

  it('exports SUPPORTED_MODELS list with Google Gemini and Ollama models', () => {
    expect(SUPPORTED_MODELS).toBeDefined();
    expect(Array.isArray(SUPPORTED_MODELS)).toBe(true);
    expect(SUPPORTED_MODELS.length).toBeGreaterThanOrEqual(2);

    const modelIds = SUPPORTED_MODELS.map((m) => m.id);
    expect(modelIds).toContain('gemini-3.7-flash');
    expect(modelIds).toContain('gemini-3.5-flash-lite');
    expect(modelIds).toContain('qwen2.5-vl');
    expect(modelIds).toContain('llama3.2-vision');
  });

  it('resolves Google model gemini-3.7-flash without throwing', () => {
    const model = getLanguageModel({ modelId: 'gemini-3.7-flash' });
    expect(model).toBeDefined();
  });

  it('resolves Google model gemini-3.5-flash-lite without throwing', () => {
    const model = getLanguageModel({ modelId: 'gemini-3.5-flash-lite' });
    expect(model).toBeDefined();
  });

  it('falls back to DEFAULT_MODEL_ID and logs warning when given invalid modelId', () => {
    const warnSpy = vi.spyOn(console, 'warn').mockImplementation(() => {
      /* noop */
    });

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
