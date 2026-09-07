export default async function ProjectMaterialsPage({
  params,
}: {
  params: Promise<{ projectId: string }>;
}) {
  const { projectId } = await params;

  return (
    <div
      className="flex h-full w-full flex-col p-6"
      data-testid="project-materials-page"
      data-project-id={projectId}
    >
      <div className="flex items-center justify-between border-b pb-4">
        <div>
          <h1 className="text-xl font-bold tracking-tight">Materials Workbench</h1>
          <p className="text-sm text-muted-foreground">
            Upload, inspect, and manage learning materials, extraction pipelines, and chunks.
          </p>
        </div>
      </div>
      <div className="flex flex-1 items-center justify-center rounded-lg border border-dashed border-border/80 my-4 text-center">
        <div className="max-w-md p-6">
          <p className="text-sm font-medium text-foreground">Dedicated Materials Workbench</p>
          <p className="text-xs text-muted-foreground mt-1">
            Full-width ingestion monitoring, chunk inspection, and batch concept extraction.
          </p>
        </div>
      </div>
    </div>
  );
}
