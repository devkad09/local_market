import { createFileRoute, Link } from "@tanstack/react-router";
import { useState } from "react";
import { useQuery, useMutation, useQueryClient } from "@tanstack/react-query";
import { toast } from "sonner";
import {
  ShieldAlert,
  Store,
  FolderTree,
  BarChart3,
  Users,
  CheckCircle2,
  XCircle,
  Clock,
  Plus,
  Edit2,
  Trash2,
  Search,
  UserCheck,
  TrendingUp,
  ShoppingBag,
  DollarSign,
  ShieldCheck,
  RefreshCw,
  ScrollText,
} from "lucide-react";
import {
  BarChart,
  Bar,
  XAxis,
  YAxis,
  CartesianGrid,
  Tooltip,
  ResponsiveContainer,
  PieChart,
  Pie,
  Cell,
} from "recharts";
import { supabase } from "@/integrations/supabase/client";
import { useAuth, type AppRole } from "@/lib/auth-context";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { Badge } from "@/components/ui/badge";
import { Tabs, TabsContent, TabsList, TabsTrigger } from "@/components/ui/tabs";
import {
  Dialog,
  DialogContent,
  DialogHeader,
  DialogTitle,
  DialogFooter,
} from "@/components/ui/dialog";

export const Route = createFileRoute("/admin")({
  head: () => ({
    meta: [
      { title: "Admin Portal — Marketplace" },
      { name: "description", content: "Platform management, trader approvals, category CRUD, and sales analytics." },
    ],
  }),
  component: AdminPage,
});

const PIE_COLORS = ["#f59e0b", "#3b82f6", "#10b981", "#059669", "#ef4444"];

function AdminPage() {
  const { user, roles, refreshRoles, loading: authLoading } = useAuth();
  const queryClient = useQueryClient();
  const [activeTab, setActiveTab] = useState("traders");
  const [devModeOverride, setDevModeOverride] = useState(false);

  // Check admin status
  const isAdmin = roles.includes("admin") || devModeOverride;

  // Handler to grant current logged in user admin role in user_roles table
  const handleGrantSelfAdmin = async () => {
    if (!user) return;
    try {
      const { error } = await supabase
        .from("user_roles")
        .insert({ user_id: user.id, role: "admin" });

      if (error && !error.message.includes("duplicate")) {
        throw error;
      }

      await refreshRoles();
      setDevModeOverride(true);
      toast.success("Granted Admin role to your account!");
    } catch (err: any) {
      toast.error(err?.message ?? "Failed to assign admin role");
    }
  };

  if (authLoading) {
    return (
      <main className="mx-auto max-w-7xl px-4 py-12 sm:px-6">
        <div className="h-8 w-48 rounded bg-muted animate-pulse mb-6" />
        <div className="h-96 rounded-xl border bg-card/50 animate-pulse" />
      </main>
    );
  }

  if (!user) {
    return (
      <main className="mx-auto max-w-md px-4 py-16 text-center">
        <ShieldAlert className="mx-auto h-12 w-12 text-destructive" />
        <h1 className="mt-4 font-display text-2xl font-bold">Admin Sign In Required</h1>
        <p className="mt-2 text-sm text-muted-foreground">
          You must be signed in with an administrative account to access the platform admin portal.
        </p>
        <Button asChild className="mt-6 w-full">
          <Link to="/auth" search={{ redirect: "/admin" }}>
            Sign In to Admin Portal
          </Link>
        </Button>
      </main>
    );
  }

  return (
    <main className="mx-auto max-w-7xl px-4 py-8 sm:px-6">
      {/* Dev Mode Banner if user is signed in but not yet an admin role */}
      {!roles.includes("admin") && (
        <div className="mb-6 rounded-xl border border-amber-200 bg-amber-50 dark:bg-amber-950/40 dark:border-amber-900 p-4 text-xs text-amber-900 dark:text-amber-200 flex flex-col sm:flex-row items-start sm:items-center justify-between gap-3">
          <div className="flex items-center gap-2">
            <ShieldAlert className="h-4 w-4 shrink-0 text-amber-600 dark:text-amber-400" />
            <span>
              Your account ({user.email}) currently has roles: <strong>{roles.join(", ") || "customer"}</strong>.
            </span>
          </div>
          <div className="flex items-center gap-2">
            <Button size="sm" variant="outline" onClick={handleGrantSelfAdmin} className="h-7 text-xs gap-1">
              <ShieldCheck className="h-3.5 w-3.5" /> Assign Admin Role
            </Button>
            <Button
              size="sm"
              variant={devModeOverride ? "default" : "ghost"}
              onClick={() => setDevModeOverride(!devModeOverride)}
              className="h-7 text-xs"
            >
              {devModeOverride ? "Dev Override Active" : "Enable Dev Override"}
            </Button>
          </div>
        </div>
      )}

      {/* Header */}
      <div className="flex flex-col gap-2 md:flex-row md:items-center md:justify-between">
        <div>
          <h1 className="font-display text-3xl font-bold tracking-tight">Platform Administration</h1>
          <p className="mt-1 text-sm text-muted-foreground">
            Approve local traders, manage product categories, inspect analytics, and audit user roles.
          </p>
        </div>
      </div>

      {/* Main Tabs */}
      <Tabs value={activeTab} onValueChange={setActiveTab} className="mt-8">
        <TabsList className="grid w-full grid-cols-2 md:grid-cols-5 h-auto p-1">
          <TabsTrigger value="traders" className="gap-2 py-2.5 text-xs font-semibold">
            <Store className="h-4 w-4" /> Trader Approvals
          </TabsTrigger>
          <TabsTrigger value="categories" className="gap-2 py-2.5 text-xs font-semibold">
            <FolderTree className="h-4 w-4" /> Categories
          </TabsTrigger>
          <TabsTrigger value="analytics" className="gap-2 py-2.5 text-xs font-semibold">
            <BarChart3 className="h-4 w-4" /> Analytics & Reports
          </TabsTrigger>
          <TabsTrigger value="users" className="gap-2 py-2.5 text-xs font-semibold">
            <Users className="h-4 w-4" /> User Roles
          </TabsTrigger>
          <TabsTrigger value="audit-logs" className="gap-2 py-2.5 text-xs font-semibold">
            <ScrollText className="h-4 w-4" /> Audit Logs
          </TabsTrigger>
        </TabsList>

        <div className="mt-6">
          <TabsContent value="traders">
            <TraderApprovalsTab />
          </TabsContent>

          <TabsContent value="categories">
            <CategoryManagementTab />
          </TabsContent>

          <TabsContent value="analytics">
            <AnalyticsTab />
          </TabsContent>

          <TabsContent value="users">
            <UserRolesTab />
          </TabsContent>

          <TabsContent value="audit-logs">
            <AuditLogsTab />
          </TabsContent>
        </div>
      </Tabs>
    </main>
  );
}

