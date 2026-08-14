import { createContext, useContext, useEffect, useState, type ReactNode } from "react";
import { onAuthStateChanged, signOut as fbSignOut, type User as FirebaseUser } from "firebase/auth";
import { auth } from "@/lib/firebase";
import { supabase } from "@/integrations/supabase/client";

export type AppRole = "customer" | "trader" | "admin";

export interface AppUser {
  id: string;
  uid: string;
  email: string | null;
  displayName: string | null;
  user_metadata: {
    name?: string;
    full_name?: string;
  };
}

interface AuthCtx {
  user: AppUser | null;
  firebaseUser: FirebaseUser | null;
  roles: AppRole[];
  loading: boolean;
  refreshRoles: () => Promise<void>;
  signOut: () => Promise<void>;
}

const Ctx = createContext<AuthCtx | undefined>(undefined);

export function AuthProvider({ children }: { children: ReactNode }) {
  const [firebaseUser, setFirebaseUser] = useState<FirebaseUser | null>(null);
  const [user, setUser] = useState<AppUser | null>(null);
  const [roles, setRoles] = useState<AppRole[]>([]);
  const [loading, setLoading] = useState(true);

  const loadRoles = async (uid: string) => {
    const { data } = await supabase.from("user_roles").select("role").eq("user_id", uid);
    setRoles((data ?? []).map((r) => r.role as AppRole));
  };

  useEffect(() => {
    const unsubscribe = onAuthStateChanged(auth, async (fbUser) => {
      setFirebaseUser(fbUser);
      if (fbUser) {
        const appUser: AppUser = {
          id: fbUser.uid,
          uid: fbUser.uid,
          email: fbUser.email,
          displayName: fbUser.displayName,
          user_metadata: {
            name: fbUser.displayName ?? fbUser.email?.split("@")[0] ?? "",
            full_name: fbUser.displayName ?? "",
          },
        };
        setUser(appUser);
        await loadRoles(fbUser.uid);
      } else {
        setUser(null);
        setRoles([]);
      }
      setLoading(false);
    });

    return () => unsubscribe();
  }, []);

  const refreshRoles = async () => {
    if (user) await loadRoles(user.id);
  };

  const signOut = async () => {
    await fbSignOut(auth);
    setUser(null);
    setFirebaseUser(null);
    setRoles([]);
  };

  return (
    <Ctx.Provider value={{ user, firebaseUser, roles, loading, refreshRoles, signOut }}>
      {children}
    </Ctx.Provider>
  );
}

export function useAuth() {
  const ctx = useContext(Ctx);
  if (!ctx) throw new Error("useAuth must be used within AuthProvider");
  return ctx;
}
