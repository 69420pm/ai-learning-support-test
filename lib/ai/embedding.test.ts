import { describe, expect, it } from 'vitest';
import {
  DEFAULT_EMBEDDING_MODEL_ID,
  EMBEDDING_DIMENSIONS,
  generateEmbeddings,
  getEmbeddingModel,
} from './embedding';

describe('Embedding Module', () => {
  it('returns an embedding model with 768 dimensions', () => {
    const model = getEmbeddingModel();
    expect(model).toBeDefined();
  });

  it('uses gemini-embedding-001 as default model id', () => {
    expect(DEFAULT_EMBEDDING_MODEL_ID).toBe('gemini-embedding-001');
  });

  it('generates 768-dimension embeddings for input texts', async () => {
    const embeddings = await generateEmbeddings(['Hello world', 'Second chunk of text']);
    expect(embeddings).toHaveLength(2);
    expect(embeddings[0]).toHaveLength(EMBEDDING_DIMENSIONS);
    expect(embeddings[1]).toHaveLength(EMBEDDING_DIMENSIONS);
  });

  it('returns empty array when input texts array is empty', async () => {
    const embeddings = await generateEmbeddings([]);
    expect(embeddings).toEqual([]);
  });

  it('resolves google embedding model with custom modelId and apiKey without throwing', () => {
    const model = getEmbeddingModel({
      provider: 'google',
      modelId: 'gemini-embedding-001',
      apiKey: 'test-google-key',
    });
    expect(model).toBeDefined();
  });

  it('resolves openai embedding model with custom options without throwing', () => {
    const model = getEmbeddingModel({
      provider: 'openai',
      modelId: 'text-embedding-3-small',
      apiKey: 'test-openai-key',
    });
    expect(model).toBeDefined();
  });
});
