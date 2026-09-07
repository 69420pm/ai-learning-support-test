import { KnowledgeGraphWorkbench } from '@/components/knowledge-graph/knowledge-graph-workbench';

export default async function ProjectGraphPage({
  params,
}: {
  params: Promise<{ projectId: string }>;
}) {
  const { projectId } = await params;

  return (
    <div
      className="flex h-full w-full flex-col overflow-hidden"
      data-testid="project-graph-page"
      data-project-id={projectId}
    >
      <KnowledgeGraphWorkbench projectId={projectId} />
    </div>
  );
}
