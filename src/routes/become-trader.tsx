import { createFileRoute, useNavigate, Link } from "@tanstack/react-router";
import { useEffect, useState } from "react";
import { z } from "zod";
import { toast } from "sonner";
import { supabase } from "@/integrations/supabase/client";
import { useAuth } from "@/lib/auth-context";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { Textarea } from "@/components/ui/textarea";
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from "@/components/ui/card";
import { Badge } from "@/components/ui/badge";
import { Store, CheckCircle2, Clock, XCircle } from "lucide-react";

export const Route = createFileRoute("/become-trader")({
  head: () => ({
    meta: [
      { title: "Sell on Marketplace — Open your shop" },
      { name: "description", content: "Apply to open your shop on Marketplace. Reach local customers with your products." },
    ],
  }),
  component: BecomeTraderPage,
});

const schema = z.object({
  shop_name: z.string().trim().min(2, "Shop name is required").max(80),
  address: z.string().trim().min(5, "Address is required").max(300),
  description: z.string().trim().max(1000).optional(),
});

type TraderRow = {
  id: string;
  shop_name: string;
  address: string;
  description: string | null;
  status: "pending" | "approved" | "rejected";
};

function BecomeTraderPage() {
  const navigate = useNavigate();
  const { user, loading, refreshRoles } = useAuth();
  const [existing, setExisting] = useState<TraderRow | null>(null);
  const [fetching, setFetching] = useState(true);
  const [submitting, setSubmitting] = useState(false);

  useEffect(() => {
    if (loading) return;
    if (!user) {
      navigate({ to: "/auth", search: { redirect: "/become-trader" } });
      return;
    }
    (async () => {
      const { data } = await supabase
        .from("traders")
        .select("id, shop_name, address, description, status")
        .eq("user_id", user.id)
        .maybeSingle();
      setExisting((data as TraderRow | null) ?? null);
      setFetching(false);
    })();
  }, [user, loading, navigate]);

  const handleSubmit = async (e: React.FormEvent<HTMLFormElement>) => {
    e.preventDefault();
    if (!user) return;
    const form = new FormData(e.currentTarget);
    const parsed = schema.safeParse({
      shop_name: form.get("shop_name"),
      address: form.get("address"),
      description: form.get("description") || undefined,
    });
    if (!parsed.success) return toast.error(parsed.error.issues[0].message);

    setSubmitting(true);
    const { data, error } = await supabase
      .from("traders")
      .insert({
        user_id: user.id,
        shop_name: parsed.data.shop_name,
        address: parsed.data.address,
        description: parsed.data.description ?? null,
      })
      .select("id, shop_name, address, description, status")
      .single();
    setSubmitting(false);

    if (error) return toast.error(error.message);
    await refreshRoles();
    setExisting(data as TraderRow);
    toast.success("Application submitted — we'll review it shortly.");
  };

  if (loading || fetching) {
    return <main className="mx-auto max-w-2xl px-4 py-16 text-sm text-muted-foreground">Loading…</main>;
  }

  if (existing) {
    return (
      <main className="mx-auto max-w-2xl px-4 py-12">
        <StatusCard trader={existing} />
      </main>
    );
  }

  return (
    <main className="mx-auto max-w-2xl px-4 py-12">
      <div className="mb-8 text-center">
        <span className="inline-flex h-12 w-12 items-center justify-center rounded-lg bg-primary text-primary-foreground">
          <Store className="h-6 w-6" />
        </span>
        <h1 className="mt-4 font-display text-3xl font-bold">Open your shop</h1>
        <p className="mt-2 text-sm text-muted-foreground">
          Tell us about your business. Applications are reviewed by our team — you'll get trader access as soon as you submit and can start listing products right away.
        </p>
      </div>

      <Card>
        <CardHeader>
          <CardTitle>Shop details</CardTitle>
          <CardDescription>All fields except description are required.</CardDescription>
        </CardHeader>
        <CardContent>
          <form onSubmit={handleSubmit} className="space-y-5">
            <div className="space-y-1.5">
              <Label htmlFor="shop_name">Shop name</Label>
              <Input id="shop_name" name="shop_name" required maxLength={80} placeholder="e.g. Rosa's Bakery" />
            </div>
            <div className="space-y-1.5">
              <Label htmlFor="address">Pickup / business address</Label>
              <Input id="address" name="address" required maxLength={300} placeholder="Street, city, postal code" />
            </div>
            <div className="space-y-1.5">
              <Label htmlFor="description">About your shop (optional)</Label>
              <Textarea id="description" name="description" maxLength={1000} rows={5} placeholder="What do you sell? What makes your shop special?" />
            </div>
            <Button type="submit" className="w-full" disabled={submitting}>
              {submitting ? "Submitting…" : "Submit application"}
            </Button>
          </form>
        </CardContent>
      </Card>
    </main>
  );
}

function StatusCard({ trader }: { trader: TraderRow }) {
  const map = {
    pending: { icon: Clock, label: "Pending review", tone: "bg-amber-100 text-amber-900", copy: "Your application is with our team. You already have trader access — head to your dashboard to start adding products while we review." },
    approved: { icon: CheckCircle2, label: "Approved", tone: "bg-emerald-100 text-emerald-900", copy: "Your shop is live and visible to customers. Manage products from your trader dashboard." },
    rejected: { icon: XCircle, label: "Rejected", tone: "bg-red-100 text-red-900", copy: "Your application wasn't approved. Contact support if you'd like more details." },
  }[trader.status];
  const Icon = map.icon;

  return (
    <Card>
      <CardHeader>
        <div className="flex items-center justify-between">
          <div>
            <CardTitle className="font-display text-2xl">{trader.shop_name}</CardTitle>
            <CardDescription className="mt-1">{trader.address}</CardDescription>
          </div>
          <Badge className={map.tone}>
            <Icon className="mr-1 h-3.5 w-3.5" />
            {map.label}
          </Badge>
        </div>
      </CardHeader>
      <CardContent className="space-y-4">
        <p className="text-sm text-muted-foreground">{map.copy}</p>
        {trader.description && (
          <p className="text-sm border-l-2 border-border pl-3 italic text-muted-foreground">{trader.description}</p>
        )}
        {trader.status !== "rejected" && (
          <Button asChild>
            <Link to="/trader">Go to trader dashboard</Link>
          </Button>
        )}
      </CardContent>
    </Card>
  );
}
