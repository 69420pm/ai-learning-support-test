'use client';

import {
  BookOpen,
  Check,
  ChevronRight,
  Code2,
  Copy,
  Cpu,
  ExternalLink,
  GitBranch,
  Sparkles,
  X,
} from 'lucide-react';
import Link from 'next/link';
import { useMemo, useState } from 'react';
import { Badge } from '@/components/ui/badge';
import { Button } from '@/components/ui/button';
import { ScrollArea } from '@/components/ui/scroll-area';
import { Tabs, TabsContent, TabsList, TabsTrigger } from '@/components/ui/tabs';
import type {
  Exercise,
  KnowledgeComponent,
  MaterialChunk,
} from '@/lib/hooks/use-concept-inspection';
import type { KnowledgeDependency, Material } from '@/lib/hooks/use-project-graph';
import { getPacerColor } from '@/lib/learning/graph-layout';
import {
  BLOOM_TAXONOMY_CONFIG,
  type BloomStageInfo,
  getBloomStageInfo,
  PACER_DETAILS_CONFIG,
  type PacerDetails,
} from '@/lib/learning/graph-traversal';
import { cn } from '@/lib/utils';

export type ConceptInspectorTab = 'overview' | 'dependencies' | 'exercises' | 'source' | 'debug';

export type ConceptInspectorDrawerProps = {
  concept: KnowledgeComponent | null;
  allComponents: KnowledgeComponent[];
  dependencies: KnowledgeDependency[];
  materials: Material[];
  exercises?: Exercise[];
  chunks?: MaterialChunk[];
  projectId: string;
  defaultTab?: ConceptInspectorTab;
  onClose: () => void;
  onSelectConcept?: (kcId: string) => void;
  className?: string;
};

type PrereqItem = {
  dep: KnowledgeDependency;
  component?: KnowledgeComponent;
};

