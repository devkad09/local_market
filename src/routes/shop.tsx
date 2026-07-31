import { createFileRoute, Link, useNavigate, useSearch } from "@tanstack/react-router";
import { useState } from "react";
import { useQuery, useQueryClient } from "@tanstack/react-query";
import { z } from "zod";
import { toast } from "sonner";
import {
  Search,
  Filter,
  SlidersHorizontal,
  Plus,
  ShoppingBag,
  Store,
  X,
  PackageX,
  Check,
  Sparkles,
} from "lucide-react";
import { supabase } from "@/integrations/supabase/client";
import { useCart, type ProductWithTrader } from "@/lib/cart-context";
import { seedDemoData } from "@/lib/seed-data";
import { MOCK_CATEGORIES, MOCK_TRADERS, MOCK_PRODUCTS } from "@/lib/mock-data";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import {
  Select,
  SelectContent,
  SelectItem,
  SelectTrigger,
  SelectValue,
} from "@/components/ui/select";
import { Badge } from "@/components/ui/badge";

const shopSearchSchema = z.object({
  category: z.string().optional(),
  trader: z.string().optional(),
  q: z.string().optional(),
  sort: z.enum(["newest", "price_asc", "price_desc", "name"]).optional().default("newest"),
  inStock: z.boolean().optional(),
  minPrice: z.number().optional(),
  maxPrice: z.number().optional(),
});

export const Route = createFileRoute("/shop")({
  validateSearch: shopSearchSchema,
  head: () => ({
    meta: [
      { title: "Shop — Marketplace" },
      { name: "description", content: "Browse products from independent local traders and shops." },
    ],
  }),
  component: ShopPage,
});

