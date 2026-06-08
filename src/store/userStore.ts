import { create } from "zustand";
import { persist } from "zustand/middleware";
import type { Profile } from "@/lib/supabase/types";

interface UserState {
  profile:    Profile | null;
  isLoggedIn: boolean;
  hasOnboarded: boolean;

  // Optimistic rating cache { [productId]: score }
  ratings: Record<string, number>;

  setProfile:      (p: Profile | null) => void;
  setOnboarded:    (v: boolean) => void;
  setRating:       (productId: string, score: number) => void;
  clearRating:     (productId: string) => void;
  reset:           () => void;
}

export const useUserStore = create<UserState>()(
  persist(
    (set) => ({
      profile:      null,
      isLoggedIn:   false,
      hasOnboarded: false,
      ratings:      {},

      setProfile:   (p)  => set({ profile: p, isLoggedIn: !!p }),
      setOnboarded: (v)  => set({ hasOnboarded: v }),
      setRating:    (id, score) =>
        set((s) => ({ ratings: { ...s.ratings, [id]: score } })),
      clearRating:  (id) =>
        set((s) => {
          const r = { ...s.ratings };
          delete r[id];
          return { ratings: r };
        }),
      reset: () => set({ profile: null, isLoggedIn: false, ratings: {} }),
    }),
    { name: "cracked-user" }
  )
);