function OverviewTabContent({
  concept,
  pacerColor,
  pacerDetails,
  bloomInfo,
}: {
  concept: KnowledgeComponent;
  pacerColor: string;
  pacerDetails: PacerDetails;
  bloomInfo: BloomStageInfo;
}) {
  return (
    <TabsContent value="overview" className="m-0 space-y-5" data-testid="tab-content-overview">
      {/* Slug and Identification */}
      <div className="space-y-1.5 rounded-lg border border-border bg-background p-3.5 shadow-xs">
        <div className="text-xs font-semibold text-muted-foreground uppercase tracking-wider">
          Concept Slug &amp; Name
        </div>
        <div className="text-sm font-medium text-foreground" data-testid="concept-name">
          {concept.name}
        </div>
        <div className="font-mono text-xs text-muted-foreground" data-testid="concept-slug">
          {concept.slug}
        </div>
      </div>

      {/* PACER Classification */}
      <div
        className="space-y-2 rounded-lg border border-border bg-background p-3.5 shadow-xs"
        data-testid="concept-pacer"
      >
        <div className="flex items-center justify-between">
          <span className="text-xs font-semibold text-muted-foreground uppercase tracking-wider">
            PACER Classification
          </span>
          <span
            className="inline-flex items-center gap-1.5 text-xs font-medium px-2 py-0.5 rounded-md"
            style={{ backgroundColor: `${pacerColor}20`, color: pacerColor }}
          >
            <span className="size-2 rounded-full" style={{ backgroundColor: pacerColor }} />
            {pacerDetails.label}
          </span>
        </div>
        <p className="text-xs text-muted-foreground leading-relaxed">{pacerDetails.description}</p>
      </div>

      {/* Bloom Cognitive Level */}
      <div
        className="space-y-2.5 rounded-lg border border-border bg-background p-3.5 shadow-xs"
        data-testid="concept-bloom"
      >
        <div className="flex items-center justify-between">
          <span className="text-xs font-semibold text-muted-foreground uppercase tracking-wider">
            Bloom Cognitive Taxonomy
          </span>
          <Badge variant="secondary" className="text-xs font-semibold">
            Level {concept.bloomLevel} &bull; {bloomInfo.name}
          </Badge>
        </div>
        <div className="space-y-1">
          <div className="text-xs font-medium text-foreground" data-testid="bloom-cognitive-stage">
            Cognitive Stage: {bloomInfo.stage}
          </div>
          <p className="text-xs text-muted-foreground leading-relaxed">{bloomInfo.description}</p>
        </div>

        {/* 6-step hierarchy visual */}
        <div className="grid grid-cols-6 gap-1 pt-1">
          {[1, 2, 3, 4, 5, 6].map((lvl) => {
            const isActive = lvl === concept.bloomLevel;
            const isPassed = lvl < concept.bloomLevel;
            const item = BLOOM_TAXONOMY_CONFIG[lvl];
            return (
              <div
                key={lvl}
                className={cn(
                  'flex flex-col items-center justify-center p-1 rounded text-[10px] text-center border transition-all',
                  isActive
                    ? 'border-primary bg-primary/15 font-semibold text-primary'
                    : isPassed
                      ? 'border-border/60 bg-muted/40 text-muted-foreground'
                      : 'border-border/30 bg-muted/10 text-muted-foreground/40',
                )}
                title={`Level ${lvl}: ${item.name}`}
              >
                <span>L{lvl}</span>
                <span className="truncate w-full text-[9px]">{item.name.slice(0, 3)}</span>
              </div>
            );
          })}
        </div>
      </div>

      {/* Aliases */}
      <div
        className="space-y-2 rounded-lg border border-border bg-background p-3.5 shadow-xs"
        data-testid="concept-aliases"
      >
        <div className="text-xs font-semibold text-muted-foreground uppercase tracking-wider">
          Recognized Aliases
        </div>
        {Array.isArray(concept.aliases) && concept.aliases.length > 0 ? (
          <div className="flex flex-wrap gap-1.5 pt-0.5">
            {concept.aliases.map((alias) => (
              <Badge key={alias} variant="outline" className="text-xs font-normal">
                {alias}
              </Badge>
            ))}
          </div>
        ) : (
          <p className="text-xs text-muted-foreground italic">No aliases defined.</p>
        )}
      </div>
    </TabsContent>
  );
}

function DependencyConceptCard({
  targetId,
  component,
  reasoning,
  pacerColor,
  testId,
  onSelect,
}: {
  targetId: string;
  component?: KnowledgeComponent;
  reasoning?: string | null;
  pacerColor: string;
  testId: string;
  onSelect?: (id: string) => void;
}) {
  return (
    <div
      className="group rounded-lg border border-border bg-background p-3 shadow-xs space-y-2"
      data-testid={testId}
    >
      <div className="flex items-center justify-between">
        <Button
          type="button"
          variant="ghost"
          onClick={() => onSelect?.(targetId)}
          className="flex h-auto items-center gap-2 p-0 text-sm font-medium text-foreground hover:bg-transparent hover:text-primary transition-colors text-left"
        >
          <span className="size-2 rounded-full shrink-0" style={{ backgroundColor: pacerColor }} />
          <span>{component?.name ?? targetId}</span>
          <ChevronRight className="size-3 text-muted-foreground group-hover:text-primary transition-transform group-hover:translate-x-0.5" />
        </Button>
        {component && (
          <Badge variant="outline" className="text-[10px] h-5 shrink-0">
            L{component.bloomLevel} &bull; {component.pacerCategory}
          </Badge>
        )}
      </div>

      {reasoning && (
        <div
          className="flex items-start gap-1.5 rounded-md bg-muted/40 p-2 text-xs text-muted-foreground"
          data-testid="dependency-reasoning"
        >
          <Sparkles className="size-3.5 text-primary shrink-0 mt-0.5" />
          <p className="leading-relaxed">{reasoning}</p>
        </div>
      )}
    </div>
  );
}

