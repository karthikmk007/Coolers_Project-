"""
Database operations for the LCBO scraper.
All writes use the service role key (bypasses RLS).
"""

import logging
from datetime import datetime, timezone

from supabase import Client

from .models import RawProduct

log = logging.getLogger(__name__)


# ── scrape_run lifecycle ─────────────────────────────────────────────────────
def start_run(client: Client) -> int:
    """Insert a scrape_run row with status='running'. Returns the run id."""
    resp = (
        client.table("scrape_run")
        .insert({"status": "running"})
        .execute()
    )
    run_id = resp.data[0]["id"]
    log.info("scrape_run started (id=%d)", run_id)
    return run_id


def finish_run(
    client: Client,
    run_id: int,
    *,
    upserted: int,
    skipped: int,
    error: str | None = None,
) -> None:
    """Update scrape_run with final status and counts."""
    status = "failed" if error else "success"
    client.table("scrape_run").update({
        "finished_at": datetime.now(timezone.utc).isoformat(),
        "status": status,
        "products_upserted": upserted,
        "products_skipped": skipped,
        "error_message": error,
    }).eq("id", run_id).execute()
    log.info(
        "scrape_run #%d → %s (upserted=%d skipped=%d)",
        run_id, status, upserted, skipped,
    )


# ── Brand upsert ─────────────────────────────────────────────────────────────
def upsert_brand(client: Client, name: str, brand_cache: dict[str, int]) -> int:
    """
    Return brand id for `name`, upserting if necessary.
    `brand_cache` is mutated in-place to avoid redundant DB round-trips.
    """
    if name in brand_cache:
        return brand_cache[name]

    resp = (
        client.table("brand")
        .upsert({"name": name}, on_conflict="name")
        .execute()
    )
    brand_id = resp.data[0]["id"]
    brand_cache[name] = brand_id
    return brand_id


# ── Existing SKUs ────────────────────────────────────────────────────────────
def get_existing_lcbo_ids(client: Client) -> set[str]:
    """
    Return the set of lcbo_id values already in the product table.
    Used to skip Phase-2 detail fetches for known products.
    """
    resp = client.table("product").select("lcbo_id").execute()
    return {row["lcbo_id"] for row in resp.data if row["lcbo_id"]}


# ── Product upsert ───────────────────────────────────────────────────────────
def upsert_products(
    client: Client,
    products: list[RawProduct],
) -> tuple[int, int]:
    """
    Upsert all products. Conflict key is `lcbo_id`.
    Returns (upserted_count, skipped_count).
    """
    upserted = 0
    skipped = 0
    brand_cache: dict[str, int] = {}

    for p in products:
        # Fallback brand: extract first two words of product name
        brand_name = p.brand_name or _infer_brand(p.name)

        try:
            brand_id = upsert_brand(client, brand_name, brand_cache)
        except Exception as exc:
            log.warning("Brand upsert failed for '%s': %s — skipping product", brand_name, exc)
            skipped += 1
            continue

        try:
            client.table("product").upsert(
                {
                    "lcbo_id": p.lcbo_id,
                    "name": p.name,
                    "brand_id": brand_id,
                    "normalized_category": p.normalized_category,
                    "abv": p.abv,
                    "price_cents": p.price_cents,
                    "image_url": p.image_url,
                },
                on_conflict="lcbo_id",
            ).execute()
            upserted += 1
        except Exception as exc:
            log.error("Product upsert failed for SKU %s: %s", p.lcbo_id, exc)
            skipped += 1

    return upserted, skipped


def _infer_brand(name: str) -> str:
    """
    Last-resort brand extraction: take the first 1-2 capitalised words
    that form a plausible brand name from the product name.
    e.g. "White Claw Hard Seltzer Black Cherry" → "White Claw"
    """
    tokens = name.split()
    brand_tokens: list[str] = []
    for token in tokens:
        if token[0].isupper():
            brand_tokens.append(token)
        else:
            break  # stop at first lowercase word
    # Cap at 3 words to avoid swallowing the full product name
    return " ".join(brand_tokens[:3]) if brand_tokens else name[:30]
