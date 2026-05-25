"""
Extractor module for the CRACKED LCBO catalog scraper.

Design Decisions:
1. selectolax (HTMLParser) is used instead of BeautifulSoup or lxml because selectolax
   is written in C/C++ (built on Modest engine) and is significantly faster and uses
   much less memory than BeautifulSoup, which is critical when parsing hundreds/thousands of pages.
2. Pydantic v2 is used for strict schema validation. If required fields like SKU or name
   are missing, it will raise a ValidationError immediately, ensuring bad data does not corrupt the DB.
3. Fallback strategies are implemented for every field to ensure robustness against DOM changes.
"""

import re
from selectolax.parser import HTMLParser
from .models import Product

def parse_product(html: str, url: str) -> Product:
    """
    Parse a single LCBO product page HTML and extract product details.
    
    Args:
        html: Raw HTML content of the product page.
        url: The product URL.
        
    Returns:
        Product: A validated Pydantic Product model.
    """
    parser = HTMLParser(html)
    
    # ── 1. Product Name ───────────────────────────────────────────────────────
    # Found in the main page title <h1 class="page-title">
    name_node = parser.css_first("h1.page-title")
    name = name_node.text(strip=True) if name_node else ""
    
    # ── 2. LCBO SKU ───────────────────────────────────────────────────────────
    # We check multiple fallback locations for the SKU:
    # A. The product add-to-cart form attribute
    sku = None
    form_node = parser.css_first("form[data-product-sku]")
    if form_node:
        sku = form_node.attributes.get("data-product-sku")
        
    # B. A span/div containing itemprop="sku"
    if not sku:
        sku_node = parser.css_first("[itemprop='sku']")
        if sku_node:
            sku = sku_node.text(strip=True)
            
    # C. Extract from URL key suffix (e.g. /en/pommies-farmhouse-cider-418582 -> 418582)
    if not sku and url:
        match = re.search(r"-(\d+)(?:/|\?|$)", url)
        if match:
            sku = match.group(1)
            
    # ── 3. Price (in Cents) ───────────────────────────────────────────────────
    # Price is in <span class="price">
    price_node = parser.css_first("span.price")
    price_cents = None
    if price_node:
        price_text = price_node.text(strip=True)
        # Extract numeric characters and decimal points
        price_digits = re.sub(r"[^\d.]", "", price_text)
        if price_digits:
            try:
                price_cents = int(round(float(price_digits) * 100))
            except ValueError:
                pass

    # ── 4. Image URL ──────────────────────────────────────────────────────────
    # Extracted from og:image meta tag
    meta_img = parser.css_first("meta[property='og:image']")
    image_url = meta_img.attributes.get("content") if meta_img else None
    
    # ── 5. Description ────────────────────────────────────────────────────────
    # Extracted from meta description tag
    meta_desc = parser.css_first("meta[name='description']")
    description_raw = meta_desc.attributes.get("content") if meta_desc else None
    
    # ── 6. ABV (Alcohol by Volume) & Brand ────────────────────────────────────
    # Both live inside the specifications container <div id="moredetail">
    abv = None
    brand_name = None
    
    moredetail = parser.css_first("div#moredetail")
    if moredetail:
        for li in moredetail.css("li"):
            # Selectolax allows CSS selections scoped to the list item
            label_el = li.css_first("span.label") or li.css_first(".label")
            value_el = li.css_first("span.value") or li.css_first(".value")
            
            if label_el and value_el:
                label_text = label_el.text(strip=True).lower()
                value_text = value_el.text(strip=True)
                
                # Extract ABV (e.g., "Alcohol/Vol: 4%" or "4.5%")
                if "alcohol" in label_text:
                    m = re.search(r"(\d+(?:\.\d+)?)", value_text)
                    if m:
                        try:
                            abv = float(m.group(1))
                        except ValueError:
                            pass
                
                # Extract Brand (e.g., "By: Social Lite")
                elif label_text == "by" or "by" in label_text:
                    brand_name = value_text

    # ── 7. Package Format & Volume (mL) ───────────────────────────────────────
    # Size specs are in: div.product-info-main div.lcbo-product-info-size div.lcbo-product-size span
    size_node = parser.css_first("div.product-info-main div.lcbo-product-info-size div.lcbo-product-size span")
    package_format = size_node.text(strip=True) if size_node else None
    
    volume_ml = None
    if package_format:
        # Regex extracts the container volume (e.g. "4 x 355 ml can" -> 355, "473 ml can" -> 473)
        matches = re.findall(r"(\d+)\s*(?:ml|mL|ml\.|mL\.)", package_format)
        if matches:
            try:
                volume_ml = int(matches[-1])  # Take the last match which represents container volume
            except ValueError:
                pass
                
    # Fallback to inferring brand from product name if not found in moredetail specs
    if not brand_name and name:
        tokens = name.split()
        brand_tokens = []
        for token in tokens:
            if token and token[0].isupper():
                brand_tokens.append(token)
            else:
                break
        brand_name = " ".join(brand_tokens[:3]) if brand_tokens else None

    # Construct and validate Product using Pydantic
    return Product(
        lcbo_sku=sku or "",
        name=name,
        brand_name=brand_name,
        raw_category=None, # To be determined by category context in crawler
        abv=abv,
        volume_ml=volume_ml,
        package_format=package_format,
        price_cents=price_cents,
        product_url=url,
        image_url=image_url,
        description_raw=description_raw,
    )
