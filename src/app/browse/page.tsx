import { supabase } from "@/lib/supabase";
import { CatalogueSplit } from "@/components/CatalogueSplit";
import type { Database } from "@/lib/database.types";

export const revalidate = 300;

type ProductWithBrand = Database["public"]["Tables"]["product"]["Row"] & {
  brand: { name: string } | null;
};

export default async function BrowsePage() {
  const { data } = await supabase
    .from("product")
    .select("*, brand(name)")
    .order("name")
    .limit(482);

  const products = (data ?? []) as unknown as ProductWithBrand[];

  return <CatalogueSplit initialProducts={products} />;
}
