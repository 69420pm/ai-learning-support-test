import { describe, expect, it } from 'vitest';
import { calculateMaterialsRefreshInterval, type MaterialItem } from './use-materials';

describe('useMaterials Hook Helpers', () => {
  it('returns 2500ms when any material is pending', () => {
    const data = {
      materials: [
        { id: '1', status: 'ready' as const },
        { id: '2', status: 'pending' as const },
      ] as MaterialItem[],
    };

    expect(calculateMaterialsRefreshInterval(data)).toBe(2500);
  });

  it('returns 2500ms when any material is processing', () => {
    const data = {
      materials: [
        { id: '1', status: 'processing' as const },
        { id: '2', status: 'ready' as const },
      ] as MaterialItem[],
    };

    expect(calculateMaterialsRefreshInterval(data)).toBe(2500);
  });

  it('returns 0 (idling) when all materials are in terminal states (ready or failed)', () => {
    const data = {
      materials: [
        { id: '1', status: 'ready' as const },
        { id: '2', status: 'failed' as const },
      ] as MaterialItem[],
    };

    expect(calculateMaterialsRefreshInterval(data)).toBe(0);
  });

  it('returns 0 when materials list is empty or undefined', () => {
    expect(calculateMaterialsRefreshInterval(undefined)).toBe(0);
    expect(calculateMaterialsRefreshInterval({ materials: [] })).toBe(0);
  });
});
