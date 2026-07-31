import { createFileRoute, Link, useSearch } from "@tanstack/react-router";
import { useEffect } from "react";
import { useQuery, useQueryClient } from "@tanstack/react-query";
import { z } from "zod";
import { format } from "date-fns";
import {
  ShoppingBag,
  Store,
  Clock,
  Package,
  Truck,
  CheckCircle2,
  XCircle,
  Sparkles,
  ArrowRight,
  MapPin,
  Phone,
  Mail,
  Radio,
} from "lucide-react";
import { supabase } from "@/integrations/supabase/client";
import { useAuth } from "@/lib/auth-context";
import { useCart } from "@/lib/cart-context";
import { Button } from "@/components/ui/button";
import { Badge } from "@/components/ui/badge";
import { toast } from "sonner";
import { verifyPaymentAndConfirmOrder, getUserOrders } from "@/lib/server-checkout";

const ordersSearchSchema = z.object({
  success: z.union([z.boolean(), z.string()]).optional(),
  session_id: z.string().optional(),
  order_id: z.string().optional(),
  mock: z.union([z.boolean(), z.string()]).optional(),
  reference: z.string().optional(),
  trxref: z.string().optional(),
});

export const Route = createFileRoute("/orders")({
  validateSearch: ordersSearchSchema,
  head: () => ({
    meta: [
      { title: "My Orders & Live Tracking — Marketplace" },
      { name: "description", content: "Track live status, delivery progress, and order history for local purchases." },
    ],
  }),
  component: OrdersPage,
});

const TRACKING_STEPS = [
  { status: "pending", label: "Order Placed", icon: Clock },
  { status: "processing", label: "Processing & Payment", icon: Package },
  { status: "shipped", label: "Out for Delivery", icon: Truck },
  { status: "delivered", label: "Delivered", icon: CheckCircle2 },
];

function getStepIndex(status: string): number {
  switch (status) {
    case "pending":
      return 0;
    case "processing":
      return 1;
    case "shipped":
      return 2;
    case "delivered":
      return 3;
    case "cancelled":
      return -1;
    default:
      return 0;
  }
}

