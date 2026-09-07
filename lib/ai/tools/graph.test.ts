import { beforeEach, describe, expect, it, vi } from 'vitest';
import type { DataStreamWriter } from '@/lib/ai/tools';
import {
  createGraphNeighborhoodTool,
  createPrerequisiteChainTool,
  type GraphNeighborhoodToolResult,
  getGraphNeighborhoodTool,
  getPrerequisiteChainTool,
  type PrerequisiteChainToolResult,
} from './graph';

const mockGetGraphNeighborhood = vi.fn();
const mockGetPrerequisiteChain = vi.fn();

vi.mock('@/lib/db/queries/knowledge', () => ({
  getGraphNeighborhood: (...args: unknown[]) => mockGetGraphNeighborhood(...args),
  getPrerequisiteChain: (...args: unknown[]) => mockGetPrerequisiteChain(...args),
}));

function countApproximateTokens(text: string): number {
  return text.trim().split(/\s+/).length;
}

describe('Dual-Output Graph AI Tools (lib/ai/tools/graph.ts)', () => {
  beforeEach(() => {
    vi.clearAllMocks();
  });

  describe('createGraphNeighborhoodTool / getGraphNeighborhoodTool', () => {
    it('aliases getGraphNeighborhoodTool to createGraphNeighborhoodTool', () => {
      expect(getGraphNeighborhoodTool).toBe(createGraphNeighborhoodTool);
    });

    it('creates tool with appropriate description and input schema', () => {
      const toolInstance = createGraphNeighborhoodTool({
        projectId: 'proj-1',
        userId: 'user-1',
      });

      expect(toolInstance.description).toMatch(/neighborhood|prerequisites/i);
      expect(toolInstance.inputSchema).toBeDefined();
    });

    it('executes tool returning Dual-Output Projection: terse summary (<= 15 tokens) and structured payload', async () => {
      const mockDataStream: DataStreamWriter = { write: vi.fn() };
      const centralConcept = {
        id: 'kc-1',
        projectId: 'proj-1',
        slug: 'binary-search',
        name: 'Binary Search',
      };
      const prereqs = [
        { id: 'kc-p1', name: 'Arrays', depth: 1, relationshipType: 'prerequisite' },
        { id: 'kc-p2', name: 'Divide and Conquer', depth: 1, relationshipType: 'prerequisite' },
      ];
      const unlocked = [
        { id: 'kc-u1', name: 'Binary Search Tree', depth: 1, relationshipType: 'prerequisite' },
      ];

      mockGetGraphNeighborhood.mockResolvedValueOnce({
        concept: centralConcept,
        prerequisites: prereqs,
        unlocked,
        depth: 1,
      });

      const toolInstance = createGraphNeighborhoodTool({
        projectId: 'proj-1',
        userId: 'user-1',
        dataStream: mockDataStream,
      });

      const result = (await toolInstance.execute(
        { kcId: 'kc-1', depth: 1 },
        { toolCallId: 'tc-1', messages: [], context: {} },
      )) as GraphNeighborhoodToolResult;

      // 1. Dual-Output Projection: Terse text summary <= 15 tokens
      expect(result.summary).toBe('[OK: 2 prerequisites, 1 unlocked]');
      expect(result.text).toBe('[OK: 2 prerequisites, 1 unlocked]');
      expect(result.content).toBe('[OK: 2 prerequisites, 1 unlocked]');
      expect(result.toString()).toBe('[OK: 2 prerequisites, 1 unlocked]');
      expect(countApproximateTokens(result.summary)).toBeLessThanOrEqual(15);
      expect(
        toolInstance.toModelOutput?.({
          toolCallId: 'tc-1',
          input: { kcId: 'kc-1', depth: 1 },
          output: result,
        }),
      ).toEqual({
        type: 'text',
        value: '[OK: 2 prerequisites, 1 unlocked]',
      });
      expect(toolInstance.experimental_toToolResultContent?.(result)).toEqual([
        { type: 'text', text: '[OK: 2 prerequisites, 1 unlocked]' },
      ]);

      // 2. Dual-Output Projection: Rich structured JSON payload for client consumers
      expect(result.payload).toEqual({
        concept: centralConcept,
        prerequisites: prereqs,
        unlocked,
        depth: 1,
      });
      expect(result.prerequisites).toEqual(prereqs);
      expect(result.unlocked).toEqual(unlocked);
      expect(result.concept).toEqual(centralConcept);

      // 3. Streaming status events
      expect(mockDataStream.write).toHaveBeenCalledWith({
        type: 'data-tool-status',
        data: {
          tool: 'getGraphNeighborhood',
          status: 'searching',
          kcId: 'kc-1',
          depth: 1,
        },
      });
      expect(mockDataStream.write).toHaveBeenCalledWith({
        type: 'data-tool-status',
        data: {
          tool: 'getGraphNeighborhood',
          status: 'completed',
          kcId: 'kc-1',
          depth: 1,
          prerequisitesCount: 2,
          unlockedCount: 1,
        },
      });
    });

    it('handles concept not found gracefully with terse summary <= 15 tokens', async () => {
      mockGetGraphNeighborhood.mockResolvedValueOnce({
        concept: null,
        prerequisites: [],
        unlocked: [],
        depth: 1,
      });

      const toolInstance = createGraphNeighborhoodTool({
        projectId: 'proj-1',
        userId: 'user-1',
      });

      const result = (await toolInstance.execute(
        { kcId: 'unknown-id' },
        { toolCallId: 'tc-2', messages: [], context: {} },
      )) as GraphNeighborhoodToolResult;

      expect(result.summary).toBe('[Error: Concept not found]');
      expect(countApproximateTokens(result.summary)).toBeLessThanOrEqual(15);
      expect(result.concept).toBeNull();
      expect(result.prerequisites).toEqual([]);
      expect(result.unlocked).toEqual([]);
    });

    it('handles missing projectId gracefully without calling DB query', async () => {
      const toolInstance = createGraphNeighborhoodTool({
        userId: 'user-1',
      });

      const result = (await toolInstance.execute(
        { kcId: 'kc-1' },
        { toolCallId: 'tc-3', messages: [], context: {} },
      )) as GraphNeighborhoodToolResult;

      expect(result.summary).toBe('[Error: No project context]');
      expect(countApproximateTokens(result.summary)).toBeLessThanOrEqual(15);
      expect(mockGetGraphNeighborhood).not.toHaveBeenCalled();
    });

    it('handles DB error gracefully and emits error status event', async () => {
      const mockDataStream: DataStreamWriter = { write: vi.fn() };
      mockGetGraphNeighborhood.mockRejectedValueOnce(new Error('Database query failure'));

      const toolInstance = createGraphNeighborhoodTool({
        projectId: 'proj-1',
        dataStream: mockDataStream,
      });

      const result = (await toolInstance.execute(
        { kcId: 'kc-1' },
        { toolCallId: 'tc-4', messages: [], context: {} },
      )) as GraphNeighborhoodToolResult;

      expect(result.summary).toBe('[Error: Database query failure]');
      expect(countApproximateTokens(result.summary)).toBeLessThanOrEqual(15);
      expect(mockDataStream.write).toHaveBeenCalledWith({
        type: 'data-tool-status',
        data: {
          tool: 'getGraphNeighborhood',
          status: 'error',
          kcId: 'kc-1',
          error: 'Database query failure',
        },
      });
    });
  });

  describe('createPrerequisiteChainTool / getPrerequisiteChainTool', () => {
    it('aliases getPrerequisiteChainTool to createPrerequisiteChainTool', () => {
      expect(getPrerequisiteChainTool).toBe(createPrerequisiteChainTool);
    });

    it('creates tool with appropriate description and input schema', () => {
      const toolInstance = createPrerequisiteChainTool({
        projectId: 'proj-1',
        userId: 'user-1',
      });

      expect(toolInstance.description).toMatch(/prerequisite|ancestor|chain/i);
      expect(toolInstance.inputSchema).toBeDefined();
    });

    it('executes tool returning Dual-Output Projection: terse summary (<= 15 tokens) and structured payload', async () => {
      const mockDataStream: DataStreamWriter = { write: vi.fn() };
      const chainNodes = [
        {
          id: 'kc-bfs',
          name: 'Breadth-First Search',
          slug: 'bfs',
          depth: 1,
          relationshipType: 'prerequisite',
        },
        {
          id: 'kc-graphs',
          name: 'Graphs',
          slug: 'graphs',
          depth: 2,
          relationshipType: 'prerequisite',
        },
      ];

      mockGetPrerequisiteChain.mockResolvedValueOnce(chainNodes);

      const toolInstance = createPrerequisiteChainTool({
        projectId: 'proj-1',
        userId: 'user-1',
        dataStream: mockDataStream,
      });

      const result = (await toolInstance.execute(
        { kcId: 'kc-dijkstra', maxDepth: 10 },
        { toolCallId: 'tc-5', messages: [], context: {} },
      )) as PrerequisiteChainToolResult;

      // 1. Dual-Output Projection: Terse text summary <= 15 tokens
      expect(result.summary).toBe('[OK: 2 prerequisite ancestors]');
      expect(result.text).toBe('[OK: 2 prerequisite ancestors]');
      expect(result.content).toBe('[OK: 2 prerequisite ancestors]');
      expect(result.toString()).toBe('[OK: 2 prerequisite ancestors]');
      expect(countApproximateTokens(result.summary)).toBeLessThanOrEqual(15);
      expect(
        toolInstance.toModelOutput?.({
          toolCallId: 'tc-5',
          input: { kcId: 'kc-dijkstra', maxDepth: 10 },
          output: result,
        }),
      ).toEqual({
        type: 'text',
        value: '[OK: 2 prerequisite ancestors]',
      });
      expect(toolInstance.experimental_toToolResultContent?.(result)).toEqual([
        { type: 'text', text: '[OK: 2 prerequisite ancestors]' },
      ]);

      // 2. Dual-Output Projection: Rich structured JSON payload for client consumers
      expect(result.payload).toEqual({
        kcId: 'kc-dijkstra',
        chain: chainNodes,
        ancestors: chainNodes,
        depth: 2,
        count: 2,
      });
      expect(result.chain).toEqual(chainNodes);
      expect(result.ancestors).toEqual(chainNodes);

      // 3. Streaming status events
      expect(mockDataStream.write).toHaveBeenCalledWith({
        type: 'data-tool-status',
        data: {
          tool: 'getPrerequisiteChain',
          status: 'searching',
          kcId: 'kc-dijkstra',
          maxDepth: 10,
        },
      });
      expect(mockDataStream.write).toHaveBeenCalledWith({
        type: 'data-tool-status',
        data: {
          tool: 'getPrerequisiteChain',
          status: 'completed',
          kcId: 'kc-dijkstra',
          ancestorsCount: 2,
        },
      });
    });

    it('handles empty chain (no prerequisites) gracefully with terse summary <= 15 tokens', async () => {
      mockGetPrerequisiteChain.mockResolvedValueOnce([]);

      const toolInstance = createPrerequisiteChainTool({
        projectId: 'proj-1',
      });

      const result = (await toolInstance.execute(
        { kcId: 'kc-root' },
        { toolCallId: 'tc-6', messages: [], context: {} },
      )) as PrerequisiteChainToolResult;

      expect(result.summary).toBe('[OK: 0 prerequisite ancestors]');
      expect(countApproximateTokens(result.summary)).toBeLessThanOrEqual(15);
      expect(result.chain).toEqual([]);
    });

    it('handles missing projectId gracefully without calling DB query', async () => {
      const toolInstance = createPrerequisiteChainTool({});

      const result = (await toolInstance.execute(
        { kcId: 'kc-1' },
        { toolCallId: 'tc-7', messages: [], context: {} },
      )) as PrerequisiteChainToolResult;

      expect(result.summary).toBe('[Error: No project context]');
      expect(countApproximateTokens(result.summary)).toBeLessThanOrEqual(15);
      expect(mockGetPrerequisiteChain).not.toHaveBeenCalled();
    });

    it('handles DB error gracefully and emits error status event', async () => {
      const mockDataStream: DataStreamWriter = { write: vi.fn() };
      mockGetPrerequisiteChain.mockRejectedValueOnce(new Error('CTE query timeout'));

      const toolInstance = createPrerequisiteChainTool({
        projectId: 'proj-1',
        dataStream: mockDataStream,
      });

      const result = (await toolInstance.execute(
        { kcId: 'kc-1' },
        { toolCallId: 'tc-8', messages: [], context: {} },
      )) as PrerequisiteChainToolResult;

      expect(result.summary).toBe('[Error: CTE query timeout]');
      expect(countApproximateTokens(result.summary)).toBeLessThanOrEqual(15);
      expect(mockDataStream.write).toHaveBeenCalledWith({
        type: 'data-tool-status',
        data: {
          tool: 'getPrerequisiteChain',
          status: 'error',
          kcId: 'kc-1',
          error: 'CTE query timeout',
        },
      });
    });
  });
});
