import { tool } from 'ai';
import { z } from 'zod';
import type { GetEmbeddingModelOptions } from '@/lib/ai/embedding';
import type { ProviderName } from '@/lib/ai/providers';
import { retrieveMaterials, type SearchMaterialsResult } from '@/lib/materials';

export type ToolStatusData =
  | {
      tool: 'searchProjectMaterials';
      status: 'searching';
      query: string;
    }
  | {
      tool: 'searchProjectMaterials';
      status: 'completed';
      query: string;
      resultCount: number;
    }
  | {
      tool: 'searchProjectMaterials';
      status: 'error';
      query: string;
      error: string;
    };

export type DataStreamWriter = {
  write: (part: {
    type: `data-${string}`;
    id?: string;
    data: unknown;
    transient?: boolean;
  }) => void;
};

export type CreateToolsOptions = {
  userId?: string;
  projectId?: string;
  dataStream?: DataStreamWriter;
  modelId?: string;
  provider?: ProviderName;
  apiKey?: string;
  embeddingOptions?: GetEmbeddingModelOptions;
};

export type SearchProjectMaterialsResult =
  | SearchMaterialsResult
  | {
      query: string;
      results: unknown[];
      error: string;
    };

export type ProjectTools = {
  searchProjectMaterials: ReturnType<typeof createSearchProjectMaterialsTool>;
};

function resolveEmbeddingOptions(
  options: Pick<CreateToolsOptions, 'provider' | 'apiKey' | 'embeddingOptions'>,
): GetEmbeddingModelOptions | undefined {
  if (options.embeddingOptions) {
    return options.embeddingOptions;
  }
  const { provider, apiKey } = options;
  const isSupportedEmbeddingProvider = provider === 'google' || provider === 'openai';
  if (!apiKey && !isSupportedEmbeddingProvider) {
    return undefined;
  }
  return {
    apiKey,
    provider: isSupportedEmbeddingProvider ? provider : undefined,
  };
}

function createSearchProjectMaterialsTool({
  projectId,
  dataStream,
  provider,
  apiKey,
  embeddingOptions,
}: CreateToolsOptions) {
  const resolvedEmbeddingOptions = resolveEmbeddingOptions({ provider, apiKey, embeddingOptions });

  return tool({
    description:
      'Search through project-grounded course materials, lecture slides, textbooks, and notes for relevant concepts, explanations, diagrams, and citations.',
    inputSchema: z.object({
      query: z
        .string()
        .min(1)
        .describe('The search query or concept keyword to search for in project materials'),
    }),
    execute: async ({ query }: { query: string }): Promise<SearchProjectMaterialsResult> => {
      try {
        dataStream?.write({
          type: 'data-tool-status',
          data: {
            tool: 'searchProjectMaterials',
            status: 'searching',
            query,
          },
        });

        if (!projectId) {
          return {
            query,
            results: [],
            error: 'No project context available for material search.',
          };
        }

        const searchResult = await retrieveMaterials({
          projectId,
          query,
          embeddingOptions: resolvedEmbeddingOptions,
        });

        dataStream?.write({
          type: 'data-tool-status',
          data: {
            tool: 'searchProjectMaterials',
            status: 'completed',
            query,
            resultCount: searchResult.results.length,
          },
        });

        return searchResult;
      } catch (err) {
        const errorMessage = err instanceof Error ? err.message : 'Unknown search error';
        dataStream?.write({
          type: 'data-tool-status',
          data: {
            tool: 'searchProjectMaterials',
            status: 'error',
            query,
            error: errorMessage,
          },
        });

        return {
          query,
          results: [],
          error: errorMessage,
        };
      }
    },
  });
}

export function createTools(options: CreateToolsOptions): ProjectTools {
  return {
    searchProjectMaterials: createSearchProjectMaterialsTool(options),
  };
}
