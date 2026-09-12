import { z } from 'zod';
import {
  getKnowledgeComponentsByProjectId,
  getKnowledgeDependenciesByProjectId,
} from '@/lib/db/queries/knowledge';
import { getMaterialsByProjectId } from '@/lib/db/queries/material';
import type { KnowledgeComponent, KnowledgeDependency, Material } from '@/lib/db/schema';
import { ChatbotError } from '@/lib/errors';
import { computeGraphDiagnostics, type GraphDiagnostics } from './graph-diagnostics';

export { computeGraphDiagnostics, type GraphDiagnostics };

export const projectGraphTopologyInputSchema = z.object({
  projectId: z.string().trim().min(1, 'Project ID is required'),
  userId: z.string().trim().min(1).optional(),
});

export type ProjectGraphTopologyInput = z.infer<typeof projectGraphTopologyInputSchema>;

export type ProjectGraphTopology = {
  components: KnowledgeComponent[];
  dependencies: KnowledgeDependency[];
  materials: Material[];
  diagnostics: GraphDiagnostics;
};

export type GraphNeighborKC = KnowledgeComponent & {
  depth: number;
  relationshipType?: string;
  reasoning?: string | null;
};

export type GraphNeighborhoodResult = {
  concept: KnowledgeComponent | null;
  prerequisites: GraphNeighborKC[];
  unlocked: GraphNeighborKC[];
  depth: number;
};

/**
 * Deep domain seam for knowledge graph topology resolution.
 * Decouples pedagogical graph analytics, cycle diagnostics, and in-memory DAG traversal
 * from raw database SQL queries.
 */
export async function getProjectGraphTopology(
  input: ProjectGraphTopologyInput,
): Promise<ProjectGraphTopology> {
  const parseResult = projectGraphTopologyInputSchema.safeParse(input);
  if (!parseResult.success) {
    throw new ChatbotError(
      'bad_request:api',
      parseResult.error.issues[0]?.message ?? 'Invalid project graph parameters',
    );
  }

  const { projectId, userId } = parseResult.data;

  try {
    const [components, dependencies, materials] = await Promise.all([
      getKnowledgeComponentsByProjectId({ projectId }),
      getKnowledgeDependenciesByProjectId({ projectId }),
      getMaterialsByProjectId({ projectId, userId }),
    ]);

    const diagnostics = computeGraphDiagnostics(components, dependencies);

    return {
      components,
      dependencies,
      materials,
      diagnostics,
    };
  } catch (error) {
    if (error instanceof ChatbotError) throw error;
    throw new ChatbotError('bad_request:database', { cause: error });
  }
}

/**
 * Pure in-memory pedagogical frontier algorithm.
 * Identifies knowledge components that are unlocked and ready to learn based on
 * the current learner's mastery profile, without requiring SQL queries or database mocks.
 */
export function computeReadyToLearnFrontier(
  components: KnowledgeComponent[],
  dependencies: KnowledgeDependency[],
  masteredKcIds: string[] = [],
): KnowledgeComponent[] {
  const masteredSet = new Set(masteredKcIds);

  // Filter to active, unmastered components
  const activeUnmastered = components.filter(
    (kc) => (kc.status === 'active' || !kc.status) && !masteredSet.has(kc.id),
  );

  // Group prerequisite dependencies by target concept
  // In our schema: sourceKcId -> prerequisite for -> targetKcId
  const unmasteredPrereqsByTarget = new Map<string, string[]>();
  for (const dep of dependencies) {
    if (dep.relationshipType === 'prerequisite' && !masteredSet.has(dep.sourceKcId)) {
      const list = unmasteredPrereqsByTarget.get(dep.targetKcId) ?? [];
      list.push(dep.sourceKcId);
      unmasteredPrereqsByTarget.set(dep.targetKcId, list);
    }
  }

  // A concept is on the ready-to-learn frontier if it has no unmastered prerequisites
  return activeUnmastered
    .filter((kc) => {
      const unmastered = unmasteredPrereqsByTarget.get(kc.id);
      return !unmastered || unmastered.length === 0;
    })
    .sort((a, b) => (a.orderIndex ?? 0) - (b.orderIndex ?? 0) || a.name.localeCompare(b.name));
}

