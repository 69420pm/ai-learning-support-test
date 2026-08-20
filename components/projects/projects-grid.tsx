'use client';

import { FolderKanban, Plus, Search, Sparkles } from 'lucide-react';
import { useState } from 'react';
import useSWR from 'swr';
import { CreateProjectDialog } from '@/components/projects/create-project-dialog';
import { DeleteProjectDialog } from '@/components/projects/delete-project-dialog';
import { EditProjectDialog } from '@/components/projects/edit-project-dialog';
import { ProjectCard, type ProjectItem } from '@/components/projects/project-card';
import { Badge } from '@/components/ui/badge';
import { Button } from '@/components/ui/button';
import { Card, CardContent } from '@/components/ui/card';
import { Input } from '@/components/ui/input';
import { fetcher } from '@/lib/utils';

type ProjectsGridProps = {
  initialProjects?: ProjectItem[];
  userName?: string;
};

export function ProjectsGrid({ initialProjects = [], userName }: ProjectsGridProps) {
  const { data, mutate, isLoading } = useSWR<{ projects: ProjectItem[] }>(
    '/api/projects',
    fetcher,
    {
      fallbackData: { projects: initialProjects },
      revalidateOnFocus: true,
    },
  );

  const [searchQuery, setSearchQuery] = useState('');
  const [isCreateOpen, setIsCreateOpen] = useState(false);
  const [editingProject, setEditingProject] = useState<ProjectItem | null>(null);
  const [deletingProject, setDeletingProject] = useState<ProjectItem | null>(null);

  const projects = data?.projects || [];

  const filteredProjects = projects.filter((p) =>
    p.name.toLowerCase().includes(searchQuery.trim().toLowerCase()),
  );

  return (
    <div className="w-full min-h-[calc(100vh-3.5rem)] bg-background p-4 sm:p-6 lg:p-8">
      <div className="mx-auto max-w-7xl flex flex-col gap-6">
        {/* Header Banner */}
        <div className="flex flex-col md:flex-row md:items-center justify-between gap-4 border-b border-border/60 pb-6">
          <div className="flex flex-col gap-1.5">
            <div className="flex items-center gap-2">
              <Badge variant="outline" className="gap-1.5 px-2.5 py-0.5 text-xs font-medium">
                <Sparkles className="size-3.5 text-primary" />
                Active Learning Platform
              </Badge>
            </div>
            <h1
              className="font-bold text-2xl sm:text-3xl tracking-tight text-foreground"
              data-testid="dashboard-heading"
            >
              Projects
            </h1>
            <p className="text-muted-foreground text-sm" data-testid="dashboard-welcome">
              {userName
                ? `Welcome back, ${userName}! Select or create a project to continue learning.`
                : 'Select or create a project to organize your study sessions.'}
            </p>
          </div>

          <div className="flex items-center gap-3">
            <Button
              onClick={() => setIsCreateOpen(true)}
              className="gap-2 shadow-xs shrink-0"
              data-testid="new-project-button"
            >
              <Plus className="size-4" />
              <span>New Project</span>
            </Button>
          </div>
        </div>

        {/* Search / Filter Bar */}
        {projects.length > 0 && (
          <div className="flex items-center max-w-md relative">
            <Search className="absolute left-3 size-4 text-muted-foreground" />
            <Input
              placeholder="Search projects..."
              value={searchQuery}
              onChange={(e) => setSearchQuery(e.target.value)}
              className="pl-9"
              data-testid="search-projects-input"
            />
          </div>
        )}

        {/* Projects Grid Content */}
        {isLoading && projects.length === 0 ? (
          <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-3 gap-4">
            {[1, 2, 3].map((i) => (
              <div
                key={i}
                className="h-32 animate-pulse rounded-xl border border-border bg-muted/40"
              />
            ))}
          </div>
        ) : projects.length === 0 ? (
          /* Empty State: No projects created yet */
          <Card
            className="border-dashed border-2 border-border/80 bg-card/50"
            data-testid="empty-projects-state"
          >
            <CardContent className="flex flex-col items-center justify-center py-16 text-center">
              <div className="flex size-14 items-center justify-center rounded-2xl bg-primary/10 text-primary mb-4">
                <FolderKanban className="size-7" />
              </div>
              <h2 className="font-semibold text-lg text-foreground mb-1">No projects yet</h2>
              <p className="text-muted-foreground text-sm max-w-sm mb-6">
                Create your first project to start organizing your chats and learning materials by
                subject or topic.
              </p>
              <Button
                onClick={() => setIsCreateOpen(true)}
                className="gap-2"
                data-testid="create-first-project-button"
              >
                <Plus className="size-4" />
                <span>Create Your First Project</span>
              </Button>
            </CardContent>
          </Card>
        ) : filteredProjects.length === 0 ? (
          /* Empty Search State */
          <div className="flex flex-col items-center justify-center py-12 text-center">
            <p className="text-muted-foreground text-sm">
              No projects found matching &quot;{searchQuery}&quot;
            </p>
          </div>
        ) : (
          /* Grid of Projects */
          <div
            className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-3 gap-4"
            data-testid="projects-grid"
          >
            {filteredProjects.map((project) => (
              <ProjectCard
                key={project.id}
                project={project}
                onEdit={(p) => setEditingProject(p)}
                onDelete={(p) => setDeletingProject(p)}
              />
            ))}
          </div>
        )}
      </div>

      {/* Dialog Modals */}
      <CreateProjectDialog
        open={isCreateOpen}
        onOpenChange={setIsCreateOpen}
        onSuccess={() => mutate()}
      />

      <EditProjectDialog
        project={editingProject}
        open={!!editingProject}
        onOpenChange={(open) => {
          if (!open) setEditingProject(null);
        }}
        onSuccess={() => mutate()}
      />

      <DeleteProjectDialog
        project={deletingProject}
        open={!!deletingProject}
        onOpenChange={(open) => {
          if (!open) setDeletingProject(null);
        }}
        onSuccess={() => mutate()}
      />
    </div>
  );
}
