import type { PgBoss } from 'pg-boss';
import { beforeEach, describe, expect, it, vi } from 'vitest';
import {
  cleanupMaterialExtractedGraph,
  getActiveProjectConceptNames,
  getKnowledgeComponentsByProjectId,
  insertExercises,
  insertKnowledgeDependencies,
  upsertKnowledgeComponents,
} from '@/lib/db/queries/knowledge';
import {
  getMaterialById,
  getMaterialChunksByMaterialId,
  updateMaterialStatus,
} from '@/lib/db/queries/material';
import { processGraphExtraction, registerConceptGraphExtractWorker } from './graph-extraction';

vi.mock('@/lib/db/queries/material', () => ({
  getMaterialById: vi.fn(),
  getMaterialChunksByMaterialId: vi.fn(),
  updateMaterialStatus: vi.fn(),
}));

vi.mock('@/lib/db/queries/knowledge', () => ({
  upsertKnowledgeComponents: vi.fn(),
  insertKnowledgeDependencies: vi.fn(),
  insertExercises: vi.fn(),
  getKnowledgeComponentsByProjectId: vi.fn(),
  getActiveProjectConceptNames: vi.fn(),
  cleanupMaterialExtractedGraph: vi.fn(),
}));

vi.mock('ai', async (importOriginal) => {
  const actual = await importOriginal<typeof import('ai')>();
  return {
    ...actual,
    generateObject: vi.fn(),
  };
});

type WorkHandler = (jobs: Array<{ id: string; data: unknown }>) => Promise<void>;

function createMockBoss() {
  let capturedHandler: WorkHandler | null = null;
  return {
    work: vi.fn().mockImplementation((_queue: string, handler: WorkHandler) => {
      capturedHandler = handler;
      return Promise.resolve();
    }),
    getHandler: (): WorkHandler => {
      if (!capturedHandler) throw new Error('Handler not registered');
      return capturedHandler;
    },
  };
}

