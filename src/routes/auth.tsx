import { createFileRoute, useNavigate, useSearch } from "@tanstack/react-router";
import { useState, useEffect } from "react";
import { z } from "zod";
import { toast } from "sonner";
import { supabase } from "@/integrations/supabase/client";
import { useAuth } from "@/lib/auth-context";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { Tabs, TabsContent, TabsList, TabsTrigger } from "@/components/ui/tabs";
import { Store } from "lucide-react";

const searchSchema = z.object({
  redirect: z.string().optional(),
});

export const Route = createFileRoute("/auth")({
  validateSearch: searchSchema,
  head: () => ({ meta: [{ title: "Sign in — Marketplace" }] }),
  component: AuthPage,
});

const emailSchema = z.string().email("Enter a valid email");
const passwordSchema = z.string().min(6, "At least 6 characters");

function AuthPage() {
  const navigate = useNavigate();
  const search = useSearch({ from: "/auth" });
  const { user, loading } = useAuth();
  const [isLoading, setIsLoading] = useState(false);

  useEffect(() => {
    if (!loading && user) {
      const target = (search.redirect && search.redirect.startsWith("/")) ? search.redirect : "/";
      navigate({ to: target });
    }
  }, [user, loading, search.redirect, navigate]);

  const handleSignIn = async (e: React.FormEvent<HTMLFormElement>) => {
    e.preventDefault();
    const form = new FormData(e.currentTarget);
    const emailR = emailSchema.safeParse(form.get("email"));
    const passR = passwordSchema.safeParse(form.get("password"));
    if (!emailR.success) return toast.error(emailR.error.issues[0].message);
    if (!passR.success) return toast.error(passR.error.issues[0].message);
    setIsLoading(true);
    const { error } = await supabase.auth.signInWithPassword({ email: emailR.data, password: passR.data });
    setIsLoading(false);
    if (error) return toast.error(error.message);
    toast.success("Welcome back");
  };

  const handleSignUp = async (e: React.FormEvent<HTMLFormElement>) => {
    e.preventDefault();
    const form = new FormData(e.currentTarget);
    const name = String(form.get("name") ?? "").trim();
    const emailR = emailSchema.safeParse(form.get("email"));
    const passR = passwordSchema.safeParse(form.get("password"));
    if (!name) return toast.error("Enter your name");
    if (!emailR.success) return toast.error(emailR.error.issues[0].message);
    if (!passR.success) return toast.error(passR.error.issues[0].message);
    setIsLoading(true);
    const { error } = await supabase.auth.signUp({
      email: emailR.data,
      password: passR.data,
      options: { data: { name }, emailRedirectTo: window.location.origin },
    });
    setIsLoading(false);
    if (error) return toast.error(error.message);
    toast.success("Account created — welcome!");
  };

  const handleGoogle = async () => {
    setIsLoading(true);
    const { error } = await supabase.auth.signInWithOAuth({
      provider: "google",
      options: {
        redirectTo: window.location.origin,
      },
    });
    setIsLoading(false);
    if (error) return toast.error(error.message ?? "Google sign-in failed");
  };

  return (
    <main className="mx-auto flex min-h-[calc(100vh-4rem)] max-w-md flex-col justify-center px-4 py-10">
      <div className="mb-8 text-center">
        <span className="inline-flex h-12 w-12 items-center justify-center rounded-lg bg-primary text-primary-foreground">
          <Store className="h-6 w-6" />
        </span>
        <h1 className="mt-4 font-display text-3xl font-bold">Welcome to Marketplace</h1>
        <p className="mt-1 text-sm text-muted-foreground">Sign in to shop or open your own shop.</p>
      </div>

      <Tabs defaultValue="signin" className="w-full">
        <TabsList className="grid w-full grid-cols-2">
          <TabsTrigger value="signin">Sign in</TabsTrigger>
          <TabsTrigger value="signup">Sign up</TabsTrigger>
        </TabsList>

        <TabsContent value="signin" className="mt-6">
          <form onSubmit={handleSignIn} className="space-y-4">
            <div className="space-y-1.5">
              <Label htmlFor="si-email">Email</Label>
              <Input id="si-email" name="email" type="email" required autoComplete="email" />
            </div>
            <div className="space-y-1.5">
              <Label htmlFor="si-pass">Password</Label>
              <Input id="si-pass" name="password" type="password" required autoComplete="current-password" />
            </div>
            <Button type="submit" className="w-full" disabled={isLoading}>
              {isLoading ? "Signing in…" : "Sign in"}
            </Button>
          </form>
        </TabsContent>

        <TabsContent value="signup" className="mt-6">
          <form onSubmit={handleSignUp} className="space-y-4">
            <div className="space-y-1.5">
              <Label htmlFor="su-name">Full name</Label>
              <Input id="su-name" name="name" required autoComplete="name" maxLength={100} />
            </div>
            <div className="space-y-1.5">
              <Label htmlFor="su-email">Email</Label>
              <Input id="su-email" name="email" type="email" required autoComplete="email" />
            </div>
            <div className="space-y-1.5">
              <Label htmlFor="su-pass">Password</Label>
              <Input id="su-pass" name="password" type="password" required autoComplete="new-password" minLength={6} />
            </div>
            <Button type="submit" className="w-full" disabled={isLoading}>
              {isLoading ? "Creating account…" : "Create account"}
            </Button>
          </form>
        </TabsContent>
      </Tabs>

      <div className="my-6 flex items-center gap-3 text-xs text-muted-foreground">
        <div className="h-px flex-1 bg-border" /> OR <div className="h-px flex-1 bg-border" />
      </div>

      <Button variant="outline" className="w-full" onClick={handleGoogle} disabled={isLoading}>
        <svg className="mr-2 h-4 w-4" viewBox="0 0 24 24"><path fill="#4285F4" d="M22.56 12.25c0-.78-.07-1.53-.2-2.25H12v4.26h5.92a5.06 5.06 0 0 1-2.2 3.32v2.77h3.56c2.08-1.92 3.28-4.74 3.28-8.1Z"/><path fill="#34A853" d="M12 23c2.97 0 5.46-.98 7.28-2.65l-3.56-2.77c-.99.66-2.25 1.06-3.72 1.06-2.86 0-5.29-1.93-6.16-4.53H2.18v2.84A11 11 0 0 0 12 23Z"/><path fill="#FBBC05" d="M5.84 14.11a6.6 6.6 0 0 1 0-4.22V7.05H2.18a11 11 0 0 0 0 9.9l3.66-2.84Z"/><path fill="#EA4335" d="M12 5.38c1.62 0 3.06.56 4.2 1.65l3.15-3.15C17.45 2.09 14.97 1 12 1 7.7 1 3.99 3.47 2.18 7.05l3.66 2.84C6.71 7.31 9.14 5.38 12 5.38Z"/></svg>
        Continue with Google
      </Button>
    </main>
  );
}
