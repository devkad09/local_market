import { createFileRoute, Link } from "@tanstack/react-router";
import { useState } from "react";
import { useQuery, useMutation, useQueryClient } from "@tanstack/react-query";
import { toast } from "sonner";
import {
  Store,
  Package,
  ShoppingBag,
  Plus,
  Edit2,
  Trash2,
  Clock,
  CheckCircle2,
  Truck,
  XCircle,
  MapPin,
  Phone,
  AlertCircle,
} from "lucide-react";
import { supabase } from "@/integrations/supabase/client";
import { useAuth } from "@/lib/auth-context";
import { sendOrderEmailNotification } from "@/lib/notifications";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { Textarea } from "@/components/ui/textarea";
import { Badge } from "@/components/ui/badge";
import { Tabs, TabsContent, TabsList, TabsTrigger } from "@/components/ui/tabs";
import {
  Select,
  SelectContent,
  SelectItem,
  SelectTrigger,
  SelectValue,
} from "@/components/ui/select";
import {
  Dialog,
  DialogContent,
  DialogHeader,
  DialogTitle,
  DialogFooter,
} from "@/components/ui/dialog";

export const Route = createFileRoute("/trader")({
  head: () => ({
    meta: [
      { title: "Trader Dashboard — Marketplace" },
      { name: "description", content: "Manage inventory, products, and process customer orders." },
    ],
  }),
  component: TraderDashboardPage,
});

function TraderDashboardPage() {
  const { user, roles, loading: authLoading } = useAuth();
  const queryClient = useQueryClient();
  const [activeTab, setActiveTab] = useState("inventory");

  // Fetch trader record for current user
  const { data: trader, isLoading: traderLoading } = useQuery({
    queryKey: ["trader-profile", user?.id],
    queryFn: async () => {
      if (!user) return null;
      const { data } = await supabase
        .from("traders")
        .select("*")
        .eq("user_id", user.id)
        .maybeSingle();
      return data;
    },
    enabled: !!user,
  });

  if (authLoading || (user && traderLoading)) {
    return (
      <main className="mx-auto max-w-7xl px-4 py-12 sm:px-6">
        <div className="h-8 w-48 rounded bg-muted animate-pulse mb-6" />
        <div className="h-80 rounded-xl border bg-card/50 animate-pulse" />
      </main>
    );
  }

  if (!user) {
    return (
      <main className="mx-auto max-w-md px-4 py-16 text-center">
        <Store className="mx-auto h-12 w-12 text-muted-foreground" />
        <h1 className="mt-4 font-display text-2xl font-bold">Trader Sign In Required</h1>
        <p className="mt-2 text-sm text-muted-foreground">
          Sign in to access your shop workspace and process local customer orders.
        </p>
        <Button asChild className="mt-6 w-full">
          <Link to="/auth" search={{ redirect: "/trader" }}>
            Sign In
          </Link>
        </Button>
      </main>
    );
  }

  // If user is not yet a registered trader
  if (!trader) {
    return (
      <main className="mx-auto max-w-xl px-4 py-16 text-center">
        <AlertCircle className="mx-auto h-12 w-12 text-amber-500" />
        <h1 className="mt-4 font-display text-2xl font-bold">No Shop Found</h1>
        <p className="mt-2 text-sm text-muted-foreground">
          You haven't set up a trader shop on Marketplace yet. Apply to open your shop in minutes!
        </p>
        <div className="mt-6 flex flex-wrap justify-center gap-3">
          <Button asChild size="lg">
            <Link to="/become-trader">Open Your Shop</Link>
          </Button>
        </div>
      </main>
    );
  }

  return (
    <main className="mx-auto max-w-7xl px-4 py-8 sm:px-6">
      {/* Header */}
      <div className="flex flex-col gap-4 md:flex-row md:items-center md:justify-between border-b pb-6">
        <div>
          <div className="flex items-center gap-2">
            <h1 className="font-display text-3xl font-bold tracking-tight">{trader.shop_name}</h1>
            <Badge
              variant={trader.status === "approved" ? "default" : "outline"}
              className="capitalize text-xs"
            >
              {trader.status}
            </Badge>
          </div>
          <p className="mt-1 text-sm text-muted-foreground flex items-center gap-2">
            <MapPin className="h-3.5 w-3.5 shrink-0 text-muted-foreground" />
            {trader.address}
          </p>
        </div>
      </div>

      {/* Main Tabs */}
      <Tabs value={activeTab} onValueChange={setActiveTab} className="mt-8">
        <TabsList className="grid w-full grid-cols-2 max-w-md">
          <TabsTrigger value="inventory" className="gap-2">
            <Package className="h-4 w-4" /> Products & Inventory
          </TabsTrigger>
          <TabsTrigger value="orders" className="gap-2">
            <ShoppingBag className="h-4 w-4" /> Orders & Fulfilment
          </TabsTrigger>
        </TabsList>

        <div className="mt-6">
          <TabsContent value="inventory">
            <TraderInventoryTab traderId={trader.id} />
          </TabsContent>

          <TabsContent value="orders">
            <TraderOrdersTab traderId={trader.id} />
          </TabsContent>
        </div>
      </Tabs>
    </main>
  );
}