describe('Concept Graph Extraction Worker Job', () => {
  const mockGetMaterialById = vi.mocked(getMaterialById);
  const mockGetMaterialChunks = vi.mocked(getMaterialChunksByMaterialId);
  const mockUpdateMaterialStatus = vi.mocked(updateMaterialStatus);
  const mockUpsertKc = vi.mocked(upsertKnowledgeComponents);
  const mockInsertKd = vi.mocked(insertKnowledgeDependencies);
  const mockInsertExercises = vi.mocked(insertExercises);
  const mockGetKcsByProjectId = vi.mocked(getKnowledgeComponentsByProjectId);
  const mockGetActiveProjectConceptNames = vi.mocked(getActiveProjectConceptNames);
  const mockCleanupMaterialExtractedGraph = vi.mocked(cleanupMaterialExtractedGraph);

  beforeEach(() => {
    vi.clearAllMocks();
    mockGetActiveProjectConceptNames.mockResolvedValue([]);
    mockCleanupMaterialExtractedGraph.mockResolvedValue(undefined);
  });

  it('stitches chunks, extracts concepts/prereqs via generateObject, and updates status to ready', async () => {
    const { generateObject } = await import('ai');
    const mockGenerateObject = vi.mocked(generateObject);

    mockGetMaterialById.mockResolvedValueOnce({
      id: 'mat-1',
      projectId: 'proj-1',
      userId: 'user-1',
      title: 'Operating Systems',
      filename: 'os.md',
      fileType: 'text/markdown',
      fileSize: 100,
      storagePath: 'proj-1/os.md',
      status: 'ready',
      errorMessage: null,
      metadata: {},
      createdAt: new Date(),
      updatedAt: new Date(),
    });

    mockGetMaterialChunks.mockResolvedValueOnce([
      {
        id: 'chunk-1',
        materialId: 'mat-1',
        projectId: 'proj-1',
        userId: 'user-1',
        chunkIndex: 0,
        content: '# Processes and Threads\nA process is an executing program.',
        tokenCount: 50,
        embedding: null,
        metadata: { pageNumber: 1 },
        createdAt: new Date(),
      },
      {
        id: 'chunk-2',
        materialId: 'mat-1',
        projectId: 'proj-1',
        userId: 'user-1',
        chunkIndex: 1,
        content: 'Threads share memory space within a process.',
        tokenCount: 40,
        embedding: null,
        metadata: { pageNumber: 1 },
        createdAt: new Date(),
      },
    ]);

    mockGenerateObject.mockResolvedValueOnce({
      object: {
        concepts: [
          {
            name: 'Process',
            pacerCategory: 'conceptual',
            bloomLevel: 2,
            aliases: ['OS Process'],
          },
          {
            name: 'Thread',
            pacerCategory: 'conceptual',
            bloomLevel: 3,
            aliases: ['Lightweight Process'],
          },
          {
            name: 'Self Loop Test',
            pacerCategory: 'procedural',
            bloomLevel: 2,
            aliases: [],
          },
        ],
        prerequisites: [
          {
            sourceName: 'Process',
            targetName: 'Thread',
            relationshipType: 'prerequisite',
            reasoning: 'Threads exist inside a process',
          },
          {
            sourceName: 'Self Loop Test',
            targetName: 'Self Loop Test',
            relationshipType: 'prerequisite',
            reasoning: 'Self loop to drop',
          },
          {
            sourceName: 'Process',
            targetName: 'Non Existent Concept',
            relationshipType: 'prerequisite',
            reasoning: 'Dangling target to drop',
          },
        ],
      },
    } as never);

    mockUpsertKc.mockResolvedValueOnce([
      {
        id: 'kc-process-id',
        projectId: 'proj-1',
        userId: 'user-1',
        slug: 'process',
        name: 'Process',
        pacerCategory: 'conceptual',
        bloomLevel: 2,
        aliases: ['OS Process'],
        embedding: null,
        sourceMaterialId: 'mat-1',
        status: 'active',
        orderIndex: 0,
        createdAt: new Date(),
        updatedAt: new Date(),
      },
      {
        id: 'kc-thread-id',
        projectId: 'proj-1',
        userId: 'user-1',
        slug: 'thread',
        name: 'Thread',
        pacerCategory: 'conceptual',
        bloomLevel: 3,
        aliases: ['Lightweight Process'],
        embedding: null,
        sourceMaterialId: 'mat-1',
        status: 'active',
        orderIndex: 1,
        createdAt: new Date(),
        updatedAt: new Date(),
      },
      {
        id: 'kc-selfloop-id',
        projectId: 'proj-1',
        userId: 'user-1',
        slug: 'self-loop-test',
        name: 'Self Loop Test',
        pacerCategory: 'procedural',
        bloomLevel: 2,
        aliases: [],
        embedding: null,
        sourceMaterialId: 'mat-1',
        status: 'active',
        orderIndex: 2,
        createdAt: new Date(),
        updatedAt: new Date(),
      },
    ]);

    mockInsertKd.mockResolvedValueOnce([]);

    const result = await processGraphExtraction({
      projectId: 'proj-1',
      userId: 'user-1',
      materialIds: ['mat-1'],
    });

    expect(result.processedCount).toBe(1);
    expect(result.kcCount).toBe(3);

    // Verify status transition: first 'extracting'
    expect(mockUpdateMaterialStatus).toHaveBeenNthCalledWith(
      1,
      expect.objectContaining({
        id: 'mat-1',
        status: 'ready', // Material status preserved!
        metadata: expect.objectContaining({
          graphExtraction: expect.objectContaining({
            status: 'extracting',
          }),
        }),
      }),
    );

    // Verify AI SDK call with strict prompt and schema
    expect(mockGenerateObject).toHaveBeenCalledWith(
      expect.objectContaining({
        prompt: expect.stringContaining('# Processes and Threads'),
      }),
    );

    // Verify KCs upserted with deterministic slugs
    expect(mockUpsertKc).toHaveBeenCalledWith(
      expect.arrayContaining([
        expect.objectContaining({
          slug: 'process',
          name: 'Process',
          sourceMaterialId: 'mat-1',
        }),
        expect.objectContaining({
          slug: 'thread',
          name: 'Thread',
          sourceMaterialId: 'mat-1',
        }),
      ]),
    );

    // Verify KDs inserted with resolved IDs, self-loop and dangling dropped
    expect(mockInsertKd).toHaveBeenCalledWith([
      expect.objectContaining({
        sourceKcId: 'kc-process-id',
        targetKcId: 'kc-thread-id',
        relationshipType: 'prerequisite',
        sourceMaterialId: 'mat-1',
      }),
    ]);

    // Verify final status update to 'ready' with kcCount and completedAt
    expect(mockUpdateMaterialStatus).toHaveBeenLastCalledWith(
      expect.objectContaining({
        id: 'mat-1',
        status: 'ready', // Material status preserved
        metadata: expect.objectContaining({
          graphExtraction: expect.objectContaining({
            status: 'ready',
            kcCount: 3,
            completedAt: expect.any(String),
          }),
        }),
      }),
    );
  });

  it('on failure, updates graphExtraction.status to failed while preserving material.status as ready', async () => {
    const { generateObject } = await import('ai');
    const mockGenerateObject = vi.mocked(generateObject);

    mockGetMaterialById.mockResolvedValueOnce({
      id: 'mat-err',
      projectId: 'proj-1',
      userId: 'user-1',
      title: 'Faulty Doc',
      filename: 'faulty.md',
      fileType: 'text/markdown',
      fileSize: 100,
      storagePath: 'proj-1/faulty.md',
      status: 'ready',
      errorMessage: null,
      metadata: {},
      createdAt: new Date(),
      updatedAt: new Date(),
    });

    mockGetMaterialChunks.mockResolvedValueOnce([
      {
        id: 'c-1',
        materialId: 'mat-err',
        projectId: 'proj-1',
        userId: 'user-1',
        chunkIndex: 0,
        content: 'Faulty content',
        tokenCount: 10,
        embedding: null,
        metadata: {},
        createdAt: new Date(),
      },
    ]);

    mockGenerateObject.mockRejectedValueOnce(new Error('AI rate limit exhausted'));

    await expect(
      processGraphExtraction({
        projectId: 'proj-1',
        userId: 'user-1',
        materialIds: ['mat-err'],
      }),
    ).rejects.toThrow('AI rate limit exhausted');

    // Verify that graphExtraction is marked as failed, but material.status remains 'ready'
    expect(mockUpdateMaterialStatus).toHaveBeenLastCalledWith(
      expect.objectContaining({
        id: 'mat-err',
        status: 'ready',
        metadata: expect.objectContaining({
          graphExtraction: expect.objectContaining({
            status: 'failed',
            error: 'AI rate limit exhausted',
          }),
        }),
      }),
    );
  });

  it('extracts, links, and persists practice exercises anchoring to page numbers and tracks exerciseCount', async () => {
    const { generateObject } = await import('ai');
    const mockGenerateObject = vi.mocked(generateObject);

    mockGetMaterialById.mockResolvedValueOnce({
      id: 'mat-exercises',
      projectId: 'proj-1',
      userId: 'user-1',
      title: 'Math Course',
      filename: 'math.pdf',
      fileType: 'application/pdf',
      fileSize: 200,
      storagePath: 'proj-1/math.pdf',
      status: 'ready',
      errorMessage: null,
      metadata: {},
      createdAt: new Date(),
      updatedAt: new Date(),
    });

    mockGetMaterialChunks.mockResolvedValueOnce([
      {
        id: 'chunk-1',
        materialId: 'mat-exercises',
        projectId: 'proj-1',
        userId: 'user-1',
        chunkIndex: 0,
        content: '# Chapter 1: Limits and Derivatives\nProblem 1.1: Calculate limit.',
        tokenCount: 50,
        embedding: null,
        metadata: { pageNumber: 4 },
        createdAt: new Date(),
      },
    ]);

    mockGenerateObject.mockResolvedValueOnce({
      object: {
        concepts: [
          {
            name: 'Derivatives',
            pacerCategory: 'conceptual',
            bloomLevel: 2,
            aliases: [],
          },
        ],
        prerequisites: [],
        exercises: [
          {
            pageNumber: 4,
            title: 'Problem 1.1',
            prompt: 'Compute limit as x -> 0 of sin(x)/x',
            solution: '1',
            questionType: 'calculation',
            difficulty: 2,
            targetConceptName: 'Limits', // matches existing project KC
          },
          {
            pageNumber: 5,
            title: 'Problem 1.2',
            prompt: 'Explain derivative definition',
            solution: undefined,
            questionType: 'conceptual',
            difficulty: 3,
            targetConceptName: 'Derivatives', // matches active batch KC
          },
          {
            pageNumber: 5,
            title: 'Problem 1.3',
            prompt: 'Dangling problem',
            solution: undefined,
            questionType: 'multiple_choice',
            difficulty: 1,
            targetConceptName: 'Unresolved Concept', // dangling, should be discarded
          },
        ],
      },
    } as never);

    mockUpsertKc.mockResolvedValueOnce([
      {
        id: 'kc-derivatives',
        projectId: 'proj-1',
        userId: 'user-1',
        slug: 'derivatives',
        name: 'Derivatives',
        pacerCategory: 'conceptual',
        bloomLevel: 2,
        aliases: [],
        embedding: null,
        sourceMaterialId: 'mat-exercises',
        status: 'active',
        orderIndex: 0,
        createdAt: new Date(),
        updatedAt: new Date(),
      },
    ]);

    mockGetKcsByProjectId.mockResolvedValueOnce([
      {
        id: 'kc-limits',
        projectId: 'proj-1',
        userId: 'user-1',
        slug: 'limits',
        name: 'Limits',
        pacerCategory: 'conceptual',
        bloomLevel: 2,
        aliases: [],
        embedding: null,
        sourceMaterialId: null,
        status: 'active',
        orderIndex: 0,
        createdAt: new Date(),
        updatedAt: new Date(),
      },
    ]);

    mockInsertKd.mockResolvedValueOnce([]);
    mockInsertExercises.mockResolvedValueOnce([
      {
        id: 'ex-1',
        projectId: 'proj-1',
        userId: 'user-1',
        materialId: 'mat-exercises',
        kcId: 'kc-limits',
        pageNumber: 4,
        title: 'Problem 1.1',
        prompt: 'Compute limit as x -> 0 of sin(x)/x',
        solution: '1',
        questionType: 'calculation',
        difficulty: 2,
        createdAt: new Date(),
      },
      {
        id: 'ex-2',
        projectId: 'proj-1',
        userId: 'user-1',
        materialId: 'mat-exercises',
        kcId: 'kc-derivatives',
        pageNumber: 5,
        title: 'Problem 1.2',
        prompt: 'Explain derivative definition',
        solution: null,
        questionType: 'conceptual',
        difficulty: 3,
        createdAt: new Date(),
      },
    ]);

    const result = await processGraphExtraction({
      projectId: 'proj-1',
      userId: 'user-1',
      materialIds: ['mat-exercises'],
    });

    expect(result.processedCount).toBe(1);
    expect(result.kcCount).toBe(1);
    expect(result.exerciseCount).toBe(2);

    // Verify insertExercises was called with resolved KCs, anchored pageNumbers, and discarded dangling
    expect(mockInsertExercises).toHaveBeenCalledWith([
      expect.objectContaining({
        projectId: 'proj-1',
        userId: 'user-1',
        materialId: 'mat-exercises',
        kcId: 'kc-limits',
        pageNumber: 4,
        title: 'Problem 1.1',
        prompt: 'Compute limit as x -> 0 of sin(x)/x',
        solution: '1',
        questionType: 'calculation',
        difficulty: 2,
      }),
      expect.objectContaining({
        projectId: 'proj-1',
        userId: 'user-1',
        materialId: 'mat-exercises',
        kcId: 'kc-derivatives',
        pageNumber: 5,
        title: 'Problem 1.2',
        prompt: 'Explain derivative definition',
        solution: null,
        questionType: 'conceptual',
        difficulty: 3,
      }),
    ]);

    // Verify material status update tracks exerciseCount alongside kcCount
    expect(mockUpdateMaterialStatus).toHaveBeenLastCalledWith(
      expect.objectContaining({
        id: 'mat-exercises',
        metadata: expect.objectContaining({
          graphExtraction: expect.objectContaining({
            status: 'ready',
            kcCount: 1,
            exerciseCount: 2,
          }),
        }),
      }),
    );
  });

  it('registerConceptGraphExtractWorker registers worker on concept-graph-extract queue', async () => {
    const mockBoss = createMockBoss();

    await registerConceptGraphExtractWorker(mockBoss as unknown as PgBoss);

    expect(mockBoss.work).toHaveBeenCalledWith('concept-graph-extract', expect.any(Function));
  });

  it('atomically cleans up exercises and material-attributed dependencies before inserting fresh batches on re-extraction', async () => {
    const { generateObject } = await import('ai');
    const mockGenerateObject = vi.mocked(generateObject);

    mockGetMaterialById.mockResolvedValueOnce({
      id: 'mat-reextract',
      projectId: 'proj-1',
      userId: 'user-1',
      title: 'Operating Systems Re-extract',
      filename: 'os.md',
      fileType: 'text/markdown',
      fileSize: 100,
      storagePath: 'proj-1/os.md',
      status: 'ready',
      errorMessage: null,
      metadata: {},
      createdAt: new Date(),
      updatedAt: new Date(),
    });

    mockGetMaterialChunks.mockResolvedValueOnce([
      {
        id: 'chunk-1',
        materialId: 'mat-reextract',
        projectId: 'proj-1',
        userId: 'user-1',
        chunkIndex: 0,
        content: 'Processes and Threads',
        tokenCount: 50,
        embedding: null,
        metadata: { pageNumber: 1 },
        createdAt: new Date(),
      },
    ]);

    mockGenerateObject.mockResolvedValueOnce({
      object: {
        concepts: [{ name: 'Process', pacerCategory: 'conceptual', bloomLevel: 2, aliases: [] }],
        prerequisites: [],
        exercises: [],
      },
    } as never);

    mockUpsertKc.mockResolvedValueOnce([]);

    await processGraphExtraction({
      projectId: 'proj-1',
      userId: 'user-1',
      materialIds: ['mat-reextract'],
    });

    // Verify cleanup was invoked before generating object / inserting new records
    expect(mockCleanupMaterialExtractedGraph).toHaveBeenCalledTimes(1);
    expect(mockCleanupMaterialExtractedGraph).toHaveBeenCalledWith({
      materialId: 'mat-reextract',
      projectId: 'proj-1',
    });
  });

  it('injects up to 500 existing active project concepts into extraction prompt for vocabulary grounding', async () => {
    const { generateObject } = await import('ai');
    const mockGenerateObject = vi.mocked(generateObject);

    mockGetMaterialById.mockResolvedValueOnce({
      id: 'mat-vocab',
      projectId: 'proj-1',
      userId: 'user-1',
      title: 'Graph Algorithms',
      filename: 'graphs.md',
      fileType: 'text/markdown',
      fileSize: 100,
      storagePath: 'proj-1/graphs.md',
      status: 'ready',
      errorMessage: null,
      metadata: {},
      createdAt: new Date(),
      updatedAt: new Date(),
    });

    mockGetMaterialChunks.mockResolvedValueOnce([
      {
        id: 'chunk-1',
        materialId: 'mat-vocab',
        projectId: 'proj-1',
        userId: 'user-1',
        chunkIndex: 0,
        content: 'Graph traversal algorithms.',
        tokenCount: 20,
        embedding: null,
        metadata: { pageNumber: 1 },
        createdAt: new Date(),
      },
    ]);

    mockGetActiveProjectConceptNames.mockResolvedValueOnce([
      'Depth First Search',
      'Breadth First Search',
      'Graph',
    ]);

    mockGenerateObject.mockResolvedValueOnce({
      object: {
        concepts: [
          { name: 'Graph Traversal', pacerCategory: 'conceptual', bloomLevel: 2, aliases: [] },
        ],
        prerequisites: [],
        exercises: [],
      },
    } as never);

    mockUpsertKc.mockResolvedValueOnce([]);

    await processGraphExtraction({
      projectId: 'proj-1',
      userId: 'user-1',
      materialIds: ['mat-vocab'],
    });

    expect(mockGetActiveProjectConceptNames).toHaveBeenCalledWith({
      projectId: 'proj-1',
      limit: 500,
    });

    expect(mockGenerateObject).toHaveBeenCalledWith(
      expect.objectContaining({
        prompt: expect.stringMatching(
          /Depth First Search[\s\S]*Breadth First Search[\s\S]*Reuse existing concept names whenever the text discusses a concept already in the vocabulary\. Only create a new concept name if the concept is genuinely distinct\./,
        ),
      }),
    );
  });

  it('processes multiple materials sequentially so downstream materials ground against concepts extracted from earlier materials', async () => {
    const { generateObject } = await import('ai');
    const mockGenerateObject = vi.mocked(generateObject);

    const callOrder: string[] = [];

    mockGetMaterialById.mockImplementation(({ id }: { id: string }) => {
      callOrder.push(`getMaterialById:${id}`);
      return Promise.resolve({
        id,
        projectId: 'proj-1',
        userId: 'user-1',
        title: `Doc ${id}`,
        filename: `${id}.md`,
        fileType: 'text/markdown',
        fileSize: 100,
        storagePath: `proj-1/${id}.md`,
        status: 'ready',
        errorMessage: null,
        metadata: {},
        createdAt: new Date(),
        updatedAt: new Date(),
      });
    });

    mockGetMaterialChunks.mockImplementation(({ materialId }: { materialId: string }) => {
      callOrder.push(`getChunks:${materialId}`);
      return Promise.resolve([
        {
          id: `chunk-${materialId}`,
          materialId,
          projectId: 'proj-1',
          userId: 'user-1',
          chunkIndex: 0,
          content: `Content for ${materialId}`,
          tokenCount: 20,
          embedding: null,
          metadata: { pageNumber: 1 },
          createdAt: new Date(),
        },
      ]);
    });

    mockCleanupMaterialExtractedGraph.mockImplementation(
      ({ materialId }: { materialId: string }) => {
        callOrder.push(`cleanup:${materialId}`);
        return Promise.resolve();
      },
    );

    // Material 1 extraction finds 'Linear Search'
    // Material 2 should see 'Linear Search' in vocabulary
    mockGetActiveProjectConceptNames
      .mockResolvedValueOnce([]) // for mat-1
      .mockResolvedValueOnce(['Linear Search']); // for mat-2 (reflects mat-1 concepts)

    mockGenerateObject
      .mockImplementationOnce(() => {
        callOrder.push('generateObject:mat-1');
        return Promise.resolve({
          object: {
            concepts: [
              { name: 'Linear Search', pacerCategory: 'procedural', bloomLevel: 2, aliases: [] },
            ],
            prerequisites: [],
            exercises: [],
          },
        } as never);
      })
      .mockImplementationOnce(() => {
        callOrder.push('generateObject:mat-2');
        return Promise.resolve({
          object: {
            concepts: [
              { name: 'Binary Search', pacerCategory: 'procedural', bloomLevel: 3, aliases: [] },
            ],
            prerequisites: [],
            exercises: [],
          },
        } as never);
      });

    mockUpsertKc.mockImplementation((kcs) => {
      callOrder.push(`upsertKc:${kcs[0]?.name}`);
      return Promise.resolve([
        {
          id: `kc-${kcs[0]?.slug}`,
          projectId: 'proj-1',
          userId: 'user-1',
          slug: kcs[0]?.slug ?? '',
          name: kcs[0]?.name ?? '',
          pacerCategory: 'procedural',
          bloomLevel: 2,
          aliases: [],
          embedding: null,
          sourceMaterialId: 'mat-1',
          status: 'active',
          orderIndex: 0,
          createdAt: new Date(),
          updatedAt: new Date(),
        },
      ]);
    });

    const result = await processGraphExtraction({
      projectId: 'proj-1',
      userId: 'user-1',
      materialIds: ['mat-1', 'mat-2'],
    });

    expect(result.processedCount).toBe(2);

    // Verify sequential execution order
    expect(callOrder).toEqual([
      'getMaterialById:mat-1',
      'cleanup:mat-1',
      'getChunks:mat-1',
      'generateObject:mat-1',
      'upsertKc:Linear Search',
      'getMaterialById:mat-2',
      'cleanup:mat-2',
      'getChunks:mat-2',
      'generateObject:mat-2',
      'upsertKc:Binary Search',
    ]);

    // Verify mat-2's prompt included Linear Search
    expect(mockGenerateObject).toHaveBeenNthCalledWith(
      2,
      expect.objectContaining({
        prompt: expect.stringContaining('Linear Search'),
      }),
    );
  });
});