/* =========================================================================
   1. TRADER APPROVALS TAB
   ========================================================================= */
function TraderApprovalsTab() {
  const queryClient = useQueryClient();
  const [statusFilter, setStatusFilter] = useState<string>("all");

  const { data: traders = [], isLoading } = useQuery({
    queryKey: ["admin-traders"],
    queryFn: async () => {
      const { data, error } = await supabase
        .from("traders")
        .select("*")
        .order("created_at", { ascending: false });
      if (error) throw error;
      return data ?? [];
    },
  });

  const updateStatusMutation = useMutation({
    mutationFn: async ({ traderId, userId, newStatus }: { traderId: string; userId: string; newStatus: "approved" | "suspended" | "pending" }) => {
      // 1. Update trader status in traders table
      const { error: statusErr } = await supabase
        .from("traders")
        .update({ status: newStatus })
        .eq("id", traderId);

      if (statusErr) throw statusErr;

      // 2. If approved, make sure user has 'trader' role in user_roles
      if (newStatus === "approved") {
        const { data: existing } = await supabase
          .from("user_roles")
          .select("id")
          .eq("user_id", userId)
          .eq("role", "trader")
          .maybeSingle();

        if (!existing) {
          await supabase.from("user_roles").insert({ user_id: userId, role: "trader" });
        }
      }
    },
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ["admin-traders"] });
      toast.success("Trader status updated successfully");
    },
    onError: (err: any) => {
      toast.error(err?.message ?? "Failed to update status");
    },
  });

  const filteredTraders = traders.filter((t) => {
    if (statusFilter === "all") return true;
    return t.status === statusFilter;
  });

  const pendingCount = traders.filter((t) => t.status === "pending").length;
  const approvedCount = traders.filter((t) => t.status === "approved").length;
  const suspendedCount = traders.filter((t) => t.status === "suspended").length;

  return (
    <div className="space-y-6">
      {/* Stat Cards */}
      <div className="grid grid-cols-2 gap-4 sm:grid-cols-4">
        <div className="rounded-xl border bg-card p-4">
          <span className="text-xs text-muted-foreground">Total Applicants</span>
          <div className="mt-1 font-display text-2xl font-bold">{traders.length}</div>
        </div>
        <div className="rounded-xl border border-amber-200 bg-amber-50/50 dark:bg-amber-950/20 p-4">
          <span className="text-xs text-amber-800 dark:text-amber-300 font-medium">Pending Approval</span>
          <div className="mt-1 font-display text-2xl font-bold text-amber-700 dark:text-amber-400">{pendingCount}</div>
        </div>
        <div className="rounded-xl border border-emerald-200 bg-emerald-50/50 dark:bg-emerald-950/20 p-4">
          <span className="text-xs text-emerald-800 dark:text-emerald-300 font-medium">Approved Shops</span>
          <div className="mt-1 font-display text-2xl font-bold text-emerald-700 dark:text-emerald-400">{approvedCount}</div>
        </div>
        <div className="rounded-xl border border-destructive/20 bg-destructive/5 p-4">
          <span className="text-xs text-destructive font-medium">Suspended</span>
          <div className="mt-1 font-display text-2xl font-bold text-destructive">{suspendedCount}</div>
        </div>
      </div>

      {/* Filter Tabs */}
      <div className="flex items-center gap-2 overflow-x-auto pb-1">
        {["all", "pending", "approved", "suspended"].map((st) => (
          <Button
            key={st}
            variant={statusFilter === st ? "default" : "outline"}
            size="sm"
            onClick={() => setStatusFilter(st)}
            className="capitalize rounded-full text-xs"
          >
            {st === "all" ? "All Shops" : st}
          </Button>
        ))}
      </div>

      {/* Traders Table */}
      {isLoading ? (
        <div className="h-48 rounded-xl border bg-card/50 animate-pulse" />
      ) : filteredTraders.length === 0 ? (
        <div className="rounded-xl border border-dashed py-12 text-center text-muted-foreground">
          No trader applications found matching filter.
        </div>
      ) : (
        <div className="overflow-hidden rounded-xl border bg-card shadow-sm">
          <div className="overflow-x-auto">
            <table className="w-full text-left text-sm">
              <thead className="border-b bg-muted/40 text-xs font-semibold text-muted-foreground uppercase tracking-wider">
                <tr>
                  <th className="px-5 py-3">Shop Name</th>
                  <th className="px-5 py-3">Address</th>
                  <th className="px-5 py-3">Status</th>
                  <th className="px-5 py-3">Applied Date</th>
                  <th className="px-5 py-3 text-right">Actions</th>
                </tr>
              </thead>
              <tbody className="divide-y">
                {filteredTraders.map((trader) => (
                  <tr key={trader.id} className="hover:bg-muted/20 transition-colors">
                    <td className="px-5 py-4">
                      <div className="font-semibold text-foreground">{trader.shop_name}</div>
                      {trader.description && (
                        <div className="text-xs text-muted-foreground line-clamp-1 max-w-xs">
                          {trader.description}
                        </div>
                      )}
                    </td>
                    <td className="px-5 py-4 text-xs text-muted-foreground max-w-xs truncate">
                      {trader.address}
                    </td>
                    <td className="px-5 py-4">
                      <Badge
                        variant={
                          trader.status === "approved"
                            ? "default"
                            : trader.status === "pending"
                            ? "outline"
                            : "destructive"
                        }
                        className="capitalize text-xs gap-1"
                      >
                        {trader.status === "approved" && <CheckCircle2 className="h-3 w-3" />}
                        {trader.status === "pending" && <Clock className="h-3 w-3" />}
                        {trader.status === "suspended" && <XCircle className="h-3 w-3" />}
                        {trader.status}
                      </Badge>
                    </td>
                    <td className="px-5 py-4 text-xs text-muted-foreground whitespace-nowrap">
                      {new Date(trader.created_at).toLocaleDateString()}
                    </td>
                    <td className="px-5 py-4 text-right">
                      <div className="flex items-center justify-end gap-2">
                        {trader.status !== "approved" && (
                          <Button
                            size="sm"
                            variant="outline"
                            onClick={() =>
                              updateStatusMutation.mutate({
                                traderId: trader.id,
                                userId: trader.user_id,
                                newStatus: "approved",
                              })
                            }
                            className="h-8 text-xs gap-1 text-emerald-600 hover:text-emerald-700"
                          >
                            <CheckCircle2 className="h-3.5 w-3.5" /> Approve
                          </Button>
                        )}
                        {trader.status !== "suspended" && (
                          <Button
                            size="sm"
                            variant="ghost"
                            onClick={() =>
                              updateStatusMutation.mutate({
                                traderId: trader.id,
                                userId: trader.user_id,
                                newStatus: "suspended",
                              })
                            }
                            className="h-8 text-xs gap-1 text-destructive hover:text-destructive"
                          >
                            <XCircle className="h-3.5 w-3.5" /> Suspend
                          </Button>
                        )}
                      </div>
                    </td>
                  </tr>
                ))}
              </tbody>
            </table>
          </div>
        </div>
      )}
    </div>
  );
}

