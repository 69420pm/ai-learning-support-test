import { ArrowRight, BookOpen, Brain, MessageSquare, Sparkles, Zap } from 'lucide-react';
import { cookies } from 'next/headers';
import Link from 'next/link';
import { Badge } from '@/components/ui/badge';
import { Button } from '@/components/ui/button';
import {
  Card,
  CardContent,
  CardDescription,
  CardFooter,
  CardHeader,
  CardTitle,
} from '@/components/ui/card';
import { createClient } from '@/lib/supabase/server';

export default async function Home() {
  let user: {
    id: string;
    email: string;
    // biome-ignore lint/style/useNamingConvention: Supabase user metadata structure
    user_metadata?: { full_name?: string; avatar_url?: string };
  } | null = null;

  try {
    const supabase = await createClient();
    const {
      data: { user: authUser },
    } = await supabase.auth.getUser();

    if (authUser) {
      user = {
        id: authUser.id,
        email: authUser.email ?? '',
        // biome-ignore lint/style/useNamingConvention: Supabase user metadata structure
        user_metadata: authUser.user_metadata,
      };
    } else if (process.env.PLAYWRIGHT_TEST === 'true' || process.env.LOCAL_DEV_AUTH === 'true') {
      const cookieStore = await cookies();
      const mockAuth = cookieStore.get('sb-mock-auth');
      if (mockAuth?.value) {
        try {
          const parsed = JSON.parse(mockAuth.value);
          user = {
            id: parsed.id ?? 'mock-user-id',
            email: parsed.email ?? '',
            // biome-ignore lint/style/useNamingConvention: Supabase user metadata structure
            user_metadata: parsed.user_metadata,
          };
        } catch {
          // ignore
        }
      }
    }
  } catch (error) {
    console.error('Failed to get user session in Home page:', error);
  }

  if (user) {
    const displayName = user.user_metadata?.full_name || user.email;

    return (
      <main className="min-h-[calc(100vh-3.5rem)] w-full bg-background p-6 md:p-10">
        <div className="mx-auto max-w-5xl space-y-8">
          <div className="flex flex-col gap-2">
            <h1
              className="font-bold text-3xl tracking-tight sm:text-4xl"
              data-testid="dashboard-heading"
            >
              Dashboard
            </h1>
            <p
              className="text-muted-foreground text-base sm:text-lg"
              data-testid="dashboard-welcome"
            >
              Welcome back, {displayName}!
            </p>
          </div>

          <div className="grid gap-6 sm:grid-cols-2 lg:grid-cols-3">
            <Card className="border-border shadow-sm">
              <CardHeader className="flex flex-row items-center justify-between pb-2">
                <CardTitle className="font-medium text-sm">AI Active Learning Chat</CardTitle>
                <MessageSquare className="size-4 text-primary" />
              </CardHeader>
              <CardContent>
                <div className="font-bold text-2xl">Real-time Assistance</div>
                <p className="mt-1 text-xs text-muted-foreground">
                  Stream response deltas powered by Gemini & OpenAI multi-LLM routing.
                </p>
              </CardContent>
              <CardFooter className="pt-2">
                <Button asChild size="sm" className="w-full gap-2" data-testid="go-to-ai-chat-btn">
                  <Link href="/chat">
                    <span>Go to AI Chat</span>
                    <ArrowRight className="size-4" />
                  </Link>
                </Button>
              </CardFooter>
            </Card>

            <Card className="border-border shadow-sm">
              <CardHeader className="flex flex-row items-center justify-between pb-2">
                <CardTitle className="font-medium text-sm">FSRS Spaced Repetition</CardTitle>
                <Zap className="size-4 text-primary" />
              </CardHeader>
              <CardContent>
                <div className="font-bold text-2xl">0 Reviews Due</div>
                <p className="mt-1 text-xs text-muted-foreground">
                  Pedagogical science engine schedules flashcard retention reviews.
                </p>
              </CardContent>
              <CardFooter className="pt-2">
                <Button variant="outline" size="sm" className="w-full" disabled>
                  Start Review
                </Button>
              </CardFooter>
            </Card>

            <Card className="border-border shadow-sm">
              <CardHeader className="flex flex-row items-center justify-between pb-2">
                <CardTitle className="font-medium text-sm">Document Ingestion</CardTitle>
                <BookOpen className="size-4 text-primary" />
              </CardHeader>
              <CardContent>
                <div className="font-bold text-2xl">GraphRAG Ready</div>
                <p className="mt-1 text-xs text-muted-foreground">
                  Upload PDFs and materials for automated knowledge graph extraction.
                </p>
              </CardContent>
              <CardFooter className="pt-2">
                <Button variant="outline" size="sm" className="w-full" disabled>
                  Manage Materials
                </Button>
              </CardFooter>
            </Card>
          </div>
        </div>
      </main>
    );
  }

  return (
    <main className="min-h-[calc(100vh-3.5rem)] flex flex-col items-center justify-center bg-background p-4 md:p-8">
      <Card className="max-w-lg w-full shadow-lg border-border">
        <CardHeader className="space-y-3">
          <div className="flex items-center justify-between">
            <Badge variant="secondary" className="gap-1.5 px-3 py-1">
              <Sparkles className="size-3.5 text-primary" />
              AI Grounded Learning
            </Badge>
          </div>
          <CardTitle className="text-2xl font-bold tracking-tight flex items-center gap-2">
            <Brain className="size-6 text-primary" />
            AI Learning Support
          </CardTitle>
          <CardDescription className="text-base">
            Document-grounded active learning platform combining PDF ingestion, GraphRAG knowledge
            structuring, and pedagogical science engines.
          </CardDescription>
        </CardHeader>

        <CardContent className="space-y-4 text-sm text-muted-foreground">
          <div className="rounded-lg bg-muted/50 p-4 border border-border/50 space-y-2">
            <div className="flex items-center gap-2 font-medium text-foreground">
              <BookOpen className="size-4 text-primary" />
              Core Architecture Active
            </div>
            <p className="text-xs leading-relaxed">
              Experience multi-LLM chat streaming with Google Gemini and OpenAI models, FSRS memory
              retention, and GraphRAG knowledge maps.
            </p>
          </div>
        </CardContent>

        <CardFooter className="flex gap-3 justify-end border-t pt-4">
          <Button asChild variant="outline" size="sm">
            <Link href="/login">Sign In</Link>
          </Button>
          <Button asChild size="sm" className="gap-2">
            <Link href="/signup">
              Get Started
              <ArrowRight className="size-4" />
            </Link>
          </Button>
        </CardFooter>
      </Card>
    </main>
  );
}
