import { createFileRoute, Link, useNavigate } from "@tanstack/react-router";
import { useState, useEffect } from "react";
import { useQuery } from "@tanstack/react-query";
import { toast } from "sonner";
import {
  ShoppingBag,
  Trash2,
  Plus,
  Minus,
  ArrowLeft,
  Store,
  Truck,
  ShieldCheck,
  CheckCircle,
  LogIn,
} from "lucide-react";
import { supabase } from "@/integrations/supabase/client";
import { useAuth } from "@/lib/auth-context";
import { useCart, type CartItem } from "@/lib/cart-context";
import { createCheckoutSession, processWebhookPayload } from "@/lib/server-checkout";
import { sendOrderEmailNotification } from "@/lib/notifications";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { Textarea } from "@/components/ui/textarea";

export const Route = createFileRoute("/cart")({
  head: () => ({
    meta: [
      { title: "Your Cart & Checkout — Marketplace" },
      { name: "description", content: "Review items in your cart and enter delivery details to check out." },
    ],
  }),
  component: CartPage,
});

function CartPage() {
  const navigate = useNavigate();
  const { user } = useAuth();
  const { items, updateQuantity, removeItem, clearCart, subtotal } = useCart();

  const [deliveryName, setDeliveryName] = useState("");
  const [deliveryPhone, setDeliveryPhone] = useState("");
  const [deliveryAddress, setDeliveryAddress] = useState("");
  const [deliveryNotes, setDeliveryNotes] = useState("");
  const [isSubmitting, setIsSubmitting] = useState(false);

  // Fetch user profile if logged in to pre-populate delivery info
  const { data: profile } = useQuery({
    queryKey: ["user-profile", user?.id],
    queryFn: async () => {
      if (!user) return null;
      const { data } = await supabase
        .from("profiles")
        .select("*")
        .eq("id", user.id)
        .single();
      return data;
    },
    enabled: !!user,
  });

  useEffect(() => {
    if (profile) {
      if (profile.name && !deliveryName) setDeliveryName(profile.name);
      if (profile.phone && !deliveryPhone) setDeliveryPhone(profile.phone);
    } else if (user?.user_metadata?.name && !deliveryName) {
      setDeliveryName(user.user_metadata.name);
    }
  }, [profile, user]);

  const deliveryFee = subtotal >= 35 || items.length === 0 ? 0 : 2.99;
  const grandTotal = subtotal + deliveryFee;

  // Group items by trader for clean display
  const itemsByTrader = items.reduce<Record<string, { shopName: string; items: CartItem[] }>>(
    (acc, item) => {
      const traderId = item.product.trader_id || "unknown";
      const shopName = item.product.traders?.shop_name || "Independent Trader";
      if (!acc[traderId]) {
        acc[traderId] = { shopName, items: [] };
      }
      acc[traderId].items.push(item);
      return acc;
    },
    {}
  );

  const handleCheckout = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!user) {
      toast.error("Please sign in to complete your checkout");
      navigate({ to: "/auth", search: { redirect: "/cart" } });
      return;
    }

    if (!deliveryName.trim()) return toast.error("Please enter full delivery name");
    if (!deliveryPhone.trim()) return toast.error("Please enter a phone number");
    if (!deliveryAddress.trim()) return toast.error("Please enter delivery address");

    setIsSubmitting(true);
    try {
      // 1. Create order record in Supabase
      const { data: order, error: orderError } = await supabase
        .from("orders")
        .insert({
          user_id: user.id,
          delivery_name: deliveryName.trim(),
          delivery_phone: deliveryPhone.trim(),
          delivery_address: deliveryAddress.trim(),
          notes: deliveryNotes.trim() || null,
          total: grandTotal,
          status: "pending",
        })
        .select("id")
        .single();

      if (orderError || !order) {
        throw new Error(orderError?.message ?? "Failed to create order");
      }

      // 2. Create order items records
      const orderItemsInsert = items.map((item) => ({
        order_id: order.id,
        product_id: item.product.id,
        quantity: item.quantity,
        price: item.product.price,
      }));

      const { error: itemsError } = await supabase.from("order_items").insert(orderItemsInsert);
      if (itemsError) {
        console.error("Order items error:", itemsError);
      }

      // Trigger order creation notification email
      sendOrderEmailNotification({
        data: {
          type: "order_created",
          orderId: order.id,
          recipientEmail: user.email ?? undefined,
        },
      }).catch((err) => console.error("Notification error:", err));

      // 3. Create Stripe Checkout Session via server function
      const sessionData = await createCheckoutSession({
        data: {
          orderId: order.id,
          items: items.map((i) => ({
            name: i.product.name,
            price: i.product.price,
            quantity: i.quantity,
            image_url: i.product.image_url,
          })),
          deliveryFee,
        },
      });

      if (!sessionData || !sessionData.url) {
        throw new Error("Failed to create payment checkout session");
      }

      // Clear local cart state before redirect
      clearCart();

      // If mock dev mode, trigger simulated webhook payload to process payment
      if (sessionData.mock) {
        await processWebhookPayload({
          data: {
            type: "checkout.session.completed",
            data: {
              object: {
                id: sessionData.sessionId,
                amount_total: Math.round(grandTotal * 100),
                payment_intent: `pi_mock_${Date.now()}`,
                metadata: { order_id: order.id },
              },
            },
          },
        });
      }

      toast.success("Redirecting to secure payment checkout…");
      window.location.href = sessionData.url;
    } catch (err: any) {
      toast.error(err?.message ?? "Checkout failed. Please try again.");
      setIsSubmitting(false);
    }
  };

  if (items.length === 0) {
    return (
      <main className="mx-auto max-w-7xl px-4 py-16 sm:px-6 text-center">
        <div className="mx-auto inline-flex h-20 w-20 items-center justify-center rounded-full bg-muted">
          <ShoppingBag className="h-10 w-10 text-muted-foreground" />
        </div>
        <h1 className="mt-6 font-display text-3xl font-bold">Your cart is empty</h1>
        <p className="mt-2 text-sm text-muted-foreground max-w-md mx-auto">
          Explore products from neighbourhood bakers, crafts, markets, and shops to add them to your cart.
        </p>
        <div className="mt-8">
          <Button asChild size="lg" className="gap-2">
            <Link to="/shop">
              Start Shopping <ArrowLeft className="h-4 w-4 rotate-180" />
            </Link>
          </Button>
        </div>
      </main>
    );
  }

  return (
    <main className="mx-auto max-w-7xl px-4 py-8 sm:px-6">
      <div className="mb-6 flex items-center justify-between">
        <div>
          <h1 className="font-display text-3xl font-bold tracking-tight sm:text-4xl">
            Shopping Cart
          </h1>
          <p className="mt-1 text-sm text-muted-foreground">
            Review your local items and enter delivery details to place your order.
          </p>
        </div>
        <Button variant="ghost" size="sm" onClick={clearCart} className="text-muted-foreground hover:text-destructive">
          Clear Cart
        </Button>
      </div>

      <div className="grid grid-cols-1 gap-10 lg:grid-cols-12">
        {/* Cart Item List */}
        <div className="lg:col-span-7 space-y-8">
          {Object.entries(itemsByTrader).map(([traderId, { shopName, items: traderItems }]) => (
            <div key={traderId} className="rounded-xl border bg-card overflow-hidden">
              {/* Trader header */}
              <div className="flex items-center gap-2 border-b bg-muted/30 px-5 py-3 text-sm font-semibold">
                <Store className="h-4 w-4 text-primary" />
                <span>{shopName}</span>
                <span className="ml-auto text-xs font-normal text-muted-foreground">
                  {traderItems.length} {traderItems.length === 1 ? "item" : "items"}
                </span>
              </div>

              {/* Items */}
              <div className="divide-y">
                {traderItems.map(({ product, quantity }) => (
                  <div key={product.id} className="flex items-center gap-4 p-4 sm:p-5">
                    {/* Image */}
                    <div className="h-16 w-16 shrink-0 overflow-hidden rounded-lg border bg-muted">
                      {product.image_url ? (
                        <img src={product.image_url} alt={product.name} className="h-full w-full object-cover" />
                      ) : (
                        <div className="flex h-full w-full items-center justify-center text-muted-foreground">
                          <ShoppingBag className="h-6 w-6 opacity-30" />
                        </div>
                      )}
                    </div>

                    {/* Info */}
                    <div className="flex-1 min-w-0">
                      <h3 className="font-display text-sm font-semibold text-foreground truncate">
                        <Link to="/product/$productId" params={{ productId: product.id }} className="hover:text-primary transition-colors">
                          {product.name}
                        </Link>
                      </h3>
                      <p className="text-xs text-muted-foreground mt-0.5">
                        GH₵{product.price.toFixed(2)} each
                      </p>
                      <div className="mt-2 flex items-center gap-3">
                        <div className="flex items-center rounded-md border bg-background">
                          <button
                            type="button"
                            onClick={() => updateQuantity(product.id, quantity - 1)}
                            className="p-1 hover:bg-muted text-muted-foreground hover:text-foreground"
                          >
                            <Minus className="h-3 w-3" />
                          </button>
                          <span className="px-2 text-xs font-semibold">{quantity}</span>
                          <button
                            type="button"
                            onClick={() => updateQuantity(product.id, quantity + 1)}
                            className="p-1 hover:bg-muted text-muted-foreground hover:text-foreground"
                          >
                            <Plus className="h-3 w-3" />
                          </button>
                        </div>
                        <button
                          type="button"
                          onClick={() => removeItem(product.id)}
                          className="text-xs text-muted-foreground hover:text-destructive flex items-center gap-1"
                        >
                          <Trash2 className="h-3.5 w-3.5" /> Remove
                        </button>
                      </div>
                    </div>

                    {/* Subtotal */}
                    <div className="text-right">
                      <span className="font-display text-base font-bold text-foreground">
                        GH₵{(product.price * quantity).toFixed(2)}
                      </span>
                    </div>
                  </div>
                ))}
              </div>
            </div>
          ))}

          <Button asChild variant="outline" className="gap-2">
            <Link to="/shop">
              <ArrowLeft className="h-4 w-4" /> Continue Shopping
            </Link>
          </Button>
        </div>

        {/* Delivery Form & Order Summary */}
        <div className="lg:col-span-5 space-y-6">
          <form onSubmit={handleCheckout} className="rounded-xl border bg-card p-6 shadow-sm space-y-5">
            <h2 className="font-display text-lg font-semibold border-b pb-3 flex items-center gap-2">
              <Truck className="h-5 w-5 text-primary" /> Delivery Details
            </h2>

            {!user && (
              <div className="rounded-lg bg-amber-50 dark:bg-amber-950/40 border border-amber-200 dark:border-amber-900 p-3 text-xs text-amber-800 dark:text-amber-300 flex items-center justify-between">
                <span>Sign in required to place orders.</span>
                <Button asChild size="sm" variant="outline" className="h-7 text-xs gap-1">
                  <Link to="/auth" search={{ redirect: "/cart" }}>
                    <LogIn className="h-3 w-3" /> Sign in
                  </Link>
                </Button>
              </div>
            )}

            <div className="space-y-1.5">
              <Label htmlFor="del-name" className="text-xs font-medium">Full Name</Label>
              <Input
                id="del-name"
                required
                placeholder="Jane Doe"
                value={deliveryName}
                onChange={(e) => setDeliveryName(e.target.value)}
              />
            </div>

            <div className="space-y-1.5">
              <Label htmlFor="del-phone" className="text-xs font-medium">Phone Number</Label>
              <Input
                id="del-phone"
                type="tel"
                required
                placeholder="+233 24 000 0000"
                value={deliveryPhone}
                onChange={(e) => setDeliveryPhone(e.target.value)}
              />
            </div>

            <div className="space-y-1.5">
              <Label htmlFor="del-address" className="text-xs font-medium">Delivery Address</Label>
              <Textarea
                id="del-address"
                required
                rows={2}
                placeholder="House No. 12, Oxford Street, Osu, Accra"
                value={deliveryAddress}
                onChange={(e) => setDeliveryAddress(e.target.value)}
              />
            </div>

            <div className="space-y-1.5">
              <Label htmlFor="del-notes" className="text-xs font-medium">Delivery Instructions (Optional)</Label>
              <Input
                id="del-notes"
                placeholder="e.g. Leave at front gate or call on arrival"
                value={deliveryNotes}
                onChange={(e) => setDeliveryNotes(e.target.value)}
              />
            </div>

            {/* Order Summary */}
            <div className="border-t pt-4 space-y-2 text-sm">
              <div className="flex justify-between text-muted-foreground">
                <span>Subtotal</span>
                <span className="font-medium text-foreground">GH₵{subtotal.toFixed(2)}</span>
              </div>
              <div className="flex justify-between text-muted-foreground">
                <span>Local Delivery</span>
                <span className="font-medium text-foreground">
                  {deliveryFee === 0 ? (
                    <span className="text-emerald-600 font-semibold">FREE</span>
                  ) : (
                    `GH₵${deliveryFee.toFixed(2)}`
                  )}
                </span>
              </div>
              {subtotal < 100 && (
                <p className="text-[11px] text-muted-foreground italic">
                  Add GH₵{(100 - subtotal).toFixed(2)} more for free delivery!
                </p>
              )}
              <div className="border-t pt-3 flex justify-between font-display text-lg font-bold">
                <span>Total</span>
                <span className="text-primary">GH₵{grandTotal.toFixed(2)}</span>
              </div>
            </div>

            <Button
              type="submit"
              size="lg"
              disabled={isSubmitting}
              className="w-full mt-4 font-semibold"
            >
              {isSubmitting
                ? "Placing Order…"
                : user
                ? "Place Order & Pay"
                : "Sign in to Place Order"}
            </Button>

            <div className="flex items-center justify-center gap-2 text-[11px] text-muted-foreground pt-2">
              <ShieldCheck className="h-4 w-4 text-emerald-600" />
              <span>Secure checkout with local trader protection</span>
            </div>
          </form>
        </div>
      </div>
    </main>
  );
}
