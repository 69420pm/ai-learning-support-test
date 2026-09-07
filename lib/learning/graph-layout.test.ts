import { describe, expect, it } from 'vitest';
import {
  calculateEdgeEndpoints,
  computeDagLayout,
  computeFitViewTransform,
  createForceSimulation,
  getBloomRadius,
  getPacerColor,
  type LayoutEdge,
  type LayoutNode,
} from './graph-layout';

describe('graph-layout', () => {
  describe('getPacerColor', () => {
    it('returns correct color encoding for standard PACER categories', () => {
      expect(getPacerColor('procedural')).toMatch(/blue|#3b82f6/i);
      expect(getPacerColor('conceptual')).toMatch(/purple|#a855f7/i);
      expect(getPacerColor('analogous')).toMatch(/amber|#f59e0b/i);
      expect(getPacerColor('evidence')).toMatch(/green|emerald|#10b981/i);
      expect(getPacerColor('reference')).toMatch(/slate|#64748b/i);
    });

    it('returns fallback color for unknown or undefined categories', () => {
      expect(getPacerColor('unknown')).toMatch(/slate|#64748b/i);
      expect(getPacerColor('')).toMatch(/slate|#64748b/i);
    });
  });

  describe('getBloomRadius', () => {
    it('scales radius from 18px to 36px based on Bloom taxonomy levels 1-6', () => {
      expect(getBloomRadius(1)).toBe(18);
      expect(getBloomRadius(6)).toBe(36);
    });

    it('increases monotonically as bloom level increases', () => {
      const r1 = getBloomRadius(1);
      const r2 = getBloomRadius(2);
      const r3 = getBloomRadius(3);
      const r4 = getBloomRadius(4);
      const r5 = getBloomRadius(5);
      const r6 = getBloomRadius(6);

      expect(r1).toBeLessThan(r2);
      expect(r2).toBeLessThan(r3);
      expect(r3).toBeLessThan(r4);
      expect(r4).toBeLessThan(r5);
      expect(r5).toBeLessThan(r6);
    });

    it('clamps out of bounds bloom levels to [18, 36]', () => {
      expect(getBloomRadius(0)).toBe(18);
      expect(getBloomRadius(-5)).toBe(18);
      expect(getBloomRadius(10)).toBe(36);
    });
  });

  describe('computeDagLayout', () => {
    it('assigns x and y coordinates to all nodes within canvas dimensions', () => {
      const nodes: LayoutNode[] = [
        { id: 'n1', name: 'Variables', pacerCategory: 'conceptual', bloomLevel: 1 },
        { id: 'n2', name: 'Functions', pacerCategory: 'procedural', bloomLevel: 3 },
      ];
      const edges: LayoutEdge[] = [{ source: 'n1', target: 'n2' }];

      const positioned = computeDagLayout(nodes, edges, { width: 800, height: 600 });
      expect(positioned).toHaveLength(2);
      for (const node of positioned) {
        expect(typeof node.x).toBe('number');
        expect(typeof node.y).toBe('number');
        expect(Number.isNaN(node.x)).toBe(false);
        expect(Number.isNaN(node.y)).toBe(false);
        expect(node.x).toBeGreaterThanOrEqual(0);
        expect(node.x).toBeLessThanOrEqual(800);
        expect(node.y).toBeGreaterThanOrEqual(0);
        expect(node.y).toBeLessThanOrEqual(600);
      }
    });

    it('places prerequisite roots at the top and downstream dependents below', () => {
      const nodes: LayoutNode[] = [
        { id: 'root', name: 'Intro to Math', pacerCategory: 'conceptual', bloomLevel: 1 },
        { id: 'mid', name: 'Algebra', pacerCategory: 'procedural', bloomLevel: 3 },
        { id: 'leaf', name: 'Calculus', pacerCategory: 'procedural', bloomLevel: 5 },
      ];
      const edges: LayoutEdge[] = [
        { source: 'root', target: 'mid' },
        { source: 'mid', target: 'leaf' },
      ];

      const positioned = computeDagLayout(nodes, edges, { width: 800, height: 600 });
      const rootNode = positioned.find((n) => n.id === 'root');
      const midNode = positioned.find((n) => n.id === 'mid');
      const leafNode = positioned.find((n) => n.id === 'leaf');

      expect(rootNode).toBeDefined();
      expect(midNode).toBeDefined();
      expect(leafNode).toBeDefined();

      // Root prerequisites should have lower y (at top) than dependents downstream
      expect(rootNode?.y).toBeLessThan(midNode?.y ?? 0);
      expect(midNode?.y).toBeLessThan(leafNode?.y ?? 0);
    });

    it('handles diamond dependencies correctly with layer depths', () => {
      const nodes: LayoutNode[] = [
        { id: 'a', name: 'A', pacerCategory: 'conceptual', bloomLevel: 1 },
        { id: 'b', name: 'B', pacerCategory: 'conceptual', bloomLevel: 2 },
        { id: 'c', name: 'C', pacerCategory: 'conceptual', bloomLevel: 2 },
        { id: 'd', name: 'D', pacerCategory: 'conceptual', bloomLevel: 4 },
      ];
      const edges: LayoutEdge[] = [
        { source: 'a', target: 'b' },
        { source: 'a', target: 'c' },
        { source: 'b', target: 'd' },
        { source: 'c', target: 'd' },
      ];

      const positioned = computeDagLayout(nodes, edges, { width: 800, height: 600 });
      const nodeA = positioned.find((n) => n.id === 'a');
      const nodeB = positioned.find((n) => n.id === 'b');
      const nodeC = positioned.find((n) => n.id === 'c');
      const nodeD = positioned.find((n) => n.id === 'd');

      expect(nodeA).toBeDefined();
      expect(nodeB).toBeDefined();
      expect(nodeC).toBeDefined();
      expect(nodeD).toBeDefined();

      expect(nodeA?.y).toBeLessThan(nodeB?.y ?? 0);
      expect(nodeA?.y).toBeLessThan(nodeC?.y ?? 0);
      expect(nodeB?.y).toBe(nodeC?.y);
      expect(nodeB?.y).toBeLessThan(nodeD?.y ?? 0);
    });

    it('handles disconnected or orphan nodes without crashing', () => {
      const nodes: LayoutNode[] = [
        { id: 'orphan1', name: 'Standalone 1', pacerCategory: 'reference', bloomLevel: 1 },
        { id: 'orphan2', name: 'Standalone 2', pacerCategory: 'evidence', bloomLevel: 2 },
      ];
      const edges: LayoutEdge[] = [];

      const positioned = computeDagLayout(nodes, edges, { width: 600, height: 400 });
      expect(positioned).toHaveLength(2);
      expect(Number.isFinite(positioned[0].x)).toBe(true);
      expect(Number.isFinite(positioned[1].x)).toBe(true);
    });

    it('handles cyclic dependencies gracefully without infinite loop', () => {
      const nodes: LayoutNode[] = [
        { id: 'cycle1', name: 'Cycle 1', pacerCategory: 'conceptual', bloomLevel: 1 },
        { id: 'cycle2', name: 'Cycle 2', pacerCategory: 'conceptual', bloomLevel: 2 },
      ];
      const edges: LayoutEdge[] = [
        { source: 'cycle1', target: 'cycle2' },
        { source: 'cycle2', target: 'cycle1' },
      ];

      const positioned = computeDagLayout(nodes, edges, { width: 600, height: 400 });
      expect(positioned).toHaveLength(2);
      expect(Number.isFinite(positioned[0].y)).toBe(true);
      expect(Number.isFinite(positioned[1].y)).toBe(true);
    });
  });

  describe('createForceSimulation', () => {
    it('configures d3 force simulation with manyBody, link, center, and collide forces', () => {
      const nodes: LayoutNode[] = [
        { id: 'n1', name: 'Node 1', pacerCategory: 'conceptual', bloomLevel: 2 },
        { id: 'n2', name: 'Node 2', pacerCategory: 'procedural', bloomLevel: 3 },
      ];
      const edges: LayoutEdge[] = [{ source: 'n1', target: 'n2' }];

      const sim = createForceSimulation(nodes, edges, { width: 800, height: 600 });
      expect(sim).toBeDefined();
      expect(typeof sim.tick).toBe('function');
      expect(typeof sim.stop).toBe('function');

      // Ticking simulation updates coordinates
      sim.tick(5);
      expect(Number.isFinite(nodes[0].x)).toBe(true);
      expect(Number.isFinite(nodes[0].y)).toBe(true);
      sim.stop();
    });

    it('respects node pinning with fx and fy', () => {
      const nodes: LayoutNode[] = [
        {
          id: 'n1',
          name: 'Pinned Node',
          pacerCategory: 'conceptual',
          bloomLevel: 2,
          fx: 150,
          fy: 250,
        },
        { id: 'n2', name: 'Free Node', pacerCategory: 'procedural', bloomLevel: 3 },
      ];
      const edges: LayoutEdge[] = [{ source: 'n1', target: 'n2' }];

      const sim = createForceSimulation(nodes, edges, { width: 800, height: 600 });
      sim.tick(10);
      expect(nodes[0].x).toBe(150);
      expect(nodes[0].y).toBe(250);
      sim.stop();
    });
  });

  describe('calculateEdgeEndpoints', () => {
    it('computes truncated line endpoints between two circular nodes', () => {
      const source: LayoutNode = {
        id: 's',
        name: 'Source',
        pacerCategory: 'conceptual',
        bloomLevel: 1,
        x: 0,
        y: 0,
        radius: 20,
      };
      const target: LayoutNode = {
        id: 't',
        name: 'Target',
        pacerCategory: 'procedural',
        bloomLevel: 1,
        x: 100,
        y: 0,
        radius: 20,
      };

      const endpoints = calculateEdgeEndpoints(source, target);
      expect(endpoints).not.toBeNull();
      expect(endpoints?.x1).toBe(20);
      expect(endpoints?.y1).toBe(0);
      // Target is at 100, offset is radius 20 + 8 = 28, so 100 - 28 = 72
      expect(endpoints?.x2).toBe(72);
      expect(endpoints?.y2).toBe(0);
    });

    it('returns null when distance is zero', () => {
      const source: LayoutNode = {
        id: 's',
        name: 'Source',
        pacerCategory: 'conceptual',
        bloomLevel: 1,
        x: 50,
        y: 50,
      };
      const target: LayoutNode = {
        id: 't',
        name: 'Target',
        pacerCategory: 'conceptual',
        bloomLevel: 1,
        x: 50,
        y: 50,
      };

      expect(calculateEdgeEndpoints(source, target)).toBeNull();
    });
  });

  describe('computeFitViewTransform', () => {
    it('returns default transform for empty node list', () => {
      const transform = computeFitViewTransform([], 800, 600);
      expect(transform).toEqual({ x: 0, y: 0, scale: 1 });
    });

    it('calculates centered bounding box and scale for populated nodes', () => {
      const nodes: LayoutNode[] = [
        {
          id: '1',
          name: 'N1',
          pacerCategory: 'conceptual',
          bloomLevel: 1,
          x: 100,
          y: 100,
          radius: 20,
        },
        {
          id: '2',
          name: 'N2',
          pacerCategory: 'conceptual',
          bloomLevel: 1,
          x: 500,
          y: 500,
          radius: 20,
        },
      ];

      const transform = computeFitViewTransform(nodes, 800, 600);
      expect(Number.isFinite(transform.x)).toBe(true);
      expect(Number.isFinite(transform.y)).toBe(true);
      expect(transform.scale).toBeGreaterThan(0);
      expect(transform.scale).toBeLessThanOrEqual(1.5);
    });
  });
});