/* =========================================================================
   1. TRADER INVENTORY & PRODUCTS TAB
   ========================================================================= */
function TraderInventoryTab({ traderId }: { traderId: string }) {
  const queryClient = useQueryClient();
  const [isDialogOpen, setIsDialogOpen] = useState(false);
  const [editingProduct, setEditingProduct] = useState<any>(null);

  const [name, setName] = useState("");
  const [description, setDescription] = useState("");
  const [price, setPrice] = useState("");
  const [stock, setStock] = useState("");
  const [categoryId, setCategoryId] = useState("");
  const [imageUrl, setImageUrl] = useState("");

  const { data: categories = [] } = useQuery({
    queryKey: ["categories"],
    queryFn: async () => {
      const { data } = await supabase.from("categories").select("*").order("name");
      return data ?? [];
    },
  });

  const { data: products = [], isLoading } = useQuery({
    queryKey: ["trader-products", traderId],
    queryFn: async () => {
      const { data } = await supabase
        .from("products")
        .select("*, categories(name)")
        .eq("trader_id", traderId)
        .order("created_at", { ascending: false });
      return data ?? [];
    },
  });

  const openCreateDialog = () => {
    setEditingProduct(null);
    setName("");
    setDescription("");
    setPrice("");
    setStock("10");
    setCategoryId(categories[0]?.id || "");
    setImageUrl("");
    setIsDialogOpen(true);
  };

  const openEditDialog = (p: any) => {
    setEditingProduct(p);
    setName(p.name);
    setDescription(p.description || "");
    setPrice(String(p.price));
    setStock(String(p.stock));
    setCategoryId(p.category_id || "");
    setImageUrl(p.image_url || "");
    setIsDialogOpen(true);
  };

  const saveMutation = useMutation({
    mutationFn: async () => {
      const parsedPrice = parseFloat(price);
      const parsedStock = parseInt(stock, 10);
      if (!name.trim()) throw new Error("Product name required");
      if (isNaN(parsedPrice) || parsedPrice <= 0) throw new Error("Valid price required");

      const payload = {
        name: name.trim(),
        description: description.trim() || null,
        price: parsedPrice,
        stock: isNaN(parsedStock) ? 0 : parsedStock,
        category_id: categoryId || null,
        image_url: imageUrl.trim() || null,
        trader_id: traderId,
        is_active: true,
      };

      if (editingProduct?.id) {
        const { error } = await supabase
          .from("products")
          .update(payload)
          .eq("id", editingProduct.id);
        if (error) throw error;
      } else {
        const { error } = await supabase.from("products").insert(payload);
        if (error) throw error;
      }
    },
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ["trader-products", traderId] });
      queryClient.invalidateQueries({ queryKey: ["products"] });
      setIsDialogOpen(false);
      toast.success(editingProduct ? "Product updated" : "Product added to shop");
    },
    onError: (err: any) => {
      toast.error(err?.message ?? "Failed to save product");
    },
  });

  const deleteMutation = useMutation({
    mutationFn: async (id: string) => {
      const { error } = await supabase.from("products").delete().eq("id", id);
      if (error) throw error;
    },
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ["trader-products", traderId] });
      queryClient.invalidateQueries({ queryKey: ["products"] });
      toast.success("Product deleted");
    },
    onError: (err: any) => {
      toast.error(err?.message ?? "Failed to delete product");
    },
  });

  return (
    <div className="space-y-6">
      <div className="flex items-center justify-between">
        <div>
          <h3 className="font-display text-lg font-semibold">Shop Products & Stock</h3>
          <p className="text-xs text-muted-foreground">Manage your product offerings, pricing, and stock levels.</p>
        </div>
        <Button onClick={openCreateDialog} size="sm" className="gap-1.5">
          <Plus className="h-4 w-4" /> Add New Product
        </Button>
      </div>

      {isLoading ? (
        <div className="h-48 rounded-xl border bg-card/50 animate-pulse" />
      ) : products.length === 0 ? (
        <div className="rounded-xl border border-dashed py-12 text-center text-muted-foreground">
          You haven't listed any products yet. Click "Add New Product" to start selling!
        </div>
      ) : (
        <div className="overflow-hidden rounded-xl border bg-card shadow-sm">
          <div className="overflow-x-auto">
            <table className="w-full text-left text-sm">
              <thead className="border-b bg-muted/40 text-xs font-semibold text-muted-foreground uppercase tracking-wider">
                <tr>
                  <th className="px-5 py-3">Product</th>
                  <th className="px-5 py-3">Category</th>
                  <th className="px-5 py-3">Price</th>
                  <th className="px-5 py-3">Stock</th>
                  <th className="px-5 py-3 text-right">Actions</th>
                </tr>
              </thead>
              <tbody className="divide-y">
                {products.map((p) => (
                  <tr key={p.id} className="hover:bg-muted/20 transition-colors">
                    <td className="px-5 py-4">
                      <div className="flex items-center gap-3">
                        <div className="h-10 w-10 shrink-0 overflow-hidden rounded bg-muted border">
                          {p.image_url ? (
                            <img src={p.image_url} alt={p.name} className="h-full w-full object-cover" />
                          ) : (
                            <div className="flex h-full w-full items-center justify-center text-muted-foreground">
                              <ShoppingBag className="h-4 w-4 opacity-40" />
                            </div>
                          )}
                        </div>
                        <div>
                          <div className="font-semibold text-foreground">{p.name}</div>
                          {p.description && (
                            <div className="text-xs text-muted-foreground line-clamp-1 max-w-xs">
                              {p.description}
                            </div>
                          )}
                        </div>
                      </div>
                    </td>
                    <td className="px-5 py-4 text-xs text-muted-foreground">
                      <Badge variant="secondary">{p.categories?.name || "Uncategorized"}</Badge>
                    </td>
                    <td className="px-5 py-4 font-display font-semibold text-foreground">
                      GH₵{p.price.toFixed(2)}
                    </td>
                    <td className="px-5 py-4 text-xs">
                      {p.stock > 0 ? (
                        <span className="text-emerald-600 font-semibold">{p.stock} units</span>
                      ) : (
                        <span className="text-destructive font-semibold">Out of stock</span>
                      )}
                    </td>
                    <td className="px-5 py-4 text-right">
                      <div className="flex items-center justify-end gap-2">
                        <Button
                          size="icon"
                          variant="ghost"
                          onClick={() => openEditDialog(p)}
                          className="h-8 w-8 text-muted-foreground hover:text-foreground"
                        >
                          <Edit2 className="h-4 w-4" />
                        </Button>
                        <Button
                          size="icon"
                          variant="ghost"
                          onClick={() => {
                            if (confirm(`Delete "${p.name}"?`)) {
                              deleteMutation.mutate(p.id);
                            }
                          }}
                          className="h-8 w-8 text-muted-foreground hover:text-destructive"
                        >
                          <Trash2 className="h-4 w-4" />
                        </Button>
                      </div>
                    </td>
                  </tr>
                ))}
              </tbody>
            </table>
          </div>
        </div>
      )}

      {/* Product Form Modal */}
      <Dialog open={isDialogOpen} onOpenChange={setIsDialogOpen}>
        <DialogContent className="max-w-md">
          <DialogHeader>
            <DialogTitle>{editingProduct ? "Edit Product" : "Add Product to Shop"}</DialogTitle>
          </DialogHeader>
          <div className="space-y-4 py-2 text-xs">
            <div className="space-y-1">
              <Label htmlFor="p-name">Product Name</Label>
              <Input
                id="p-name"
                placeholder="e.g. Sourdough Bread Loaf"
                value={name}
                onChange={(e) => setName(e.target.value)}
              />
            </div>

            <div className="grid grid-cols-2 gap-3">
              <div className="space-y-1">
                <Label htmlFor="p-price">Price (GH₵)</Label>
                <Input
                  id="p-price"
                  type="number"
                  step="0.01"
                  placeholder="4.50"
                  value={price}
                  onChange={(e) => setPrice(e.target.value)}
                />
              </div>

              <div className="space-y-1">
                <Label htmlFor="p-stock">Available Stock</Label>
                <Input
                  id="p-stock"
                  type="number"
                  placeholder="10"
                  value={stock}
                  onChange={(e) => setStock(e.target.value)}
                />
              </div>
            </div>

            <div className="space-y-1">
              <Label htmlFor="p-cat">Category</Label>
              <Select value={categoryId} onValueChange={setCategoryId}>
                <SelectTrigger id="p-cat" className="h-9 text-xs">
                  <SelectValue placeholder="Select category" />
                </SelectTrigger>
                <SelectContent>
                  {categories.map((c) => (
                    <SelectItem key={c.id} value={c.id}>
                      {c.name}
                    </SelectItem>
                  ))}
                </SelectContent>
              </Select>
            </div>

            <div className="space-y-1">
              <Label htmlFor="p-img">Image URL (Optional)</Label>
              <Input
                id="p-img"
                placeholder="https://images.unsplash.com/..."
                value={imageUrl}
                onChange={(e) => setImageUrl(e.target.value)}
              />
            </div>

            <div className="space-y-1">
              <Label htmlFor="p-desc">Description</Label>
              <Textarea
                id="p-desc"
                rows={3}
                placeholder="Freshly baked organic sourdough..."
                value={description}
                onChange={(e) => setDescription(e.target.value)}
              />
            </div>
          </div>

          <DialogFooter>
            <Button variant="outline" onClick={() => setIsDialogOpen(false)}>
              Cancel
            </Button>
            <Button onClick={() => saveMutation.mutate()} disabled={saveMutation.isPending}>
              {saveMutation.isPending ? "Saving…" : "Save Product"}
            </Button>
          </DialogFooter>
        </DialogContent>
      </Dialog>
    </div>
  );
}

