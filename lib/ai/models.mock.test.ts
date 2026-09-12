import { embed, generateObject, generateText, streamText } from 'ai';
import { describe, expect, it } from 'vitest';
import { z } from 'zod';
import { createMockEmbeddingModel, createMockLanguageModel } from './models.mock';

describe('Deterministic AI Mock Boundaries', () => {
  describe('createMockLanguageModel', () => {
    it('generates text deterministically with default response', async () => {
      const model = createMockLanguageModel();
      const result = await generateText({
        model,
        prompt: 'Explain quicksort',
      });

      expect(result.text).toBeDefined();
      expect(typeof result.text).toBe('string');
      expect(result.text.length).toBeGreaterThan(0);
    });

    it('generates custom text response when configured', async () => {
      const model = createMockLanguageModel({
        textResponse: 'Custom deterministic answer',
      });
      const result = await generateText({
        model,
        prompt: 'Any query',
      });

      expect(result.text).toBe('Custom deterministic answer');
    });

    it('streams text chunks deterministically', async () => {
      const model = createMockLanguageModel({
        textChunks: ['Chunk 1', ' and ', 'Chunk 2'],
      });
      const stream = streamText({
        model,
        prompt: 'Stream test',
      });

      let fullText = '';
      for await (const chunk of stream.textStream) {
        fullText += chunk;
      }

      expect(fullText).toBe('Chunk 1 and Chunk 2');
    });

    it('generates structured objects matching zod schema deterministically', async () => {
      const mockConceptData = {
        concepts: [
          {
            name: 'Linear Algebra',
            slug: 'linear-algebra',
            pacerCategory: 'Conceptual',
            bloomLevel: 3,
            description: 'Study of linear equations and matrices',
            summary: 'Core math foundation',
          },
        ],
        dependencies: [],
        exercises: [],
      };

      const model = createMockLanguageModel({
        objectResponse: mockConceptData,
      });

      const schema = z.object({
        concepts: z.array(
          z.object({
            name: z.string(),
            slug: z.string(),
            pacerCategory: z.string(),
            bloomLevel: z.number(),
            description: z.string(),
            summary: z.string(),
          }),
        ),
        dependencies: z.array(z.unknown()),
        exercises: z.array(z.unknown()),
      });

      const result = await generateObject({
        model,
        schema,
        prompt: 'Extract concepts from syllabus',
      });

      expect(result.object).toEqual(mockConceptData);
    });

    it('supports generating tool calls deterministically', async () => {
      const model = createMockLanguageModel({
        toolCalls: [
          {
            toolCallId: 'call-1',
            toolName: 'searchProjectMaterials',
            args: { query: 'quantum computing' },
          },
        ],
      });

      const { tool } = await import('ai');
      const result = await generateText({
        model,
        prompt: 'Search materials for quantum computing',
        tools: {
          searchProjectMaterials: tool({
            description: 'Search materials',
            inputSchema: z.object({ query: z.string() }),
            execute: async ({ query }) => ({ query, results: [] }),
          }),
        },
      });

      expect(result.toolCalls).toHaveLength(1);
      expect(result.toolCalls[0].toolName).toBe('searchProjectMaterials');
      expect(result.toolCalls[0].input).toEqual({ query: 'quantum computing' });
    });

    it('simulates model error when error option is specified', async () => {
      const model = createMockLanguageModel({
        simulateError: new Error('Rate limit exceeded: 429'),
      });

      await expect(
        generateText({
          model,
          prompt: 'Should fail',
        }),
      ).rejects.toThrow('Rate limit exceeded: 429');
    });
  });

  describe('createMockEmbeddingModel', () => {
    it('generates deterministic 768-dimensional embeddings', async () => {
      const model = createMockEmbeddingModel();
      const result = await embed({
        model,
        value: 'Test chunk text for embedding',
      });

      expect(result.embedding).toHaveLength(768);
      expect(typeof result.embedding[0]).toBe('number');
      // Deterministic: same text yields identical embedding
      const result2 = await embed({
        model,
        value: 'Test chunk text for embedding',
      });
      expect(result.embedding).toEqual(result2.embedding);
    });

    it('simulates embedding error when error option is specified', async () => {
      const model = createMockEmbeddingModel({
        simulateError: new Error('Embedding provider unreachable'),
      });

      await expect(
        embed({
          model,
          value: 'Fail embedding',
        }),
      ).rejects.toThrow('Embedding provider unreachable');
    });
  });
});