function ShopPage() {
  const navigate = useNavigate();
  const search = useSearch({ from: "/shop" });
  const { addItem } = useCart();
  const queryClient = useQueryClient();
  const [searchInput, setSearchInput] = useState(search.q ?? "");
  const [isSeeding, setIsSeeding] = useState(false);

  const handleSeedDemo = async () => {
    setIsSeeding(true);
    try {
      const res = await seedDemoData();
      if (res.success) {
        toast.success("Sample products and shops populated successfully!");
        queryClient.invalidateQueries({ queryKey: ["products"] });
        queryClient.invalidateQueries({ queryKey: ["categories"] });
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

  // Fetch categories
  const { data: categories = MOCK_CATEGORIES } = useQuery({
    queryKey: ["categories"],
    queryFn: async () => {
      try {
        const { data, error } = await supabase.from("categories").select("*").order("name");
        if (error || !data || data.length === 0) return MOCK_CATEGORIES;
        return data;
      } catch {
        return MOCK_CATEGORIES;
      }
    },
  });

  // Fetch approved traders for shop filter dropdown
  const { data: traders = MOCK_TRADERS } = useQuery({
    queryKey: ["approved-traders"],
    queryFn: async () => {
      try {
        const { data, error } = await supabase
          .from("traders")
          .select("id, shop_name")
          .order("shop_name");
        if (error || !data || data.length === 0) return MOCK_TRADERS;
        return data;
      } catch {
        return MOCK_TRADERS;
      }
    },
  });

  // Fetch products with active filter & sort
  const { data: products = [], isLoading } = useQuery({
    queryKey: ["products", search],
    queryFn: async () => {
      try {
        let query = supabase
          .from("products")
          .select("*, categories(*), traders(*)");

        // Filter by category slug or id
        if (search.category) {
          const matchedCategory = categories.find(
            (c) => c.slug === search.category || c.id === search.category
          );
          if (matchedCategory) {
            query = query.eq("category_id", matchedCategory.id);
          }
        }

        // Filter by trader ID
        if (search.trader) {
          query = query.eq("trader_id", search.trader);
        }

        // Filter by in-stock only
        if (search.inStock) {
          query = query.gt("stock", 0);
        }

        // Filter by price range
        if (search.minPrice !== undefined) {
          query = query.gte("price", search.minPrice);
        }
        if (search.maxPrice !== undefined) {
          query = query.lte("price", search.maxPrice);
        }

        // Search text query
        if (search.q) {
          query = query.or(`name.ilike.%${search.q}%,description.ilike.%${search.q}%`);
        }

        // Sorting
        switch (search.sort) {
          case "price_asc":
            query = query.order("price", { ascending: true });
            break;
          case "price_desc":
            query = query.order("price", { ascending: false });
            break;
          case "name":
            query = query.order("name", { ascending: true });
            break;
          case "newest":
          default:
            query = query.order("created_at", { ascending: false });
            break;
        }

        const { data, error } = await query;
        if (error || !data || data.length === 0) {
          // Filter mock products
          let mockRes = [...MOCK_PRODUCTS];
          if (search.category) {
            mockRes = mockRes.filter((p) => p.category_id === search.category || (p.categories as any)?.slug === search.category);
          }
          if (search.trader) {
            mockRes = mockRes.filter((p) => p.trader_id === search.trader);
          }
          if (search.inStock) {
            mockRes = mockRes.filter((p) => p.stock > 0);
          }
          if (search.q) {
            const term = search.q.toLowerCase();
            mockRes = mockRes.filter((p) => p.name.toLowerCase().includes(term) || (p.description && p.description.toLowerCase().includes(term)));
          }
          return mockRes;
        }
        return (data as ProductWithTrader[]) ?? [];
      } catch {
        return MOCK_PRODUCTS;
      }
    },
    enabled: true,
  });

  const updateSearch = (params: Partial<z.infer<typeof shopSearchSchema>>) => {
    navigate({
      to: "/shop",
      search: (prev) => {
        const next = { ...prev, ...params };
        // Clean undefined or empty strings
        Object.keys(next).forEach((key) => {
          const k = key as keyof typeof next;
          if (next[k] === undefined || next[k] === "" || next[k] === null) {
            delete next[k];
          }
        });
        return next;
      },
    });
  };

  const handleSearchSubmit = (e: React.FormEvent) => {
    e.preventDefault();
    updateSearch({ q: searchInput.trim() || undefined });
  };

  const clearFilters = () => {
    setSearchInput("");
    navigate({ to: "/shop", search: {} });
  };

  const activeFiltersCount = [
    search.category,
    search.trader,
    search.q,
    search.inStock,
    search.minPrice,
    search.maxPrice,
  ].filter(Boolean).length;

  return (
    <main className="mx-auto max-w-7xl px-4 py-8 sm:px-6">
      {/* Header */}
      <div className="flex flex-col gap-4 md:flex-row md:items-center md:justify-between">
        <div>
          <h1 className="font-display text-3xl font-bold tracking-tight sm:text-4xl">
            Explore Local Products
          </h1>
          <p className="mt-1 text-sm text-muted-foreground">
            Support independent artisans, bakers, and local traders in your community.
          </p>
        </div>

        {/* Search bar */}
        <form onSubmit={handleSearchSubmit} className="relative flex w-full max-w-md items-center">
          <Search className="absolute left-3 h-4 w-4 text-muted-foreground" />
          <Input
            type="search"
            placeholder="Search products, items, or shops…"
            value={searchInput}
            onChange={(e) => setSearchInput(e.target.value)}
            className="pl-9 pr-10"
          />
          {searchInput && (
            <button
              type="button"
              onClick={() => {
                setSearchInput("");
                updateSearch({ q: undefined });
              }}
              className="absolute right-3 text-muted-foreground hover:text-foreground"
            >
              <X className="h-4 w-4" />
            </button>
          )}
        </form>
      </div>

      {/* Category Pills Bar */}
      <div className="mt-6 flex items-center gap-2 overflow-x-auto pb-2 scrollbar-none">
        <Button
          variant={!search.category ? "default" : "outline"}
          size="sm"
          onClick={() => updateSearch({ category: undefined })}
          className="shrink-0 rounded-full"
        >
          All Categories
        </Button>
        {categories.map((c) => (
          <Button
            key={c.id}
            variant={search.category === c.slug || search.category === c.id ? "default" : "outline"}
            size="sm"
            onClick={() =>
              updateSearch({
                category: search.category === c.slug ? undefined : c.slug,
              })
            }
            className="shrink-0 rounded-full"
          >
            {c.name}
          </Button>
        ))}
      </div>

      {/* Filter and Sort Toolbar */}
      <div className="mt-6 flex flex-wrap items-center justify-between gap-4 rounded-xl border bg-card p-4">
        <div className="flex flex-wrap items-center gap-3">
          {/* Shop/Trader Filter */}
          <Select
            value={search.trader ?? "all"}
            onValueChange={(val) => updateSearch({ trader: val === "all" ? undefined : val })}
          >
            <SelectTrigger className="w-[180px] h-9 text-xs">
              <Store className="mr-2 h-3.5 w-3.5" />
              <SelectValue placeholder="All Shops" />
            </SelectTrigger>
            <SelectContent>
              <SelectItem value="all">All Shops</SelectItem>
              {traders.map((t) => (
                <SelectItem key={t.id} value={t.id}>
                  {t.shop_name}
                </SelectItem>
              ))}
            </SelectContent>
          </Select>

          {/* In Stock Toggle */}
          <Button
            variant={search.inStock ? "secondary" : "outline"}
            size="sm"
            onClick={() => updateSearch({ inStock: !search.inStock ? true : undefined })}
            className="h-9 gap-1.5 text-xs"
          >
            <Check className={`h-3.5 w-3.5 ${search.inStock ? "opacity-100" : "opacity-0"}`} />
            In stock only
          </Button>

          {/* Price Presets */}
          <div className="flex items-center gap-1.5">
            <Button
              variant={search.maxPrice === 50 && !search.minPrice ? "secondary" : "outline"}
              size="sm"
              onClick={() =>
                updateSearch({
                  minPrice: undefined,
                  maxPrice: search.maxPrice === 50 ? undefined : 50,
                })
              }
              className="h-9 text-xs"
            >
              &lt; GH₵50
            </Button>
            <Button
              variant={search.minPrice === 50 && search.maxPrice === 200 ? "secondary" : "outline"}
              size="sm"
              onClick={() =>
                updateSearch({
                  minPrice: search.minPrice === 50 ? undefined : 50,
                  maxPrice: search.maxPrice === 200 ? undefined : 200,
                })
              }
              className="h-9 text-xs"
            >
              GH₵50–200
            </Button>
            <Button
              variant={search.minPrice === 200 && !search.maxPrice ? "secondary" : "outline"}
              size="sm"
              onClick={() =>
                updateSearch({
                  minPrice: search.minPrice === 200 ? undefined : 200,
                  maxPrice: undefined,
                })
              }
              className="h-9 text-xs"
            >
              GH₵200+
            </Button>
          </div>

          {/* Active filter clear button */}
          {activeFiltersCount > 0 && (
            <Button
              variant="ghost"
              size="sm"
              onClick={clearFilters}
              className="h-9 gap-1 text-xs text-muted-foreground hover:text-foreground"
            >
              Clear filters ({activeFiltersCount})
              <X className="h-3.5 w-3.5" />
            </Button>
          )}
        </div>

        {/* Sort Select */}
        <div className="flex items-center gap-2">
          <span className="text-xs text-muted-foreground hidden sm:inline">Sort by:</span>
          <Select
            value={search.sort ?? "newest"}
            onValueChange={(val: "newest" | "price_asc" | "price_desc" | "name") =>
              updateSearch({ sort: val })
            }
          >
            <SelectTrigger className="w-[160px] h-9 text-xs">
              <SlidersHorizontal className="mr-2 h-3.5 w-3.5" />
              <SelectValue placeholder="Sort order" />
            </SelectTrigger>
            <SelectContent>
              <SelectItem value="newest">Newest additions</SelectItem>
              <SelectItem value="price_asc">Price: Low to High</SelectItem>
              <SelectItem value="price_desc">Price: High to Low</SelectItem>
              <SelectItem value="name">Name (A–Z)</SelectItem>
            </SelectContent>
          </Select>
        </div>
      </div>

      {/* Product Grid */}
      {isLoading ? (
        <div className="mt-10 grid grid-cols-1 gap-6 sm:grid-cols-2 md:grid-cols-3 lg:grid-cols-4">
          {Array.from({ length: 8 }).map((_, i) => (
            <div key={i} className="h-72 rounded-xl border bg-card/50 animate-pulse p-4 flex flex-col justify-between">
              <div className="h-40 rounded-lg bg-muted" />
              <div className="space-y-2">
                <div className="h-4 w-3/4 rounded bg-muted" />
                <div className="h-4 w-1/2 rounded bg-muted" />
              </div>
            </div>
          ))}
        </div>
      ) : products.length === 0 ? (
        <div className="mt-16 flex flex-col items-center justify-center rounded-2xl border border-dashed py-16 text-center">
          <div className="inline-flex h-14 w-14 items-center justify-center rounded-full bg-muted">
            <PackageX className="h-7 w-7 text-muted-foreground" />
          </div>
          <h3 className="mt-4 font-display text-xl font-semibold">No products found</h3>
          <p className="mt-1 text-sm text-muted-foreground max-w-md">
            The store has no products listed yet. Click below to load sample artisanal products and local shops!
          </p>
          <div className="mt-6 flex flex-wrap justify-center gap-3">
            <Button onClick={handleSeedDemo} disabled={isSeeding} className="gap-2">
              <Sparkles className="h-4 w-4" />
              {isSeeding ? "Populating Demo Products…" : "Load Sample Demo Products"}
            </Button>
            <Button onClick={clearFilters} variant="outline">
              Clear all filters
            </Button>
          </div>
        </div>
      ) : (
        <div className="mt-8 grid grid-cols-1 gap-6 sm:grid-cols-2 md:grid-cols-3 lg:grid-cols-4">
          {products.map((product) => {
            const inStock = product.stock > 0;
            return (
              <div
                key={product.id}
                className="group relative flex flex-col justify-between overflow-hidden rounded-xl border bg-card transition-all hover:-translate-y-1 hover:shadow-lg"
              >
                <div>
                  {/* Product Image */}
                  <Link to="/product/$productId" params={{ productId: product.id }} className="block aspect-square overflow-hidden bg-muted">
                    {product.image_url ? (
                      <img
                        src={product.image_url}
                        alt={product.name}
                        className="h-full w-full object-cover transition-transform duration-300 group-hover:scale-105"
                      />
                    ) : (
                      <div className="flex h-full w-full items-center justify-center bg-secondary/30 text-muted-foreground">
                        <ShoppingBag className="h-10 w-10 opacity-40" />
                      </div>
                    )}
                  </Link>

                  {/* Stock & Trader Pill */}
                  <div className="p-4">
                    <div className="flex items-center justify-between gap-2 text-xs">
                      {product.traders?.shop_name && (
                        <Link
                          to="/trader"
                          search={{ id: product.trader_id }}
                          className="inline-flex items-center gap-1 font-medium text-muted-foreground hover:text-primary transition-colors truncate"
                        >
                          <Store className="h-3 w-3 shrink-0" />
                          <span className="truncate">{product.traders.shop_name}</span>
                        </Link>
                      )}
                      {product.categories?.name && (
                        <Badge variant="secondary" className="text-[10px] font-normal shrink-0">
                          {product.categories.name}
                        </Badge>
                      )}
                    </div>

                    {/* Title */}
                    <h3 className="mt-2 font-display text-base font-semibold leading-snug text-foreground">
                      <Link to="/product/$productId" params={{ productId: product.id }} className="hover:text-primary transition-colors line-clamp-1">
                        {product.name}
                      </Link>
                    </h3>

                    {/* Description excerpt */}
                    {product.description && (
                      <p className="mt-1 text-xs text-muted-foreground line-clamp-2">
                        {product.description}
                      </p>
                    )}
                  </div>
                </div>

                {/* Footer price & Add to cart */}
                <div className="flex items-center justify-between border-t px-4 py-3 bg-card">
                  <div>
                    <span className="font-display text-lg font-bold text-foreground">
                      GH₵{product.price.toFixed(2)}
                    </span>
                    {!inStock && (
                      <span className="block text-[11px] font-medium text-destructive">Out of stock</span>
                    )}
                  </div>

                  <Button
                    size="sm"
                    disabled={!inStock}
                    onClick={() => {
                      addItem(product, 1);
                      toast.success(`Added ${product.name} to cart`);
                    }}
                    className="gap-1 rounded-lg"
                  >
                    <Plus className="h-4 w-4" />
                    <span>Add</span>
                  </Button>
                </div>
              </div>
            );
          })}
        </div>
      )}
    </main>
  );
}
