import { supabase } from "@/lib/supabase";
import { notFound } from "next/navigation";
import Link from "next/link";
import { Database } from "@/lib/database.types";
import { Recommendations } from "@/components/Recommendations";

export default async function ProductDetailPage({
  params,
}: {
  params: Promise<{ id: string }>;
}) {
  const resolvedParams = await params;
  const productId = parseInt(resolvedParams.id, 10);

  if (isNaN(productId)) {
    notFound();
  }

  const { data: productData, error } = await supabase
    .from("product")
    .select(`*, brand(name)`)
    .eq("id", productId)
    .single();

  if (error || !productData) {
    notFound();
  }

  const product = productData as any;

  const brandName = product.brand?.name || "Unknown Brand";
  const formattedPrice = product.price_cents
    ? `$${(product.price_cents / 100).toFixed(2)}`
    : "—";
  const categoryStr = product.normalized_category.replace("_", " ");

  return (
    <main className="min-h-screen px-6 py-8 md:p-12 max-w-7xl mx-auto flex flex-col">
      <div className="mb-12 flex items-center justify-between">
        <Link
          href="/browse"
          className="font-mono text-xs uppercase tracking-widest text-ink/60 hover:text-ink transition-colors flex items-center gap-2"
        >
          ← Back to shelf
        </Link>
        <div className="font-mono text-xs uppercase tracking-widest text-ink/40">
          Product Details
        </div>
      </div>

      <div className="flex flex-col lg:flex-row gap-12 lg:gap-24 flex-1">
        {/* Left Image Area */}
        <div className="w-full lg:w-1/2 aspect-square bg-ink/5 border border-ink/10 flex items-center justify-center p-12 relative overflow-hidden">
          {product.image_url ? (
            <img
              src={product.image_url}
              alt={product.name}
              className="object-contain w-full h-full mix-blend-multiply"
            />
          ) : (
            <div className="font-display text-6xl text-ink/20 rotate-[-10deg]">
              {categoryStr}
            </div>
          )}
          <div className="absolute top-4 left-4 border border-ink/20 bg-cream/80 backdrop-blur px-3 py-1 font-mono text-[10px] uppercase tracking-widest text-ink">
            {categoryStr}
          </div>
        </div>

        {/* Right Info Area */}
        <div className="w-full lg:w-1/2 flex flex-col justify-center">
          <div className="font-mono text-sm tracking-widest uppercase text-ink/50 mb-4">
            {brandName}
          </div>
          <h1 className="font-display text-5xl md:text-7xl tracking-tight text-ink mb-8 leading-[0.9]">
            {product.name}
          </h1>

          <div className="flex items-center gap-8 border-y border-ink/10 py-6 mb-10">
            <div>
              <div className="font-mono text-[10px] uppercase tracking-widest text-ink/40 mb-1">
                Price
              </div>
              <div className="font-sans text-2xl">{formattedPrice}</div>
            </div>
            <div>
              <div className="font-mono text-[10px] uppercase tracking-widest text-ink/40 mb-1">
                ABV
              </div>
              <div className="font-sans text-2xl">
                {product.abv ? `${product.abv}%` : "—"}
              </div>
            </div>
            {product.lcbo_id && (
              <div>
                <div className="font-mono text-[10px] uppercase tracking-widest text-ink/40 mb-1">
                  LCBO No.
                </div>
                <div className="font-sans text-lg text-ink/70 mt-1">
                  {product.lcbo_id}
                </div>
              </div>
            )}
          </div>

          {/* Phase 4 Recommendations */}
          <Recommendations productId={product.id} />
        </div>
      </div>
    </main>
  );
}
