from dataclasses import dataclass


@dataclass
class RawProduct:
    lcbo_id: str          # SKU from LCBO — used as idempotency key
    name: str
    brand_name: str       # "By" field from product page
    normalized_category: str
    abv: float | None
    price_cents: int | None
    image_url: str | None
    url_key: str          # for constructing the product detail page URL
