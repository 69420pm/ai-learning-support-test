import { describe, expect, it } from 'vitest';
import { EMBEDDING_DIMENSIONS, generateEmbeddings, getEmbeddingModel } from './embedding';

describe('Embedding Module', () => {
  it('returns an embedding model with 768 dimensions', () => {
    const model = getEmbeddingModel();
    expect(model).toBeDefined();
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
});
