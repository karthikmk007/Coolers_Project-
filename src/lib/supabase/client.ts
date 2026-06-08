"use client";

import { createBrowserClient } from "@supabase/ssr";
import type { Database } from "@/lib/database.types";

/**
 * Browser (client-side) Supabase client.
 * Use in Client Components only ("use client").
 */
export function createClient() {
  return createBrowserClient<Database>(
    process.env.NEXT_PUBLIC_SUPABASE_URL!,
    process.env.NEXT_PUBLIC_SUPABASE_ANON_KEY!
  );
}

// Singleton for one-off use in client utilities
let _client: ReturnType<typeof createClient> | null = null;
export function getClient() {
  if (!_client) _client = createClient();
  return _client;
}
