'use client';

import useSWR from 'swr';
import type { Exercise, KnowledgeComponent, MaterialChunk } from '@/lib/db/schema';
import { fetcher } from '@/lib/utils';

export type { Exercise, KnowledgeComponent, MaterialChunk };

export type ConceptInspectionData = {
  component: KnowledgeComponent;
  exercises: Exercise[];
  chunks: MaterialChunk[];
};

export function getConceptInspectionKey(
  projectId?: string | null,
  kcId?: string | null,
): string | null {
  if (!projectId || !kcId || projectId.trim() === '' || kcId.trim() === '') {
    return null;
  }
  return `/api/projects/${projectId}/graph/components/${kcId}`;
}

export type UseConceptInspectionReturn = {
  data: ConceptInspectionData | undefined;
  component: KnowledgeComponent | null;
  exercises: Exercise[];
  chunks: MaterialChunk[];
  isLoading: boolean;
  isValidating: boolean;
  error: unknown;
  mutate: ReturnType<typeof useSWR<ConceptInspectionData>>['mutate'];
};

export function useConceptInspection(
  projectId?: string | null,
  kcId?: string | null,
): UseConceptInspectionReturn {
  const key = getConceptInspectionKey(projectId, kcId);

  const { data, error, isLoading, isValidating, mutate } = useSWR<ConceptInspectionData>(
    key,
    fetcher,
    {
      revalidateOnFocus: false,
      dedupingInterval: 2000,
    },
  );

  return {
    data,
    component: data?.component ?? null,
    exercises: data?.exercises ?? [],
    chunks: data?.chunks ?? [],
    isLoading: Boolean(key) && isLoading,
    isValidating,
    error,
    mutate,
  };
}
