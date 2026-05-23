export function ProductCardSkeleton() {
  return (
    <div className="flex flex-col animate-pulse">
      {/* Tile */}
      <div className="aspect-[3/4] bg-ink/10" />
      {/* Info strip */}
      <div className="mt-3 flex justify-between gap-2">
        <div className="flex-1 space-y-2">
          <div className="h-4 w-3/4 bg-ink/10" />
          <div className="h-3 w-1/3 bg-ink/10" />
        </div>
        <div className="space-y-1.5 text-right">
          <div className="h-3 w-8 bg-ink/10" />
          <div className="h-3 w-10 bg-ink/10" />
        </div>
      </div>
    </div>
  );
}

export function BrowseGridSkeleton() {
  return (
    <div className="grid grid-cols-2 sm:grid-cols-3 lg:grid-cols-4 gap-6">
      {Array.from({ length: 8 }).map((_, i) => (
        <ProductCardSkeleton key={i} />
      ))}
    </div>
  );
}

export function FeaturedShelfSkeleton() {
  return (
    <div className="flex gap-6 overflow-hidden">
      {Array.from({ length: 6 }).map((_, i) => (
        <div key={i} className="flex-shrink-0 w-52 animate-pulse">
          <div className="aspect-[3/4] bg-ink/10" />
          <div className="mt-3 space-y-2">
            <div className="h-4 w-3/4 bg-ink/10" />
            <div className="h-3 w-1/3 bg-ink/10" />
          </div>
        </div>
      ))}
    </div>
  );
}