function expandHop2Neighbors(
  hop1Nodes: GraphNeighborKC[],
  dependencies: KnowledgeDependency[],
  componentMap: Map<string, KnowledgeComponent>,
  direction: 'prerequisites' | 'unlocked',
  initialVisitedIds: string[],
): GraphNeighborKC[] {
  const visited = new Set(initialVisitedIds);
  const hop2Nodes: GraphNeighborKC[] = [];
  const isPrereq = direction === 'prerequisites';

  for (const node of hop1Nodes) {
    const relevantDeps = dependencies.filter((d) => {
      const matchNodeId = isPrereq ? d.targetKcId : d.sourceKcId;
      const nextNodeId = isPrereq ? d.sourceKcId : d.targetKcId;
      return matchNodeId === node.id && !visited.has(nextNodeId);
    });

    for (const d of relevantDeps) {
      const nextId = isPrereq ? d.sourceKcId : d.targetKcId;
      const c = componentMap.get(nextId);
      if (c) {
        visited.add(c.id);
        hop2Nodes.push({
          ...c,
          depth: 2,
          relationshipType: d.relationshipType,
          reasoning: d.reasoning,
        });
      }
    }
  }

  return hop2Nodes;
}

/**
 * Pure in-memory BFS graph neighborhood traversal.
 * Determines 1-hop or multi-hop prerequisites and unlocked concepts for a target KC.
 */
export function computeGraphNeighborhood(
  components: KnowledgeComponent[],
  dependencies: KnowledgeDependency[],
  targetKcIdOrSlug: string,
  depth = 1,
): GraphNeighborhoodResult {
  const safeDepth = Math.max(1, Math.min(2, Math.floor(depth)));
  const concept =
    components.find((c) => c.id === targetKcIdOrSlug || c.slug === targetKcIdOrSlug) ?? null;

  if (!concept) {
    return { concept: null, prerequisites: [], unlocked: [], depth: safeDepth };
  }

  const componentMap = new Map(components.map((c) => [c.id, c]));

  // Direct prerequisites: sourceKcId -> targetKcId (where target = concept.id)
  const hop1Prereqs: GraphNeighborKC[] = dependencies
    .filter((d) => d.targetKcId === concept.id)
    .map((d): GraphNeighborKC | null => {
      const c = componentMap.get(d.sourceKcId);
      if (!c) return null;
      return {
        ...c,
        depth: 1,
        relationshipType: d.relationshipType,
        reasoning: d.reasoning,
      };
    })
    .filter((k): k is GraphNeighborKC => k !== null);

  // Direct unlocked: sourceKcId -> targetKcId (where source = concept.id)
  const hop1Unlocked: GraphNeighborKC[] = dependencies
    .filter((d) => d.sourceKcId === concept.id)
    .map((d): GraphNeighborKC | null => {
      const c = componentMap.get(d.targetKcId);
      if (!c) return null;
      return {
        ...c,
        depth: 1,
        relationshipType: d.relationshipType,
        reasoning: d.reasoning,
      };
    })
    .filter((k): k is GraphNeighborKC => k !== null);

  let hop2Prereqs: GraphNeighborKC[] = [];
  let hop2Unlocked: GraphNeighborKC[] = [];

  if (safeDepth === 2) {
    hop2Prereqs = expandHop2Neighbors(hop1Prereqs, dependencies, componentMap, 'prerequisites', [
      concept.id,
      ...hop1Prereqs.map((p) => p.id),
    ]);
    hop2Unlocked = expandHop2Neighbors(hop1Unlocked, dependencies, componentMap, 'unlocked', [
      concept.id,
      ...hop1Unlocked.map((u) => u.id),
    ]);
  }

  return {
    concept,
    prerequisites: [...hop1Prereqs, ...hop2Prereqs],
    unlocked: [...hop1Unlocked, ...hop2Unlocked],
    depth: safeDepth,
  };
}
