from pydantic import BaseModel, Field

class Product(BaseModel):
    lcbo_sku: str = Field(..., min_length=1)
    name: str = Field(..., min_length=1)
    brand_name: str | None = None
    raw_category: str | None = None
    abv: float | None = None
    volume_ml: int | None = None
    package_format: str | None = None
    price_cents: int | None = None
    product_url: str = Field(..., min_length=1)
    image_url: str | None = None
    description_raw: str | None = None