/* =========================================================================
   2. CATEGORY MANAGEMENT TAB
   ========================================================================= */
function CategoryManagementTab() {
  const queryClient = useQueryClient();
  const [isDialogOpen, setIsDialogOpen] = useState(false);
  const [editingCategory, setEditingCategory] = useState<{ id?: string; name: string; slug: string } | null>(null);
  const [nameInput, setNameInput] = useState("");
  const [slugInput, setSlugInput] = useState("");

  const { data: categories = [], isLoading } = useQuery({
    queryKey: ["admin-categories"],
    queryFn: async () => {
      const { data, error } = await supabase
        .from("categories")
        .select(`
          *,
          products (id)
        `)
        .order("name");
      if (error) throw error;
      return data ?? [];
    },
  });

  const slugify = (str: string) =>
    str
      .toLowerCase()
      .trim()
      .replace(/[^\w\s-]/g, "")
      .replace(/[\s_-]+/g, "-")
      .replace(/^-+|-+$/g, "");

  const handleNameChange = (val: string) => {
    setNameInput(val);
    if (!editingCategory?.id) {
      setSlugInput(slugify(val));
    }
  };

  const openCreateDialog = () => {
    setEditingCategory(null);
    setNameInput("");
    setSlugInput("");
    setIsDialogOpen(true);
  };

  const openEditDialog = (cat: { id: string; name: string; slug: string }) => {
    setEditingCategory(cat);
    setNameInput(cat.name);
    setSlugInput(cat.slug);
    setIsDialogOpen(true);
  };

  const saveMutation = useMutation({
    mutationFn: async () => {
      if (!nameInput.trim() || !slugInput.trim()) {
        throw new Error("Category name and slug are required");
      }

      if (editingCategory?.id) {
        const { error } = await supabase
          .from("categories")
          .update({ name: nameInput.trim(), slug: slugInput.trim() })
          .eq("id", editingCategory.id);
        if (error) throw error;
      } else {
        const { error } = await supabase
          .from("categories")
          .insert({ name: nameInput.trim(), slug: slugInput.trim() });
        if (error) throw error;
      }
    },
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ["admin-categories"] });
      queryClient.invalidateQueries({ queryKey: ["categories"] });
      setIsDialogOpen(false);
      toast.success(editingCategory ? "Category updated" : "Category created");
    },
    onError: (err: any) => {
      toast.error(err?.message ?? "Failed to save category");
    },
  });

  const deleteMutation = useMutation({
    mutationFn: async (id: string) => {
      const { error } = await supabase.from("categories").delete().eq("id", id);
      if (error) throw error;
    },
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ["admin-categories"] });
      queryClient.invalidateQueries({ queryKey: ["categories"] });
      toast.success("Category deleted");
    },
    onError: (err: any) => {
      toast.error(err?.message ?? "Failed to delete category");
    },
  });

  return (
    <div className="space-y-6">
      <div className="flex items-center justify-between">
        <div>
          <h3 className="font-display text-lg font-semibold">Product Categories</h3>
          <p className="text-xs text-muted-foreground">Manage storefront product taxonomy and category filters.</p>
        </div>
        <Button onClick={openCreateDialog} size="sm" className="gap-1.5">
          <Plus className="h-4 w-4" /> Add Category
        </Button>
      </div>

      {isLoading ? (
        <div className="h-48 rounded-xl border bg-card/50 animate-pulse" />
      ) : (
        <div className="overflow-hidden rounded-xl border bg-card shadow-sm">
          <table className="w-full text-left text-sm">
            <thead className="border-b bg-muted/40 text-xs font-semibold text-muted-foreground uppercase tracking-wider">
              <tr>
                <th className="px-5 py-3">Category Name</th>
                <th className="px-5 py-3">Slug</th>
                <th className="px-5 py-3">Product Count</th>
                <th className="px-5 py-3 text-right">Actions</th>
              </tr>
            </thead>
            <tbody className="divide-y">
              {categories.map((cat: any) => (
                <tr key={cat.id} className="hover:bg-muted/20 transition-colors">
                  <td className="px-5 py-4 font-semibold text-foreground">{cat.name}</td>
                  <td className="px-5 py-4 text-xs font-mono text-muted-foreground">{cat.slug}</td>
                  <td className="px-5 py-4 text-xs text-muted-foreground">
                    <Badge variant="secondary" className="font-mono">
                      {cat.products?.length ?? 0} products
                    </Badge>
                  </td>
                  <td className="px-5 py-4 text-right">
                    <div className="flex items-center justify-end gap-2">
                      <Button
                        size="icon"
                        variant="ghost"
                        onClick={() => openEditDialog(cat)}
                        className="h-8 w-8 text-muted-foreground hover:text-foreground"
                      >
                        <Edit2 className="h-4 w-4" />
                      </Button>
                      <Button
                        size="icon"
                        variant="ghost"
                        onClick={() => {
                          if (confirm(`Delete category "${cat.name}"?`)) {
                            deleteMutation.mutate(cat.id);
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
      )}

      {/* Category Modal */}
      <Dialog open={isDialogOpen} onOpenChange={setIsDialogOpen}>
        <DialogContent className="max-w-md">
          <DialogHeader>
            <DialogTitle>{editingCategory ? "Edit Category" : "Add New Category"}</DialogTitle>
          </DialogHeader>
          <div className="space-y-4 py-2">
            <div className="space-y-1.5">
              <Label htmlFor="cat-name">Category Name</Label>
              <Input
                id="cat-name"
                placeholder="e.g. Artisanal Bakery"
                value={nameInput}
                onChange={(e) => handleNameChange(e.target.value)}
              />
            </div>
            <div className="space-y-1.5">
              <Label htmlFor="cat-slug">URL Slug</Label>
              <Input
                id="cat-slug"
                placeholder="artisanal-bakery"
                value={slugInput}
                onChange={(e) => setSlugInput(e.target.value)}
              />
            </div>
          </div>
          <DialogFooter>
            <Button variant="outline" onClick={() => setIsDialogOpen(false)}>
              Cancel
            </Button>
            <Button onClick={() => saveMutation.mutate()} disabled={saveMutation.isPending}>
              {saveMutation.isPending ? "Saving…" : "Save Category"}
            </Button>
          </DialogFooter>
        </DialogContent>
      </Dialog>
    </div>
  );
}

/* =========================================================================
   3. SALES & PLATFORM ANALYTICS TAB
   ========================================================================= */
function AnalyticsTab() {
  const { data: orders = [], isLoading } = useQuery({
    queryKey: ["admin-analytics-orders"],
    queryFn: async () => {
      const { data, error } = await supabase
        .from("orders")
        .select(`
          *,
          order_items(price, quantity, products(traders(shop_name)))
        `)
        .order("created_at", { ascending: true });
      if (error) throw error;
      return data ?? [];
    },
  });

  if (isLoading) {
    return <div className="h-64 rounded-xl border bg-card/50 animate-pulse" />;
  }

  // Calculate Metrics
  const totalRevenue = orders.reduce((sum, o) => sum + (o.total ?? 0), 0);
  const totalOrders = orders.length;
  const avgOrderValue = totalOrders > 0 ? totalRevenue / totalOrders : 0;

  // Revenue chart data grouped by date
  const revenueByDateMap: Record<string, number> = {};
  orders.forEach((o) => {
    const d = new Date(o.created_at).toLocaleDateString("en-GB", { month: "short", day: "numeric" });
    revenueByDateMap[d] = (revenueByDateMap[d] || 0) + (o.total ?? 0);
  });
  const revenueChartData = Object.entries(revenueByDateMap).map(([date, sales]) => ({
    date,
    sales: Number(sales.toFixed(2)),
  }));

  // Status breakdown data for Pie Chart
  const statusMap: Record<string, number> = {};
  orders.forEach((o) => {
    statusMap[o.status] = (statusMap[o.status] || 0) + 1;
  });
  const pieChartData = Object.entries(statusMap).map(([name, value]) => ({
    name: name.toUpperCase(),
    value,
  }));

  // Top shops data
  const shopSalesMap: Record<string, number> = {};
  orders.forEach((o) => {
    (o.order_items ?? []).forEach((item: any) => {
      const shopName = item.products?.traders?.shop_name || "Unknown Shop";
      const itemTotal = (item.price ?? 0) * (item.quantity ?? 1);
      shopSalesMap[shopName] = (shopSalesMap[shopName] || 0) + itemTotal;
    });
  });
  const topShopsData = Object.entries(shopSalesMap)
    .map(([shop, revenue]) => ({ shop, revenue: Number(revenue.toFixed(2)) }))
    .sort((a, b) => b.revenue - a.revenue)
    .slice(0, 5);

  return (
    <div className="space-y-8">
      {/* Metric Cards */}
      <div className="grid grid-cols-1 gap-4 sm:grid-cols-3">
        <div className="rounded-xl border bg-card p-5">
          <div className="flex items-center justify-between text-muted-foreground">
            <span className="text-xs font-medium">Total Platform Revenue</span>
            <DollarSign className="h-4 w-4 text-emerald-600" />
          </div>
          <div className="mt-2 font-display text-3xl font-bold text-foreground">
            GH₵{totalRevenue.toFixed(2)}
          </div>
        </div>

        <div className="rounded-xl border bg-card p-5">
          <div className="flex items-center justify-between text-muted-foreground">
            <span className="text-xs font-medium">Total Orders Processed</span>
            <ShoppingBag className="h-4 w-4 text-primary" />
          </div>
          <div className="mt-2 font-display text-3xl font-bold text-foreground">
            {totalOrders}
          </div>
        </div>

        <div className="rounded-xl border bg-card p-5">
          <div className="flex items-center justify-between text-muted-foreground">
            <span className="text-xs font-medium">Average Order Value</span>
            <TrendingUp className="h-4 w-4 text-amber-600" />
          </div>
          <div className="mt-2 font-display text-3xl font-bold text-foreground">
            GH₵{avgOrderValue.toFixed(2)}
          </div>
        </div>
      </div>

      {/* Charts Grid */}
      <div className="grid grid-cols-1 gap-6 lg:grid-cols-12">
        {/* Sales Trend Bar Chart */}
        <div className="lg:col-span-8 rounded-xl border bg-card p-6 shadow-sm">
          <h3 className="font-display text-base font-semibold">Sales Revenue Trend (GH₵)</h3>
          <div className="mt-6 h-72 w-full">
            {revenueChartData.length > 0 ? (
              <ResponsiveContainer width="100%" height="100%">
                <BarChart data={revenueChartData}>
                  <CartesianGrid strokeDasharray="3 3" vertical={false} opacity={0.3} />
                  <XAxis dataKey="date" fontSize={12} tickLine={false} />
                  <YAxis fontSize={12} tickLine={false} tickFormatter={(v) => `GH₵${v}`} />
                  <Tooltip formatter={(value: any) => [`GH₵${value}`, "Revenue"]} />
                  <Bar dataKey="sales" fill="#10b981" radius={[4, 4, 0, 0]} />
                </BarChart>
              </ResponsiveContainer>
            ) : (
              <div className="flex h-full items-center justify-center text-xs text-muted-foreground">
                No revenue data recorded yet.
              </div>
            )}
          </div>
        </div>

        {/* Order Status Distribution Pie Chart */}
        <div className="lg:col-span-4 rounded-xl border bg-card p-6 shadow-sm">
          <h3 className="font-display text-base font-semibold">Order Status Distribution</h3>
          <div className="mt-6 h-72 w-full flex items-center justify-center">
            {pieChartData.length > 0 ? (
              <ResponsiveContainer width="100%" height="100%">
                <PieChart>
                  <Pie
                    data={pieChartData}
                    cx="50%"
                    cy="50%"
                    innerRadius={50}
                    outerRadius={80}
                    paddingAngle={4}
                    dataKey="value"
                    label={({ name, percent }: any) => `${name} (${(percent * 100).toFixed(0)}%)`}
                  >
                    {pieChartData.map((_, index) => (
                      <Cell key={`cell-${index}`} fill={PIE_COLORS[index % PIE_COLORS.length]} />
                    ))}
                  </Pie>
                  <Tooltip />
                </PieChart>
              </ResponsiveContainer>
            ) : (
              <div className="flex h-full items-center justify-center text-xs text-muted-foreground">
                No orders recorded yet.
              </div>
            )}
          </div>
        </div>
      </div>

      {/* Top Shops Bar Chart */}
      {topShopsData.length > 0 && (
        <div className="rounded-xl border bg-card p-6 shadow-sm">
          <h3 className="font-display text-base font-semibold">Top Performing Shops by Sales (GH₵)</h3>
          <div className="mt-6 h-64 w-full">
            <ResponsiveContainer width="100%" height="100%">
              <BarChart data={topShopsData} layout="vertical">
                <CartesianGrid strokeDasharray="3 3" horizontal={false} opacity={0.3} />
                <XAxis type="number" fontSize={12} tickFormatter={(v) => `GH₵${v}`} />
                <YAxis dataKey="shop" type="category" fontSize={12} width={140} />
                <Tooltip formatter={(value: any) => [`GH₵${value}`, "Sales"]} />
                <Bar dataKey="revenue" fill="#3b82f6" radius={[0, 4, 4, 0]} />
              </BarChart>
            </ResponsiveContainer>
          </div>
        </div>
      )}
    </div>
  );
}

/* =========================================================================
   4. USER ACCOUNTS & ROLES TAB
   ========================================================================= */
function UserRolesTab() {
  const queryClient = useQueryClient();
  const [searchQuery, setSearchQuery] = useState("");

  const { data: usersData = [], isLoading } = useQuery({
    queryKey: ["admin-users-roles"],
    queryFn: async () => {
      const { data: profiles, error: pErr } = await supabase.from("profiles").select("*");
      if (pErr) throw pErr;

      const { data: rolesData, error: rErr } = await supabase.from("user_roles").select("*");
      if (rErr) throw rErr;

      return (profiles ?? []).map((p) => ({
        ...p,
        roles: (rolesData ?? []).filter((r) => r.user_id === p.id).map((r) => r.role as AppRole),
      }));
    },
  });

  const toggleRoleMutation = useMutation({
    mutationFn: async ({ userId, targetRole, hasRole }: { userId: string; targetRole: AppRole; hasRole: boolean }) => {
      if (hasRole) {
        const { error } = await supabase
          .from("user_roles")
          .delete()
          .eq("user_id", userId)
          .eq("role", targetRole);
        if (error) throw error;
      } else {
        const { error } = await supabase
          .from("user_roles")
          .insert({ user_id: userId, role: targetRole });
        if (error) throw error;
      }
    },
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ["admin-users-roles"] });
      toast.success("User role updated");
    },
    onError: (err: any) => {
      toast.error(err?.message ?? "Failed to update role");
    },
  });

  const filteredUsers = usersData.filter(
    (u) =>
      u.name.toLowerCase().includes(searchQuery.toLowerCase()) ||
      u.id.toLowerCase().includes(searchQuery.toLowerCase())
  );

  return (
    <div className="space-y-6">
      <div className="flex flex-col gap-4 sm:flex-row sm:items-center sm:justify-between">
        <div>
          <h3 className="font-display text-lg font-semibold">User Accounts & Roles</h3>
          <p className="text-xs text-muted-foreground">Audit registered user profiles and grant/revoke trader or admin permissions.</p>
        </div>

        <div className="relative w-full sm:w-72">
          <Search className="absolute left-3 top-2.5 h-4 w-4 text-muted-foreground" />
          <Input
            placeholder="Search by name or ID…"
            value={searchQuery}
            onChange={(e) => setSearchQuery(e.target.value)}
            className="pl-9 text-xs"
          />
        </div>
      </div>

      {isLoading ? (
        <div className="h-48 rounded-xl border bg-card/50 animate-pulse" />
      ) : (
        <div className="overflow-hidden rounded-xl border bg-card shadow-sm">
          <table className="w-full text-left text-sm">
            <thead className="border-b bg-muted/40 text-xs font-semibold text-muted-foreground uppercase tracking-wider">
              <tr>
                <th className="px-5 py-3">User</th>
                <th className="px-5 py-3">Phone</th>
                <th className="px-5 py-3">Assigned Roles</th>
                <th className="px-5 py-3 text-right">Role Actions</th>
              </tr>
            </thead>
            <tbody className="divide-y">
              {filteredUsers.map((userProfile) => {
                const isTraderRole = userProfile.roles.includes("trader");
                const isAdminRole = userProfile.roles.includes("admin");

                return (
                  <tr key={userProfile.id} className="hover:bg-muted/20 transition-colors">
                    <td className="px-5 py-4">
                      <div className="font-semibold text-foreground">{userProfile.name}</div>
                      <div className="text-xs font-mono text-muted-foreground">{userProfile.id}</div>
                    </td>
                    <td className="px-5 py-4 text-xs text-muted-foreground">
                      {userProfile.phone || "—"}
                    </td>
                    <td className="px-5 py-4">
                      <div className="flex flex-wrap gap-1">
                        <Badge variant="outline" className="text-[10px]">customer</Badge>
                        {isTraderRole && <Badge variant="secondary" className="text-[10px] bg-blue-50 dark:bg-blue-950 text-blue-700 dark:text-blue-300">trader</Badge>}
                        {isAdminRole && <Badge variant="default" className="text-[10px]">admin</Badge>}
                      </div>
                    </td>
                    <td className="px-5 py-4 text-right">
                      <div className="flex items-center justify-end gap-2">
                        <Button
                          size="sm"
                          variant={isTraderRole ? "secondary" : "outline"}
                          onClick={() =>
                            toggleRoleMutation.mutate({
                              userId: userProfile.id,
                              targetRole: "trader",
                              hasRole: isTraderRole,
                            })
                          }
                          className="h-7 text-xs"
                        >
                          {isTraderRole ? "- Remove Trader" : "+ Grant Trader"}
                        </Button>
                        <Button
                          size="sm"
                          variant={isAdminRole ? "default" : "outline"}
                          onClick={() =>
                            toggleRoleMutation.mutate({
                              userId: userProfile.id,
                              targetRole: "admin",
                              hasRole: isAdminRole,
                            })
                          }
                          className="h-7 text-xs"
                        >
                          {isAdminRole ? "- Remove Admin" : "+ Grant Admin"}
                        </Button>
                      </div>
                    </td>
                  </tr>
                );
              })}
            </tbody>
          </table>
        </div>
      )}
    </div>
  );
}

/* =========================================================================
   5. ADMIN AUDIT LOGS TAB
   ========================================================================= */
function formatAuditAction(action: string, details: any): string {
  if (!details) return action;
  switch (action) {
    case "create_category":
      return `Created category "${details.name}" (${details.slug})`;
    case "update_category":
      return `Updated category "${details.old_name}" to "${details.new_name}"`;
    case "delete_category":
      return `Deleted category "${details.name}"`;
    case "create_trader":
      return `Registered trader shop "${details.shop_name}"`;
    case "approve_trader":
      return `Approved trader shop "${details.shop_name}"`;
    case "suspend_trader":
      return `Suspended trader shop "${details.shop_name}"`;
    case "update_trader_status":
      return `Updated trader shop "${details.shop_name}" status from ${details.old_status} to ${details.new_status}`;
    case "update_trader":
      return `Updated details for trader shop "${details.shop_name}"`;
    case "delete_trader":
      return `Deleted trader shop "${details.shop_name}"`;
    case "assign_role":
      return `Assigned role "${details.role}" to user ${details.user_id}`;
    case "revoke_role":
      return `Revoked role "${details.role}" from user ${details.user_id}`;
    case "update_role":
      return `Updated user ${details.user_id} role from "${details.old_role}" to "${details.new_role}"`;
    default:
      return action.replace(/_/g, " ");
  }
}

function AuditLogsTab() {
  const [expandedLogId, setExpandedLogId] = useState<string | null>(null);

  const { data: logs = [], isLoading, refetch } = useQuery({
    queryKey: ["admin-audit-logs"],
    queryFn: async () => {
      const { data, error } = await supabase
        .from("admin_audit_logs")
        .select(`
          *,
          profiles:admin_id (
            name
          )
        `)
        .order("created_at", { ascending: false });

      if (error) throw error;
      return data ?? [];
    },
  });

  const getActionBadgeColor = (action: string) => {
    if (action.startsWith("create_") || action.includes("approve") || action.includes("assign")) {
      return "bg-emerald-50 dark:bg-emerald-950 text-emerald-700 dark:text-emerald-300 border-emerald-200 dark:border-emerald-900";
    }
    if (action.startsWith("update_")) {
      return "bg-blue-50 dark:bg-blue-950 text-blue-700 dark:text-blue-300 border-blue-200 dark:border-blue-900";
    }
    if (action.startsWith("delete_") || action.includes("suspend") || action.includes("revoke")) {
      return "bg-rose-50 dark:bg-rose-950 text-rose-700 dark:text-rose-300 border-rose-200 dark:border-rose-900";
    }
    return "bg-muted text-muted-foreground";
  };

  return (
    <div className="space-y-6">
      <div className="flex flex-col gap-4 sm:flex-row sm:items-center sm:justify-between">
        <div>
          <h3 className="font-display text-lg font-semibold">Administrative Audit Logs</h3>
          <p className="text-xs text-muted-foreground">Trace all administrative modifications and database alterations in real-time.</p>
        </div>
        <Button variant="outline" size="sm" onClick={() => refetch()} className="gap-1.5 h-8">
          <RefreshCw className="h-3.5 w-3.5" /> Refresh Logs
        </Button>
      </div>

      {isLoading ? (
        <div className="h-48 rounded-xl border bg-card/50 animate-pulse" />
      ) : logs.length === 0 ? (
        <div className="flex flex-col items-center justify-center rounded-xl border border-dashed p-12 text-center">
          <ScrollText className="h-8 w-8 text-muted-foreground/60" />
          <h3 className="mt-4 font-semibold text-foreground">No audit logs found</h3>
          <p className="mt-1 text-xs text-muted-foreground">Admin actions will automatically appear here once database triggers log changes.</p>
        </div>
      ) : (
        <div className="overflow-hidden rounded-xl border bg-card shadow-sm">
          <table className="w-full text-left text-sm">
            <thead className="border-b bg-muted/40 text-xs font-semibold text-muted-foreground uppercase tracking-wider">
              <tr>
                <th className="px-5 py-3">Timestamp</th>
                <th className="px-5 py-3">Admin User</th>
                <th className="px-5 py-3">Action Type</th>
                <th className="px-5 py-3">Audit Details</th>
              </tr>
            </thead>
            <tbody className="divide-y">
              {logs.map((log: any) => {
                const adminName = log.profiles?.name || "System / Automated";
                const isExpanded = expandedLogId === log.id;
                return (
                  <tr key={log.id} className="hover:bg-muted/10 transition-colors align-top">
                    <td className="px-5 py-4 whitespace-nowrap text-xs text-muted-foreground font-mono">
                      {new Date(log.created_at).toLocaleString()}
                    </td>
                    <td className="px-5 py-4 whitespace-nowrap">
                      <div className="font-semibold text-foreground">{adminName}</div>
                      <div className="text-[10px] font-mono text-muted-foreground">{log.admin_id || "system"}</div>
                    </td>
                    <td className="px-5 py-4 whitespace-nowrap">
                      <Badge variant="outline" className={`text-[10px] capitalize px-2 py-0.5 border ${getActionBadgeColor(log.action)}`}>
                        {log.action.replace(/_/g, " ")}
                      </Badge>
                    </td>
                    <td className="px-5 py-4">
                      <div className="text-xs text-foreground font-medium">
                        {formatAuditAction(log.action, log.details)}
                      </div>
                      <div className="mt-2">
                        <button
                          onClick={() => setExpandedLogId(isExpanded ? null : log.id)}
                          className="text-[10px] font-semibold text-primary hover:underline"
                        >
                          {isExpanded ? "Hide raw JSON" : "Show raw JSON"}
                        </button>
                        {isExpanded && (
                          <pre className="mt-2 p-3 text-[10px] font-mono bg-muted/60 dark:bg-muted/30 rounded-md border text-muted-foreground max-h-40 overflow-y-auto">
                            {JSON.stringify(log.details, null, 2)}
                          </pre>
                        )}
                      </div>
                    </td>
                  </tr>
                );
              })}
            </tbody>
          </table>
        </div>
      )}
    </div>
  );
}

