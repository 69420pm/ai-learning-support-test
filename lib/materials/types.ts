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
