export default async function ProjectGraphPage({
  params,
}: {
  params: Promise<{ projectId: string }>;
}) {
  const { projectId } = await params;

  return (
    <div
      className="flex h-full w-full flex-col p-6"
      data-testid="project-graph-page"
      data-project-id={projectId}
    >
      <div className="flex items-center justify-between border-b pb-4">
        <div>
          <h1 className="text-xl font-bold tracking-tight">Knowledge Graph</h1>
          <p className="text-sm text-muted-foreground">
            Explore concepts, prerequisite dependencies, and learning mastery flows.
          </p>
        </div>
      </div>
      <div className="flex flex-1 items-center justify-center rounded-lg border border-dashed border-border/80 my-4 text-center">
        <div className="max-w-md p-6">
          <p className="text-sm font-medium text-foreground">Interactive Knowledge Graph</p>
          <p className="text-xs text-muted-foreground mt-1">
            Visual topological canvas rendering concept nodes and prerequisite dependencies.
          </p>
        </div>
      </div>
    </div>
  );
}
