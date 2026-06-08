"""
CRACKED — Step 1: Export Data from Supabase → CSV
===================================================
Pulls the live product catalogue and community reviews tables from Supabase
and saves them as coolers.csv and user_ratings.csv so the ML pipeline can
work offline without hitting the database every run.

Usage:
    cd /path/to/Coolers_Project
    python ml/01_export_data.py
"""

import os
import sys
import csv
import json
from dotenv import load_dotenv
from supabase import create_client, Client

# ── Load credentials ────────────────────────────────────────────────────────
env_path = os.path.join(os.path.dirname(os.path.dirname(os.path.abspath(__file__))), ".env.local")
load_dotenv(dotenv_path=env_path)

SUPABASE_URL = os.environ.get("NEXT_PUBLIC_SUPABASE_URL")
SUPABASE_KEY = os.environ.get("NEXT_PUBLIC_SUPABASE_ANON_KEY")

if not SUPABASE_URL or not SUPABASE_KEY:
    sys.exit("ERROR: Set NEXT_PUBLIC_SUPABASE_URL and NEXT_PUBLIC_SUPABASE_ANON_KEY in .env.local")

sb: Client = create_client(SUPABASE_URL, SUPABASE_KEY)
OUT_DIR = os.path.dirname(os.path.abspath(__file__))


# ── Export 1: coolers.csv ──────────────────────────────────────────────────
def export_coolers():
    print("Fetching products from Supabase...")
    resp = sb.from_("product").select(
        "id, name, normalized_category, abv, price_cents, image_url, lcbo_id, created_at, brand(name)"
    ).order("id").execute()

    rows = resp.data or []
    print(f"  {len(rows)} products fetched")

    out_path = os.path.join(OUT_DIR, "coolers.csv")
    with open(out_path, "w", newline="", encoding="utf-8") as f:
        writer = csv.DictWriter(f, fieldnames=[
            "cooler_id", "name", "brand_name", "normalized_category",
            "abv", "price_cents", "price_dollars", "image_url", "lcbo_id", "created_at"
        ])
        writer.writeheader()
        for row in rows:
            brand_name = ""
            if isinstance(row.get("brand"), dict):
                brand_name = row["brand"].get("name", "")
            elif isinstance(row.get("brand"), str):
                try:
                    brand_name = json.loads(row["brand"]).get("name", "")
                except Exception:
                    brand_name = row["brand"]

            price_cents = row.get("price_cents") or 0
            writer.writerow({
                "cooler_id":           row["id"],
                "name":                row["name"],
                "brand_name":          brand_name,
                "normalized_category": row["normalized_category"],
                "abv":                 row.get("abv") or "",
                "price_cents":         price_cents,
                "price_dollars":       round(price_cents / 100, 2) if price_cents else "",
                "image_url":           row.get("image_url") or "",
                "lcbo_id":             row.get("lcbo_id") or "",
                "created_at":          row.get("created_at") or "",
            })

    print(f"  Saved → {out_path}")
    return rows


# ── Export 2: user_ratings.csv ─────────────────────────────────────────────
def export_user_ratings():
    print("Fetching reviews from Supabase...")
    resp = sb.from_("review").select(
        "id, product_id, rating, body, author_name, created_at"
    ).order("created_at", desc=False).execute()

    rows = resp.data or []
    print(f"  {len(rows)} reviews fetched")

    out_path = os.path.join(OUT_DIR, "user_ratings.csv")
    with open(out_path, "w", newline="", encoding="utf-8") as f:
        writer = csv.DictWriter(f, fieldnames=[
            "rating_id", "cooler_id", "user_handle", "rating", "review_body", "created_at"
        ])
        writer.writeheader()
        for row in rows:
            writer.writerow({
                "rating_id":    row["id"],
                "cooler_id":    row["product_id"],
                "user_handle":  row.get("author_name") or "Anonymous",
                "rating":       row["rating"],
                "review_body":  (row.get("body") or "").replace("\n", " "),
                "created_at":   row.get("created_at") or "",
            })

    print(f"  Saved → {out_path}")
    return rows


if __name__ == "__main__":
    print("\n── CRACKED  Data Export ──────────────────────────────")
    products = export_coolers()
    ratings  = export_user_ratings()
    print(f"\n✓ Export complete: {len(products)} coolers, {len(ratings)} ratings")
    print("  Run ml/02_preprocessing.py next.\n")
