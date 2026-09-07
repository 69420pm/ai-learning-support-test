import { describe, expect, it } from 'vitest';
import type { MaterialChunk } from '@/lib/db/schema';
import {
  conceptExtractionSchema,
  sanitizeExtractedGraph,
  sliceMaterialChunksIntoBatches,
  slugifyConceptName,
} from './concept-extraction';

describe('Concept Extraction Domain Logic', () => {
  describe('slugifyConceptName', () => {
    it('deterministically slugifies concept names into kebab-case', () => {
      expect(slugifyConceptName('Breadth First Search')).toBe('breadth-first-search');
      expect(slugifyConceptName('Machine Learning (ML)')).toBe('machine-learning-ml');
      expect(slugifyConceptName('  Calculus II - Integration & Series! ')).toBe(
        'calculus-ii-integration-series',
      );
      expect(slugifyConceptName('Feynman Technique')).toBe('feynman-technique');
    });

    it('handles multiple dashes and special punctuation cleanly', () => {
      expect(slugifyConceptName('Object-Oriented --- Programming')).toBe(
        'object-oriented-programming',
      );
      expect(slugifyConceptName('@#$%Hello World***')).toBe('hello-world');
    });
  });

  describe('conceptExtractionSchema', () => {
    it('validates a valid LLM extraction result', () => {
      const payload = {
        concepts: [
          {
            name: 'Linear Algebra',
            pacerCategory: 'conceptual',
            bloomLevel: 2,
            aliases: ['Matrix Algebra'],
          },
          {
            name: 'Matrix Multiplication',
            pacerCategory: 'procedural',
            bloomLevel: 3,
            aliases: [],
          },
        ],
        prerequisites: [
          {
            sourceName: 'Linear Algebra',
            targetName: 'Matrix Multiplication',
            relationshipType: 'prerequisite',
            reasoning: 'Understanding vector spaces is necessary before performing operations',
          },
        ],
      };

      const parsed = conceptExtractionSchema.safeParse(payload);
      expect(parsed.success).toBe(true);
    });

    it('rejects invalid PACER category or Bloom levels', () => {
      const invalidPacer = {
        concepts: [
          {
            name: 'Invalid PACER',
            pacerCategory: 'random_category',
            bloomLevel: 2,
            aliases: [],
          },
        ],
        prerequisites: [],
      };
      expect(conceptExtractionSchema.safeParse(invalidPacer).success).toBe(false);

      const invalidBloom = {
        concepts: [
          {
            name: 'Invalid Bloom',
            pacerCategory: 'conceptual',
            bloomLevel: 7, // Bloom is 1-6
            aliases: [],
          },
        ],
        prerequisites: [],
      };
      expect(conceptExtractionSchema.safeParse(invalidBloom).success).toBe(false);
    });
  });

  describe('sanitizeExtractedGraph', () => {
    it('drops self-loops where sourceName === targetName', () => {
      const raw = {
        concepts: [
          {
            name: 'Recursion',
            pacerCategory: 'conceptual' as const,
            bloomLevel: 3,
            aliases: [],
          },
        ],
        prerequisites: [
          {
            sourceName: 'Recursion',
            targetName: 'Recursion',
            relationshipType: 'prerequisite',
            reasoning: 'Self loop',
          },
          {
            sourceName: 'recursion',
            targetName: 'Recursion',
            relationshipType: 'prerequisite',
            reasoning: 'Case insensitive self loop',
          },
        ],
      };

      const result = sanitizeExtractedGraph(raw);
      expect(result.concepts).toHaveLength(1);
      expect(result.prerequisites).toHaveLength(0);
    });

    it('drops dangling references targeting concepts not in vocabulary/batch', () => {
      const raw = {
        concepts: [
          {
            name: 'Binary Search Tree',
            pacerCategory: 'procedural' as const,
            bloomLevel: 3,
            aliases: [],
          },
        ],
        prerequisites: [
          {
            sourceName: 'Graph Theory', // Not in concepts vocabulary
            targetName: 'Binary Search Tree',
            relationshipType: 'prerequisite',
            reasoning: 'Dangling source',
          },
          {
            sourceName: 'Binary Search Tree',
            targetName: 'Red Black Tree', // Not in concepts vocabulary
            relationshipType: 'prerequisite',
            reasoning: 'Dangling target',
          },
        ],
      };

      const result = sanitizeExtractedGraph(raw);
      expect(result.concepts).toHaveLength(1);
      expect(result.prerequisites).toHaveLength(0);
    });

    it('retains valid prerequisites matching vocabulary and attaches deterministic slugs', () => {
      const raw = {
        concepts: [
          {
            name: 'Linked List',
            pacerCategory: 'conceptual' as const,
            bloomLevel: 2,
            aliases: ['Singly Linked List'],
          },
          {
            name: 'Queue',
            pacerCategory: 'procedural' as const,
            bloomLevel: 3,
            aliases: ['FIFO Queue'],
          },
        ],
        prerequisites: [
          {
            sourceName: 'Linked List',
            targetName: 'Queue',
            relationshipType: 'prerequisite',
            reasoning: 'Queues can be implemented using linked lists',
          },
        ],
      };

      const result = sanitizeExtractedGraph(raw);
      expect(result.concepts).toHaveLength(2);
      expect(result.concepts[0].slug).toBe('linked-list');
      expect(result.concepts[1].slug).toBe('queue');
      expect(result.prerequisites).toHaveLength(1);
      expect(result.prerequisites[0].sourceSlug).toBe('linked-list');
      expect(result.prerequisites[0].targetSlug).toBe('queue');
    });

    it('deduplicates concepts with identical slugs in the same batch', () => {
      const raw = {
        concepts: [
          {
            name: 'Dynamic Programming',
            pacerCategory: 'conceptual' as const,
            bloomLevel: 4,
            aliases: ['DP'],
          },
          {
            name: 'dynamic-programming',
            pacerCategory: 'procedural' as const,
            bloomLevel: 4,
            aliases: ['Memoization'],
          },
        ],
        prerequisites: [],
      };

      const result = sanitizeExtractedGraph(raw);
      expect(result.concepts).toHaveLength(1);
      expect(result.concepts[0].slug).toBe('dynamic-programming');
      expect(result.concepts[0].aliases).toContain('DP');
      expect(result.concepts[0].aliases).toContain('Memoization');
    });
  });

  describe('sliceMaterialChunksIntoBatches', () => {
    function createMockChunk(
      index: number,
      tokens: number,
      content = '',
      pageNumber = 1,
    ): MaterialChunk {
      return {
        id: `chunk-${index}`,
        materialId: 'mat-1',
        projectId: 'proj-1',
        userId: 'user-1',
        chunkIndex: index,
        content: content || `Sample content for chunk ${index}`,
        tokenCount: tokens,
        embedding: null,
        metadata: { pageNumber },
        createdAt: new Date(),
      };
    }

    it('returns a single batch when total tokens is within batch limit (16k - 32k)', () => {
      const chunks = [createMockChunk(0, 500), createMockChunk(1, 1000), createMockChunk(2, 2000)];

      const batches = sliceMaterialChunksIntoBatches(chunks);
      expect(batches).toHaveLength(1);
      expect(batches[0].chunkIndices).toEqual([0, 1, 2]);
      expect(batches[0].tokenCount).toBe(3500);
      expect(batches[0].content).toContain('chunk 0');
      expect(batches[0].content).toContain('chunk 2');
    });

    it('returns empty array when chunks array is empty', () => {
      expect(sliceMaterialChunksIntoBatches([])).toEqual([]);
    });

    it('slices on heading boundaries (#, ##) once minimum batch token threshold is reached', () => {
      // Chunk 0: 10,000 tokens
      // Chunk 1: 7,000 tokens (accumulated = 17,000 tokens >= 16,000 min tokens)
      // Chunk 2: Starts with "## Chapter 2", 5,000 tokens -> should start new batch!
      const chunks = [
        createMockChunk(0, 10000, 'Content part 1'),
        createMockChunk(1, 7000, 'Content part 2'),
        createMockChunk(2, 5000, '## Chapter 2: Advanced Topics\nContent part 3'),
      ];

      const batches = sliceMaterialChunksIntoBatches(chunks, {
        minTokens: 16000,
        maxTokens: 32000,
      });

      expect(batches).toHaveLength(2);
      expect(batches[0].chunkIndices).toEqual([0, 1]);
      expect(batches[0].tokenCount).toBe(17000);
      expect(batches[1].chunkIndices).toEqual([2]);
      expect(batches[1].tokenCount).toBe(5000);
    });

    it('slices on page boundaries when accumulated tokens >= minTokens and page changes', () => {
      const chunks = [
        createMockChunk(0, 10000, 'Page 1 text', 1),
        createMockChunk(1, 6500, 'Page 1 continued', 1),
        createMockChunk(2, 4000, 'Page 2 starting', 2),
      ];

      const batches = sliceMaterialChunksIntoBatches(chunks, {
        minTokens: 16000,
        maxTokens: 32000,
      });

      expect(batches).toHaveLength(2);
      expect(batches[0].chunkIndices).toEqual([0, 1]);
      expect(batches[1].chunkIndices).toEqual([2]);
    });

    it('splits when maxTokens threshold would be exceeded even without natural boundary', () => {
      const chunks = [
        createMockChunk(0, 20000, 'Chunk 0', 1),
        createMockChunk(1, 15000, 'Chunk 1', 1), // 20k + 15k = 35k > 32k maxTokens
      ];

      const batches = sliceMaterialChunksIntoBatches(chunks, {
        minTokens: 16000,
        maxTokens: 32000,
      });

      expect(batches).toHaveLength(2);
      expect(batches[0].chunkIndices).toEqual([0]);
      expect(batches[1].chunkIndices).toEqual([1]);
    });
  });
});
