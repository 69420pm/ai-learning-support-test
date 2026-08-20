'use client';

import { FolderKanban, MessageSquare, MoreVertical, Pencil, Trash2 } from 'lucide-react';
import Link from 'next/link';
import { Badge } from '@/components/ui/badge';
import { Button } from '@/components/ui/button';
import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card';
import {
  DropdownMenu,
  DropdownMenuContent,
  DropdownMenuItem,
  DropdownMenuTrigger,
} from '@/components/ui/dropdown-menu';

export type ProjectItem = {
  id: string;
  name: string;
  userId: string;
  createdAt: string | Date;
  updatedAt: string | Date;
  chatCount?: number;
};

type ProjectCardProps = {
  project: ProjectItem;
  onEdit: (project: ProjectItem) => void;
  onDelete: (project: ProjectItem) => void;
};

function formatDate(date: string | Date): string {
  const d = new Date(date);
  return d.toLocaleDateString(undefined, {
    month: 'short',
    day: 'numeric',
    year: 'numeric',
  });
}

export function ProjectCard({ project, onEdit, onDelete }: ProjectCardProps) {
  const chatCount = Number(project.chatCount ?? 0);

  return (
    <Card
      className="group relative flex flex-col justify-between border-border bg-card transition-all duration-150 hover:border-primary/50 hover:shadow-md"
      data-testid={`project-card-${project.id}`}
    >
      <Link
        href={`/projects/${project.id}/chat`}
        className="absolute inset-0 z-0 rounded-lg focus:outline-hidden focus:ring-2 focus:ring-primary"
        aria-label={`Open project ${project.name}`}
      />

      <CardHeader className="flex flex-row items-start justify-between space-y-0 pb-3">
        <div className="flex items-center gap-2.5 min-w-0 pr-2">
          <div className="flex size-9 shrink-0 items-center justify-center rounded-lg bg-primary/10 text-primary transition-colors group-hover:bg-primary/20">
            <FolderKanban className="size-4" />
          </div>
          <CardTitle
            className="truncate font-semibold text-base text-foreground group-hover:text-primary transition-colors"
            title={project.name}
            data-testid={`project-title-${project.id}`}
          >
            {project.name}
          </CardTitle>
        </div>

        {/* Action Dropdown Menu */}
        <div className="relative z-10">
          <DropdownMenu>
            <DropdownMenuTrigger asChild>
              <Button
                variant="ghost"
                size="icon"
                className="size-8 text-muted-foreground hover:text-foreground"
                data-testid={`project-actions-${project.id}`}
              >
                <MoreVertical className="size-4" />
                <span className="sr-only">Project actions</span>
              </Button>
            </DropdownMenuTrigger>
            <DropdownMenuContent align="end" className="w-40">
              <DropdownMenuItem
                onSelect={() => onEdit(project)}
                onClick={(e) => {
                  e.stopPropagation();
                  onEdit(project);
                }}
                data-testid={`edit-project-action-${project.id}`}
              >
                <Pencil className="mr-2 size-3.5" />
                <span>Rename</span>
              </DropdownMenuItem>
              <DropdownMenuItem
                onSelect={() => onDelete(project)}
                onClick={(e) => {
                  e.stopPropagation();
                  onDelete(project);
                }}
                className="text-destructive focus:bg-destructive/10 focus:text-destructive"
                data-testid={`delete-project-action-${project.id}`}
              >
                <Trash2 className="mr-2 size-3.5" />
                <span>Delete</span>
              </DropdownMenuItem>
            </DropdownMenuContent>
          </DropdownMenu>
        </div>
      </CardHeader>

      <CardContent className="flex items-center justify-between pt-0 text-muted-foreground text-xs">
        <Badge variant="secondary" className="gap-1 px-2 py-0.5 text-xs font-normal">
          <MessageSquare className="size-3" />
          <span>
            {chatCount} {chatCount === 1 ? 'chat' : 'chats'}
          </span>
        </Badge>
        <span>Updated {formatDate(project.updatedAt)}</span>
      </CardContent>
    </Card>
  );
}
