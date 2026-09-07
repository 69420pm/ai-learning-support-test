import { describe, expect, it } from 'vitest';
import type { MaterialChunk } from '@/lib/db/schema';
import {
  conceptExtractionSchema,
  linkExercisesToKcs,
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

    it('defaults exercises to empty array if omitted', () => {
      const payload = {
        concepts: [
          {
            name: 'Calculus',
            pacerCategory: 'conceptual',
            bloomLevel: 2,
            aliases: [],
          },
        ],
        prerequisites: [],
      };
      const parsed = conceptExtractionSchema.safeParse(payload);
      expect(parsed.success).toBe(true);
      if (parsed.success) {
        expect(parsed.data.exercises).toEqual([]);
      }
    });

    it('validates exercises with proper types, difficulty range, and question types', () => {
      const payload = {
        concepts: [
          {
            name: 'Derivatives',
            pacerCategory: 'conceptual',
            bloomLevel: 3,
            aliases: [],
          },
        ],
        prerequisites: [],
        exercises: [
          {
            pageNumber: 12,
            title: 'Problem 2.4',
            prompt: 'Find the derivative of f(x) = x^2',
            solution: '2x',
            questionType: 'calculation',
            difficulty: 2,
            targetConceptName: 'Derivatives',
          },
          {
            pageNumber: 13,
            questionType: 'multiple_choice',
            targetConceptName: 'Derivatives',
          },
          {
            pageNumber: 14,
            title: 'Problem 2.5',
            prompt: 'Unsolved challenge problem',
            solution: null,
            questionType: 'conceptual',
            difficulty: 4,
            targetConceptName: 'Derivatives',
          },
        ],
      };

      const parsed = conceptExtractionSchema.safeParse(payload);
      expect(parsed.success).toBe(true);
      if (parsed.success) {
        expect(parsed.data.exercises).toHaveLength(3);
        expect(parsed.data.exercises[0].difficulty).toBe(2);
        expect(parsed.data.exercises[1].difficulty).toBe(1); // default difficulty
        expect(parsed.data.exercises[1].solution).toBeUndefined();
        expect(parsed.data.exercises[2].solution).toBeNull();
      }
    });

    it('rejects invalid questionType or out-of-range difficulty in exercises', () => {
      const invalidQuestionType = {
        concepts: [],
        prerequisites: [],
        exercises: [
          {
            pageNumber: 5,
            questionType: 'invalid_type',
            targetConceptName: 'Math',
          },
        ],
      };
      expect(conceptExtractionSchema.safeParse(invalidQuestionType).success).toBe(false);

      const invalidDifficulty = {
        concepts: [],
        prerequisites: [],
        exercises: [
          {
            pageNumber: 5,
            questionType: 'conceptual',
            difficulty: 6, // 1 to 5 only
            targetConceptName: 'Math',
          },
        ],
      };
      expect(conceptExtractionSchema.safeParse(invalidDifficulty).success).toBe(false);
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
    it('sanitizes extracted exercises and slugifies targetConceptName', () => {
      const raw = {
        concepts: [
          {
            name: 'Depth First Search',
            pacerCategory: 'procedural' as const,
            bloomLevel: 3,
            aliases: ['DFS'],
          },
        ],
        prerequisites: [],
        exercises: [
          {
            pageNumber: 15,
            title: '  Problem 4.1  ',
            prompt: ' Trace DFS on the given tree:  ',
            solution: ' A -> B -> C ',
            questionType: 'calculation' as const,
            difficulty: 3,
            targetConceptName: ' Depth First Search ',
          },
        ],
      };

      const result = sanitizeExtractedGraph(raw);
      expect(result.exercises).toHaveLength(1);
      expect(result.exercises[0]).toEqual({
        pageNumber: 15,
        title: 'Problem 4.1',
        prompt: 'Trace DFS on the given tree:',
        solution: 'A -> B -> C',
        questionType: 'calculation',
        difficulty: 3,
        targetConceptName: 'Depth First Search',
        targetConceptSlug: 'depth-first-search',
      });
    });
  });

  describe('linkExercisesToKcs', () => {
    it('links exercises to matching KC from active batch or existing project KCs and maps foreign keys', () => {
      const sanitizedExercises = [
        {
          pageNumber: 5,
          title: 'Ex 1',
          prompt: 'What is a stack?',
          solution: 'LIFO structure',
          questionType: 'conceptual' as const,
          difficulty: 1,
          targetConceptName: 'Stack Data Structure',
          targetConceptSlug: 'stack-data-structure',
        },
        {
          pageNumber: 8,
          title: 'Ex 2',
          prompt: 'Implement DFS',
          solution: undefined,
          questionType: 'code' as const,
          difficulty: 4,
          targetConceptName: 'Depth First Search',
          targetConceptSlug: 'depth-first-search',
        },
      ];

      const availableKcs = [
        { id: 'kc-uuid-1', slug: 'stack-data-structure', name: 'Stack Data Structure' },
        { id: 'kc-uuid-2', slug: 'depth-first-search', name: 'Depth First Search' },
      ];

      const linked = linkExercisesToKcs({
        exercises: sanitizedExercises,
        availableKcs,
        projectId: 'proj-1',
        userId: 'user-1',
        materialId: 'mat-1',
      });

      expect(linked).toHaveLength(2);
      expect(linked[0]).toEqual({
        projectId: 'proj-1',
        userId: 'user-1',
        materialId: 'mat-1',
        kcId: 'kc-uuid-1',
        pageNumber: 5,
        title: 'Ex 1',
        prompt: 'What is a stack?',
        solution: 'LIFO structure',
        questionType: 'conceptual',
        difficulty: 1,
      });
      expect(linked[1]).toEqual({
        projectId: 'proj-1',
        userId: 'user-1',
        materialId: 'mat-1',
        kcId: 'kc-uuid-2',
        pageNumber: 8,
        title: 'Ex 2',
        prompt: 'Implement DFS',
        solution: null,
        questionType: 'code',
        difficulty: 4,
      });
    });

    it('discards dangling exercises where target concept cannot be resolved', () => {
      const sanitizedExercises = [
        {
          pageNumber: 10,
          title: 'Valid Ex',
          prompt: 'Valid prompt',
          questionType: 'multiple_choice' as const,
          difficulty: 2,
          targetConceptName: 'Known Concept',
          targetConceptSlug: 'known-concept',
        },
        {
          pageNumber: 12,
          title: 'Dangling Ex',
          prompt: 'Dangling prompt',
          questionType: 'multiple_choice' as const,
          difficulty: 2,
          targetConceptName: 'Unknown Concept',
          targetConceptSlug: 'unknown-concept',
        },
      ];

      const availableKcs = [{ id: 'kc-uuid-1', slug: 'known-concept', name: 'Known Concept' }];

      const linked = linkExercisesToKcs({
        exercises: sanitizedExercises,
        availableKcs,
        projectId: 'proj-1',
        userId: 'user-1',
        materialId: 'mat-1',
      });

      expect(linked).toHaveLength(1);
      expect(linked[0].title).toBe('Valid Ex');
      expect(linked[0].kcId).toBe('kc-uuid-1');
    });

    it('resolves by case-insensitive name matching if slug does not match exactly', () => {
      const sanitizedExercises = [
        {
          pageNumber: 20,
          title: 'Name Match Ex',
          prompt: 'Solve problem',
          questionType: 'calculation' as const,
          difficulty: 3,
          targetConceptName: 'Dynamic Programming',
          targetConceptSlug: 'dynamic-programming',
        },
      ];

      const availableKcs = [
        {
          id: 'kc-uuid-3',
          slug: 'custom-dp-slug',
          name: 'dynamic programming',
        },
      ];

      const linked = linkExercisesToKcs({
        exercises: sanitizedExercises,
        availableKcs,
        projectId: 'proj-1',
        userId: 'user-1',
        materialId: 'mat-1',
      });

      expect(linked).toHaveLength(1);
      expect(linked[0].kcId).toBe('kc-uuid-3');
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
