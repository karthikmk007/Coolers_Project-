import { BottomNav }     from "@/components/layout/BottomNav";
import { AuthProvider }  from "@/components/layout/AuthProvider";

/**
 * (app) layout — wraps all main app pages.
 *
 * AuthProvider hydrates Zustand with the current Supabase session
 * on mount and keeps it in sync on login/logout. Pages that need
 * auth (rating, saving) gate themselves client-side via useUserStore.
 * Browsing and product pages remain public.
 */
export default function AppLayout({ children }: { children: React.ReactNode }) {
  return (
    <AuthProvider>
      <div className="min-h-screen bg-cracked-cream pb-20">
        {children}
        <BottomNav />
      </div>
    </AuthProvider>
  );
}