function DependenciesTabContent({
  directPrerequisites,
  unlockedConcepts,
  onSelectConcept,
}: {
  directPrerequisites: PrereqItem[];
  unlockedConcepts: PrereqItem[];
  onSelectConcept?: (kcId: string) => void;
}) {
  return (
    <TabsContent
      value="dependencies"
      className="m-0 space-y-4"
      data-testid="tab-content-dependencies"
    >
      {/* Direct Prerequisites */}
      <div className="space-y-2.5" data-testid="section-prerequisites">
        <div className="flex items-center gap-1.5 text-xs font-semibold uppercase tracking-wider text-muted-foreground">
          <GitBranch className="size-3.5 text-primary rotate-180" />
          <span data-testid="direct-prerequisites-title">Direct Prerequisites</span>
          <span className="text-xs font-normal text-muted-foreground">
            ({directPrerequisites.length})
          </span>
        </div>

        {directPrerequisites.length === 0 ? (
          <div className="rounded-lg border border-dashed border-border p-3 text-center text-xs text-muted-foreground italic">
            Foundational root concept &mdash; no upstream prerequisites required.
          </div>
        ) : (
          <div className="flex flex-col gap-2" data-testid="direct-prerequisites-list">
            {directPrerequisites.map(({ dep, component }) => (
              <DependencyConceptCard
                key={dep.id}
                targetId={dep.sourceKcId}
                component={component}
                reasoning={dep.reasoning}
                pacerColor={getPacerColor(component?.pacerCategory)}
                testId={`prerequisite-item-${dep.sourceKcId}`}
                onSelect={onSelectConcept}
              />
            ))}
          </div>
        )}
      </div>

      {/* Downstream Unlocked Concepts */}
      <div className="space-y-2.5 pt-2" data-testid="section-unlocked">
        <div className="flex items-center gap-1.5 text-xs font-semibold uppercase tracking-wider text-muted-foreground">
          <GitBranch className="size-3.5 text-primary" />
          <span data-testid="unlocked-concepts-title">Unlocked Concepts</span>
          <span className="text-xs font-normal text-muted-foreground">
            ({unlockedConcepts.length})
          </span>
        </div>

        {unlockedConcepts.length === 0 ? (
          <div className="rounded-lg border border-dashed border-border p-3 text-center text-xs text-muted-foreground italic">
            Terminal concept &mdash; does not unlock downstream concepts yet.
          </div>
        ) : (
          <div className="flex flex-col gap-2" data-testid="unlocked-concepts-list">
            {unlockedConcepts.map(({ dep, component }) => (
              <DependencyConceptCard
                key={dep.id}
                targetId={dep.targetKcId}
                component={component}
                reasoning={dep.reasoning}
                pacerColor={getPacerColor(component?.pacerCategory)}
                testId={`unlocked-item-${dep.targetKcId}`}
                onSelect={onSelectConcept}
              />
            ))}
          </div>
        )}
      </div>
    </TabsContent>
  );
}

