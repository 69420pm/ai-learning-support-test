export const GRAPH_EXTRACTION_STATUSES = [
  'not_started',
  'queued',
  'extracting',
  'ready',
  'ready_with_warnings',
  'failed',
] as const;

export type GraphExtractionStatus = (typeof GRAPH_EXTRACTION_STATUSES)[number];

export type MaterialGraphExtractionMetadata = {
  status: GraphExtractionStatus;
  jobId?: string;
  kcCount?: number;
  exerciseCount?: number;
  warnings?: string[];
  error?: string;
  startedAt?: string;
  completedAt?: string;
};

export type MaterialMetadata = {
  pageCount?: number;
  chunkCount?: number;
  tokenCount?: number;
  progress?: {
    stage?: string;
    stagePercent?: number;
    totalPages?: number;
    currentPage?: number;
    completedPages?: number;
  };
  graphExtraction?: MaterialGraphExtractionMetadata;
  error?: {
    message?: string;
    stage?: string;
    failedAt?: string;
  };
  processedAt?: string;
  [key: string]: unknown;
};

export type MaterialWithMetadata = {
  metadata?: MaterialMetadata | Record<string, unknown> | null;
};

export function isMaterialExtractingGraph(
  materialOrMetadata?: MaterialWithMetadata | MaterialMetadata | Record<string, unknown> | null,
): boolean {
  if (!materialOrMetadata) return false;
  const metadata =
    'metadata' in materialOrMetadata &&
    materialOrMetadata.metadata !== null &&
    typeof materialOrMetadata.metadata === 'object'
      ? (materialOrMetadata.metadata as MaterialMetadata)
      : (materialOrMetadata as MaterialMetadata);
  const status = metadata?.graphExtraction?.status;
  return status === 'queued' || status === 'extracting';
}
