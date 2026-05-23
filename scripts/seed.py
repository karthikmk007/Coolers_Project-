#!/usr/bin/env python3
"""
CRACKED — Dev Seed Script
Populates brand and product tables with a small, realistic fixture set
for local development. Safe to run multiple times (idempotent via lcbo_id).

Usage:
    pip install supabase python-dotenv
    cp .env.local.example .env.local   # fill in credentials first
    python scripts/seed.py
"""

import os
import sys
from dotenv import load_dotenv
from supabase import create_client, Client

load_dotenv(".env.local")

SUPABASE_URL = os.environ.get("NEXT_PUBLIC_SUPABASE_URL")
SUPABASE_KEY = os.environ.get("SUPABASE_SERVICE_ROLE_KEY")  # needs write access

if not SUPABASE_URL or not SUPABASE_KEY:
    sys.exit(
        "ERROR: Set NEXT_PUBLIC_SUPABASE_URL and SUPABASE_SERVICE_ROLE_KEY in .env.local"
    )

client: Client = create_client(SUPABASE_URL, SUPABASE_KEY)

# ── Fixture data ─────────────────────────────────────────────────────────────
BRANDS = [
    "White Claw",
    "Truly",
    "Nude",
    "Cottage Springs",
    "Palm Bay",
    "Mike's Hard",
    "Creemore Springs",
    "Smirnoff",
    "Bud Light",
    "Vizzy",
]

PRODUCTS = [
    # (lcbo_id, brand_name, name, category, abv, price_cents)
    ("seed-001", "White Claw",       "White Claw Hard Seltzer Black Cherry 355mL",  "hard_seltzer", 5.00,  325),
    ("seed-002", "White Claw",       "White Claw Hard Seltzer Mango 355mL",         "hard_seltzer", 5.00,  325),
    ("seed-003", "White Claw",       "White Claw Hard Seltzer Natural Lime 355mL",  "hard_seltzer", 5.00,  325),
    ("seed-004", "Truly",            "Truly Wild Berry Hard Seltzer 355mL",         "hard_seltzer", 5.00,  319),
    ("seed-005", "Truly",            "Truly Lemonade Hard Seltzer 355mL",           "hard_seltzer", 5.00,  319),
    ("seed-006", "Nude",             "Nude Vodka Soda Grapefruit 355mL",            "hard_seltzer", 5.00,  310),
    ("seed-007", "Nude",             "Nude Vodka Soda Peach Tea 355mL",             "hard_seltzer", 5.00,  310),
    ("seed-008", "Cottage Springs",  "Cottage Springs Vodka Soda Lemon 355mL",      "hard_seltzer", 5.00,  290),
    ("seed-009", "Cottage Springs",  "Cottage Springs Vodka Soda Raspberry 355mL",  "hard_seltzer", 5.00,  290),
    ("seed-010", "Palm Bay",         "Palm Bay Key Lime Cherry 355mL",              "cooler",       4.00,  279),
    ("seed-011", "Palm Bay",         "Palm Bay Mango Strawberry 355mL",             "cooler",       4.00,  279),
    ("seed-012", "Mike's Hard",      "Mike's Hard Lemonade 355mL",                  "cooler",       5.00,  305),
    ("seed-013", "Mike's Hard",      "Mike's Hard Black Cherry Lemonade 355mL",     "cooler",       5.00,  305),
    ("seed-014", "Smirnoff",         "Smirnoff Ice Original 355mL",                 "cooler",       4.50,  289),
    ("seed-015", "Smirnoff",         "Smirnoff Ice Screwdriver 355mL",              "cooler",       4.50,  289),
    ("seed-016", "Creemore Springs", "Creemore Springs Radler Grapefruit 355mL",    "radler",       2.50,  299),
    ("seed-017", "Bud Light",        "Bud Light Lime Clamato 355mL",                "cooler",       4.00,  265),
    ("seed-018", "Vizzy",            "Vizzy Hard Seltzer Blueberry Pomegranate",    "hard_seltzer", 5.00,  319),
    ("seed-019", "Vizzy",            "Vizzy Hard Seltzer Pineapple Mango 355mL",    "hard_seltzer", 5.00,  319),
    ("seed-020", "Cottage Springs",  "Cottage Springs Gin & Soda Cucumber 355mL",   "hard_seltzer", 5.00,  299),
]


def upsert_brands(brands: list[str]) -> dict[str, int]:
    """Insert brands, skip duplicates, return name→id map."""
    result = {}
    for name in brands:
        resp = (
            client.table("brand")
            .upsert({"name": name}, on_conflict="name")
            .execute()
        )
        row = resp.data[0]
        result[row["name"]] = row["id"]
        print(f"  brand  ✓  {row['name']} (id={row['id']})")
    return result


def upsert_products(products: list[tuple], brand_map: dict[str, int]) -> None:
    """Insert products, update price/abv on conflict (idempotent by lcbo_id)."""
    for lcbo_id, brand_name, name, category, abv, price_cents in products:
        brand_id = brand_map.get(brand_name)
        if brand_id is None:
            print(f"  SKIP   ✗  {name} — brand '{brand_name}' not found")
            continue

        resp = (
            client.table("product")
            .upsert(
                {
                    "lcbo_id": lcbo_id,
                    "name": name,
                    "brand_id": brand_id,
                    "normalized_category": category,
                    "abv": abv,
                    "price_cents": price_cents,
                    "image_url": None,
                },
                on_conflict="lcbo_id",
            )
            .execute()
        )
        row = resp.data[0]
        print(
            f"  product ✓  {row['name'][:50]:<50} "
            f"({category}, ${price_cents / 100:.2f}, {abv}%)"
        )


def main() -> None:
    print("\n── CRACKED seed ─────────────────────────────────────")
    print("Upserting brands...")
    brand_map = upsert_brands(BRANDS)

    print("\nUpserting products...")
    upsert_products(PRODUCTS, brand_map)

    total = len(PRODUCTS)
    print(f"\n── Done. {total} products seeded. ────────────────────\n")


if __name__ == "__main__":
    main()
