import { redirect } from 'next/navigation';

export default async function ProjectDefaultPage({
  params,
}: {
  params: Promise<{ projectId: string }>;
}) {
  const { projectId } = await params;
  redirect(`/projects/${projectId}/chat`);
}
