import { generateText } from 'ai';
import { beforeEach, describe, expect, it, vi } from 'vitest';
import { createTools } from '@/lib/ai/tools';
import { getReadyToLearnFrontier } from '@/lib/db/queries/knowledge';
import { ingestMaterial } from '@/lib/materials/ingestion';
import { retrieveMaterials } from '@/lib/materials/retrieval';
import { processGraphExtraction } from '@/lib/queue/jobs/graph-extraction';
import type { StorageDriver } from '@/lib/storage';
import {
  createChatQuestionAnsweringMockAI,
  createConceptExtractionMockAI,
  createErrorMockAI,
  createMockEmbeddingModel,
  createMockLanguageModel,
  resetMockAIOverrides,
} from '@/tests/helpers/mock-ai';

// Module-level mocks for database layer to maintain fast, deterministic, offline execution
const mockUpdateMaterialStatus = vi.fn();
const mockInsertMaterialChunks = vi.fn();
const mockSearchMaterialChunks = vi.fn();
const mockGetMaterialChunksByMaterialId = vi.fn();
const mockGetActiveProjectConceptNames = vi.fn();
const mockGetMaterialById = vi.fn();
const mockUpsertKnowledgeComponents = vi.fn();
const mockInsertKnowledgeDependencies = vi.fn();
const mockInsertGroundedExercises = vi.fn();
const mockCleanupMaterialExtractedGraph = vi.fn();
const mockDbExecute = vi.fn();

vi.mock('@/lib/db/queries/material', () => ({
  updateMaterialStatus: (...args: unknown[]) => mockUpdateMaterialStatus(...args),
  insertMaterialChunks: (...args: unknown[]) => mockInsertMaterialChunks(...args),
  searchMaterialChunks: (...args: unknown[]) => mockSearchMaterialChunks(...args),
  getMaterialChunksByMaterialId: (...args: unknown[]) => mockGetMaterialChunksByMaterialId(...args),
  getMaterialById: (...args: unknown[]) => mockGetMaterialById(...args),
}));

const mockGetKnowledgeComponentsByProjectId = vi.fn();

vi.mock('@/lib/db/queries/knowledge', async () => {
  const actual = await vi.importActual<typeof import('@/lib/db/queries/knowledge')>(
    '@/lib/db/queries/knowledge',
  );
  return {
    ...actual,
    getActiveProjectConceptNames: (...args: unknown[]) => mockGetActiveProjectConceptNames(...args),
    getKnowledgeComponentsByProjectId: (...args: unknown[]) =>
      mockGetKnowledgeComponentsByProjectId(...args),
    upsertKnowledgeComponents: (...args: unknown[]) => mockUpsertKnowledgeComponents(...args),
    insertKnowledgeDependencies: (...args: unknown[]) => mockInsertKnowledgeDependencies(...args),
    insertExercises: (...args: unknown[]) => mockInsertGroundedExercises(...args),
    cleanupMaterialExtractedGraph: (...args: unknown[]) =>
      mockCleanupMaterialExtractedGraph(...args),
  };
});

vi.mock('@/lib/db', () => ({
  db: {
    execute: (...args: unknown[]) => mockDbExecute(...args),
  },
}));

