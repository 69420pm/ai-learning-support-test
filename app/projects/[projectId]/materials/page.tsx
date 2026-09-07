import { MaterialWorkbench } from '@/components/document/material-workbench';

export default async function ProjectMaterialsPage({
  params,
}: {
  params: Promise<{ projectId: string }>;
}) {
  const { projectId } = await params;

  return (
    <div
      className="flex h-full w-full flex-col overflow-hidden"
      data-testid="project-materials-page"
      data-project-id={projectId}
    >
      <MaterialWorkbench projectId={projectId} />
    </div>
  );
}
