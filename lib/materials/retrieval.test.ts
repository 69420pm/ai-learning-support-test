import { beforeEach, describe, expect, it, vi } from 'vitest';
import { generateEmbeddings } from '@/lib/ai/embedding';
import { type MaterialChunkSearchResult, searchMaterialChunks } from '@/lib/db/queries/material';
import {
  DEFAULT_MAX_OUTPUT_CHARS,
  type RetrieveMaterialsOptions,
  retrieveMaterials,
} from './retrieval';

vi.mock('@/lib/ai/embedding', () => ({
  generateEmbeddings: vi.fn(),
}));

vi.mock('@/lib/db/queries/material', () => ({
  searchMaterialChunks: vi.fn(),
}));

const mockGenerateEmbeddings = vi.mocked(generateEmbeddings);
const mockSearchMaterialChunks = vi.mocked(searchMaterialChunks);

describe('Deep Material Retrieval Pipeline (lib/materials/retrieval)', () => {
  const sampleEmbedding = [0.1, 0.2, 0.3, 0.4];

  const sampleDbChunks: MaterialChunkSearchResult[] = [
    {
      id: 'chunk-1',
      materialId: 'mat-1',
      projectId: 'proj-1',
      materialTitle: 'Lecture 1: Quantum Physics',
      filename: 'lecture1.pdf',
      fileType: 'application/pdf',
      chunkIndex: 0,
      content: 'Quantum physics is the study of matter and energy at the most fundamental level.',
      similarity: 0.8912345,
      metadata: { pageNumber: 1 },
    },
    {
      id: 'chunk-2',
      materialId: 'mat-1',
      projectId: 'proj-1',
      materialTitle: 'Lecture 1: Quantum Physics',
      filename: 'lecture1.pdf',
      fileType: 'application/pdf',
      chunkIndex: 1,
      content: 'Wave-particle duality posits that all particles exhibit wave-like behavior.',
      similarity: 0.7654321,
      metadata: { pageNumber: 2 },
    },
    {
      id: 'chunk-3',
      materialId: 'mat-2',
      projectId: 'proj-1',
      materialTitle: 'Lecture 2: Superposition',
      filename: 'lecture2.pdf',
      fileType: 'application/pdf',
      chunkIndex: 2,
      content:
        'Superposition principle states that linear combinations of solutions are solutions.',
      similarity: 0.6543219,
      metadata: {}, // No pageNumber in metadata -> should fallback to chunkIndex + 1 = 3
    },
  ];

  beforeEach(() => {
    vi.clearAllMocks();
  });

  describe('Core text query to chunk retrieval', () => {
    it('generates query embeddings, searches vector store, and formats result chunks', async () => {
      mockGenerateEmbeddings.mockResolvedValueOnce([sampleEmbedding]);
      mockSearchMaterialChunks.mockResolvedValueOnce(sampleDbChunks);

      const result = await retrieveMaterials({
        projectId: 'proj-1',
        query: 'What is quantum superposition?',
      });

      expect(mockGenerateEmbeddings).toHaveBeenCalledTimes(1);
      expect(mockGenerateEmbeddings).toHaveBeenCalledWith(
        ['What is quantum superposition?'],
        undefined,
      );

      expect(mockSearchMaterialChunks).toHaveBeenCalledTimes(1);
      expect(mockSearchMaterialChunks).toHaveBeenCalledWith({
        projectId: 'proj-1',
        embedding: sampleEmbedding,
        limit: undefined,
        threshold: undefined,
      });

      expect(result.query).toBe('What is quantum superposition?');
      expect(result.totalResults).toBe(3);
      expect(result.results).toHaveLength(3);

      expect(result.results[0]).toEqual({
        id: 'chunk-1',
        materialId: 'mat-1',
        projectId: 'proj-1',
        materialTitle: 'Lecture 1: Quantum Physics',
        filename: 'lecture1.pdf',
        fileType: 'application/pdf',
        pageNumber: 1,
        chunkIndex: 0,
        similarity: 0.8912,
        content: 'Quantum physics is the study of matter and energy at the most fundamental level.',
      });

      expect(result.results[1]).toEqual({
        id: 'chunk-2',
        materialId: 'mat-1',
        projectId: 'proj-1',
        materialTitle: 'Lecture 1: Quantum Physics',
        filename: 'lecture1.pdf',
        fileType: 'application/pdf',
        pageNumber: 2,
        chunkIndex: 1,
        similarity: 0.7654,
        content: 'Wave-particle duality posits that all particles exhibit wave-like behavior.',
      });

      // chunk-3 fallback to chunkIndex + 1 (2 + 1 = 3)
      expect(result.results[2]).toEqual({
        id: 'chunk-3',
        materialId: 'mat-2',
        projectId: 'proj-1',
        materialTitle: 'Lecture 2: Superposition',
        filename: 'lecture2.pdf',
        fileType: 'application/pdf',
        pageNumber: 3,
        chunkIndex: 2,
        similarity: 0.6543,
        content:
          'Superposition principle states that linear combinations of solutions are solutions.',
      });
    });
  });

  describe('Page number formatting & metadata fallback', () => {
    it('uses metadata.pageNumber when available as positive number', async () => {
      mockGenerateEmbeddings.mockResolvedValueOnce([sampleEmbedding]);
      mockSearchMaterialChunks.mockResolvedValueOnce([
        {
          ...sampleDbChunks[0],
          chunkIndex: 5,
          metadata: { pageNumber: 42 },
        },
      ]);

      const result = await retrieveMaterials({
        projectId: 'proj-1',
        query: 'test',
      });

      expect(result.results[0].pageNumber).toBe(42);
    });

    it('falls back to chunkIndex + 1 when metadata has invalid or no page number', async () => {
      mockGenerateEmbeddings.mockResolvedValueOnce([sampleEmbedding]);
      mockSearchMaterialChunks.mockResolvedValueOnce([
        {
          ...sampleDbChunks[0],
          chunkIndex: 0,
          metadata: { pageNumber: 0 }, // 0 is not a positive page
        },
        {
          ...sampleDbChunks[1],
          chunkIndex: 3,
          metadata: null as unknown as Record<string, unknown>,
        },
      ]);

      const result = await retrieveMaterials({
        projectId: 'proj-1',
        query: 'test',
      });

      expect(result.results[0].pageNumber).toBe(1); // 0 + 1
      expect(result.results[1].pageNumber).toBe(4); // 3 + 1
    });
  });

  describe('Vector similarity threshold and limit passthrough', () => {
    it('passes explicit limit and threshold parameters to searchMaterialChunks', async () => {
      mockGenerateEmbeddings.mockResolvedValueOnce([sampleEmbedding]);
      mockSearchMaterialChunks.mockResolvedValueOnce([]);

      const options: RetrieveMaterialsOptions = {
        projectId: 'proj-1',
        query: 'quantum mechanics',
        limit: 10,
        threshold: 0.65,
      };

      await retrieveMaterials(options);

      expect(mockSearchMaterialChunks).toHaveBeenCalledWith({
        projectId: 'proj-1',
        embedding: sampleEmbedding,
        limit: 10,
        threshold: 0.65,
      });
    });
  });

  describe('Output character budget capping and whole-chunk preservation/truncation', () => {
    it('preserves all whole chunks when total characters are within budget', async () => {
      mockGenerateEmbeddings.mockResolvedValueOnce([sampleEmbedding]);
      mockSearchMaterialChunks.mockResolvedValueOnce(sampleDbChunks);

      const totalChars = sampleDbChunks.reduce((acc, c) => acc + c.content.length, 0);

      const result = await retrieveMaterials({
        projectId: 'proj-1',
        query: 'quantum',
        maxOutputChars: totalChars + 100,
      });

      expect(result.results).toHaveLength(3);
      expect(result.totalResults).toBe(3);
      expect(result.results[0].content).toBe(sampleDbChunks[0].content);
      expect(result.results[1].content).toBe(sampleDbChunks[1].content);
      expect(result.results[2].content).toBe(sampleDbChunks[2].content);
    });

    it('truncates the chunk that partially exceeds the remaining budget and retains total matched count', async () => {
      mockGenerateEmbeddings.mockResolvedValueOnce([sampleEmbedding]);
      mockSearchMaterialChunks.mockResolvedValueOnce(sampleDbChunks);

      const chunk1Len = sampleDbChunks[0].content.length; // 80 chars
      // Allow chunk1 fully + 20 chars of chunk2
      const budget = chunk1Len + 20;

      const result = await retrieveMaterials({
        projectId: 'proj-1',
        query: 'quantum',
        maxOutputChars: budget,
      });

      expect(result.results).toHaveLength(2);
      expect(result.results[0].content).toBe(sampleDbChunks[0].content);
      expect(result.results[1].content).toBe(sampleDbChunks[1].content.slice(0, 20));
      // totalResults reflects the 3 matching chunks found in DB
      expect(result.totalResults).toBe(3);

      const finalTotalChars = result.results.reduce((acc, c) => acc + c.content.length, 0);
      expect(finalTotalChars).toBe(budget);
    });

    it('drops subsequent chunks entirely when budget is exactly reached by preceding chunks', async () => {
      mockGenerateEmbeddings.mockResolvedValueOnce([sampleEmbedding]);
      mockSearchMaterialChunks.mockResolvedValueOnce(sampleDbChunks);

      const chunk1Len = sampleDbChunks[0].content.length;

      const result = await retrieveMaterials({
        projectId: 'proj-1',
        query: 'quantum',
        maxOutputChars: chunk1Len,
      });

      expect(result.results).toHaveLength(1);
      expect(result.results[0].content).toBe(sampleDbChunks[0].content);
      expect(result.totalResults).toBe(3);
    });

    it('returns empty results when maxOutputChars is explicitly 0', async () => {
      mockGenerateEmbeddings.mockResolvedValueOnce([sampleEmbedding]);
      mockSearchMaterialChunks.mockResolvedValueOnce(sampleDbChunks);

      const result = await retrieveMaterials({
        projectId: 'proj-1',
        query: 'quantum',
        maxOutputChars: 0,
      });

      expect(result.results).toHaveLength(0);
      expect(result.totalResults).toBe(3);
    });

    it('uses DEFAULT_MAX_OUTPUT_CHARS (8000) when maxOutputChars is not provided', async () => {
      mockGenerateEmbeddings.mockResolvedValueOnce([sampleEmbedding]);
      mockSearchMaterialChunks.mockResolvedValueOnce(sampleDbChunks);

      expect(DEFAULT_MAX_OUTPUT_CHARS).toBe(8000);

      const result = await retrieveMaterials({
        projectId: 'proj-1',
        query: 'quantum',
      });

      expect(result.results).toHaveLength(3);
      expect(result.totalResults).toBe(3);
    });
  });

  describe('BYOK credential passthrough', () => {
    it('passes BYOK embedding options to generateEmbeddings', async () => {
      mockGenerateEmbeddings.mockResolvedValueOnce([sampleEmbedding]);
      mockSearchMaterialChunks.mockResolvedValueOnce([]);

      const embeddingOptions = {
        apiKey: 'sk-custom-byok-key',
        provider: 'openai' as const,
        modelId: 'text-embedding-3-large',
      };

      await retrieveMaterials({
        projectId: 'proj-1',
        query: 'search query',
        embeddingOptions,
      });

      expect(mockGenerateEmbeddings).toHaveBeenCalledWith(['search query'], embeddingOptions);
    });
  });

  describe('Empty query or empty results handling', () => {
    it('returns empty results immediately for empty query without calling embedding or db', async () => {
      const result = await retrieveMaterials({
        projectId: 'proj-1',
        query: '',
      });

      expect(result).toEqual({
        query: '',
        results: [],
        totalResults: 0,
      });
      expect(mockGenerateEmbeddings).not.toHaveBeenCalled();
      expect(mockSearchMaterialChunks).not.toHaveBeenCalled();
    });

    it('returns empty results immediately for whitespace query without calling embedding or db', async () => {
      const result = await retrieveMaterials({
        projectId: 'proj-1',
        query: '   \n\t  ',
      });

      expect(result).toEqual({
        query: '   \n\t  ',
        results: [],
        totalResults: 0,
      });
      expect(mockGenerateEmbeddings).not.toHaveBeenCalled();
      expect(mockSearchMaterialChunks).not.toHaveBeenCalled();
    });

    it('returns empty results immediately for empty projectId', async () => {
      const result = await retrieveMaterials({
        projectId: '',
        query: 'some query',
      });

      expect(result).toEqual({
        query: 'some query',
        results: [],
        totalResults: 0,
      });
      expect(mockGenerateEmbeddings).not.toHaveBeenCalled();
      expect(mockSearchMaterialChunks).not.toHaveBeenCalled();
    });

    it('returns empty results when searchMaterialChunks finds no matching chunks', async () => {
      mockGenerateEmbeddings.mockResolvedValueOnce([sampleEmbedding]);
      mockSearchMaterialChunks.mockResolvedValueOnce([]);

      const result = await retrieveMaterials({
        projectId: 'proj-1',
        query: 'unmatched query',
      });

      expect(result).toEqual({
        query: 'unmatched query',
        results: [],
        totalResults: 0,
      });
    });

    it('handles empty embeddings returned from generateEmbeddings', async () => {
      mockGenerateEmbeddings.mockResolvedValueOnce([]);

      const result = await retrieveMaterials({
        projectId: 'proj-1',
        query: 'query with empty embedding return',
      });

      expect(result).toEqual({
        query: 'query with empty embedding return',
        results: [],
        totalResults: 0,
      });
      expect(mockSearchMaterialChunks).not.toHaveBeenCalled();
    });
  });

  describe('Error propagation / edge cases', () => {
    it('propagates embedding generation errors', async () => {
      mockGenerateEmbeddings.mockRejectedValueOnce(new Error('Embedding API quota exceeded'));

      await expect(
        retrieveMaterials({
          projectId: 'proj-1',
          query: 'failing query',
        }),
      ).rejects.toThrow('Embedding API quota exceeded');
    });

    it('propagates database vector search errors', async () => {
      mockGenerateEmbeddings.mockResolvedValueOnce([sampleEmbedding]);
      mockSearchMaterialChunks.mockRejectedValueOnce(new Error('PostgreSQL vector lookup timeout'));

      await expect(
        retrieveMaterials({
          projectId: 'proj-1',
          query: 'failing db search',
        }),
      ).rejects.toThrow('PostgreSQL vector lookup timeout');
    });
  });
});
