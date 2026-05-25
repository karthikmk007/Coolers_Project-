"use server";

import { revalidatePath } from "next/cache";
import { supabase } from "@/lib/supabase";

export async function submitReview(_prev: unknown, formData: FormData) {
  const product_id = Number(formData.get("product_id"));
  const rating     = Number(formData.get("rating"));
  const body       = (formData.get("body") as string)?.trim() || null;
  const author_name = ((formData.get("author_name") as string)?.trim()) || "Anonymous";

  if (!product_id || !rating || rating < 1 || rating > 5) {
    return { error: "Please select a star rating before submitting." };
  }

  const { error } = await (supabase as any).from("review").insert({
    product_id,
    rating,
    body,
    author_name,
  });

  if (error) return { error: `Could not save review: ${error.message}` };

  revalidatePath(`/products/${product_id}`);
  return { success: true };
}
