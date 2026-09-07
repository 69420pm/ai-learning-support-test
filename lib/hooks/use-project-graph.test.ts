import { describe, expect, it } from 'vitest';
import { createEmptyDiagnostics } from '@/lib/learning/graph-diagnostics';
import { calculateGraphRefreshInterval, type ProjectGraphResponse } from './use-project-graph';

describe('use-project-graph helper functions', () => {
  it('returns 0 refresh interval when no materials are extracting', () => {
    const data: ProjectGraphResponse = {
      components: [],
      dependencies: [],
      materials: [
        {
          id: 'mat-1',
          projectId: 'p1',
          userId: 'u1',
          title: 'Math',
          filename: 'math.pdf',
          fileType: 'application/pdf',
          fileSize: 100,
          storagePath: 'p1/math.pdf',
          status: 'ready',
          errorMessage: null,
          metadata: { graphExtraction: { status: 'ready' } },
          createdAt: new Date(),
          updatedAt: new Date(),
        },
      ],
      diagnostics: createEmptyDiagnostics(),
    };

    expect(calculateGraphRefreshInterval(data)).toBe(0);
  });

  it('returns 2500ms refresh interval when a material is actively extracting graph', () => {
    const data: ProjectGraphResponse = {
      components: [],
      dependencies: [],
      materials: [
        {
          id: 'mat-1',
          projectId: 'p1',
          userId: 'u1',
          title: 'Math',
          filename: 'math.pdf',
          fileType: 'application/pdf',
          fileSize: 100,
          storagePath: 'p1/math.pdf',
          status: 'ready',
          errorMessage: null,
          metadata: { graphExtraction: { status: 'extracting' } },
          createdAt: new Date(),
          updatedAt: new Date(),
        },
      ],
      diagnostics: createEmptyDiagnostics(),
    };

    expect(calculateGraphRefreshInterval(data)).toBe(2500);
  });
});
