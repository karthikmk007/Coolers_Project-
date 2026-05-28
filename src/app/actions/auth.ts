"use server";

import { redirect } from "next/navigation";
import { createSupabaseServerClient } from "@/lib/supabase-server";

export async function login(_prev: unknown, formData: FormData) {
  const email    = (formData.get("email") as string)?.trim().toLowerCase();
  const password = formData.get("password") as string;

  if (!email || !password) {
    return { error: "Email and password are required." };
  }

  const supabase = await createSupabaseServerClient();
  const { error } = await supabase.auth.signInWithPassword({ email, password });

  if (error) {
    return { error: "Invalid email or password." };
  }

  const next = (formData.get("next") as string) || "/browse";
  redirect(next);
}

export async function signup(_prev: unknown, formData: FormData) {
  const email    = (formData.get("email") as string)?.trim().toLowerCase();
  const password = formData.get("password") as string;
  const handle   = (formData.get("handle") as string)?.trim();

  if (!email || !password || !handle) {
    return { error: "All fields are required." };
  }
  if (password.length < 8) {
    return { error: "Password must be at least 8 characters." };
  }
  if (handle.length < 2 || handle.length > 30) {
    return { error: "Handle must be 2–30 characters." };
  }
  if (!/^[a-zA-Z0-9_.-]+$/.test(handle)) {
    return { error: "Handle can only contain letters, numbers, _, -, and ." };
  }

  const supabase = await createSupabaseServerClient();
  const { error } = await supabase.auth.signUp({
    email,
    password,
    options: { data: { handle } },
  });

  if (error) {
    if (error.message.toLowerCase().includes("already registered")) {
      return { error: "An account with this email already exists." };
    }
    return { error: error.message };
  }

  return { success: "Check your email to confirm your account." };
}

export async function logout() {
  const supabase = await createSupabaseServerClient();
  await supabase.auth.signOut();
  redirect("/login");
}
