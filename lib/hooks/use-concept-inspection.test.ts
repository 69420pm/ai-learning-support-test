import { describe, expect, it } from 'vitest';
import { getConceptInspectionKey } from './use-concept-inspection';

describe('use-concept-inspection helpers', () => {
  it('returns null key when projectId or kcId is not provided', () => {
    expect(getConceptInspectionKey(null, null)).toBeNull();
    expect(getConceptInspectionKey('proj-1', null)).toBeNull();
    expect(getConceptInspectionKey(null, 'kc-1')).toBeNull();
    expect(getConceptInspectionKey('proj-1', '')).toBeNull();
    expect(getConceptInspectionKey('', 'kc-1')).toBeNull();
  });

  it('constructs correct API endpoint key when both IDs are provided', () => {
    expect(getConceptInspectionKey('proj-1', 'kc-123')).toBe(
      '/api/projects/proj-1/graph/components/kc-123',
    );
  });
});
