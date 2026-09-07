'use client';

import useSWR from 'swr';
import type { KnowledgeComponent, KnowledgeDependency, Material } from '@/lib/db/schema';
import type { GraphDiagnostics } from '@/lib/learning/graph-diagnostics';

export type { KnowledgeComponent, KnowledgeDependency, Material };

import { isMaterialExtractingGraph } from '@/lib/materials/types';
import { fetcher } from '@/lib/utils';

export type ProjectGraphResponse = {
  components: KnowledgeComponent[];
  dependencies: KnowledgeDependency[];
  materials: Material[];
  diagnostics: GraphDiagnostics;
};

export function calculateGraphRefreshInterval(data?: ProjectGraphResponse): number {
  if (!data?.materials || data.materials.length === 0) {
    return 0;
  }

  const hasExtracting = data.materials.some((m) => isMaterialExtractingGraph(m));
  return hasExtracting ? 2500 : 0;
}

export function useProjectGraph(projectId?: string | null) {
  const key = projectId ? `/api/projects/${projectId}/graph` : null;

  const { data, error, isLoading, isValidating, mutate } = useSWR<ProjectGraphResponse>(
    key,
    fetcher,
    {
      refreshInterval: calculateGraphRefreshInterval,
      revalidateOnFocus: true,
      revalidateOnReconnect: true,
      dedupingInterval: 1000,
    },
  );

  return {
    graph: data,
    components: data?.components ?? [],
    dependencies: data?.dependencies ?? [],
    materials: data?.materials ?? [],
    diagnostics: data?.diagnostics,
    isLoading,
    isValidating,
    error,
    mutate,
  };
}
