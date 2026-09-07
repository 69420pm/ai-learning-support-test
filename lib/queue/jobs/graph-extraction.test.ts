import type { PgBoss } from 'pg-boss';
import { beforeEach, describe, expect, it, vi } from 'vitest';
import { insertKnowledgeDependencies, upsertKnowledgeComponents } from '@/lib/db/queries/knowledge';
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

  beforeEach(() => {
    vi.clearAllMocks();
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

  it('registerConceptGraphExtractWorker registers worker on concept-graph-extract queue', async () => {
    const mockBoss = createMockBoss();

    await registerConceptGraphExtractWorker(mockBoss as unknown as PgBoss);

    expect(mockBoss.work).toHaveBeenCalledWith('concept-graph-extract', expect.any(Function));
  });
});