function ExercisesTabContent({ exercises }: { exercises: Exercise[] }) {
  return (
    <TabsContent value="exercises" className="m-0 space-y-4" data-testid="tab-content-exercises">
      <div className="flex items-center justify-between">
        <span className="text-xs font-semibold text-muted-foreground uppercase tracking-wider">
          Grounded Practice Problems
        </span>
        <Badge variant="secondary" className="text-xs">
          {exercises.length} problems
        </Badge>
      </div>

      {exercises.length === 0 ? (
        <div
          className="rounded-lg border border-dashed border-border p-8 text-center text-xs text-muted-foreground"
          data-testid="exercises-empty"
        >
          No grounded practice exercises generated for this concept yet.
        </div>
      ) : (
        <div className="flex flex-col gap-3" data-testid="grounded-exercises-list">
          {exercises.map((exercise) => (
            <div
              key={exercise.id}
              className="rounded-lg border border-border bg-background p-4 shadow-xs space-y-3"
              data-testid={`exercise-card-${exercise.id}`}
            >
              {/* Header & Badges */}
              <div className="flex flex-wrap items-center justify-between gap-2 border-b border-border/50 pb-2">
                <div className="flex items-center gap-1.5">
                  <Badge
                    variant="outline"
                    className="text-xs capitalize"
                    data-testid="exercise-type"
                  >
                    {exercise.questionType.replace('_', ' ')}
                  </Badge>
                  <Badge
                    variant="secondary"
                    className="text-[11px]"
                    data-testid="exercise-difficulty"
                  >
                    Difficulty {exercise.difficulty}
                  </Badge>
                </div>
                <Badge
                  variant="outline"
                  className="text-[11px] bg-muted/30"
                  data-testid="exercise-page"
                >
                  Page {exercise.pageNumber}
                </Badge>
              </div>

              {/* Title & Prompt */}
              {exercise.title && (
                <h3 className="text-sm font-semibold text-foreground">{exercise.title}</h3>
              )}
              <p
                className="text-xs text-foreground/90 whitespace-pre-wrap leading-relaxed"
                data-testid="exercise-prompt"
              >
                {exercise.prompt}
              </p>

              {/* Solution */}
              {exercise.solution && (
                <div
                  className="mt-2 rounded-md border border-primary/20 bg-primary/5 p-3 text-xs text-foreground space-y-1"
                  data-testid="exercise-solution"
                >
                  <div className="font-semibold text-primary text-[11px] uppercase tracking-wider">
                    Solution
                  </div>
                  <div className="whitespace-pre-wrap leading-relaxed">{exercise.solution}</div>
                </div>
              )}
            </div>
          ))}
        </div>
      )}
    </TabsContent>
  );
}

function SourceTabContent({
  sourceMaterial,
  chunks,
  projectId,
}: {
  sourceMaterial: Material | null;
  chunks: MaterialChunk[];
  projectId: string;
}) {
  return (
    <TabsContent value="source" className="m-0 space-y-4" data-testid="tab-content-source">
      {/* Originating Material */}
      <div
        className="rounded-lg border border-border bg-background p-4 shadow-xs space-y-2.5"
        data-testid="source-material-card"
      >
        <div className="flex items-center justify-between">
          <span className="text-xs font-semibold text-muted-foreground uppercase tracking-wider">
            Originating Material
          </span>
          {sourceMaterial && (
            <Badge variant="outline" className="text-[11px]">
              {sourceMaterial.fileType}
            </Badge>
          )}
        </div>

        {sourceMaterial ? (
          <div className="space-y-2">
            <div
              className="text-sm font-semibold text-foreground flex items-center gap-2"
              data-testid="source-material-name"
            >
              <BookOpen className="size-4 text-primary shrink-0" />
              <span>{sourceMaterial.title}</span>
            </div>
            <Link
              href={`/projects/${projectId}/materials`}
              className="inline-flex items-center gap-1 text-xs text-primary hover:underline"
              data-testid="source-material-link"
            >
              <span>View in Materials Workbench</span>
              <ExternalLink className="size-3" />
            </Link>
          </div>
        ) : (
          <p className="text-xs text-muted-foreground italic" data-testid="source-empty">
            No source material directly attributed to this concept.
          </p>
        )}
      </div>

      {/* Excerpted Chunks */}
      <div className="space-y-3">
        <div className="flex items-center justify-between">
          <span className="text-xs font-semibold text-muted-foreground uppercase tracking-wider">
            Originating Document Chunks
          </span>
          <Badge variant="secondary" className="text-xs">
            {chunks.length} chunks
          </Badge>
        </div>

        {chunks.length === 0 ? (
          <div className="rounded-lg border border-dashed border-border p-6 text-center text-xs text-muted-foreground italic">
            No extracted chunks found for this material.
          </div>
        ) : (
          <div className="flex flex-col gap-3" data-testid="source-chunks-list">
            {chunks.map((chunk) => {
              const chunkMetadata =
                typeof chunk.metadata === 'object' && chunk.metadata !== null
                  ? (chunk.metadata as Record<string, unknown>)
                  : {};
              const page = chunkMetadata.pageNumber ?? chunkMetadata.page;

              return (
                <div
                  key={chunk.id}
                  className="rounded-lg border border-border bg-background p-3.5 shadow-xs space-y-2"
                  data-testid={`chunk-card-${chunk.id}`}
                >
                  <div className="flex items-center justify-between text-xs text-muted-foreground border-b border-border/40 pb-1.5">
                    <span className="font-mono font-medium text-foreground">
                      Chunk #{chunk.chunkIndex + 1}
                    </span>
                    <div className="flex items-center gap-2">
                      {page !== undefined && (
                        <span data-testid="chunk-page">Page {String(page)}</span>
                      )}
                      {chunk.tokenCount !== undefined && (
                        <span data-testid="chunk-tokens">&bull; {chunk.tokenCount} tokens</span>
                      )}
                    </div>
                  </div>
                  <p
                    className="font-mono text-xs text-foreground/90 whitespace-pre-wrap leading-relaxed line-clamp-6 hover:line-clamp-none transition-all"
                    data-testid="chunk-content"
                  >
                    {chunk.content}
                  </p>
                </div>
              );
            })}
          </div>
        )}
      </div>
    </TabsContent>
  );
}

