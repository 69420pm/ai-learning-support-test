import { tool } from 'ai';
import { z } from 'zod';
import type { CreateToolsOptions } from '@/lib/ai/tools';
import {
  type GraphNeighborKC,
  getGraphNeighborhood,
  getPrerequisiteChain,
  type PrerequisiteChainNode,
} from '@/lib/db/queries/knowledge';
import type { KnowledgeComponent } from '@/lib/db/schema';

export type GraphNeighborhoodToolResult = {
  summary: string;
  text: string;
  content: string;
  concept: KnowledgeComponent | null;
  prerequisites: GraphNeighborKC[];
  unlocked: GraphNeighborKC[];
  depth: number;
  payload: {
    concept: KnowledgeComponent | null;
    prerequisites: GraphNeighborKC[];
    unlocked: GraphNeighborKC[];
    depth: number;
  };
  error?: string;
  toString: () => string;
};

export type PrerequisiteChainToolResult = {
  summary: string;
  text: string;
  content: string;
  concept: KnowledgeComponent | null;
  chain: PrerequisiteChainNode[];
  ancestors: PrerequisiteChainNode[];
  depth: number;
  payload: {
    kcId: string;
    chain: PrerequisiteChainNode[];
    ancestors: PrerequisiteChainNode[];
    depth: number;
    count: number;
  };
  error?: string;
  toString: () => string;
};

function formatNeighborhoodSummary(prereqsCount: number, unlockedCount: number): string {
  const pWord = prereqsCount === 1 ? 'prerequisite' : 'prerequisites';
  return `[OK: ${prereqsCount} ${pWord}, ${unlockedCount} unlocked]`;
}

function formatChainSummary(chainCount: number): string {
  const aWord = chainCount === 1 ? 'prerequisite ancestor' : 'prerequisite ancestors';
  return `[OK: ${chainCount} ${aWord}]`;
}

export function createGraphNeighborhoodTool({ projectId, dataStream }: CreateToolsOptions) {
  const neighborhoodTool = tool({
    description:
      'Retrieve concept graph neighborhood including direct prerequisites and unlocked/dependent concepts, with optional 2-hop expansion.',
    inputSchema: z.object({
      kcId: z
        .string()
        .min(1)
        .describe('The concept ID, slug, or name to inspect in the knowledge graph'),
      depth: z
        .number()
        .int()
        .min(1)
        .max(2)
        .optional()
        .describe(
          'Neighborhood expansion depth: 1 for direct neighbors, 2 for up to 2-hop neighbors (default: 1)',
        ),
    }),
    toModelOutput: ({ output }) => ({
      type: 'text' as const,
      value: output.summary,
    }),
    execute: async ({
      kcId,
      depth = 1,
    }: {
      kcId: string;
      depth?: number;
    }): Promise<GraphNeighborhoodToolResult> => {
      try {
        dataStream?.write({
          type: 'data-tool-status',
          data: {
            tool: 'getGraphNeighborhood',
            status: 'searching',
            kcId,
            depth,
          },
        });

        if (!projectId) {
          const errorSummary = '[Error: No project context]';
          return {
            summary: errorSummary,
            text: errorSummary,
            content: errorSummary,
            concept: null,
            prerequisites: [],
            unlocked: [],
            depth,
            payload: {
              concept: null,
              prerequisites: [],
              unlocked: [],
              depth,
            },
            error: 'No project context available for graph neighborhood.',
            toString() {
              return errorSummary;
            },
          };
        }

        const neighborhood = await getGraphNeighborhood({
          projectId,
          kcId,
          depth,
        });

        if (!neighborhood.concept) {
          const notFoundSummary = '[Error: Concept not found]';
          return {
            summary: notFoundSummary,
            text: notFoundSummary,
            content: notFoundSummary,
            concept: null,
            prerequisites: [],
            unlocked: [],
            depth,
            payload: {
              concept: null,
              prerequisites: [],
              unlocked: [],
              depth,
            },
            error: `Concept "${kcId}" was not found in the project concept graph.`,
            toString() {
              return notFoundSummary;
            },
          };
        }

        const summary = formatNeighborhoodSummary(
          neighborhood.prerequisites.length,
          neighborhood.unlocked.length,
        );

        dataStream?.write({
          type: 'data-tool-status',
          data: {
            tool: 'getGraphNeighborhood',
            status: 'completed',
            kcId,
            depth: neighborhood.depth,
            prerequisitesCount: neighborhood.prerequisites.length,
            unlockedCount: neighborhood.unlocked.length,
          },
        });

        return {
          summary,
          text: summary,
          content: summary,
          concept: neighborhood.concept,
          prerequisites: neighborhood.prerequisites,
          unlocked: neighborhood.unlocked,
          depth: neighborhood.depth,
          payload: {
            concept: neighborhood.concept,
            prerequisites: neighborhood.prerequisites,
            unlocked: neighborhood.unlocked,
            depth: neighborhood.depth,
          },
          toString() {
            return summary;
          },
        };
      } catch (err) {
        const errorMessage = err instanceof Error ? err.message : 'Unknown graph query error';
        const errorSummary = `[Error: ${errorMessage}]`;

        dataStream?.write({
          type: 'data-tool-status',
          data: {
            tool: 'getGraphNeighborhood',
            status: 'error',
            kcId,
            error: errorMessage,
          },
        });

        return {
          summary: errorSummary,
          text: errorSummary,
          content: errorSummary,
          concept: null,
          prerequisites: [],
          unlocked: [],
          depth,
          payload: {
            concept: null,
            prerequisites: [],
            unlocked: [],
            depth,
          },
          error: errorMessage,
          toString() {
            return errorSummary;
          },
        };
      }
    },
  });

  return Object.assign(neighborhoodTool, {
    // biome-ignore lint/style/useNamingConvention: legacy AI SDK compatibility
    experimental_toToolResultContent: (result: GraphNeighborhoodToolResult) => [
      {
        type: 'text' as const,
        text: result.summary,
      },
    ],
  });
}

