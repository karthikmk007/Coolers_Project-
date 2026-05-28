import "server-only";
import { cache } from "react";
import { redirect } from "next/navigation";
import { createSupabaseServerClient } from "./supabase-server";

// Memoised per-render — safe to call multiple times in one RSC tree
export const getUser = cache(async () => {
  const supabase = await createSupabaseServerClient();
  const {
    data: { user },
  } = await supabase.auth.getUser();
  return user;
});

// Use in server actions / RSC that require a logged-in user
export async function requireUser() {
  const user = await getUser();
  if (!user) redirect("/login");
  return user;
}
