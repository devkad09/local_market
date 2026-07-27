-- Fix infinite recursion in has_role RLS check by using plpgsql instead of SQL language.
-- LANGUAGE SQL functions can be inlined by Postgres, which ignores SECURITY DEFINER and causes RLS infinite loops.
-- LANGUAGE plpgsql prevents inlining and properly executes with the definer's (owner's) permissions, bypassing RLS.
CREATE OR REPLACE FUNCTION public.has_role(_user_id UUID, _role public.app_role)
RETURNS BOOLEAN LANGUAGE plpgsql STABLE SECURITY DEFINER SET search_path = public AS $$
BEGIN
  RETURN EXISTS (SELECT 1 FROM public.user_roles WHERE user_id = _user_id AND role = _role);
END; $$;