function OrdersPage() {
  const search = useSearch({ from: "/orders" });
  const { user, loading: authLoading } = useAuth();
  const { clearCart } = useCart();
  const queryClient = useQueryClient();

  // Clear cart and verify Paystack payment if returning from checkout
  useEffect(() => {
    const isSuccess = search.success === true || search.success === "true";

    if (isSuccess) {
      clearCart();
    }

    const ref = search.reference || search.trxref || search.session_id;
    const orderId = search.order_id;

    if (isSuccess && ref && orderId) {
      (async () => {
        try {
          const res = await verifyPaymentAndConfirmOrder({
            data: {
              reference: ref,
              orderId,
            },
          });
          if (res.success) {
            if (!res.alreadyProcessed) {
              toast.success("Paystack payment verified successfully!");
            }
            queryClient.invalidateQueries({ queryKey: ["user-orders", user?.id] });
          } else {
            toast.error(res.error || "Paystack payment verification failed");
          }
        } catch (err: any) {
          console.error("Payment verification error:", err);
          toast.error(err?.message || "Failed to verify payment");
        }
      })();
    }
  }, [search.success, search.reference, search.trxref, search.session_id, search.order_id, clearCart, queryClient, user?.id]);


  // Real-time listener for orders table changes
  useEffect(() => {
    if (!user) return;

    const channel = supabase
      .channel("orders-realtime")
      .on(
        "postgres_changes",
        {
          event: "*",
          schema: "public",
          table: "orders",
          filter: `user_id=eq.${user.id}`,
        },
        () => {
          queryClient.invalidateQueries({ queryKey: ["user-orders", user.id] });
        }
      )
      .subscribe();

    return () => {
      supabase.removeChannel(channel);
    };
  }, [user, queryClient]);

  // Fetch orders with order_items and product details via server function (bypasses RLS limits)
  const { data: orders = [], isLoading } = useQuery({
    queryKey: ["user-orders", user?.id],
    queryFn: async () => {
      if (!user) return [];
      try {
        const data = await getUserOrders({
          data: { userId: user.id },
        });
        return data ?? [];
      } catch (err) {
        console.error("Error fetching user orders via server:", err);
        return [];
      }
    },
    enabled: !!user,
  });

  if (authLoading || (user && isLoading)) {
    return (
      <main className="mx-auto max-w-5xl px-4 py-12 sm:px-6 space-y-6">
        <div className="h-8 w-48 rounded bg-muted animate-pulse" />
        <div className="h-56 rounded-xl border bg-card/50 animate-pulse" />
        <div className="h-56 rounded-xl border bg-card/50 animate-pulse" />
      </main>
    );
  }

  if (!user) {
    return (
      <main className="mx-auto max-w-md px-4 py-16 text-center">
        <ShoppingBag className="mx-auto h-12 w-12 text-muted-foreground" />
        <h1 className="mt-4 font-display text-2xl font-bold">Sign in to view your orders</h1>
        <p className="mt-2 text-sm text-muted-foreground">
          Track live delivery status, order history, and local receipts by signing in.
        </p>
        <Button asChild className="mt-6 w-full">
          <Link to="/auth" search={{ redirect: "/orders" }}>
            Sign in
          </Link>
        </Button>
      </main>
    );
  }

  return (
    <main className="mx-auto max-w-5xl px-4 py-8 sm:px-6">
      {/* Celebration Banner if coming back from successful payment */}
      {search.success && (
        <div className="mb-8 rounded-xl border border-emerald-200 bg-emerald-50 dark:bg-emerald-950/40 dark:border-emerald-900 p-5 text-emerald-900 dark:text-emerald-200 flex items-start gap-4 shadow-sm">
          <Sparkles className="h-6 w-6 text-emerald-600 dark:text-emerald-400 shrink-0 mt-0.5" />
          <div>
            <h2 className="font-display text-lg font-bold">Payment Confirmed! Order Placed</h2>
            <p className="mt-1 text-sm opacity-90">
              Thank you for shopping local! Your payment was processed successfully. The trader has received your order details and is preparing it for delivery.
            </p>
          </div>
        </div>
      )}

      {/* Header */}
      <div className="flex flex-col gap-2 sm:flex-row sm:items-center sm:justify-between">
        <div>
          <div className="flex items-center gap-2">
            <h1 className="font-display text-3xl font-bold tracking-tight">Your Orders & Live Tracking</h1>
            <Badge variant="outline" className="gap-1 text-xs text-emerald-600 border-emerald-300">
              <Radio className="h-3 w-3 animate-pulse" /> Live Updates
            </Badge>
          </div>
          <p className="mt-1 text-sm text-muted-foreground">
            Track real-time fulfilment status and review order receipts from local shops.
          </p>
        </div>
        <Button asChild variant="outline" size="sm" className="gap-1.5 self-start sm:self-auto">
          <Link to="/shop">
            Browse Products <ArrowRight className="h-4 w-4" />
          </Link>
        </Button>
      </div>

      {/* Orders List */}
      {orders.length === 0 ? (
        <div className="mt-12 flex flex-col items-center justify-center rounded-2xl border border-dashed py-16 text-center">
          <div className="inline-flex h-14 w-14 items-center justify-center rounded-full bg-muted">
            <ShoppingBag className="h-7 w-7 text-muted-foreground" />
          </div>
          <h3 className="mt-4 font-display text-xl font-semibold">No orders yet</h3>
          <p className="mt-1 text-sm text-muted-foreground max-w-sm">
            When you purchase items from local traders, your order status and receipts will show up here.
          </p>
          <Button asChild className="mt-6">
            <Link to="/shop">Start Shopping</Link>
          </Button>
        </div>
      ) : (
        <div className="mt-8 space-y-8">
          {orders.map((order: any) => {
            const currentStepIdx = getStepIndex(order.status);
            const isCancelled = order.status === "cancelled";
            const isHighlighted = search.order_id === order.id;

            return (
              <div
                key={order.id}
                className={`overflow-hidden rounded-xl border bg-card shadow-sm transition-all ${
                  isHighlighted ? "ring-2 ring-primary border-primary shadow-md" : ""
                }`}
              >
                {/* Order Top Bar */}
                <div className="flex flex-wrap items-center justify-between gap-4 border-b bg-muted/30 px-5 py-4">
                  <div>
                    <span className="font-display font-semibold text-foreground text-sm">
                      Order #{order.id.slice(0, 8)}
                    </span>
                    <span className="ml-3 text-xs text-muted-foreground">
                      {format(new Date(order.created_at), "MMM d, yyyy 'at' h:mm a")}
                    </span>
                  </div>

                  <div className="flex items-center gap-4">
                    <span className="inline-flex items-center gap-1.5 text-xs text-muted-foreground">
                      <Mail className="h-3.5 w-3.5 text-primary" /> Email notifications active
                    </span>
                    <span className="font-display text-lg font-bold text-foreground">
                      GH₵{order.total.toFixed(2)}
                    </span>
                  </div>
                </div>

                {/* Progress Tracker Stepper */}
                <div className="border-b bg-muted/10 p-5">
                  {isCancelled ? (
                    <div className="flex items-center gap-2 rounded-lg bg-destructive/10 p-3 text-xs font-semibold text-destructive">
                      <XCircle className="h-4 w-4" /> This order was cancelled.
                    </div>
                  ) : (
                    <div className="relative flex items-center justify-between">
                      {/* Connecting Line */}
                      <div className="absolute left-4 right-4 top-4 -z-0 h-0.5 bg-muted" />
                      <div
                        className="absolute left-4 top-4 -z-0 h-0.5 bg-primary transition-all duration-500"
                        style={{
                          width: `${(Math.max(0, currentStepIdx) / (TRACKING_STEPS.length - 1)) * 100}%`,
                        }}
                      />

                      {/* Step Nodes */}
                      {TRACKING_STEPS.map((step, idx) => {
                        const isDone = currentStepIdx >= idx;
                        const isCurrent = currentStepIdx === idx;
                        const StepIcon = step.icon;

                        return (
                          <div key={step.status} className="relative z-10 flex flex-col items-center">
                            <div
                              className={`flex h-9 w-9 items-center justify-center rounded-full border-2 text-xs transition-colors ${
                                isDone
                                  ? "border-primary bg-primary text-primary-foreground font-bold shadow-sm"
                                  : "border-muted bg-background text-muted-foreground"
                              }`}
                            >
                              <StepIcon className="h-4 w-4" />
                            </div>
                            <span
                              className={`mt-2 text-[11px] font-medium text-center ${
                                isCurrent
                                  ? "text-primary font-bold"
                                  : isDone
                                  ? "text-foreground font-medium"
                                  : "text-muted-foreground opacity-60"
                              }`}
                            >
                              {step.label}
                            </span>
                          </div>
                        );
                      })}
                    </div>
                  )}
                </div>

                {/* Content Details Grid */}
                <div className="grid grid-cols-1 gap-6 p-5 md:grid-cols-12">
                  {/* Item List */}
                  <div className="md:col-span-8 space-y-3">
                    <h4 className="text-xs font-semibold text-muted-foreground uppercase tracking-wider">
                      Ordered Items ({order.order_items?.length ?? 0})
                    </h4>
                    <div className="divide-y rounded-lg border bg-background">
                      {(order.order_items ?? []).map((item: any) => (
                        <div key={item.id} className="flex items-center gap-3 p-3 text-sm">
                          <div className="h-12 w-12 shrink-0 overflow-hidden rounded bg-muted border">
                            {item.products?.image_url ? (
                              <img
                                src={item.products.image_url}
                                alt={item.products.name}
                                className="h-full w-full object-cover"
                              />
                            ) : (
                              <div className="flex h-full w-full items-center justify-center text-muted-foreground">
                                <ShoppingBag className="h-5 w-5 opacity-30" />
                              </div>
                            )}
                          </div>
                          <div className="flex-1 min-w-0">
                            <h5 className="font-medium text-foreground truncate">
                              <Link to="/product/$productId" params={{ productId: item.products?.id }} className="hover:text-primary transition-colors">
                                {item.products?.name ?? "Product"}
                              </Link>
                            </h5>
                            {item.products?.traders?.shop_name && (
                              <span className="inline-flex items-center gap-1 text-xs text-muted-foreground">
                                <Store className="h-3 w-3" />
                                {item.products.traders.shop_name}
                              </span>
                            )}
                          </div>
                          <div className="text-right text-xs">
                            <span className="font-medium">
                              {item.quantity} × GH₵{item.price.toFixed(2)}
                            </span>
                            <span className="block font-semibold text-foreground">
                              GH₵{(item.quantity * item.price).toFixed(2)}
                            </span>
                          </div>
                        </div>
                      ))}
                    </div>
                  </div>

                  {/* Delivery Info */}
                  <div className="md:col-span-4 rounded-lg border bg-muted/20 p-4 space-y-3 text-xs">
                    <h4 className="font-semibold text-foreground flex items-center gap-1.5">
                      <Truck className="h-4 w-4 text-primary" /> Delivery Info
                    </h4>
                    <div className="space-y-1.5 text-muted-foreground">
                      <p className="font-medium text-foreground">{order.delivery_name}</p>
                      <p className="flex items-start gap-1">
                        <MapPin className="h-3.5 w-3.5 shrink-0 mt-0.5" />
                        <span>{order.delivery_address}</span>
                      </p>
                      <p className="flex items-center gap-1">
                        <Phone className="h-3.5 w-3.5 shrink-0" />
                        <span>{order.delivery_phone}</span>
                      </p>
                      {order.notes && (
                        <p className="pt-2 border-t italic">
                          "{order.notes}"
                        </p>
                      )}
                    </div>
                  </div>
                </div>
              </div>
            );
          })}
        </div>
      )}
    </main>
  );
}
