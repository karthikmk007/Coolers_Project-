import { BottomNav } from "@/components/layout/BottomNav";

/**
 * (app) layout — wraps all main app pages.
 * Adds the fixed BottomNav and bottom padding so content
 * never hides behind the nav bar.
 */
export default function AppLayout({ children }: { children: React.ReactNode }) {
  return (
    <div className="min-h-screen bg-cracked-cream pb-20">
      {children}
      <BottomNav />
    </div>
  );
}
