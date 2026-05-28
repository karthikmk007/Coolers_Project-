import { NextResponse } from "next/server";
import { createSupabaseServerClient } from "@/lib/supabase-server";

// Handles the email confirmation redirect from Supabase:
// Supabase sends users to /auth/callback?code=...  after they click the link
export async function GET(request: Request) {
  const { searchParams, origin } = new URL(request.url);
  const code = searchParams.get("code");
  const next = searchParams.get("next") ?? "/browse";

  if (code) {
    const supabase = await createSupabaseServerClient();
    const { error } = await supabase.auth.exchangeCodeForSession(code);
    if (!error) {
      return NextResponse.redirect(`${origin}${next}`);
    }
  }

  // Something went wrong — send to login with an error hint
  return NextResponse.redirect(`${origin}/login?error=confirmation_failed`);
}
