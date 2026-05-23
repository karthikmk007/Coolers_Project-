#!/usr/bin/env python3
"""
CRACKED — LCBO Scraper Entry Point

Two-phase scrape:
  1. GraphQL bulk catalog fetch (all RTD categories, paginated)
  2. HTML product-page fetch for ABV + brand (new SKUs only)

All runs are logged to the scrape_run table for observability.

Usage:
    pip install -r scripts/requirements.txt
    python scripts/scrape.py                 # full run
    python scripts/scrape.py --dry-run       # fetch only, no DB writes
    python scripts/scrape.py --limit 20      # cap Phase-2 detail fetches (dev/test)
"""

import argparse
import logging
import os
import sys

from dotenv import load_dotenv
from supabase import create_client

# Allow running from project root: python scripts/scrape.py
sys.path.insert(0, os.path.dirname(__file__))

from scraper.lcbo import scrape_all
from scraper.db import (
    get_existing_lcbo_ids,
    upsert_products,
    start_run,
    finish_run,
)

load_dotenv(".env.local")

logging.basicConfig(
    level=logging.INFO,
    format="%(asctime)s  %(levelname)-8s  %(message)s",
    datefmt="%H:%M:%S",
)
log = logging.getLogger(__name__)


def main(dry_run: bool = False, limit: int | None = None) -> None:
    # ── Credentials ─────────────────────────────────────────────────────────
    url = os.environ.get("NEXT_PUBLIC_SUPABASE_URL")
    key = os.environ.get("SUPABASE_SERVICE_ROLE_KEY")

    if not url or not key:
        sys.exit(
            "ERROR: Set NEXT_PUBLIC_SUPABASE_URL and SUPABASE_SERVICE_ROLE_KEY"
        )

    client = create_client(url, key)
    run_id: int | None = None

    try:
        # ── Start observability run ──────────────────────────────────────────
        if not dry_run:
            run_id = start_run(client)

        # ── Load known SKUs (skip Phase-2 for these) ─────────────────────────
        existing_ids = get_existing_lcbo_ids(client)
        log.info("DB contains %d known product SKUs", len(existing_ids))

        # ── Scrape ───────────────────────────────────────────────────────────
        # Pass limit into scrape_all so Phase-2 detail fetches are also capped
        products = scrape_all(existing_ids, detail_limit=limit)
        log.info("Scrape complete: %d products returned", len(products))

        if dry_run:
            log.info("--dry-run: skipping DB writes")
            for p in products[:10]:
                log.info(
                    "  [DRY] %s | %s | $%.2f | abv=%s | brand=%s",
                    p.lcbo_id, p.name[:40], (p.price_cents or 0) / 100,
                    p.abv, p.brand_name,
                )
            return

        # ── Persist ──────────────────────────────────────────────────────────
        upserted, skipped = upsert_products(client, products)

        if run_id is not None:
            finish_run(client, run_id, upserted=upserted, skipped=skipped)

        log.info("Done. upserted=%d  skipped=%d", upserted, skipped)

    except Exception as exc:
        log.exception("Scrape failed: %s", exc)
        if run_id is not None:
            finish_run(
                client, run_id,
                upserted=0, skipped=0,
                error=str(exc)[:500],
            )
        sys.exit(1)


if __name__ == "__main__":
    parser = argparse.ArgumentParser(description="CRACKED LCBO scraper")
    parser.add_argument(
        "--dry-run", action="store_true",
        help="Fetch data but don't write to the database",
    )
    parser.add_argument(
        "--limit", type=int, default=None,
        help="Limit the number of products written (useful for testing)",
    )
    args = parser.parse_args()
    main(dry_run=args.dry_run, limit=args.limit)