function DebugTabContent({
  concept,
  rawJsonData,
  hasEmbedding,
  copied,
  onCopyJson,
}: {
  concept: KnowledgeComponent;
  rawJsonData: Record<string, unknown>;
  hasEmbedding: boolean;
  copied: boolean;
  onCopyJson: () => void;
}) {
  return (
    <TabsContent value="debug" className="m-0 space-y-4" data-testid="tab-content-debug">
      {/* Vector Embedding Diagnostics */}
      <div
        className="rounded-lg border border-border bg-background p-4 shadow-xs space-y-2.5"
        data-testid="embedding-diagnostics"
      >
        <div className="flex items-center justify-between">
          <span className="text-xs font-semibold text-muted-foreground uppercase tracking-wider flex items-center gap-1.5">
            <Cpu className="size-3.5 text-primary" />
            Vector Embedding Diagnostics
          </span>
          <Badge
            variant={hasEmbedding ? 'default' : 'secondary'}
            className="text-[11px]"
            data-testid="embedding-status"
          >
            {hasEmbedding ? '768-dim Indexed' : 'No Embedding'}
          </Badge>
        </div>
        <div className="text-xs text-muted-foreground space-y-1">
          <div>
            <span className="font-medium text-foreground">Model &amp; Dimensions: </span>
            <span data-testid="embedding-dimensions">
              {hasEmbedding ? '768 dimensions (text-embedding-004)' : 'None (no embedding indexed)'}
            </span>
          </div>
          <div>
            <span className="font-medium text-foreground">Storage Column: </span>
            <span className="font-mono">knowledge_components.embedding</span>
          </div>
        </div>
      </div>

      {/* Extraction Run Timestamps */}
      <div
        className="rounded-lg border border-border bg-background p-3.5 shadow-xs space-y-2"
        data-testid="extraction-timestamps"
      >
        <div className="text-xs font-semibold text-muted-foreground uppercase tracking-wider">
          Extraction &amp; Ingestion Timestamps
        </div>
        <div className="grid grid-cols-2 gap-2 text-xs">
          <div>
            <div className="text-muted-foreground">Created:</div>
            <div className="font-mono text-foreground font-medium">
              {concept.createdAt ? new Date(concept.createdAt).toLocaleString() : 'N/A'}
            </div>
          </div>
          <div>
            <div className="text-muted-foreground">Updated:</div>
            <div className="font-mono text-foreground font-medium">
              {concept.updatedAt ? new Date(concept.updatedAt).toLocaleString() : 'N/A'}
            </div>
          </div>
        </div>
      </div>

      {/* Complete Raw JSON Record */}
      <div
        className="rounded-lg border border-border bg-background p-3.5 shadow-xs space-y-2"
        data-testid="raw-json-payload"
      >
        <div className="flex items-center justify-between">
          <span className="text-xs font-semibold text-muted-foreground uppercase tracking-wider flex items-center gap-1.5">
            <Code2 className="size-3.5" />
            Raw Database Record JSON
          </span>
          <Button
            variant="outline"
            size="sm"
            onClick={onCopyJson}
            className="h-7 gap-1.5 text-xs"
            data-testid="copy-json-button"
          >
            {copied ? (
              <>
                <Check className="size-3 text-primary" />
                <span className="text-primary font-medium" data-testid="copy-json-success">
                  Copied!
                </span>
              </>
            ) : (
              <>
                <Copy className="size-3" />
                <span>Copy JSON</span>
              </>
            )}
          </Button>
        </div>

        <div className="relative max-h-96 overflow-auto rounded-md bg-muted/40 p-3 border border-border/60">
          <pre className="font-mono text-[11px] text-foreground leading-snug">
            <code data-testid="raw-json-code">{JSON.stringify(rawJsonData, null, 2)}</code>
          </pre>
        </div>
      </div>
    </TabsContent>
  );
}

