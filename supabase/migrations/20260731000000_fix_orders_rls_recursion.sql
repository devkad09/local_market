-- Fix infinite recursion in orders and order_items RLS policies using SECURITY DEFINER helper functions.
-- Directly referencing order_items in orders policy (and vice versa) causes Postgres to evaluate RLS
-- recursively on both tables during queries like INSERT ... RETURNING * or JOINs.

CREATE OR REPLACE FUNCTION public.is_order_trader(_order_id UUID, _user_id UUID)
RETURNS BOOLEAN LANGUAGE plpgsql STABLE SECURITY DEFINER SET search_path = public AS $$
BEGIN
  RETURN EXISTS (
    SELECT 1 FROM public.order_items oi
    JOIN public.products p ON p.id = oi.product_id
    JOIN public.traders t ON t.id = p.trader_id
    WHERE oi.order_id = _order_id AND t.user_id = _user_id
  );
END; $$;

CREATE OR REPLACE FUNCTION public.is_order_customer(_order_id UUID, _user_id UUID)
RETURNS BOOLEAN LANGUAGE plpgsql STABLE SECURITY DEFINER SET search_path = public AS $$
BEGIN
  RETURN EXISTS (
    SELECT 1 FROM public.orders o
    WHERE o.id = _order_id AND o.user_id = _user_id
  );
END; $$;

-- Re-create orders policies using helper functions
DROP POLICY IF EXISTS "trader read related orders" ON public.orders;
CREATE POLICY "trader read related orders" ON public.orders FOR SELECT TO authenticated
  USING (public.is_order_trader(id, auth.uid()));

DROP POLICY IF EXISTS "trader update related orders" ON public.orders;
CREATE POLICY "trader update related orders" ON public.orders FOR UPDATE TO authenticated
  USING (public.is_order_trader(id, auth.uid()));

-- Re-create order_items policies using helper functions
DROP POLICY IF EXISTS "customer read own items" ON public.order_items;
CREATE POLICY "customer read own items" ON public.order_items FOR SELECT TO authenticated
  USING (public.is_order_customer(order_id, auth.uid()));

DROP POLICY IF EXISTS "customer insert items" ON public.order_items;
CREATE POLICY "customer insert items" ON public.order_items FOR INSERT TO authenticated
  WITH CHECK (public.is_order_customer(order_id, auth.uid()));

-- Re-create payments policies using helper functions
DROP POLICY IF EXISTS "customer read own payments" ON public.payments;
CREATE POLICY "customer read own payments" ON public.payments FOR SELECT TO authenticated
  USING (public.is_order_customer(order_id, auth.uid()));
