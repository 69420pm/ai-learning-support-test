import { tool } from 'ai';
import { z } from 'zod';
import type { CreateToolsOptions } from '@/lib/ai/tools';
import {
  type GraphNeighborKC,
  getExercisesForKc,
  getGraphNeighborhood,
  getPrerequisiteChain,
  type PrerequisiteChainNode,
} from '@/lib/db/queries/knowledge';
import type { Exercise, KnowledgeComponent } from '@/lib/db/schema';

export type GraphNeighborhoodToolResult = {
  summary: string;
  concept: KnowledgeComponent | null;
  prerequisites: GraphNeighborKC[];
  unlocked: GraphNeighborKC[];
  depth: number;
  error?: string;
};

export type PrerequisiteChainToolResult = {
  summary: string;
  chain: PrerequisiteChainNode[];
  ancestors: PrerequisiteChainNode[];
  depth: number;
  error?: string;
};

export type ExercisesForKcToolResult = {
  summary: string;
  kcId: string;
  exercises: Exercise[];
  error?: string;
};

function formatNeighborhoodSummary(prereqsCount: number, unlockedCount: number): string {
  const pWord = prereqsCount === 1 ? 'prerequisite' : 'prerequisites';
  return `[OK: ${prereqsCount} ${pWord}, ${unlockedCount} unlocked]`;
}

function formatChainSummary(chainCount: number): string {
  const aWord = chainCount === 1 ? 'prerequisite ancestor' : 'prerequisite ancestors';
  return `[OK: ${chainCount} ${aWord}]`;
}

function formatExercisesSummary(count: number, kcId: string): string {
  const eWord = count === 1 ? 'exercise' : 'exercises';
  const cleanId = kcId.trim().replace(/\s+/g, ' ');
  const truncatedId = cleanId.length > 25 ? `${cleanId.slice(0, 22)}...` : cleanId;
  return `[OK: ${count} ${eWord} found for ${truncatedId}]`;
}

function formatErrorSummary(errorMessage: string): string {
  const clean = errorMessage.trim().replace(/\s+/g, ' ');
  const truncated = clean.length > 30 ? `${clean.slice(0, 27)}...` : clean;
  return `[Error: ${truncated}]`;
}

function createEmptyNeighborhood(
  summary: string,
  error: string,
  depth = 1,
): GraphNeighborhoodToolResult {
  return { summary, concept: null, prerequisites: [], unlocked: [], depth, error };
}

function createEmptyChain(summary: string, error: string): PrerequisiteChainToolResult {
  return { summary, chain: [], ancestors: [], depth: 0, error };
}

function createEmptyExercises(
  summary: string,
  error: string,
  kcId: string,
): ExercisesForKcToolResult {
  return { summary, kcId, exercises: [], error };
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
        return createEmptyNeighborhood(
          '[Error: No project context]',
          'No project context available for graph neighborhood.',
          depth,
        );
      }

      try {
        const neighborhood = await getGraphNeighborhood({
          projectId,
          kcId,
          depth,
        });

        if (!neighborhood.concept) {
          return createEmptyNeighborhood(
            '[Error: Concept not found]',
            `Concept "${kcId}" was not found in the project concept graph.`,
            depth,
          );
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
          concept: neighborhood.concept,
          prerequisites: neighborhood.prerequisites,
          unlocked: neighborhood.unlocked,
          depth: neighborhood.depth,
        };
      } catch (err) {
        const errorMessage = err instanceof Error ? err.message : 'Unknown graph query error';

        dataStream?.write({
          type: 'data-tool-status',
          data: {
            tool: 'getGraphNeighborhood',
            status: 'error',
            kcId,
            error: errorMessage,
          },
        });

        return createEmptyNeighborhood(formatErrorSummary(errorMessage), errorMessage, depth);
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
        return createEmptyChain(
          '[Error: No project context]',
          'No project context available for prerequisite chain.',
        );
      }

      try {
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
          chain,
          ancestors: chain,
          depth: maxObservedDepth,
        };
      } catch (err) {
        const errorMessage = err instanceof Error ? err.message : 'Unknown chain query error';

        dataStream?.write({
          type: 'data-tool-status',
          data: {
            tool: 'getPrerequisiteChain',
            status: 'error',
            kcId,
            error: errorMessage,
          },
        });

        return createEmptyChain(formatErrorSummary(errorMessage), errorMessage);
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

export function createExercisesForKcTool({ projectId, dataStream }: CreateToolsOptions) {
  const exercisesTool = tool({
    description:
      'Retrieve grounded practice exercises and problems for a knowledge component or concept, including page numbers, prompts, and solutions.',
    inputSchema: z.object({
      kcId: z
        .string()
        .min(1)
        .describe('The concept ID, slug, or name to find practice exercises for'),
    }),
    toModelOutput: ({ output }) => ({
      type: 'text' as const,
      value: output.summary,
    }),
    execute: async ({ kcId }: { kcId: string }): Promise<ExercisesForKcToolResult> => {
      dataStream?.write({
        type: 'data-tool-status',
        data: {
          tool: 'getExercisesForKc',
          status: 'searching',
          kcId,
        },
      });

      if (!projectId) {
        return createEmptyExercises(
          '[Error: No project context]',
          'No project context available for exercises query.',
          kcId,
        );
      }

      try {
        const exercises = await getExercisesForKc({
          projectId,
          kcId,
        });

        const summary = formatExercisesSummary(exercises.length, kcId);

        dataStream?.write({
          type: 'data-tool-status',
          data: {
            tool: 'getExercisesForKc',
            status: 'completed',
            kcId,
            exerciseCount: exercises.length,
          },
        });

        return {
          summary,
          kcId,
          exercises,
        };
      } catch (err) {
        const errorMessage = err instanceof Error ? err.message : 'Unknown exercises query error';

        dataStream?.write({
          type: 'data-tool-status',
          data: {
            tool: 'getExercisesForKc',
            status: 'error',
            kcId,
            error: errorMessage,
          },
        });

        return createEmptyExercises(formatErrorSummary(errorMessage), errorMessage, kcId);
      }
    },
  });

  return Object.assign(exercisesTool, {
    // biome-ignore lint/style/useNamingConvention: legacy AI SDK compatibility
    experimental_toToolResultContent: (result: ExercisesForKcToolResult) => [
      {
        type: 'text' as const,
        text: result.summary,
      },
    ],
  });
}
