import os
from cracked.extractor import parse_product
from cracked.models import Product
import pytest

# Paths to the saved HTML fixtures in the project root
FIXTURE_DIR = os.path.dirname(os.path.dirname(os.path.abspath(__file__)))

def read_fixture(filename: str) -> str:
    path = os.path.join(FIXTURE_DIR, filename)
    with open(path, "r", encoding="utf-8") as f:
        return f.read()

def test_seltzer_extractor():
    html = read_fixture("seltzer_sample.html")
    url = "https://www.lcbo.com/en/social-lite-triple-berry-vodka-soda-14477"
    product = parse_product(html, url)
    
    assert isinstance(product, Product)
    assert product.lcbo_sku == "14477"
    assert product.name == "Social Lite Triple Berry Vodka Soda"
    assert product.brand_name == "Social Lite"
    assert product.abv == 4.0
    assert product.volume_ml == 355
    assert product.package_format == "4 x 355 ml can"
    assert product.price_cents == 960
    assert product.product_url == url
    assert "https://aem.lcbo.com/content/dam/lcbo/products/" in product.image_url
    assert "Premium vodka and fresh sparkling water" in product.description_raw

def test_cider_extractor():
    html = read_fixture("cider_sample.html")
    url = "https://www.lcbo.com/en/pommies-farmhouse-cider-418582"
    product = parse_product(html, url)
    
    assert isinstance(product, Product)
    assert product.lcbo_sku == "418582"
    assert product.name == "Pommies Farmhouse Cider"
    assert product.brand_name == "Pommies"
    assert product.abv == 6.0
    assert product.volume_ml == 473
    assert product.package_format == "473 ml can"
    assert product.price_cents == 370
    assert product.product_url == url
    assert "Pommies ciders are made with fresh pressed" in product.description_raw

def test_cooler_extractor():
    html = read_fixture("cooler_sample.html")
    url = "https://www.lcbo.com/en/squeezy-s-margarita-42703"
    product = parse_product(html, url)
    
    assert isinstance(product, Product)
    assert product.lcbo_sku == "42703"
    assert product.name == "Squeezy's Margarita"
    assert product.brand_name == "WHITEBOX"
    assert product.abv == 19.0
    assert product.volume_ml == 100
    assert product.package_format == "100 ml can"
    assert product.price_cents == 595
    assert product.product_url == url
    assert "Whitebox Squeezy's Margarita is a flavourful classic" in product.description_raw

def test_mock_canned_cocktail_extractor():
    mock_html = """
    <html>
      <body>
        <h1 class="page-title">Jack Daniels Cola Canned Cocktail</h1>
        <form data-product-sku="987654"></form>
        <span class="price">$4.25</span>
        <div class="product-info-main">
          <div class="lcbo-product-info-size">
            <div class="lcbo-product-size">
              <span>355 ml can</span>
            </div>
          </div>
        </div>
        <div id="moredetail">
          <ul>
            <li><span class="label">Alcohol/Vol:</span><span class="value">5%</span></li>
            <li><span class="label">By:</span><span class="value">Jack Daniels</span></li>
          </ul>
        </div>
      </body>
    </html>
    """
    url = "https://www.lcbo.com/en/jack-daniels-cola-987654"
    product = parse_product(mock_html, url)
    
    assert product.lcbo_sku == "987654"
    assert product.name == "Jack Daniels Cola Canned Cocktail"
    assert product.brand_name == "Jack Daniels"
    assert product.abv == 5.0
    assert product.volume_ml == 355
    assert product.package_format == "355 ml can"
    assert product.price_cents == 425

def test_mock_hard_tea_extractor():
    mock_html = """
    <html>
      <body>
        <h1 class="page-title">Twisted Tea Original</h1>
        <form data-product-sku="123456"></form>
        <span class="price">$3.10</span>
        <div class="product-info-main">
          <div class="lcbo-product-info-size">
            <div class="lcbo-product-size">
              <span>6 x 355 ml can</span>
            </div>
          </div>
        </div>
        <div id="moredetail">
          <ul>
            <li><span class="label">Alcohol/Vol:</span><span class="value">5.0%</span></li>
            <li><span class="label">By:</span><span class="value">Twisted Tea</span></li>
          </ul>
        </div>
      </body>
    </html>
    """
    url = "https://www.lcbo.com/en/twisted-tea-original-123456"
    product = parse_product(mock_html, url)
    
    assert product.lcbo_sku == "123456"
    assert product.name == "Twisted Tea Original"
    assert product.brand_name == "Twisted Tea"
    assert product.abv == 5.0
    assert product.volume_ml == 355
    assert product.package_format == "6 x 355 ml can"
    assert product.price_cents == 310
