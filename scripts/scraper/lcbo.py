"""
LCBO scraper — two-phase approach:
  Phase 1: GraphQL bulk fetch (name, SKU, price, image) for all RTD categories.
  Phase 2: HTML detail fetch (ABV, brand) for new SKUs only.

Robots.txt allows scraping of /en/products/* and /graphql.
Rate limit: RATE_LIMIT_S seconds between each HTTP request.
"""

import re
import time
import logging
from urllib.robotparser import RobotFileParser

import requests
from bs4 import BeautifulSoup

from .models import RawProduct

log = logging.getLogger(__name__)

# ── Constants ────────────────────────────────────────────────────────────────
BASE_URL   = "https://www.lcbo.com"
GQL_URL    = f"{BASE_URL}/graphql"
USER_AGENT = "CRACKED-Portfolio-Scraper/1.0 (github.com/karthikkumaran; educational portfolio)"
RATE_LIMIT_S = 3.0          # seconds between requests
PAGE_SIZE    = 48            # max items per GraphQL page

# Maps GraphQL category url_key → our normalized_category enum value
CATEGORY_MAP: dict[str, str] = {
    # Ready-to-drink / seltzers
    "seltzers":           "hard_seltzer",
    # Ready-to-drink / coolers
    "classic-coolers":    "cooler",
    "cocktail-coolers":   "cooler",
    "cream-coolers":      "cooler",
    "premixed-cocktails": "cooler",
    # Cider
    "cider":              "cider",
    "flavoured-cider":    "cider",
    "craft-cider":        "cider",
    "premium-cider":      "cider",
    "traditional-cider":  "cider",
    # Radler
    "radler":             "radler",
}

# GraphQL query — fetches all fields we need from the catalog in one round-trip
_CATEGORY_QUERY = """
query CategoryProducts($urlKey: String!, $pageSize: Int!, $currentPage: Int!) {
  categoryList(filters: { url_key: { eq: $urlKey } }) {
    name
    products(pageSize: $pageSize, currentPage: $currentPage) {
      total_count
      page_info { current_page page_size total_pages }
      items {
        name
        sku
        url_key
        price_range {
          minimum_price { regular_price { value currency } }
        }
        small_image { url }
      }
    }
  }
}
"""


# ── HTTP session ──────────────────────────────────────────────────────────────
def _build_session() -> requests.Session:
    s = requests.Session()
    s.headers.update({
        "User-Agent": USER_AGENT,
        "Accept-Language": "en-CA,en;q=0.9",
    })
    return s


_session: requests.Session | None = None
_last_request_at: float = 0.0


def _get(url: str, **kwargs) -> requests.Response:
    """Rate-limited GET. Enforces RATE_LIMIT_S between every request."""
    global _last_request_at, _session
    if _session is None:
        _session = _build_session()

    elapsed = time.monotonic() - _last_request_at
    if elapsed < RATE_LIMIT_S:
        time.sleep(RATE_LIMIT_S - elapsed)

    resp = _session.get(url, timeout=20, **kwargs)
    _last_request_at = time.monotonic()
    resp.raise_for_status()
    return resp


def _post_gql(query: str, variables: dict) -> dict:
    """Rate-limited GraphQL POST."""
    global _last_request_at, _session
    if _session is None:
        _session = _build_session()

    elapsed = time.monotonic() - _last_request_at
    if elapsed < RATE_LIMIT_S:
        time.sleep(RATE_LIMIT_S - elapsed)

    resp = _session.post(
        GQL_URL,
        json={"query": query, "variables": variables},
        headers={"Content-Type": "application/json", "Accept": "application/json"},
        timeout=20,
    )
    _last_request_at = time.monotonic()
    resp.raise_for_status()
    data = resp.json()
    if "errors" in data:
        raise RuntimeError(f"GraphQL errors: {data['errors']}")
    return data


# ── Robots.txt ───────────────────────────────────────────────────────────────
def check_robots_allowed(url: str) -> bool:
    """Return True if robots.txt permits fetching `url`."""
    rp = RobotFileParser()
    rp.set_url(f"{BASE_URL}/robots.txt")
    rp.read()
    return rp.can_fetch(USER_AGENT, url)


