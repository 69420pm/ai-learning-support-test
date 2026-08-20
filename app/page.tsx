import { ArrowRight, BookOpen, Brain, Clock, Sparkles } from 'lucide-react';
import Link from 'next/link';
import { ProjectsGrid } from '@/components/projects/projects-grid';
import { Badge } from '@/components/ui/badge';
import { Button } from '@/components/ui/button';
import { Card, CardDescription, CardHeader, CardTitle } from '@/components/ui/card';
import { getCurrentUser } from '@/lib/auth/session';
import { getProjectsWithChatCount } from '@/lib/db/queries/project';

export default async function Home() {
  const authenticatedUser = await getCurrentUser();

  if (authenticatedUser) {
    const displayName = authenticatedUser.fullName || authenticatedUser.email;
    let initialProjects: Awaited<ReturnType<typeof getProjectsWithChatCount>> = [];
    if (authenticatedUser.id) {
      try {
        initialProjects = await getProjectsWithChatCount({ userId: authenticatedUser.id });
      } catch {
        // Fallback to empty array if query fails
      }
    }

    return <ProjectsGrid initialProjects={initialProjects} userName={displayName} />;
  }

  // Unauthenticated Visitor View (Public Landing)
  return (
    <div className="w-full min-h-[calc(100vh-3.5rem)] bg-background p-4 sm:p-6 lg:p-8 flex flex-col items-center justify-center">
      <div className="mx-auto max-w-4xl flex flex-col items-center text-center gap-8 py-12">
        <Badge variant="secondary" className="gap-1.5 px-3 py-1 text-sm font-medium">
          <Sparkles className="size-4 text-primary" />
          Active Learning Platform
        </Badge>

        <div className="flex flex-col gap-4 max-w-2xl">
          <h1 className="font-extrabold text-3xl sm:text-5xl tracking-tight text-foreground">
            Document-Grounded Active Learning
          </h1>
          <p className="text-muted-foreground text-base sm:text-lg leading-relaxed">
            Combine PDF ingestion, GraphRAG knowledge structuring, FSRS spaced repetition, and
            Feynman explanation audits into a personalized AI learning engine.
          </p>
        </div>

        <div className="flex flex-wrap items-center justify-center gap-4">
          <Button asChild size="lg" className="gap-2 font-medium px-6">
            <Link href="/signup">
              <span>Get Started</span>
              <ArrowRight className="size-4" />
            </Link>
          </Button>
          <Button asChild variant="outline" size="lg" className="font-medium px-6">
            <Link href="/login">Sign In</Link>
          </Button>
        </div>

        <div className="grid grid-cols-1 sm:grid-cols-3 gap-4 w-full mt-6 text-left">
          <Card className="border-border shadow-xs">
            <CardHeader className="space-y-1.5 p-5">
              <BookOpen className="size-6 text-primary mb-1" />
              <CardTitle className="font-semibold text-base">Material Ingestion</CardTitle>
              <CardDescription className="text-xs leading-normal">
                Upload PDFs and structure concept nodes automatically with vector embeddings.
              </CardDescription>
            </CardHeader>
          </Card>

          <Card className="border-border shadow-xs">
            <CardHeader className="space-y-1.5 p-5">
              <Brain className="size-6 text-primary mb-1" />
              <CardTitle className="font-semibold text-base">Feynman Audits</CardTitle>
              <CardDescription className="text-xs leading-normal">
                Test your conceptual clarity with AI-guided explanation reviews and gap analysis.
              </CardDescription>
            </CardHeader>
          </Card>

          <Card className="border-border shadow-xs">
            <CardHeader className="space-y-1.5 p-5">
              <Clock className="size-6 text-primary mb-1" />
              <CardTitle className="font-semibold text-base">FSRS Scheduling</CardTitle>
              <CardDescription className="text-xs leading-normal">
                Retain material long-term with dynamic spaced repetition scheduling.
              </CardDescription>
            </CardHeader>
          </Card>
        </div>
      </div>
    </div>
  );
}
