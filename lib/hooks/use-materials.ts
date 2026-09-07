'use client';

import useSWR from 'swr';
import type { GraphExtractionStatus, MaterialGraphExtractionMetadata } from '@/lib/materials/types';
import { fetcher } from '@/lib/utils';

export type { GraphExtractionStatus, MaterialGraphExtractionMetadata };
export type MaterialStatus = 'pending' | 'processing' | 'ready' | 'failed';

export type MaterialProgress = {
  stage?: string;
  stagePercent?: number;
  totalPages?: number;
  currentPage?: number;
  completedPages?: number;
};

export type MaterialMetadata = {
  pageCount?: number;
  chunkCount?: number;
  tokenCount?: number;
  progress?: MaterialProgress;
  graphExtraction?: MaterialGraphExtractionMetadata;
  error?: {
    message?: string;
    stage?: string;
    failedAt?: string;
  };
  processedAt?: string;
  [key: string]: unknown;
};

export type MaterialItem = {
  id: string;
  projectId: string;
  userId: string;
  title: string;
  filename: string;
  fileType: string;
  fileSize: number;
  storagePath: string;
  status: MaterialStatus;
  errorMessage?: string | null;
  metadata?: MaterialMetadata;
  createdAt: string | Date;
  updatedAt: string | Date;
};

export type MaterialsResponse = {
  materials: MaterialItem[];
};

export function calculateMaterialsRefreshInterval(
  data?:
    | MaterialsResponse
    | { materials?: { status: MaterialStatus; metadata?: MaterialMetadata }[] },
): number {
  if (!data?.materials || data.materials.length === 0) {
    return 0;
  }

  const hasActiveProcessing = data.materials.some((m) => {
    const isIngesting = m.status === 'pending' || m.status === 'processing';
    const isExtractingGraph =
      m.metadata?.graphExtraction?.status === 'queued' ||
      m.metadata?.graphExtraction?.status === 'extracting';
    return isIngesting || isExtractingGraph;
  });

  return hasActiveProcessing ? 2500 : 0;
}

export function useMaterials(projectId?: string | null) {
  const key = projectId ? `/api/projects/${projectId}/materials` : null;

  const { data, error, isLoading, isValidating, mutate } = useSWR<MaterialsResponse>(key, fetcher, {
    refreshInterval: calculateMaterialsRefreshInterval,
    revalidateOnFocus: true,
    revalidateOnReconnect: true,
    dedupingInterval: 1000,
  });

  const materials = data?.materials ?? [];
  const isProcessing = materials.some((m) => m.status === 'pending' || m.status === 'processing');
  const activeCount = materials.filter(
    (m) => m.status === 'pending' || m.status === 'processing',
  ).length;

  return {
    materials,
    isLoading,
    isValidating,
    isProcessing,
    activeCount,
    error,
    mutate,
  };
}
