import { createFileRoute, Link } from "@tanstack/react-router";
import { useState } from "react";
import { ArrowRight, Store, ShoppingBag, Truck, Sparkles } from "lucide-react";
import { Button } from "@/components/ui/button";
import { supabase } from "@/integrations/supabase/client";
import { useQuery, useQueryClient } from "@tanstack/react-query";
import { toast } from "sonner";
import { seedDemoData } from "@/lib/seed-data";
import heroImg from "@/assets/market-hero.jpg";

export const Route = createFileRoute("/")({
  head: () => ({
    meta: [
      { title: "Marketplace — Shop from local traders" },
      { name: "description", content: "A local marketplace connecting neighbourhood shops, artisans, and market vendors with customers." },
    ],
  }),
  component: Home,
});

function Home() {
  const queryClient = useQueryClient();
  const [isSeeding, setIsSeeding] = useState(false);

  const handleSeedDemo = async () => {
    setIsSeeding(true);
    try {
      const res = await seedDemoData();
      if (res.success) {
        toast.success("Sample products, shops & categories populated!");
        queryClient.invalidateQueries({ queryKey: ["categories"] });
        queryClient.invalidateQueries({ queryKey: ["products"] });
        queryClient.invalidateQueries({ queryKey: ["approved-traders"] });
        queryClient.invalidateQueries({ queryKey: ["public-traders"] });
      } else {
        toast.error(res.error || "Failed to populate demo data");
      }
    } catch (err: any) {
      toast.error(err?.message || "Error populating demo data");
    } finally {
      setIsSeeding(false);
    }
  };

  const { data: categories = [] } = useQuery({
    queryKey: ["categories"],
    queryFn: async () => {
      const { data } = await supabase.from("categories").select("*").order("name");
      return data ?? [];
    },
  });

  return (
    <main>
      {/* Hero */}
      <section className="relative overflow-hidden">
        <div className="absolute inset-0">
          <img src={heroImg} alt="" width={1600} height={1000} className="h-full w-full object-cover" />
          <div className="absolute inset-0 bg-gradient-to-r from-background/95 via-background/80 to-background/40" />
        </div>
        <div className="relative mx-auto max-w-7xl px-4 py-24 sm:px-6 sm:py-32 lg:py-40">
          <div className="max-w-2xl">
            <span className="inline-flex items-center gap-2 rounded-full border bg-surface/80 px-3 py-1 text-xs font-medium text-muted-foreground backdrop-blur">
              <Sparkles className="h-3 w-3 text-primary" /> Support your local traders
            </span>
            <h1 className="mt-6 font-display text-5xl font-bold tracking-tight text-foreground sm:text-6xl lg:text-7xl">
              Buy from the people <span className="text-primary">next door.</span>
            </h1>
            <p className="mt-6 max-w-xl text-lg text-muted-foreground">
              Fresh produce, baked goods, handmade crafts and more — all from independent
              shops and vendors in your neighbourhood, delivered to your door.
            </p>
            <div className="mt-8 flex flex-wrap items-center gap-3">
              <Button asChild size="lg" className="gap-2">
                <Link to="/shop">Start shopping <ArrowRight className="h-4 w-4" /></Link>
              </Button>
              <Button asChild size="lg" variant="outline">
                <Link to="/become-trader">Sell on Marketplace</Link>
              </Button>
              {categories.length === 0 && (
                <Button onClick={handleSeedDemo} disabled={isSeeding} size="lg" variant="secondary" className="gap-2 border border-primary/20">
                  <Sparkles className="h-4 w-4 text-primary" />
                  {isSeeding ? "Populating Demo Data…" : "Load Sample Shops & Products"}
                </Button>
              )}
            </div>
          </div>
        </div>
      </section>

      {/* Value props */}
      <section className="border-t bg-surface">
        <div className="mx-auto grid max-w-7xl gap-8 px-4 py-16 sm:grid-cols-3 sm:px-6">
          {[
            { icon: Store, title: "Local traders, verified", body: "Every shop is reviewed before going live. Real people, real businesses." },
            { icon: ShoppingBag, title: "One cart, many shops", body: "Shop across dozens of local vendors and check out in a single, secure payment." },
            { icon: Truck, title: "Track every order", body: "Live status updates from confirmation through to delivery at your door." },
          ].map(({ icon: Icon, title, body }) => (
            <div key={title} className="flex gap-4">
              <span className="mt-1 inline-flex h-10 w-10 shrink-0 items-center justify-center rounded-md bg-primary/10 text-primary">
                <Icon className="h-5 w-5" />
              </span>
              <div>
                <h3 className="font-display text-lg font-semibold">{title}</h3>
                <p className="mt-1 text-sm text-muted-foreground">{body}</p>
              </div>
            </div>
          ))}
        </div>
      </section>

      {/* Categories */}
      <section className="mx-auto max-w-7xl px-4 py-20 sm:px-6">
        <div className="flex items-end justify-between">
          <div>
            <h2 className="font-display text-3xl font-bold sm:text-4xl">Browse by category</h2>
            <p className="mt-2 text-muted-foreground">Discover what's fresh from local traders this week.</p>
          </div>
          <Button asChild variant="ghost" className="hidden sm:inline-flex">
            <Link to="/shop">All products <ArrowRight className="ml-1 h-4 w-4" /></Link>
          </Button>
        </div>
        <div className="mt-8 grid grid-cols-2 gap-4 sm:grid-cols-3 lg:grid-cols-6">
          {(categories ?? []).map((c) => (
            <Link
              key={c.id}
              to="/shop"
              search={{ category: c.slug }}
              className="group rounded-xl border bg-card p-5 text-center transition-all hover:-translate-y-0.5 hover:border-primary/40 hover:shadow-lg"
            >
              <div className="text-sm font-medium text-foreground group-hover:text-primary">{c.name}</div>
            </Link>
          ))}
        </div>
      </section>

      {/* CTA */}
      <section className="border-t bg-primary text-primary-foreground">
        <div className="mx-auto flex max-w-7xl flex-col items-start gap-6 px-4 py-16 sm:flex-row sm:items-center sm:justify-between sm:px-6">
          <div>
            <h2 className="font-display text-3xl font-bold sm:text-4xl">Are you a local trader?</h2>
            <p className="mt-2 max-w-xl text-primary-foreground/80">
              Open a shop in minutes. Reach more customers in your area without setting up your own website.
            </p>
          </div>
          <Button asChild size="lg" variant="secondary">
            <Link to="/become-trader">Open your shop <ArrowRight className="ml-1 h-4 w-4" /></Link>
          </Button>
        </div>
      </section>

      <footer className="border-t py-8 text-center text-sm text-muted-foreground">
        © {new Date().getFullYear()} Marketplace. Built for local commerce.
      </footer>
    </main>
  );
}