/* =========================================================================
   2. TRADER ORDERS & FULFILMENT TAB
   ========================================================================= */
function TraderOrdersTab({ traderId }: { traderId: string }) {
  const queryClient = useQueryClient();

  // Fetch orders containing products from this trader
  const { data: orders = [], isLoading } = useQuery({
    queryKey: ["trader-orders", traderId],
    queryFn: async () => {
      const { data, error } = await supabase
        .from("orders")
        .select(`
          *,
          order_items!inner (
            id,
            quantity,
            price,
            product_id,
            products!inner (
              id,
              name,
              trader_id
            )
          )
        `)
        .eq("order_items.products.trader_id", traderId)
        .order("created_at", { ascending: false });

      if (error) throw error;
      return data ?? [];
    },
  });

  const updateStatusMutation = useMutation({
    mutationFn: async ({ orderId, newStatus }: { orderId: string; newStatus: string }) => {
      const { error } = await supabase
        .from("orders")
        .update({ status: newStatus as any })
        .eq("id", orderId);

      if (error) throw error;

      // Trigger notification email dispatch
      sendOrderEmailNotification({
        data: {
          type: "status_updated",
          orderId,
          newStatus,
        },
      }).catch((err) => console.error("Notification error:", err));
    },
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ["trader-orders", traderId] });
      toast.success("Order status updated & notification sent to customer");
    },
    onError: (err: any) => {
      toast.error(err?.message ?? "Failed to update order status");
    },
  });

  return (
    <div className="space-y-6">
      <div>
        <h3 className="font-display text-lg font-semibold">Incoming Orders & Fulfilment</h3>
        <p className="text-xs text-muted-foreground">Process customer orders and update fulfilment delivery status.</p>
      </div>

      {isLoading ? (
        <div className="h-48 rounded-xl border bg-card/50 animate-pulse" />
      ) : orders.length === 0 ? (
        <div className="rounded-xl border border-dashed py-12 text-center text-muted-foreground">
          No customer orders received yet for your shop.
        </div>
      ) : (
        <div className="space-y-6">
          {orders.map((order: any) => (
            <div key={order.id} className="rounded-xl border bg-card overflow-hidden shadow-sm">
              <div className="flex flex-wrap items-center justify-between gap-4 border-b bg-muted/30 px-5 py-3 text-xs">
                <div>
                  <span className="font-semibold text-foreground text-sm">Order #{order.id.slice(0, 8)}</span>
                  <span className="ml-3 text-muted-foreground">{new Date(order.created_at).toLocaleString()}</span>
                </div>

                <div className="flex items-center gap-3">
                  <span className="text-muted-foreground">Update Status:</span>
                  <Select
                    value={order.status}
                    onValueChange={(newStatus) =>
                      updateStatusMutation.mutate({ orderId: order.id, newStatus })
                    }
                  >
                    <SelectTrigger className="w-[180px] h-8 text-xs font-semibold">
                      <SelectValue />
                    </SelectTrigger>
                    <SelectContent>
                      <SelectItem value="pending">Order Placed</SelectItem>
                      <SelectItem value="processing">Processing</SelectItem>
                      <SelectItem value="shipped">Out for Delivery</SelectItem>
                      <SelectItem value="delivered">Delivered</SelectItem>
                      <SelectItem value="cancelled">Cancelled</SelectItem>
                    </SelectContent>
                  </Select>
                </div>
              </div>

              <div className="grid grid-cols-1 gap-6 p-5 md:grid-cols-12 text-xs">
                {/* Ordered Items */}
                <div className="md:col-span-7 space-y-2">
                  <span className="font-semibold text-muted-foreground uppercase">Items for Your Shop</span>
                  <div className="divide-y rounded-lg border bg-background">
                    {(order.order_items ?? []).map((item: any) => (
                      <div key={item.id} className="flex items-center justify-between p-3">
                        <span className="font-medium text-foreground">{item.products?.name}</span>
                        <span>{item.quantity} × GH₵{item.price.toFixed(2)}</span>
                      </div>
                    ))}
                  </div>
                </div>

                {/* Customer Delivery Address */}
                <div className="md:col-span-5 rounded-lg border bg-muted/20 p-4 space-y-2">
                  <span className="font-semibold text-foreground flex items-center gap-1.5">
                    <Truck className="h-4 w-4 text-primary" /> Delivery Customer
                  </span>
                  <p className="font-semibold text-foreground">{order.delivery_name}</p>
                  <p className="flex items-start gap-1 text-muted-foreground">
                    <MapPin className="h-3.5 w-3.5 shrink-0 mt-0.5" />
                    <span>{order.delivery_address}</span>
                  </p>
                  <p className="flex items-center gap-1 text-muted-foreground">
                    <Phone className="h-3.5 w-3.5 shrink-0" />
                    <span>{order.delivery_phone}</span>
                  </p>
                  {order.notes && (
                    <p className="pt-2 border-t italic text-muted-foreground">
                      "{order.notes}"
                    </p>
                  )}
                </div>
              </div>
            </div>
          ))}
        </div>
      )}
    </div>
  );
}
