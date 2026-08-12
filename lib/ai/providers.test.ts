import { afterEach, beforeEach, describe, expect, it } from 'vitest';
import { getLanguageModel, getProviderForModel, SUPPORTED_MODELS } from './providers';

describe('lib/ai/providers', () => {
  const originalEnv = process.env;

  beforeEach(() => {
    process.env = { ...originalEnv };
    delete process.env.GOOGLE_GENERATIVE_AI_API_KEY;
    delete process.env.GEMINI_API_KEY;
    delete process.env.OPENAI_API_KEY;
    delete process.env.OPENROUTER_API_KEY;
    delete process.env.OPENAI_BASE_URL;
    delete process.env.PLAYWRIGHT_TEST;
  });

  afterEach(() => {
    process.env = originalEnv;
  });

  it('exports SUPPORTED_MODELS containing Google and OpenAI model configurations', () => {
    expect(SUPPORTED_MODELS).toHaveLength(5);
    expect(SUPPORTED_MODELS.map((m) => m.id)).toEqual([
      'gemini-3.5-flash-lite',
      'gemini-3.5-flash',
      'gemini-1.5-pro',
      'gpt-4o-mini',
      'gpt-4o',
    ]);
  });

  it('correctly maps model ID to provider with getProviderForModel', () => {
    expect(getProviderForModel('gemini-3.5-flash-lite')).toBe('google');
    expect(getProviderForModel('gemini-1.5-pro')).toBe('google');
    expect(getProviderForModel('gpt-4o-mini')).toBe('openai');
    expect(getProviderForModel('gpt-4o')).toBe('openai');
    expect(getProviderForModel('unknown-model')).toBe('google');
  });

  it('returns MockLanguageModelV4 when no API key or URL is configured', () => {
    const model = getLanguageModel();
    // biome-ignore lint/suspicious/noExplicitAny: AI SDK LanguageModel union type cast for provider inspection
    expect((model as any).provider).toBe('mock-provider');
  });

  it('instantiates Google provider when GOOGLE_GENERATIVE_AI_API_KEY is set', () => {
    process.env.GOOGLE_GENERATIVE_AI_API_KEY = 'test-google-key';
    const model = getLanguageModel({ modelId: 'gemini-3.5-flash' });
    // biome-ignore lint/suspicious/noExplicitAny: AI SDK LanguageModel union type cast for provider inspection
    expect((model as any).provider).toBe('google.generative-ai');
  });

  it('instantiates Google provider when GEMINI_API_KEY alias is set', () => {
    process.env.GEMINI_API_KEY = 'test-gemini-key';
    const model = getLanguageModel({ modelId: 'gemini-1.5-pro' });
    // biome-ignore lint/suspicious/noExplicitAny: AI SDK LanguageModel union type cast for provider inspection
    expect((model as any).provider).toBe('google.generative-ai');
  });

  it('automatically resolves OpenAI provider when OpenAI modelId is provided', () => {
    process.env.OPENAI_API_KEY = 'test-openai-key';
    const model = getLanguageModel({ modelId: 'gpt-4o-mini' });
    // biome-ignore lint/suspicious/noExplicitAny: AI SDK LanguageModel union type cast for provider inspection
    expect((model as any).provider).toMatch(/^openai\./);
  });

  it('instantiates OpenRouter provider when OPENROUTER_API_KEY is set', () => {
    process.env.OPENROUTER_API_KEY = 'test-openrouter-key';
    const model = getLanguageModel({ provider: 'openrouter' });
    // biome-ignore lint/suspicious/noExplicitAny: AI SDK LanguageModel union type cast for provider inspection
    expect((model as any).provider).toMatch(/^openai\./);
  });
});
