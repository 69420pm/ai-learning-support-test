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
import { ArrowRight, BookOpen, Brain, Sparkles } from 'lucide-react';

export default function Home() {
  return (
    <main className="min-h-screen flex items-center justify-center bg-background p-4 md:p-8">
      <Card className="max-w-lg w-full shadow-lg border-border">
        <CardHeader className="space-y-3">
          <div className="flex items-center justify-between">
            <Badge variant="secondary" className="gap-1.5 px-3 py-1">
              <Sparkles className="size-3.5 text-primary" />
              Under Construction
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
              The platform is being built with a single Next.js App Router architecture, powered by
              shadcn UI primitives, OKLCH design tokens, and FSRS spaced repetition.
            </p>
          </div>
        </CardContent>

        <CardFooter className="flex gap-3 justify-end border-t pt-4">
          <Button variant="outline" size="sm">
            Read Docs
          </Button>
          <Button size="sm" className="gap-2">
            Explore System
            <ArrowRight className="size-4" />
          </Button>
        </CardFooter>
      </Card>
    </main>
  );
}
