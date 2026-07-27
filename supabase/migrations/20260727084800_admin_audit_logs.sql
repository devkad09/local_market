-- Create admin audit logs table
CREATE TABLE IF NOT EXISTS public.admin_audit_logs (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  admin_id UUID REFERENCES public.profiles(id) ON DELETE SET NULL,
  action TEXT NOT NULL,
  target_id TEXT,
  details JSONB,
  created_at TIMESTAMPTZ NOT NULL DEFAULT now()
);

-- Enable RLS
ALTER TABLE public.admin_audit_logs ENABLE ROW LEVEL SECURITY;

-- Set permissions
GRANT SELECT ON public.admin_audit_logs TO authenticated;
GRANT ALL ON public.admin_audit_logs TO service_role;

-- RLS Policy: Only admins can view logs
CREATE POLICY "admins read all audit logs" ON public.admin_audit_logs
  FOR SELECT TO authenticated
  USING (public.has_role(auth.uid(), 'admin'));

-- Trigger function for audit logs
CREATE OR REPLACE FUNCTION public.log_admin_action()
RETURNS TRIGGER LANGUAGE plpgsql SECURITY DEFINER SET search_path = public AS $$
DECLARE
  _admin_id UUID := auth.uid();
  _action TEXT;
  _target_id TEXT;
  _details JSONB;
BEGIN
  -- Determine action and target
  IF (TG_OP = 'INSERT') THEN
    _target_id := NEW.id::text;
    IF (TG_TABLE_NAME = 'categories') THEN
      _action := 'create_category';
      _details := jsonb_build_object('name', NEW.name, 'slug', NEW.slug);
    ELSIF (TG_TABLE_NAME = 'traders') THEN
      _action := 'create_trader';
      _details := jsonb_build_object('shop_name', NEW.shop_name, 'user_id', NEW.user_id, 'status', NEW.status);
    ELSIF (TG_TABLE_NAME = 'user_roles') THEN
      _action := 'assign_role';
      _details := jsonb_build_object('user_id', NEW.user_id, 'role', NEW.role);
    END IF;
  ELSIF (TG_OP = 'UPDATE') THEN
    _target_id := NEW.id::text;
    IF (TG_TABLE_NAME = 'categories') THEN
      _action := 'update_category';
      _details := jsonb_build_object('old_name', OLD.name, 'new_name', NEW.name, 'old_slug', OLD.slug, 'new_slug', NEW.slug);
    ELSIF (TG_TABLE_NAME = 'traders') THEN
      IF (OLD.status <> NEW.status) THEN
        _action := CASE 
          WHEN NEW.status = 'approved' THEN 'approve_trader'
          WHEN NEW.status = 'suspended' THEN 'suspend_trader'
          ELSE 'update_trader_status'
        END;
      ELSE
        _action := 'update_trader';
      END IF;
      _details := jsonb_build_object('shop_name', NEW.shop_name, 'old_status', OLD.status, 'new_status', NEW.status);
    ELSIF (TG_TABLE_NAME = 'user_roles') THEN
      _action := 'update_role';
      _details := jsonb_build_object('user_id', NEW.user_id, 'old_role', OLD.role, 'new_role', NEW.role);
    END IF;
  ELSIF (TG_OP = 'DELETE') THEN
    _target_id := OLD.id::text;
    IF (TG_TABLE_NAME = 'categories') THEN
      _action := 'delete_category';
      _details := jsonb_build_object('name', OLD.name, 'slug', OLD.slug);
    ELSIF (TG_TABLE_NAME = 'traders') THEN
      _action := 'delete_trader';
      _details := jsonb_build_object('shop_name', OLD.shop_name, 'user_id', OLD.user_id);
    ELSIF (TG_TABLE_NAME = 'user_roles') THEN
      _action := 'revoke_role';
      _details := jsonb_build_object('user_id', OLD.user_id, 'role', OLD.role);
    END IF;
  END IF;

  -- Insert log entry
  INSERT INTO public.admin_audit_logs (admin_id, action, target_id, details)
  VALUES (_admin_id, _action, _target_id, _details);

  RETURN NULL;
END; $$;

-- Drop triggers if they already exist
DROP TRIGGER IF EXISTS audit_traders ON public.traders;
DROP TRIGGER IF EXISTS audit_categories ON public.categories;
DROP TRIGGER IF EXISTS audit_user_roles ON public.user_roles;

-- Attach triggers to tables
CREATE TRIGGER audit_traders AFTER INSERT OR UPDATE OR DELETE ON public.traders FOR EACH ROW EXECUTE FUNCTION public.log_admin_action();
CREATE TRIGGER audit_categories AFTER INSERT OR UPDATE OR DELETE ON public.categories FOR EACH ROW EXECUTE FUNCTION public.log_admin_action();
CREATE TRIGGER audit_user_roles AFTER INSERT OR UPDATE OR DELETE ON public.user_roles FOR EACH ROW EXECUTE FUNCTION public.log_admin_action();
