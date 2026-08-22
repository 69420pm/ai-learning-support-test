import { tool } from 'ai';
import { z } from 'zod';
import { generateEmbeddings } from '@/lib/ai/embedding';
import { searchMaterialChunks } from '@/lib/db/queries/material';

export const MAX_SEARCH_OUTPUT_CHARS = 8000;

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
};

export function formatAndCapResults(
  rawResults: Awaited<ReturnType<typeof searchMaterialChunks>>,
  maxChars = MAX_SEARCH_OUTPUT_CHARS,
) {
  let remainingChars = maxChars;
  const cappedResults = [];

  for (const item of rawResults) {
    if (remainingChars <= 0) break;

    const metadata = item.metadata as Record<string, unknown>;
    const pageNumber =
      typeof metadata?.pageNumber === 'number' ? metadata.pageNumber : item.chunkIndex + 1;

    const content = item.content || '';
    let chunkText = content;

    if (chunkText.length > remainingChars) {
      chunkText = chunkText.slice(0, remainingChars);
      remainingChars = 0;
    } else {
      remainingChars -= chunkText.length;
    }

    cappedResults.push({
      materialId: item.materialId,
      materialTitle: item.materialTitle,
      pageNumber,
      chunkIndex: item.chunkIndex,
      similarity: Number(item.similarity.toFixed(2)),
      content: chunkText,
    });
  }

  return cappedResults;
}

export function createTools({ projectId, dataStream }: CreateToolsOptions) {
  const searchProjectMaterials = tool({
    description:
      'Search through project-grounded course materials, lecture slides, textbooks, and notes for relevant concepts, explanations, diagrams, and citations.',
    inputSchema: z.object({
      query: z
        .string()
        .min(1)
        .describe('The search query or concept keyword to search for in project materials'),
    }),
    execute: async ({ query }: { query: string }) => {
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

        const embeddings = await generateEmbeddings([query.trim()]);
        const embedding = embeddings[0];

        if (!embedding || embedding.length === 0) {
          dataStream?.write({
            type: 'data-tool-status',
            data: {
              tool: 'searchProjectMaterials',
              status: 'completed',
              query,
              resultCount: 0,
            },
          });

          return {
            query,
            results: [],
            totalResults: 0,
          };
        }

        const rawResults = await searchMaterialChunks({
          projectId,
          embedding,
          limit: 5,
          threshold: 0.4,
        });

        const cappedResults = formatAndCapResults(rawResults, MAX_SEARCH_OUTPUT_CHARS);

        dataStream?.write({
          type: 'data-tool-status',
          data: {
            tool: 'searchProjectMaterials',
            status: 'completed',
            query,
            resultCount: cappedResults.length,
          },
        });

        return {
          query,
          results: cappedResults,
          totalResults: cappedResults.length,
        };
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

  return {
    searchProjectMaterials,
  };
}

export type ProjectTools = ReturnType<typeof createTools>;