# ── Phase 1: GraphQL bulk catalog fetch ─────────────────────────────────────
def fetch_category(url_key: str, normalized_category: str) -> list[RawProduct]:
    """
    Fetch all products for a single LCBO category via GraphQL.
    Returns a list of RawProduct with brand_name='' and abv=None
    (filled in during Phase 2 for new SKUs only).
    """
    products: list[RawProduct] = []
    current_page = 1
    total_pages = None

    while True:
        try:
            data = _post_gql(_CATEGORY_QUERY, {
                "urlKey": url_key,
                "pageSize": PAGE_SIZE,
                "currentPage": current_page,
            })
        except RuntimeError as exc:
            # LCBO's GraphQL occasionally over-reports total_pages by 1.
            # "currentPage > pages available" means we've already got everything.
            if "currentPage value" in str(exc) and "greater than the number of pages" in str(exc):
                log.debug("Category '%s': page %d out of range — stopping", url_key, current_page)
                break
            raise

        cat_list = data.get("data", {}).get("categoryList", [])
        if not cat_list:
            log.warning("No categoryList returned for url_key=%s", url_key)
            break

        page_data = cat_list[0].get("products", {})
        page_info = page_data.get("page_info", {})

        if total_pages is None:
            total_pages = page_info.get("total_pages", 1)
            total_count = page_data.get("total_count", 0)
            log.info(
                "Category '%s': %d products across %d page(s)",
                url_key, total_count, total_pages,
            )

        for item in page_data.get("items", []):
            price_cad = (
                item.get("price_range", {})
                    .get("minimum_price", {})
                    .get("regular_price", {})
                    .get("value")
            )
            products.append(RawProduct(
                lcbo_id=item["sku"],
                name=item["name"],
                brand_name="",         # filled in Phase 2
                normalized_category=normalized_category,
                abv=None,              # filled in Phase 2
                price_cents=round(price_cad * 100) if price_cad else None,
                image_url=item.get("small_image", {}).get("url"),
                url_key=item.get("url_key", ""),
            ))

        if current_page >= (total_pages or 1):
            break
        current_page += 1

    return products


# ── Phase 2: HTML product-page scrape for ABV + brand ───────────────────────
def fetch_product_details(url_key: str) -> tuple[float | None, str]:
    """
    Fetch the LCBO product page and extract:
      - ABV as float (e.g. 4.0)
      - Brand name string (e.g. "Social Lite")

    Returns (abv, brand_name). Either may be None/"" if not found.
    """
    url = f"{BASE_URL}/en/{url_key}"

    if not check_robots_allowed(url):
        log.warning("robots.txt disallows %s — skipping detail fetch", url)
        return None, ""

    try:
        resp = _get(url, headers={"Accept": "text/html,application/xhtml+xml"})
    except requests.HTTPError as exc:
        log.warning("HTTP %s fetching %s", exc.response.status_code, url)
        return None, ""

    soup = BeautifulSoup(resp.text, "html.parser")
    moredetail = soup.find(id="moredetail")

    abv: float | None = None
    brand: str = ""

    if moredetail:
        for li in moredetail.find_all("li"):
            label_el = li.find(class_="label")
            value_el = li.find(class_="value")
            if not label_el or not value_el:
                continue

            label_text = label_el.get_text(strip=True).lower()
            value_text = value_el.get_text(strip=True)

            if "alcohol" in label_text:
                m = re.search(r"(\d+\.?\d*)", value_text)
                if m:
                    abv = float(m.group(1))

            elif label_text == "by":
                brand = value_text

    if not abv and not brand:
        log.debug("No detail data found for %s", url_key)

    return abv, brand


# ── Orchestrator ─────────────────────────────────────────────────────────────
def scrape_all(
    existing_lcbo_ids: set[str],
    detail_limit: int | None = None,
) -> list[RawProduct]:
    """
    Full scrape across all RTD categories.
    - Phase 1: GraphQL bulk fetch for all categories.
    - Phase 2: HTML detail fetch only for SKUs not already in `existing_lcbo_ids`.

    Args:
        existing_lcbo_ids: set of lcbo_id strings already in the database.
                           Detail fetch is skipped for these (price/image still updated).
        detail_limit:      cap Phase-2 fetches to this many (useful for dry-runs/tests).

    Returns list of RawProduct ready for upsert.
    """
    # Verify robots.txt before starting
    if not check_robots_allowed(GQL_URL):
        raise RuntimeError("robots.txt disallows scraping — aborting")

    all_products: dict[str, RawProduct] = {}  # lcbo_id → RawProduct (dedup across categories)

    # Phase 1 — bulk catalog
    for url_key, normalized_category in CATEGORY_MAP.items():
        log.info("Phase 1 — fetching category: %s (%s)", url_key, normalized_category)
        try:
            products = fetch_category(url_key, normalized_category)
            for p in products:
                if p.lcbo_id not in all_products:
                    all_products[p.lcbo_id] = p
                # If the same SKU appears in multiple categories, first category wins
        except Exception as exc:
            log.error("Error fetching category %s: %s", url_key, exc)

    log.info("Phase 1 complete: %d unique products found", len(all_products))

    # Phase 2 — detail fetch for new SKUs only
    new_ids = [pid for pid in all_products if pid not in existing_lcbo_ids]
    if detail_limit is not None:
        log.info("detail_limit=%d: capping Phase-2 to first %d new SKUs", detail_limit, detail_limit)
        new_ids = new_ids[:detail_limit]

    log.info(
        "Phase 2 — fetching details for %d new SKUs (%d already known, skipping)",
        len(new_ids),
        len([pid for pid in all_products if pid in existing_lcbo_ids]),
    )

    for i, lcbo_id in enumerate(new_ids, 1):
        p = all_products[lcbo_id]
        log.info("  [%d/%d] %s — %s", i, len(new_ids), lcbo_id, p.name[:50])
        abv, brand = fetch_product_details(p.url_key)
        p.abv = abv
        p.brand_name = brand

    return list(all_products.values())
