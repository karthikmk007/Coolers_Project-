"use client";

import { useEffect } from "react";
import { createClient } from "@/lib/supabase/client";
import { useUserStore } from "@/store/userStore";
import type { Profile } from "@/lib/supabase/types";

/**
 * Mounts once inside the (app) layout.
 * - Loads the current Supabase session on mount
 * - Subscribes to auth state changes (login / logout / token refresh)
 * - Syncs the resolved profile into Zustand
 */
export function AuthProvider({ children }: { children: React.ReactNode }) {
  const { setProfile } = useUserStore();

  useEffect(() => {
    const sb = createClient();

    async function loadProfile(userId: string) {
      const { data } = await sb
        .from("profiles")
        .select("*")
        .eq("id", userId)
        .single();
      setProfile((data as Profile | null) ?? null);
    }

    // Hydrate on mount
    sb.auth.getUser().then(({ data: { user } }) => {
      if (user) loadProfile(user.id);
      else setProfile(null);
    });

    // Subscribe to auth changes
    const {
      data: { subscription },
    } = sb.auth.onAuthStateChange((_event, session) => {
      if (session?.user) {
        loadProfile(session.user.id);
      } else {
        setProfile(null);
      }
    });

    return () => subscription.unsubscribe();
  }, [setProfile]);

  return <>{children}</>;
}