describe('High-Level Regression Safety Net Harness', () => {
  const mockUserId = 'usr-11111111-1111-4111-a111-111111111111';
  const mockProjectId = 'prj-22222222-2222-4222-a222-222222222222';
  const mockMaterialId = 'mat-33333333-3333-4333-a333-333333333333';

  beforeEach(() => {
    vi.clearAllMocks();
    resetMockAIOverrides();
    mockUpdateMaterialStatus.mockResolvedValue({ id: mockMaterialId });
    mockInsertMaterialChunks.mockResolvedValue([]);
    mockCleanupMaterialExtractedGraph.mockResolvedValue(undefined);
  });

  // =========================================================================
  // WORKFLOW A: Document Ingestion Pipeline & Error Boundaries
  // =========================================================================
  describe('Workflow A: Document Ingestion Pipeline', () => {
    const createMockStorageDriver = (content: string | Buffer): StorageDriver => ({
      download: vi
        .fn()
        .mockResolvedValue(Buffer.isBuffer(content) ? content : Buffer.from(content, 'utf-8')),
      upload: vi.fn(),
      delete: vi.fn(),
    });

    it('successfully ingests markdown material through chunking, embedding, and persistence', async () => {
      const docMarkdown = [
        '# Introduction to Computational Neuroscience',
        'Computational neuroscience uses mathematical models and theoretical abstractions of the brain.',
        '',
        '## Hodgkin-Huxley Model',
        'The Hodgkin-Huxley model describes how action potentials in neurons are initiated and propagated.',
        'It consists of four non-linear differential equations governing membrane potential and ion channels.',
        '',
        '## Synaptic Plasticity',
        'Synaptic plasticity is the biological process by which specific patterns of synaptic activity result in changes in synaptic strength.',
      ].join('\n');

      const storageDriver = createMockStorageDriver(docMarkdown);
      const reportedStages: string[] = [];

      const result = await ingestMaterial(
        {
          materialId: mockMaterialId,
          projectId: mockProjectId,
          userId: mockUserId,
          storagePath: `projects/${mockProjectId}/neuroscience.md`,
          fileType: 'text/markdown',
        },
        {
          storageDriver,
          onProgress: (progress) => {
            reportedStages.push(progress.stage);
          },
        },
      );

      // Verify pipeline stage progression
      expect(reportedStages).toContain('downloading');
      expect(reportedStages).toContain('chunking');
      expect(reportedStages).toContain('embedding');
      expect(reportedStages).toContain('persisting');
      expect(reportedStages).toContain('completed');

      // Verify chunking & embedding results
      expect(result.pageCount).toBe(1);
      expect(result.chunkCount).toBeGreaterThanOrEqual(1);
      expect(result.tokenCount).toBeGreaterThan(0);

      // Verify DB persistence seam
      expect(mockInsertMaterialChunks).toHaveBeenCalledTimes(1);
      const insertedChunks = mockInsertMaterialChunks.mock.calls[0][0];
      expect(insertedChunks).toHaveLength(result.chunkCount);
      expect(insertedChunks[0].embedding).toHaveLength(768);
      expect(insertedChunks[0].projectId).toBe(mockProjectId);
      expect(insertedChunks[0].userId).toBe(mockUserId);

      // Verify terminal status transition to ready
      expect(mockUpdateMaterialStatus).toHaveBeenCalledWith(
        expect.objectContaining({
          id: mockMaterialId,
          status: 'ready',
          metadata: expect.objectContaining({
            chunkCount: result.chunkCount,
            pageCount: 1,
            progress: expect.objectContaining({ stage: 'completed', stagePercent: 100 }),
          }),
        }),
      );
    });

    it('handles empty document gracefully with zero chunks and completed status', async () => {
      const storageDriver = createMockStorageDriver('');

      const result = await ingestMaterial(
        {
          materialId: mockMaterialId,
          projectId: mockProjectId,
          userId: mockUserId,
          storagePath: `projects/${mockProjectId}/empty.md`,
          fileType: 'text/markdown',
        },
        { storageDriver },
      );

      expect(result.chunkCount).toBe(0);
      expect(mockInsertMaterialChunks).not.toHaveBeenCalled();
      expect(mockUpdateMaterialStatus).toHaveBeenCalledWith(
        expect.objectContaining({
          id: mockMaterialId,
          status: 'ready',
          metadata: expect.objectContaining({ chunkCount: 0 }),
        }),
      );
    });

    it('captures storage download failure and transitions material to failed status', async () => {
      const failingStorageDriver: StorageDriver = {
        download: vi
          .fn()
          .mockRejectedValue(new Error('Object storage bucket connection timed out')),
        upload: vi.fn(),
        delete: vi.fn(),
      };

      await expect(
        ingestMaterial(
          {
            materialId: mockMaterialId,
            projectId: mockProjectId,
            userId: mockUserId,
            storagePath: 'invalid/path.pdf',
            fileType: 'application/pdf',
          },
          { storageDriver: failingStorageDriver },
        ),
      ).rejects.toThrow('Object storage bucket connection timed out');

      expect(mockUpdateMaterialStatus).toHaveBeenCalledWith(
        expect.objectContaining({
          id: mockMaterialId,
          status: 'failed',
          errorMessage: 'Object storage bucket connection timed out',
          metadata: expect.objectContaining({
            error: expect.objectContaining({
              stage: 'downloading',
              message: 'Object storage bucket connection timed out',
            }),
          }),
        }),
      );
    });
    it('captures embedding generation failure and transitions material to failed status', async () => {
      const storageDriver = createMockStorageDriver(
        '# Machine Learning Chunks\nSome text content to embed.',
      );
      const { setMockEmbeddingModel } = await import('@/lib/ai/embedding');
      setMockEmbeddingModel(
        createMockEmbeddingModel({ simulateError: new Error('Embedding quota exhausted') }),
      );

      await expect(
        ingestMaterial(
          {
            materialId: mockMaterialId,
            projectId: mockProjectId,
            userId: mockUserId,
            storagePath: 'projects/ml/notes.md',
            fileType: 'text/markdown',
          },
          { storageDriver },
        ),
      ).rejects.toThrow('Embedding quota exhausted');

      expect(mockUpdateMaterialStatus).toHaveBeenCalledWith(
        expect.objectContaining({
          id: mockMaterialId,
          status: 'failed',
          metadata: expect.objectContaining({
            error: expect.objectContaining({
              stage: 'embedding',
              message: 'Embedding quota exhausted',
            }),
          }),
        }),
      );
    });
  });

  // =========================================================================
  // WORKFLOW B: Concept Graph Extraction & Learning Plan Synthesis
  // =========================================================================
  describe('Workflow B: Concept Graph Extraction & Prerequisite DAG Synthesis', () => {
    it('extracts concepts, persists prerequisite dependencies and grounded exercises', async () => {
      mockGetMaterialById.mockResolvedValue({
        id: mockMaterialId,
        projectId: mockProjectId,
        userId: mockUserId,
        title: 'Linear Algebra Lecture Notes',
        status: 'ready',
        metadata: {},
      });

      mockGetMaterialChunksByMaterialId.mockResolvedValue([
        {
          id: 'chk-1',
          materialId: mockMaterialId,
          projectId: mockProjectId,
          chunkIndex: 0,
          content:
            'Vector spaces form the mathematical basis of linear transformations and eigenvalues.',
          tokenCount: 15,
        },
      ]);

      mockGetActiveProjectConceptNames.mockResolvedValue([]);
      mockUpsertKnowledgeComponents.mockResolvedValue([
        { id: 'kc-1', slug: 'vector-spaces', name: 'Vector Spaces' },
        { id: 'kc-2', slug: 'linear-transformations', name: 'Linear Transformations' },
        { id: 'kc-3', slug: 'eigenvalues-and-eigenvectors', name: 'Eigenvalues and Eigenvectors' },
      ]);
      mockGetKnowledgeComponentsByProjectId.mockResolvedValue([
        { id: 'kc-1', slug: 'vector-spaces', name: 'Vector Spaces' },
        { id: 'kc-2', slug: 'linear-transformations', name: 'Linear Transformations' },
        { id: 'kc-3', slug: 'eigenvalues-and-eigenvectors', name: 'Eigenvalues and Eigenvectors' },
      ]);
      mockInsertKnowledgeDependencies.mockResolvedValue([]);
      mockInsertGroundedExercises.mockResolvedValue([{ id: 'ex-1', prompt: 'Axioms check' }]);

      const mockModel = createConceptExtractionMockAI();

      const result = await processGraphExtraction(
        {
          projectId: mockProjectId,
          userId: mockUserId,
          materialIds: [mockMaterialId],
        },
        { model: mockModel },
      );

      expect(result.processedCount).toBe(1);
      expect(result.kcCount).toBe(3);
      expect(result.exerciseCount).toBe(1);

      // Verify knowledge component persistence
      expect(mockUpsertKnowledgeComponents).toHaveBeenCalledWith(
        expect.arrayContaining([
          expect.objectContaining({
            projectId: mockProjectId,
            name: 'Vector Spaces',
            slug: 'vector-spaces',
            pacerCategory: 'conceptual',
          }),
        ]),
      );

      // Verify dependency insertion
      expect(mockInsertKnowledgeDependencies).toHaveBeenCalledWith(
        expect.arrayContaining([
          expect.objectContaining({
            projectId: mockProjectId,
            sourceKcId: 'kc-1',
            targetKcId: 'kc-2',
            relationshipType: 'prerequisite',
          }),
        ]),
      );

      // Verify grounded exercise persistence
      expect(mockInsertGroundedExercises).toHaveBeenCalledWith(
        expect.arrayContaining([
          expect.objectContaining({
            kcId: 'kc-1',
            projectId: mockProjectId,
            questionType: 'conceptual',
          }),
        ]),
      );
    });

    it('verifies acyclic prerequisite DAG structure and detects cyclic dependencies', async () => {
      const { computeGraphDiagnostics } = await import('@/lib/learning/graph-diagnostics');

      // Valid linear DAG: kc-1 (Vector Spaces) -> kc-2 (Linear Transformations) -> kc-3 (Eigenvalues)
      const validNodes = [
        { id: 'kc-1', pacerCategory: 'conceptual', bloomLevel: 3 },
        { id: 'kc-2', pacerCategory: 'procedural', bloomLevel: 4 },
        { id: 'kc-3', pacerCategory: 'conceptual', bloomLevel: 4 },
      ];
      const validEdges = [
        { id: 'e1', sourceKcId: 'kc-1', targetKcId: 'kc-2' },
        { id: 'e2', sourceKcId: 'kc-2', targetKcId: 'kc-3' },
      ];

      const validDiag = computeGraphDiagnostics(validNodes, validEdges);
      expect(validDiag.hasCycles).toBe(false);
      expect(validDiag.cyclePaths).toHaveLength(0);
      expect(validDiag.orphanCount).toBe(0);

      // Introduce a feedback cycle: kc-3 -> kc-1 (creates kc-1 -> kc-2 -> kc-3 -> kc-1 cycle)
      const cyclicEdges = [...validEdges, { id: 'e3', sourceKcId: 'kc-3', targetKcId: 'kc-1' }];

      const cyclicDiag = computeGraphDiagnostics(validNodes, cyclicEdges);
      expect(cyclicDiag.hasCycles).toBe(true);
      expect(cyclicDiag.cyclePaths.length).toBeGreaterThanOrEqual(1);
    });

    it('exercises domain ready-to-learn frontier calculation across mastery progression', async () => {
      // 1. Initial state (0 mastered): Only root concept Vector Spaces is ready to learn
      mockDbExecute.mockResolvedValueOnce([
        {
          id: 'kc-1',
          projectId: mockProjectId,
          name: 'Vector Spaces',
          status: 'active',
          orderIndex: 0,
        },
      ]);
      const initialFrontier = await getReadyToLearnFrontier(mockProjectId, []);
      expect(initialFrontier).toHaveLength(1);
      expect(initialFrontier[0].name).toBe('Vector Spaces');

      // 2. Mastered kc-1: Vector Spaces unblocks Linear Transformations
      mockDbExecute.mockResolvedValueOnce([
        {
          id: 'kc-2',
          projectId: mockProjectId,
          name: 'Linear Transformations',
          status: 'active',
          orderIndex: 1,
        },
      ]);
      const nextFrontier = await getReadyToLearnFrontier(mockProjectId, ['kc-1']);
      expect(nextFrontier).toHaveLength(1);
      expect(nextFrontier[0].name).toBe('Linear Transformations');

      // 3. Mastered kc-1 and kc-2: Unblocks Eigenvalues
      mockDbExecute.mockResolvedValueOnce([
        {
          id: 'kc-3',
          projectId: mockProjectId,
          name: 'Eigenvalues',
          status: 'active',
          orderIndex: 2,
        },
      ]);
      const advancedFrontier = await getReadyToLearnFrontier(mockProjectId, ['kc-1', 'kc-2']);
      expect(advancedFrontier).toHaveLength(1);
      expect(advancedFrontier[0].name).toBe('Eigenvalues');

      // 4. All mastered: Frontier is empty (mastery complete)
      mockDbExecute.mockResolvedValueOnce([]);
      const completedFrontier = await getReadyToLearnFrontier(mockProjectId, [
        'kc-1',
        'kc-2',
        'kc-3',
      ]);
      expect(completedFrontier).toEqual([]);
    });

    it('handles material with 0 chunks without extraction failure', async () => {
      mockGetMaterialById.mockResolvedValue({
        id: mockMaterialId,
        projectId: mockProjectId,
        userId: mockUserId,
        status: 'ready',
        metadata: {},
      });
      mockGetMaterialChunksByMaterialId.mockResolvedValue([]);

      const result = await processGraphExtraction({
        projectId: mockProjectId,
        userId: mockUserId,
        materialIds: [mockMaterialId],
      });

      expect(result.kcCount).toBe(0);
      expect(result.exerciseCount).toBe(0);
      expect(mockUpsertKnowledgeComponents).not.toHaveBeenCalled();
    });

    it('records failure metadata when extraction model fails on final attempt', async () => {
      mockGetMaterialById.mockResolvedValue({
        id: mockMaterialId,
        projectId: mockProjectId,
        userId: mockUserId,
        status: 'ready',
        metadata: {},
      });
      mockGetMaterialChunksByMaterialId.mockResolvedValue([
        { id: 'chk-1', materialId: mockMaterialId, content: 'Some math' },
      ]);

      const failingModel = createErrorMockAI('rate-limit');

      await expect(
        processGraphExtraction(
          {
            projectId: mockProjectId,
            userId: mockUserId,
            materialIds: [mockMaterialId],
          },
          { model: failingModel, isFinalAttempt: true },
        ),
      ).rejects.toThrow(/Too Many Requests/);

      expect(mockUpdateMaterialStatus).toHaveBeenCalledWith(
        expect.objectContaining({
          id: mockMaterialId,
          metadata: expect.objectContaining({
            graphExtraction: expect.objectContaining({
              status: 'failed',
              error: expect.stringContaining('Too Many Requests'),
            }),
          }),
        }),
      );
    });
  });

  // =========================================================================
  // WORKFLOW C: Question Answering & Retrieval Chat Workflow
  // =========================================================================
  describe('Workflow C: Question Answering & Retrieval Chat Workflow', () => {
    it('executes vector retrieval and character budget ranking for grounded queries', async () => {
      mockSearchMaterialChunks.mockResolvedValue([
        {
          id: 'chk-101',
          materialId: mockMaterialId,
          projectId: mockProjectId,
          materialTitle: 'Linear Algebra Notes',
          filename: 'linear_algebra.pdf',
          fileType: 'application/pdf',
          chunkIndex: 0,
          similarity: 0.9234,
          content: 'An eigenvalue lambda satisfies Av = lambda v for non-zero eigenvector v.',
          metadata: { pageNumber: 4 },
        },
        {
          id: 'chk-102',
          materialId: mockMaterialId,
          projectId: mockProjectId,
          materialTitle: 'Linear Algebra Notes',
          filename: 'linear_algebra.pdf',
          fileType: 'application/pdf',
          chunkIndex: 1,
          similarity: 0.8123,
          content: 'Diagonalization of matrix A requires finding an invertible matrix P.',
          metadata: { pageNumber: 5 },
        },
      ]);

      const searchResult = await retrieveMaterials({
        projectId: mockProjectId,
        query: 'What is an eigenvalue?',
        limit: 5,
        maxOutputChars: 500,
      });

      expect(searchResult.results).toHaveLength(2);
      expect(searchResult.results[0].materialTitle).toBe('Linear Algebra Notes');
      expect(searchResult.results[0].pageNumber).toBe(4);
      expect(searchResult.results[0].similarity).toBe(0.9234);
      expect(searchResult.results[0].content).toContain('eigenvalue lambda');
    });

    it('returns empty results for empty or whitespace query without executing vector search', async () => {
      const result = await retrieveMaterials({
        projectId: mockProjectId,
        query: '    ',
      });

      expect(result.results).toEqual([]);
      expect(result.totalResults).toBe(0);
      expect(mockSearchMaterialChunks).not.toHaveBeenCalled();
    });

    function createMockDataStream(): {
      dataStream: { write: (part: unknown) => void };
      streamedParts: unknown[];
    } {
      const streamedParts: unknown[] = [];
      return {
        streamedParts,
        dataStream: {
          write: (part: unknown) => {
            streamedParts.push(part);
          },
        },
      };
    }

    it('integrates searchProjectMaterials tool with dataStream status reporting', async () => {
      mockSearchMaterialChunks.mockResolvedValue([
        {
          id: 'chk-201',
          materialId: mockMaterialId,
          projectId: mockProjectId,
          materialTitle: 'Physics Notes',
          filename: 'physics.md',
          fileType: 'text/markdown',
          chunkIndex: 0,
          similarity: 0.89,
          content: 'Quantum entanglement is a physical phenomenon.',
          metadata: { pageNumber: 1 },
        },
      ]);

      const { dataStream, streamedParts } = createMockDataStream();

      const tools = createTools({
        projectId: mockProjectId,
        userId: mockUserId,
        dataStream,
      });

      const searchTool = tools.searchProjectMaterials;
      const toolResult = await searchTool.execute(
        { query: 'quantum entanglement' },
        { toolCallId: 'call-1', messages: [], context: {} as never },
      );

      // Verify tool status events streamed to UI
      expect(streamedParts).toEqual(
        expect.arrayContaining([
          {
            type: 'data-tool-status',
            data: {
              tool: 'searchProjectMaterials',
              status: 'searching',
              query: 'quantum entanglement',
            },
          },
          {
            type: 'data-tool-status',
            data: {
              tool: 'searchProjectMaterials',
              status: 'completed',
              query: 'quantum entanglement',
              resultCount: 1,
            },
          },
        ]),
      );

      expect('results' in toolResult).toBe(true);
      if ('results' in toolResult) {
        expect(toolResult.results).toHaveLength(1);
      }
    });

    it('executes end-to-end question answering journey with tool-based retrieval and LLM grounded synthesis', async () => {
      const groundedAnswer =
        'According to the uploaded physics notes, quantum entanglement is a physical phenomenon where pairs of particles interact.';
      const chatMockModel = createChatQuestionAnsweringMockAI({
        toolCallQuery: 'quantum entanglement',
        answerText: groundedAnswer,
      });

      mockSearchMaterialChunks.mockResolvedValue([
        {
          id: 'chk-qa-1',
          materialId: mockMaterialId,
          projectId: mockProjectId,
          materialTitle: 'Physics Notes',
          filename: 'physics.md',
          fileType: 'text/markdown',
          chunkIndex: 0,
          similarity: 0.94,
          content:
            'Quantum entanglement is a physical phenomenon where pairs of particles interact.',
          metadata: { pageNumber: 1 },
        },
      ]);

      const { dataStream, streamedParts } = createMockDataStream();
      const tools = createTools({
        projectId: mockProjectId,
        userId: mockUserId,
        dataStream,
      });

      // 1. LLM initiates retrieval tool call based on user query
      const toolCallResponse = await generateText({
        model: chatMockModel,
        prompt: 'Explain quantum entanglement based on the uploaded notes.',
      });
      expect(toolCallResponse.toolCalls).toHaveLength(1);
      expect(toolCallResponse.toolCalls[0].toolName).toBe('searchProjectMaterials');

      // 2. Tool execution retrieves materials and streams status events to UI
      const toolResult = await tools.searchProjectMaterials.execute(
        { query: 'quantum entanglement' },
        { toolCallId: 'call-qa-1', messages: [], context: {} as never },
      );
      expect('results' in toolResult).toBe(true);
      expect(streamedParts).toContainEqual(
        expect.objectContaining({
          type: 'data-tool-status',
          data: expect.objectContaining({
            tool: 'searchProjectMaterials',
            status: 'completed',
          }),
        }),
      );

      // 3. LLM synthesizes final grounded answer incorporating retrieved context
      const synthesisModel = createMockLanguageModel({
        textResponse: groundedAnswer,
      });
      const answerResponse = await generateText({
        model: synthesisModel,
        prompt: 'Synthesize answer with retrieved materials.',
      });

      expect(answerResponse.text).toContain('quantum entanglement');
    });

    it('gracefully handles missing project context in material search tool', async () => {
      const { dataStream } = createMockDataStream();

      const tools = createTools({
        projectId: undefined,
        dataStream,
      });

      const toolResult = await tools.searchProjectMaterials.execute(
        { query: 'anything' },
        { toolCallId: 'call-2', messages: [], context: {} as never },
      );

      expect('error' in toolResult).toBe(true);
      if ('error' in toolResult) {
        expect(toolResult.error).toContain('No project context available');
      }
    });

    it('captures retrieval failure and reports error status without crashing data stream', async () => {
      mockSearchMaterialChunks.mockRejectedValue(new Error('Vector index connection lost'));

      const { dataStream, streamedParts } = createMockDataStream();

      const tools = createTools({
        projectId: mockProjectId,
        userId: mockUserId,
        dataStream,
      });

      const toolResult = await tools.searchProjectMaterials.execute(
        { query: 'error simulation' },
        { toolCallId: 'call-err', messages: [], context: {} as never },
      );

      expect('error' in toolResult).toBe(true);
      if ('error' in toolResult) {
        expect(toolResult.error).toContain('Vector index connection lost');
      }

      expect(streamedParts).toContainEqual({
        type: 'data-tool-status',
        data: {
          tool: 'searchProjectMaterials',
          status: 'error',
          query: 'error simulation',
          error: 'Vector index connection lost',
        },
      });
    });
  });
});
