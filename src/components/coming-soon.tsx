import { Link } from "@tanstack/react-router";
import { Button } from "@/components/ui/button";
import { Sparkles } from "lucide-react";

export function ComingSoon({ title, body }: { title: string; body: string }) {
  return (
    <main className="mx-auto flex min-h-[calc(100vh-4rem)] max-w-2xl flex-col items-center justify-center px-4 py-20 text-center">
      <span className="inline-flex h-12 w-12 items-center justify-center rounded-lg bg-primary/10 text-primary">
        <Sparkles className="h-6 w-6" />
      </span>
      <h1 className="mt-6 font-display text-4xl font-bold tracking-tight">{title}</h1>
      <p className="mt-3 max-w-md text-muted-foreground">{body}</p>
      <Button asChild variant="outline" className="mt-8">
        <Link to="/">Back to home</Link>
      </Button>
    </main>
  );
}
