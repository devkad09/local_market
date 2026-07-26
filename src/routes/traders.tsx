import { createFileRoute, Link } from "@tanstack/react-router";
import { useState } from "react";
import { useQuery } from "@tanstack/react-query";
import { Store, MapPin, Search, ArrowRight, CheckCircle2, Package } from "lucide-react";
import { supabase } from "@/integrations/supabase/client";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Badge } from "@/components/ui/badge";

import { MOCK_TRADERS } from "@/lib/mock-data";

export const Route = createFileRoute("/traders")({
  head: () => ({
    meta: [
      { title: "Local Traders Directory — Marketplace" },
      { name: "description", content: "Discover independent shops, artisans, and vendors in your community." },
    ],
  }),
  component: TradersDirectoryPage,
});

function TradersDirectoryPage() {
  const [searchQuery, setSearchQuery] = useState("");

  const { data: traders = MOCK_TRADERS, isLoading } = useQuery({
    queryKey: ["public-traders"],
    queryFn: async () => {
      try {
        const { data, error } = await supabase
          .from("traders")
          .select(`
            *,
            products (id)
          `)
          .order("shop_name");

        if (error || !data || data.length === 0) return MOCK_TRADERS;
        return data;
      } catch {
        return MOCK_TRADERS;
      }
    },
  });

  const filteredTraders = traders.filter(
    (t) =>
      t.shop_name.toLowerCase().includes(searchQuery.toLowerCase()) ||
      t.address.toLowerCase().includes(searchQuery.toLowerCase()) ||
      (t.description && t.description.toLowerCase().includes(searchQuery.toLowerCase()))
  );

  return (
    <main className="mx-auto max-w-7xl px-4 py-8 sm:px-6">
      {/* Header */}
      <div className="flex flex-col gap-4 md:flex-row md:items-center md:justify-between">
        <div>
          <h1 className="font-display text-3xl font-bold tracking-tight sm:text-4xl">
            Neighbourhood Traders
          </h1>
          <p className="mt-1 text-sm text-muted-foreground">
            Meet the independent shopkeepers, bakers, artisans, and market vendors in your area.
          </p>
        </div>

        {/* Search */}
        <div className="relative w-full max-w-md">
          <Search className="absolute left-3 top-2.5 h-4 w-4 text-muted-foreground" />
          <Input
            placeholder="Search shops or locations…"
            value={searchQuery}
            onChange={(e) => setSearchQuery(e.target.value)}
            className="pl-9"
          />
        </div>
      </div>

      {/* Directory Grid */}
      {isLoading ? (
        <div className="mt-8 grid grid-cols-1 gap-6 sm:grid-cols-2 lg:grid-cols-3">
          {Array.from({ length: 6 }).map((_, i) => (
            <div key={i} className="h-48 rounded-xl border bg-card/50 animate-pulse p-5" />
          ))}
        </div>
      ) : filteredTraders.length === 0 ? (
        <div className="mt-16 flex flex-col items-center justify-center rounded-2xl border border-dashed py-16 text-center">
          <Store className="h-10 w-10 text-muted-foreground" />
          <h3 className="mt-4 font-display text-xl font-semibold">No traders found</h3>
          <p className="mt-1 text-sm text-muted-foreground max-w-sm">
            We couldn't find any verified local shops matching your search.
          </p>
        </div>
      ) : (
        <div className="mt-8 grid grid-cols-1 gap-6 sm:grid-cols-2 lg:grid-cols-3">
          {filteredTraders.map((trader) => (
            <div
              key={trader.id}
              className="group flex flex-col justify-between overflow-hidden rounded-xl border bg-card p-6 shadow-sm transition-all hover:-translate-y-1 hover:shadow-md"
            >
              <div>
                {/* Shop Header */}
                <div className="flex items-start justify-between gap-3">
                  <div className="flex items-center gap-3">
                    <span className="inline-flex h-11 w-11 items-center justify-center rounded-xl bg-primary/10 text-primary">
                      <Store className="h-6 w-6" />
                    </span>
                    <div>
                      <h3 className="font-display text-lg font-bold text-foreground group-hover:text-primary transition-colors">
                        {trader.shop_name}
                      </h3>
                      <span className="inline-flex items-center gap-1 text-[11px] font-medium text-emerald-600 dark:text-emerald-400">
                        <CheckCircle2 className="h-3 w-3" /> Verified Trader
                      </span>
                    </div>
                  </div>
                </div>

                {/* Address */}
                <div className="mt-4 flex items-start gap-1.5 text-xs text-muted-foreground">
                  <MapPin className="h-3.5 w-3.5 shrink-0 mt-0.5 text-primary" />
                  <span>{trader.address}</span>
                </div>

                {/* Description */}
                {trader.description && (
                  <p className="mt-3 text-xs leading-relaxed text-muted-foreground line-clamp-3">
                    {trader.description}
                  </p>
                )}
              </div>

              {/* Card Footer */}
              <div className="mt-6 flex items-center justify-between border-t pt-4">
                <Badge variant="secondary" className="gap-1 text-[11px] font-normal">
                  <Package className="h-3 w-3" />
                  {trader.products?.length ?? 0} products
                </Badge>

                <Button asChild size="sm" variant="ghost" className="gap-1 text-xs font-semibold hover:text-primary">
                  <Link to="/shop" search={{ trader: trader.id }}>
                    Shop Products <ArrowRight className="h-3.5 w-3.5" />
                  </Link>
                </Button>
              </div>
            </div>
          ))}
        </div>
      )}
    </main>
  );
}
