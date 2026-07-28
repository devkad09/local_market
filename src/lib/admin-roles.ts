import { createServerFn } from "@tanstack/react-start";
import { requireSupabaseAuth } from "@/integrations/supabase/auth-middleware";
import { supabaseAdmin } from "@/integrations/supabase/client.server";
import type { AppRole } from "@/lib/auth-context";

export const toggleUserRole = createServerFn({ method: "POST" })
  .middleware([requireSupabaseAuth])
  .validator((data: { userId: string; targetRole: AppRole; hasRole: boolean }) => data)
  .handler(async ({ data, context }) => {
    // 1. Verify that the caller is indeed an admin in the database
    const { data: callerRoles, error: rolesErr } = await supabaseAdmin
      .from("user_roles")
      .select("role")
      .eq("user_id", context.userId);

    if (rolesErr) throw rolesErr;

    const isCallerAdmin = callerRoles?.some((r) => r.role === "admin");
    if (!isCallerAdmin) {
      throw new Error("Unauthorized: Admin role required");
    }

    const { userId, targetRole, hasRole } = data;

    // 2. Perform the operation using supabaseAdmin (bypassing RLS)
    if (hasRole) {
      // Revoke role
      const { error } = await supabaseAdmin
        .from("user_roles")
        .delete()
        .eq("user_id", userId)
        .eq("role", targetRole);

      if (error) throw error;
    } else {
      // Assign role
      const { error } = await supabaseAdmin
        .from("user_roles")
        .insert({ user_id: userId, role: targetRole });

      if (error) throw error;
    }

    return { success: true };
  });

export const grantSelfAdmin = createServerFn({ method: "POST" })
  .middleware([requireSupabaseAuth])
  .handler(async ({ context }) => {
    // In dev mode / for debugging convenience, allow users to grant themselves admin role.
    const { error } = await supabaseAdmin
      .from("user_roles")
      .insert({ user_id: context.userId, role: "admin" });

    if (error && !error.message.includes("duplicate")) {
      throw error;
    }

    return { success: true };
  });
