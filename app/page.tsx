import {
  ArrowRight,
  BookOpen,
  Brain,
  CheckCircle2,
  Clock,
  Layers,
  MessageSquare,
  Sparkles,
  Zap,
} from 'lucide-react';
import { cookies } from 'next/headers';
import Link from 'next/link';
import { Badge } from '@/components/ui/badge';
import { Button } from '@/components/ui/button';
import {
  Card,
  CardContent,
  CardDescription,
  CardHeader,
  CardTitle,
} from '@/components/ui/card';
import { createClient } from '@/lib/supabase/server';

export default async function Home() {
  let authenticatedUser: { email: string; fullName?: string } | null = null;

  try {
    const supabase = await createClient();
    const {
      data: { user },
    } = await supabase.auth.getUser();

    if (user) {
      authenticatedUser = {
        email: user.email ?? '',
        fullName: (user.user_metadata?.full_name as string | undefined) ?? undefined,
      };
    } else if (process.env.PLAYWRIGHT_TEST === 'true' || process.env.LOCAL_DEV_AUTH === 'true') {
      const cookieStore = await cookies();
      const mockAuth = cookieStore.get('sb-mock-auth');
      if (mockAuth?.value) {
        try {
          const parsed = JSON.parse(mockAuth.value);
          authenticatedUser = {
            email: parsed.email ?? '',
            fullName: (parsed.user_metadata?.full_name as string | undefined) ?? undefined,
          };
        } catch {
          // ignore invalid json
        }
      }
    }
  } catch (error) {
    console.error('Failed to fetch user session in Home page:', error);
  }

  if (authenticatedUser) {
    const displayName = authenticatedUser.fullName || authenticatedUser.email;

    return (
      <div className="w-full min-h-[calc(100vh-3.5rem)] bg-background p-4 sm:p-6 lg:p-8">
        <div className="mx-auto max-w-7xl flex flex-col gap-6">
          {/* Welcome & Main CTA Banner */}
          <Card className="border-border shadow-xs bg-linear-to-r from-background via-muted/30 to-background">
            <CardHeader className="flex flex-col md:flex-row md:items-center justify-between gap-4">
              <div className="flex flex-col gap-1.5">
                <div className="flex items-center gap-2">
                  <Badge variant="outline" className="gap-1.5 px-2.5 py-0.5 text-xs font-medium">
                    <Sparkles className="size-3.5 text-primary" />
                    Active Learning Platform
                  </Badge>
                </div>
                <CardTitle className="font-bold text-2xl sm:text-3xl tracking-tight" data-testid="dashboard-heading">
                  Dashboard
                </CardTitle>
                <CardDescription className="text-base" data-testid="dashboard-welcome">
                  Welcome back, <span className="font-semibold text-foreground">{displayName}</span>! Ready to continue your learning session?
                </CardDescription>
              </div>
              <Button asChild size="lg" className="gap-2 shrink-0 font-medium shadow-xs">
                <Link href="/chat">
                  <MessageSquare className="size-4" />
                  <span>Go to AI Chat</span>
                  <ArrowRight className="size-4" />
                </Link>
              </Button>
            </CardHeader>
          </Card>

          {/* Quick Stats Grid */}
          <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-4 gap-4">
            <Card className="border-border shadow-xs">
              <CardHeader className="flex flex-row items-center justify-between space-y-0 pb-2">
                <CardTitle className="font-medium text-sm">Learning Materials</CardTitle>
                <BookOpen className="size-4 text-muted-foreground" />
              </CardHeader>
              <CardContent>
                <div className="font-bold text-2xl">0</div>
                <p className="text-muted-foreground text-xs">PDFs & Documents ingested</p>
              </CardContent>
            </Card>

            <Card className="border-border shadow-xs">
              <CardHeader className="flex flex-row items-center justify-between space-y-0 pb-2">
                <CardTitle className="font-medium text-sm">Spaced Repetition</CardTitle>
                <Clock className="size-4 text-muted-foreground" />
              </CardHeader>
              <CardContent>
                <div className="font-bold text-2xl">0</div>
                <p className="text-muted-foreground text-xs">Flashcards due for review</p>
              </CardContent>
            </Card>

            <Card className="border-border shadow-xs">
              <CardHeader className="flex flex-row items-center justify-between space-y-0 pb-2">
                <CardTitle className="font-medium text-sm">Knowledge Graph</CardTitle>
                <Brain className="size-4 text-muted-foreground" />
              </CardHeader>
              <CardContent>
                <div className="font-bold text-2xl">0</div>
                <p className="text-muted-foreground text-xs">Concepts structured via GraphRAG</p>
              </CardContent>
            </Card>

            <Card className="border-border shadow-xs">
              <CardHeader className="flex flex-row items-center justify-between space-y-0 pb-2">
                <CardTitle className="font-medium text-sm">Feynman Audits</CardTitle>
                <CheckCircle2 className="size-4 text-muted-foreground" />
              </CardHeader>
              <CardContent>
                <div className="font-bold text-2xl">0</div>
                <p className="text-muted-foreground text-xs">Explanations evaluated</p>
              </CardContent>
            </Card>
          </div>

          {/* Activity & Quick Actions Grid */}
          <div className="grid grid-cols-1 lg:grid-cols-3 gap-6">
            <Card className="lg:col-span-2 border-border shadow-xs">
              <CardHeader>
                <CardTitle className="font-semibold text-lg flex items-center gap-2">
                  <Zap className="size-5 text-primary" />
                  Quick Actions
                </CardTitle>
                <CardDescription>
                  Jump right into learning support modules grounded in your uploaded materials.
                </CardDescription>
              </CardHeader>
              <CardContent className="grid grid-cols-1 sm:grid-cols-2 gap-4">
                <div className="rounded-lg border border-border bg-card p-4 flex flex-col justify-between gap-3 transition-colors hover:bg-muted/50">
                  <div className="flex flex-col gap-1">
                    <div className="flex items-center gap-2 font-semibold text-sm">
                      <MessageSquare className="size-4 text-primary" />
                      AI Learning Assistant
                    </div>
                    <p className="text-muted-foreground text-xs leading-relaxed">
                      Ask questions, query concept graphs, and get grounded explanations.
                    </p>
                  </div>
                  <Button asChild variant="outline" size="sm" className="w-full gap-1.5">
                    <Link href="/chat">
                      <span>Open Chat</span>
                      <ArrowRight className="size-3.5" />
                    </Link>
                  </Button>
                </div>

                <div className="rounded-lg border border-border bg-card p-4 flex flex-col justify-between gap-3 transition-colors hover:bg-muted/50 opacity-80">
                  <div className="flex flex-col gap-1">
                    <div className="flex items-center gap-2 font-semibold text-sm">
                      <Layers className="size-4 text-primary" />
                      Material Knowledge Graph
                    </div>
                    <p className="text-muted-foreground text-xs leading-relaxed">
                      Upload PDFs and inspect concept relationships & vector chunks.
                    </p>
                  </div>
                  <Button variant="outline" size="sm" disabled className="w-full gap-1.5">
                    <span>Coming Soon</span>
                  </Button>
                </div>
              </CardContent>
            </Card>

            <Card className="border-border shadow-xs flex flex-col justify-between">
              <CardHeader>
                <CardTitle className="font-semibold text-lg flex items-center gap-2">
                  <Sparkles className="size-5 text-primary" />
                  Pedagogical Engines
                </CardTitle>
                <CardDescription>
                  Core learning science powering your progress.
                </CardDescription>
              </CardHeader>
              <CardContent className="flex flex-col gap-3 text-xs text-muted-foreground">
                <div className="rounded-md bg-muted/40 p-3 border border-border/50">
                  <div className="font-medium text-foreground text-xs mb-1">FSRS Spaced Repetition</div>
                  Optimizes review intervals dynamically based on memory decay algorithms.
                </div>
                <div className="rounded-md bg-muted/40 p-3 border border-border/50">
                  <div className="font-medium text-foreground text-xs mb-1">Feynman Explanation Audits</div>
                  Evaluates your understanding by checking for gaps in self-explanations.
                </div>
              </CardContent>
            </Card>
          </div>
        </div>
      </div>
    );
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
            Combine PDF ingestion, GraphRAG knowledge structuring, FSRS spaced repetition, and Feynman explanation audits into a personalized AI learning engine.
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
