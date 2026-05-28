"use server";

import { revalidatePath } from "next/cache";
import { redirect } from "next/navigation";
import { createSupabaseServerClient } from "@/lib/supabase-server";

const MAX_BODY_LEN   = 500;
const MAX_AUTHOR_LEN = 50;

export async function submitReview(_prev: unknown, formData: FormData) {
  const supabase = await createSupabaseServerClient();

  // Require authentication
  const { data: { user } } = await supabase.auth.getUser();
  if (!user) redirect("/login");

  const product_id = Number(formData.get("product_id"));
  const rating     = Number(formData.get("rating"));

  if (!product_id || !Number.isInteger(product_id) || product_id < 1) {
    return { error: "Invalid product." };
  }
  if (!rating || rating < 1 || rating > 5 || !Number.isInteger(rating)) {
    return { error: "Please select a star rating before submitting." };
  }

  // Sanitize: strip whitespace, enforce max lengths
  const rawBody   = (formData.get("body") as string | null)?.trim() ?? null;
  const rawHandle = (formData.get("author_name") as string | null)?.trim();

  const body        = rawBody   ? rawBody.slice(0, MAX_BODY_LEN)   : null;
  const author_name = rawHandle ? rawHandle.slice(0, MAX_AUTHOR_LEN) : "Anonymous";

  const { error } = await supabase.from("review").insert({
    product_id,
    rating,
    body,
    author_name,
  });

  if (error) return { error: `Could not save review: ${error.message}` };

  revalidatePath(`/products/${product_id}`);
  return { success: true };
}
