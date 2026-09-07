'use client';

import { ChevronLeft, FileText, FolderKanban, MessageSquare, Network } from 'lucide-react';
import Link from 'next/link';
import { usePathname } from 'next/navigation';
import { Button } from '@/components/ui/button';
import { cn } from '@/lib/utils';

export type ProjectNavProps = {
  projectId: string;
  projectName: string;
  className?: string;
};

type WorkspaceTab = {
  key: string;
  label: string;
  hrefSuffix: string;
  icon: typeof MessageSquare;
  testId: string;
  isActive: (pathname: string, basePath: string) => boolean;
};

const WORKSPACE_TABS: readonly WorkspaceTab[] = [
  {
    key: 'chat',
    label: 'Chat',
    hrefSuffix: '/chat',
    icon: MessageSquare,
    testId: 'project-nav-chat',
    isActive: (pathname, basePath) =>
      pathname === basePath || pathname.startsWith(`${basePath}/chat`),
  },
  {
    key: 'graph',
    label: 'Knowledge Graph',
    hrefSuffix: '/graph',
    icon: Network,
    testId: 'project-nav-graph',
    isActive: (pathname, basePath) => pathname.startsWith(`${basePath}/graph`),
  },
  {
    key: 'materials',
    label: 'Materials',
    hrefSuffix: '/materials',
    icon: FileText,
    testId: 'project-nav-materials',
    isActive: (pathname, basePath) => pathname.startsWith(`${basePath}/materials`),
  },
] as const;

export function ProjectNav({ projectId, projectName, className }: ProjectNavProps) {
  const pathname = usePathname();
  const basePath = `/projects/${projectId}`;

  return (
    <nav
      className={cn(
        'sticky top-0 z-40 flex h-12 w-full shrink-0 items-center justify-between border-b border-border bg-card/80 px-4 backdrop-blur supports-[backdrop-filter]:bg-card/60',
        className,
      )}
      data-testid="project-nav"
      aria-label="Project Navigation"
    >
      {/* Left: Back Link & Project Title */}
      <div className="flex items-center gap-3 min-w-0">
        <Button
          asChild
          variant="ghost"
          size="sm"
          className="h-8 gap-1 px-2 text-xs text-muted-foreground hover:text-foreground"
          data-testid="project-nav-back"
        >
          <Link href="/">
            <ChevronLeft className="size-4" />
            <span className="hidden sm:inline">All Projects</span>
          </Link>
        </Button>

        <div className="h-4 w-px bg-border shrink-0" />

        <div className="flex items-center gap-2 min-w-0" data-testid="project-nav-title-container">
          <FolderKanban className="size-4 shrink-0 text-primary" />
          <span
            className="truncate text-xs sm:text-sm font-semibold text-foreground max-w-[120px] sm:max-w-[200px]"
            title={projectName}
            data-testid="project-nav-title"
          >
            {projectName}
          </span>
        </div>
      </div>

      {/* Right: Tabbed Mode Switcher */}
      <div
        className="flex items-center gap-1 rounded-lg bg-muted/60 p-1 text-xs"
        role="tablist"
        aria-label="Project workspaces"
        data-testid="project-nav-tabs"
      >
        {WORKSPACE_TABS.map((tab) => {
          const isTabActive = tab.isActive(pathname, basePath);
          const TabIcon = tab.icon;

          return (
            <Link
              key={tab.key}
              href={`${basePath}${tab.hrefSuffix}`}
              role="tab"
              aria-selected={isTabActive}
              data-testid={tab.testId}
              className={cn(
                'flex items-center gap-1.5 rounded-md px-2.5 py-1 font-medium transition-all',
                isTabActive
                  ? 'bg-background text-foreground shadow-sm'
                  : 'text-muted-foreground hover:text-foreground hover:bg-background/50',
              )}
            >
              <TabIcon className="size-3.5" />
              <span>{tab.label}</span>
            </Link>
          );
        })}
      </div>
    </nav>
  );
}