export function ConceptInspectorDrawer({
  concept,
  allComponents,
  dependencies,
  materials,
  exercises = [],
  chunks = [],
  projectId,
  defaultTab = 'overview',
  onClose,
  onSelectConcept,
  className,
}: ConceptInspectorDrawerProps) {
  const [activeTab, setActiveTab] = useState<ConceptInspectorTab>(defaultTab);
  const [copied, setCopied] = useState(false);

  // Lookup map for fast component resolution
  const componentMap = useMemo(() => {
    const map = new Map<string, KnowledgeComponent>();
    for (const c of allComponents) {
      map.set(c.id, c);
    }
    return map;
  }, [allComponents]);

  // Find source material
  const sourceMaterial = useMemo(() => {
    if (!concept?.sourceMaterialId) return null;
    return materials.find((m) => m.id === concept.sourceMaterialId) ?? null;
  }, [concept?.sourceMaterialId, materials]);

  // Direct prerequisites
  const directPrerequisites = useMemo(() => {
    if (!concept) return [];
    return dependencies
      .filter((d) => d.targetKcId === concept.id)
      .map((dep) => ({
        dep,
        component: componentMap.get(dep.sourceKcId),
      }));
  }, [concept, dependencies, componentMap]);

  // Downstream unlocked concepts
  const unlockedConcepts = useMemo(() => {
    if (!concept) return [];
    return dependencies
      .filter((d) => d.sourceKcId === concept.id)
      .map((dep) => ({
        dep,
        component: componentMap.get(dep.targetKcId),
      }));
  }, [concept, dependencies, componentMap]);

  if (!concept) {
    return null;
  }

  const pacerColor = getPacerColor(concept.pacerCategory);
  const pacerDetails = PACER_DETAILS_CONFIG[concept.pacerCategory] ?? {
    label: concept.pacerCategory ?? 'Conceptual',
    color: pacerColor,
    description: 'Knowledge component category classification.',
  };
  const bloomInfo = getBloomStageInfo(concept.bloomLevel);

  // Parse embedding status
  const rawEmbedding = concept.embedding as unknown;
  const hasEmbedding =
    Boolean(rawEmbedding) &&
    ((Array.isArray(rawEmbedding) && rawEmbedding.length > 0) ||
      (typeof rawEmbedding === 'string' && rawEmbedding.length > 2));

  const rawJsonData = {
    component: concept,
    exercises,
    chunks,
    prerequisites: directPrerequisites.map((p) => ({
      sourceKcId: p.dep.sourceKcId,
      name: p.component?.name,
      relationship: p.dep.relationshipType,
      reasoning: p.dep.reasoning,
    })),
    unlocked: unlockedConcepts.map((u) => ({
      targetKcId: u.dep.targetKcId,
      name: u.component?.name,
      relationship: u.dep.relationshipType,
      reasoning: u.dep.reasoning,
    })),
  };

  const handleCopyJson = async () => {
    try {
      await navigator.clipboard.writeText(JSON.stringify(rawJsonData, null, 2));
      setCopied(true);
      setTimeout(() => setCopied(false), 2000);
    } catch {
      // Fallback
    }
  };

  return (
    <div
      className={cn(
        'flex h-full w-full sm:w-[460px] md:w-[500px] lg:w-[540px] flex-col border-l border-border bg-card shadow-2xl z-20 transition-all duration-300 animate-in slide-in-from-right',
        className,
      )}
      data-testid="concept-inspector-drawer"
    >
      {/* Header */}
      <div className="flex items-start justify-between gap-3 border-b border-border p-4 bg-muted/20">
        <div className="flex flex-col gap-1.5 min-w-0">
          <div className="flex flex-wrap items-center gap-2">
            <Badge
              variant="outline"
              className="font-medium text-xs border"
              style={{ borderColor: pacerColor, color: pacerColor }}
              data-testid="inspector-pacer-badge"
            >
              {pacerDetails.label}
            </Badge>
            <Badge variant="secondary" className="text-xs" data-testid="inspector-bloom-badge">
              L{concept.bloomLevel} &bull; {bloomInfo.name}
            </Badge>
          </div>
          <h2
            className="text-base font-semibold text-foreground truncate drop-shadow-sm"
            data-testid="inspector-concept-title"
            title={concept.name}
          >
            {concept.name}
          </h2>
        </div>
        <Button
          variant="ghost"
          size="sm"
          onClick={onClose}
          className="size-8 p-0 text-muted-foreground hover:text-foreground shrink-0 rounded-full"
          aria-label="Close concept inspector"
          data-testid="concept-inspector-close"
        >
          <X className="size-4" />
        </Button>
      </div>

      {/* Tabs */}
      <Tabs
        value={activeTab}
        onValueChange={(val) => setActiveTab(val as ConceptInspectorTab)}
        className="flex flex-1 flex-col overflow-hidden"
      >
        <div className="border-b border-border px-4 py-2 bg-muted/10">
          <TabsList className="grid w-full grid-cols-5 h-8 p-0.5 bg-muted/60 text-xs">
            <TabsTrigger
              value="overview"
              className="text-[11px] px-1 truncate"
              data-testid="tab-trigger-overview"
            >
              Overview
            </TabsTrigger>
            <TabsTrigger
              value="dependencies"
              className="text-[11px] px-1 truncate"
              data-testid="tab-trigger-dependencies"
            >
              Dependencies
            </TabsTrigger>
            <TabsTrigger
              value="exercises"
              className="text-[11px] px-1 truncate"
              data-testid="tab-trigger-exercises"
            >
              Exercises {exercises.length > 0 && `(${exercises.length})`}
            </TabsTrigger>
            <TabsTrigger
              value="source"
              className="text-[11px] px-1 truncate"
              data-testid="tab-trigger-source"
            >
              Source
            </TabsTrigger>
            <TabsTrigger
              value="debug"
              className="text-[11px] px-1 truncate"
              data-testid="tab-trigger-debug"
            >
              Debug
            </TabsTrigger>
          </TabsList>
        </div>

        <ScrollArea className="flex-1 p-4">
          <OverviewTabContent
            concept={concept}
            pacerColor={pacerColor}
            pacerDetails={pacerDetails}
            bloomInfo={bloomInfo}
          />
          <DependenciesTabContent
            directPrerequisites={directPrerequisites}
            unlockedConcepts={unlockedConcepts}
            onSelectConcept={onSelectConcept}
          />
          <ExercisesTabContent exercises={exercises} />
          <SourceTabContent sourceMaterial={sourceMaterial} chunks={chunks} projectId={projectId} />
          <DebugTabContent
            concept={concept}
            rawJsonData={rawJsonData}
            hasEmbedding={hasEmbedding}
            copied={copied}
            onCopyJson={handleCopyJson}
          />
        </ScrollArea>
      </Tabs>
    </div>
  );
}
