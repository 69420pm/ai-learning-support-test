'use client';

import {
  ChevronLeft,
  FolderKanban,
  Menu,
  PanelLeftClose,
  PanelLeftOpen,
  SquarePen,
} from 'lucide-react';
import Link from 'next/link';
import { useState } from 'react';
import { SidebarHistory } from '@/components/chat/sidebar-history';
import { Button } from '@/components/ui/button';
import { cn } from '@/lib/utils';

export type ChatSidebarProps = {
  user?: {
    email?: string;
    fullName?: string;
  };
  projectId?: string;
  projectName?: string;
  className?: string;
};

export function ChatSidebar({ user, projectId, projectName, className }: ChatSidebarProps) {
  const [isOpen, setIsOpen] = useState(true);
  const [isMobileOpen, setIsMobileOpen] = useState(false);

  const newChatHref = projectId ? `/projects/${projectId}/chat` : '/';

  return (
    <>
      {/* Mobile Toggle Button */}
      <div className="fixed top-3 left-4 z-40 md:hidden">
        <Button
          variant="outline"
          size="icon"
          className="size-8"
          onClick={() => setIsMobileOpen((prev) => !prev)}
          aria-label="Toggle chat history"
          data-testid="mobile-sidebar-toggle"
        >
          <Menu className="size-4" />
        </Button>
      </div>

      {/* Mobile Backdrop */}
      {isMobileOpen && (
        <div
          className="fixed inset-0 z-40 bg-background/80 backdrop-blur-sm md:hidden"
          onClick={() => setIsMobileOpen(false)}
          onKeyDown={(e) => {
            if (e.key === 'Escape') setIsMobileOpen(false);
          }}
          tabIndex={-1}
          aria-hidden="true"
        />
      )}

      {/* Sidebar Container */}
      <aside
        className={cn(
          'flex h-full flex-col border-r border-border bg-card/50 transition-all duration-200 ease-in-out',
          // Desktop collapsed/expanded width
          isOpen ? 'w-64' : 'w-0 overflow-hidden md:w-14',
          // Mobile open overlay vs hidden
          isMobileOpen
            ? 'fixed inset-y-0 left-0 z-50 w-72 shadow-xl md:relative md:z-0 md:shadow-none'
            : 'hidden md:flex',
          className,
        )}
        data-testid="chat-sidebar"
      >
        {/* Sidebar Header & Project Back Link */}
        <div className="flex flex-col border-b border-border/50 p-2 gap-2">
          {isOpen && (
            <div className="flex items-center justify-between px-1 pt-1">
              <Button
                asChild
                variant="ghost"
                size="sm"
                className="h-7 -ml-1 gap-1 px-1.5 text-xs text-muted-foreground hover:text-foreground"
                data-testid="back-to-projects-link"
              >
                <Link href="/">
                  <ChevronLeft className="size-3.5" />
                  <span>All Projects</span>
                </Link>
              </Button>

              {/* Desktop Toggle Button */}
              <Button
                variant="ghost"
                size="icon"
                className="hidden size-7 shrink-0 md:flex text-muted-foreground hover:text-foreground"
                onClick={() => setIsOpen((prev) => !prev)}
                aria-label={isOpen ? 'Collapse sidebar' : 'Expand sidebar'}
                data-testid="toggle-sidebar-button"
              >
                {isOpen ? (
                  <PanelLeftClose className="size-3.5" />
                ) : (
                  <PanelLeftOpen className="size-3.5" />
                )}
              </Button>
            </div>
          )}

          {isOpen && projectName && (
            <div className="flex items-center gap-1.5 px-2 py-0.5 text-xs font-semibold text-foreground truncate">
              <FolderKanban className="size-3.5 shrink-0 text-primary" />
              <span className="truncate" title={projectName} data-testid="sidebar-project-name">
                {projectName}
              </span>
            </div>
          )}

          <div className="flex items-center justify-between">
            <Button
              asChild
              variant="outline"
              size="sm"
              className={cn(
                'h-8 justify-start gap-2 text-xs font-medium transition-all',
                isOpen ? 'w-full' : 'size-8 justify-center p-0 md:w-8',
              )}
              onClick={() => setIsMobileOpen(false)}
              data-testid="new-chat-button"
            >
              <Link href={newChatHref}>
                <SquarePen className="size-4 shrink-0" />
                {isOpen && <span className="truncate">New Chat</span>}
              </Link>
            </Button>

            {!isOpen && (
              <Button
                variant="ghost"
                size="icon"
                className="hidden size-8 shrink-0 md:flex mt-1"
                onClick={() => setIsOpen((prev) => !prev)}
                aria-label="Expand sidebar"
                data-testid="toggle-sidebar-button"
              >
                <PanelLeftOpen className="size-4" />
              </Button>
            )}
          </div>
        </div>

        {/* Sidebar History Content */}
        {isOpen && (
          <div className="flex-1 overflow-hidden">
            <SidebarHistory
              user={user}
              projectId={projectId}
              onSelectChat={() => setIsMobileOpen(false)}
            />
          </div>
        )}
      </aside>
    </>
  );
}
