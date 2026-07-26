import { createFileRoute, Link, useNavigate } from "@tanstack/react-router";
import { useState } from "react";
import { useQuery } from "@tanstack/react-query";
import { toast } from "sonner";
import {
  ArrowLeft,
  Store,
  ShoppingBag,
  Plus,
  Minus,
  CheckCircle2,
  AlertCircle,
  Truck,
  ShieldCheck,
} from "lucide-react";
import { supabase } from "@/integrations/supabase/client";
import { useCart, type ProductWithTrader } from "@/lib/cart-context";
import { MOCK_PRODUCTS } from "@/lib/mock-data";
import { Button } from "@/components/ui/button";
import { Badge } from "@/components/ui/badge";

export const Route = createFileRoute("/product/$productId")({
  head: () => ({
    meta: [
      { title: "Product Details — Marketplace" },
      { name: "description", content: "View product details and buy from local traders." },
    ],
  }),
  component: ProductDetailPage,
});

function ProductDetailPage() {
  const { productId } = Route.useParams();
  const navigate = useNavigate();
  const { addItem } = useCart();
  const [quantity, setQuantity] = useState(1);

  // Fetch product detail
  const { data: product, isLoading, error } = useQuery({
    queryKey: ["product-detail", productId],
    queryFn: async () => {
      try {
        const { data, error } = await supabase
          .from("products")
          .select("*, categories(*), traders(*)")
          .eq("id", productId)
          .single();

        if (error || !data) {
          const mockMatch = MOCK_PRODUCTS.find((p) => p.id === productId);
          if (mockMatch) return mockMatch;
          throw new Error("Product not found");
        }
        return data as ProductWithTrader;
      } catch {
        const mockMatch = MOCK_PRODUCTS.find((p) => p.id === productId);
        if (mockMatch) return mockMatch;
        throw new Error("Product not found");
      }
    },
  });

  // Fetch related products from same category or trader
  const { data: relatedProducts = [] } = useQuery({
    queryKey: ["related-products", product?.category_id, product?.trader_id, productId],
    queryFn: async () => {
      if (!product) return [];
      const { data } = await supabase
        .from("products")
        .select("*, categories(*), traders(*)")
        .eq("is_active", true)
        .neq("id", productId)
        .or(`category_id.eq.${product.category_id},trader_id.eq.${product.trader_id}`)
        .limit(4);
      return (data as ProductWithTrader[]) ?? [];
    },
    enabled: !!product,
  });

  if (isLoading) {
    return (
      <main className="mx-auto max-w-7xl px-4 py-12 sm:px-6">
        <div className="grid grid-cols-1 gap-10 md:grid-cols-2">
          <div className="aspect-square rounded-2xl bg-muted animate-pulse" />
          <div className="space-y-4">
            <div className="h-6 w-1/3 rounded bg-muted animate-pulse" />
            <div className="h-10 w-3/4 rounded bg-muted animate-pulse" />
            <div className="h-8 w-1/4 rounded bg-muted animate-pulse" />
            <div className="h-24 w-full rounded bg-muted animate-pulse" />
          </div>
        </div>
      </main>
    );
  }

  if (error || !product) {
    return (
      <main className="mx-auto max-w-7xl px-4 py-16 sm:px-6 text-center">
        <AlertCircle className="mx-auto h-12 w-12 text-destructive" />
        <h1 className="mt-4 font-display text-2xl font-bold">Product Not Found</h1>
        <p className="mt-2 text-muted-foreground">
          The product you are looking for does not exist or has been removed.
        </p>
        <Button asChild className="mt-6" variant="outline">
          <Link to="/shop">
            <ArrowLeft className="mr-2 h-4 w-4" /> Back to Shop
          </Link>
        </Button>
      </main>
    );
  }

  const inStock = product.stock > 0;
  const maxStock = product.stock ?? 999;

  const handleAddToCart = () => {
    addItem(product, quantity);
    toast.success(`Added ${quantity} ${quantity === 1 ? "unit" : "units"} of ${product.name} to cart`);
  };

  const handleBuyNow = () => {
    addItem(product, quantity);
    navigate({ to: "/cart" });
  };

  return (
    <main className="mx-auto max-w-7xl px-4 py-8 sm:px-6">
      {/* Breadcrumb / Back button */}
      <div className="mb-6">
        <Button asChild variant="ghost" size="sm" className="gap-1.5 text-muted-foreground hover:text-foreground">
          <Link to="/shop">
            <ArrowLeft className="h-4 w-4" /> Back to Products
          </Link>
        </Button>
      </div>

      {/* Main product showcase */}
      <div className="grid grid-cols-1 gap-10 lg:grid-cols-12">
        {/* Product Image */}
        <div className="lg:col-span-6">
          <div className="overflow-hidden rounded-2xl border bg-card aspect-square relative flex items-center justify-center">
            {product.image_url ? (
              <img
                src={product.image_url}
                alt={product.name}
                className="h-full w-full object-cover"
              />
            ) : (
              <div className="flex flex-col items-center gap-2 text-muted-foreground">
                <ShoppingBag className="h-16 w-16 opacity-30" />
                <span className="text-sm font-medium">No image available</span>
              </div>
            )}
          </div>
        </div>

        {/* Product Details */}
        <div className="lg:col-span-6 flex flex-col justify-between">
          <div>
            {/* Category & Trader banner */}
            <div className="flex flex-wrap items-center gap-2">
              {product.categories?.name && (
                <Badge variant="secondary" className="text-xs">
                  {product.categories.name}
                </Badge>
              )}
              {product.traders?.shop_name && (
                <Link
                  to="/trader"
                  search={{ id: product.trader_id }}
                  className="inline-flex items-center gap-1.5 text-xs font-semibold text-primary hover:underline"
                >
                  <Store className="h-3.5 w-3.5" />
                  Sold by {product.traders.shop_name}
                </Link>
              )}
            </div>

            {/* Product Title */}
            <h1 className="mt-3 font-display text-3xl font-bold tracking-tight sm:text-4xl text-foreground">
              {product.name}
            </h1>

            {/* Price & Stock */}
            <div className="mt-4 flex items-baseline gap-4">
              <span className="font-display text-3xl font-bold text-foreground">
                GH₵{product.price.toFixed(2)}
              </span>
              {inStock ? (
                <span className="inline-flex items-center gap-1 text-xs font-medium text-emerald-600 bg-emerald-50 dark:bg-emerald-950/40 dark:text-emerald-400 px-2.5 py-1 rounded-full">
                  <CheckCircle2 className="h-3.5 w-3.5" /> In stock ({product.stock} available)
                </span>
              ) : (
                <span className="inline-flex items-center gap-1 text-xs font-medium text-destructive bg-destructive/10 px-2.5 py-1 rounded-full">
                  <AlertCircle className="h-3.5 w-3.5" /> Currently Out of Stock
                </span>
              )}
            </div>

            {/* Description */}
            <div className="mt-6 space-y-2 border-t pt-6">
              <h3 className="text-sm font-semibold text-foreground">About this product</h3>
              <p className="text-sm leading-relaxed text-muted-foreground whitespace-pre-line">
                {product.description || "No description provided by the trader."}
              </p>
            </div>

            {/* Features / Guarantees */}
            <div className="mt-6 grid grid-cols-2 gap-3 rounded-xl border bg-muted/40 p-4 text-xs">
              <div className="flex items-center gap-2 text-muted-foreground">
                <Truck className="h-4 w-4 text-primary" /> Direct local delivery
              </div>
              <div className="flex items-center gap-2 text-muted-foreground">
                <ShieldCheck className="h-4 w-4 text-primary" /> Verified local trader
              </div>
            </div>
          </div>

          {/* Action section */}
          <div className="mt-8 border-t pt-6 space-y-4">
            <div className="flex items-center gap-4">
              <span className="text-sm font-medium text-foreground">Quantity:</span>
              <div className="flex items-center rounded-lg border bg-background">
                <Button
                  variant="ghost"
                  size="icon"
                  className="h-9 w-9 rounded-r-none"
                  disabled={quantity <= 1 || !inStock}
                  onClick={() => setQuantity((q) => Math.max(1, q - 1))}
                >
                  <Minus className="h-3.5 w-3.5" />
                </Button>
                <span className="w-10 text-center font-display text-sm font-semibold">
                  {quantity}
                </span>
                <Button
                  variant="ghost"
                  size="icon"
                  className="h-9 w-9 rounded-l-none"
                  disabled={quantity >= maxStock || !inStock}
                  onClick={() => setQuantity((q) => Math.min(maxStock, q + 1))}
                >
                  <Plus className="h-3.5 w-3.5" />
                </Button>
              </div>
            </div>

            <div className="grid grid-cols-1 gap-3 sm:grid-cols-2">
              <Button
                size="lg"
                variant="outline"
                disabled={!inStock}
                onClick={handleAddToCart}
                className="w-full gap-2"
              >
                <ShoppingBag className="h-5 w-5" /> Add to Cart
              </Button>
              <Button
                size="lg"
                disabled={!inStock}
                onClick={handleBuyNow}
                className="w-full"
              >
                Buy Now
              </Button>
            </div>
          </div>
        </div>
      </div>

      {/* Related Products */}
      {relatedProducts.length > 0 && (
        <section className="mt-20 border-t pt-12">
          <h2 className="font-display text-2xl font-bold">More from this category & shop</h2>
          <div className="mt-6 grid grid-cols-1 gap-6 sm:grid-cols-2 md:grid-cols-4">
            {relatedProducts.map((rel) => (
              <div
                key={rel.id}
                className="group flex flex-col justify-between overflow-hidden rounded-xl border bg-card transition-all hover:-translate-y-1 hover:shadow-md"
              >
                <Link to="/product/$productId" params={{ productId: rel.id }} className="block aspect-square overflow-hidden bg-muted">
                  {rel.image_url ? (
                    <img
                      src={rel.image_url}
                      alt={rel.name}
                      className="h-full w-full object-cover transition-transform duration-300 group-hover:scale-105"
                    />
                  ) : (
                    <div className="flex h-full w-full items-center justify-center bg-secondary/30 text-muted-foreground">
                      <ShoppingBag className="h-8 w-8 opacity-30" />
                    </div>
                  )}
                </Link>
                <div className="p-4">
                  <span className="text-[11px] font-medium text-muted-foreground">
                    {rel.traders?.shop_name}
                  </span>
                  <h3 className="font-display text-sm font-semibold leading-snug">
                    <Link to="/product/$productId" params={{ productId: rel.id }} className="hover:text-primary transition-colors line-clamp-1">
                      {rel.name}
                    </Link>
                  </h3>
                  <div className="mt-2 font-display text-sm font-bold text-foreground">
                    GH₵{rel.price.toFixed(2)}
                  </div>
                </div>
              </div>
            ))}
          </div>
        </section>
      )}
    </main>
  );
}