export const getGraphNeighborhoodTool = createGraphNeighborhoodTool;

export function createPrerequisiteChainTool({ projectId, dataStream }: CreateToolsOptions) {
  const chainTool = tool({
    description:
      'Retrieve cycle-guarded recursive prerequisite ancestor chain for a concept, ordered from immediate to foundational prerequisites.',
    inputSchema: z.object({
      kcId: z
        .string()
        .min(1)
        .describe('The concept ID, slug, or name to find prerequisite ancestors for'),
      maxDepth: z
        .number()
        .int()
        .min(1)
        .max(20)
        .optional()
        .describe('Maximum recursion depth for prerequisite chain traversal (default: 10)'),
    }),
    toModelOutput: ({ output }) => ({
      type: 'text' as const,
      value: output.summary,
    }),
    execute: async ({
      kcId,
      maxDepth = 10,
    }: {
      kcId: string;
      maxDepth?: number;
    }): Promise<PrerequisiteChainToolResult> => {
      try {
        dataStream?.write({
          type: 'data-tool-status',
          data: {
            tool: 'getPrerequisiteChain',
            status: 'searching',
            kcId,
            maxDepth,
          },
        });

        if (!projectId) {
          const errorSummary = '[Error: No project context]';
          return {
            summary: errorSummary,
            text: errorSummary,
            content: errorSummary,
            concept: null,
            chain: [],
            ancestors: [],
            depth: 0,
            payload: {
              kcId,
              chain: [],
              ancestors: [],
              depth: 0,
              count: 0,
            },
            error: 'No project context available for prerequisite chain.',
            toString() {
              return errorSummary;
            },
          };
        }

        const chain = await getPrerequisiteChain({
          projectId,
          kcId,
          maxDepth,
        });

        const maxObservedDepth = chain.length > 0 ? Math.max(...chain.map((c) => c.depth)) : 0;
        const summary = formatChainSummary(chain.length);

        dataStream?.write({
          type: 'data-tool-status',
          data: {
            tool: 'getPrerequisiteChain',
            status: 'completed',
            kcId,
            ancestorsCount: chain.length,
          },
        });

        return {
          summary,
          text: summary,
          content: summary,
          concept: null,
          chain,
          ancestors: chain,
          depth: maxObservedDepth,
          payload: {
            kcId,
            chain,
            ancestors: chain,
            depth: maxObservedDepth,
            count: chain.length,
          },
          toString() {
            return summary;
          },
        };
      } catch (err) {
        const errorMessage = err instanceof Error ? err.message : 'Unknown chain query error';
        const errorSummary = `[Error: ${errorMessage}]`;

        dataStream?.write({
          type: 'data-tool-status',
          data: {
            tool: 'getPrerequisiteChain',
            status: 'error',
            kcId,
            error: errorMessage,
          },
        });

        return {
          summary: errorSummary,
          text: errorSummary,
          content: errorSummary,
          concept: null,
          chain: [],
          ancestors: [],
          depth: 0,
          payload: {
            kcId,
            chain: [],
            ancestors: [],
            depth: 0,
            count: 0,
          },
          error: errorMessage,
          toString() {
            return errorSummary;
          },
        };
      }
    },
  });

  return Object.assign(chainTool, {
    // biome-ignore lint/style/useNamingConvention: legacy AI SDK compatibility
    experimental_toToolResultContent: (result: PrerequisiteChainToolResult) => [
      {
        type: 'text' as const,
        text: result.summary,
      },
    ],
  });
}

export const getPrerequisiteChainTool = createPrerequisiteChainTool;

export type GraphNeighborhoodTool = ReturnType<typeof createGraphNeighborhoodTool>;
export type PrerequisiteChainTool = ReturnType<typeof createPrerequisiteChainTool>;
