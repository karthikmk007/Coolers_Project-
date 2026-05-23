import os
import sys
from dotenv import load_dotenv
from supabase import create_client, Client
from sentence_transformers import SentenceTransformer

# Load environment variables
# scripts/ is one level deep, so go up one dir to find .env.local
env_path = os.path.join(os.path.dirname(os.path.dirname(os.path.abspath(__file__))), '.env.local')
load_dotenv(dotenv_path=env_path)

url = os.environ.get("NEXT_PUBLIC_SUPABASE_URL")
key = os.environ.get("NEXT_PUBLIC_SUPABASE_ANON_KEY")

if not url or not key:
    print("Error: Supabase URL and Key must be provided in .env.local")
    sys.exit(1)

# Use the service role key for writing if available, otherwise anon key (assuming policies allow for now or service role is in env)
service_key = os.environ.get("SUPABASE_SERVICE_ROLE_KEY", key)
supabase: Client = create_client(url, service_key)

print("Loading SentenceTransformer model (all-MiniLM-L6-v2)...")
model = SentenceTransformer('all-MiniLM-L6-v2')

def get_product_text(product):
    # Combine relevant text fields for embedding
    brand_name = product.get("brand", {}).get("name", "") if product.get("brand") else ""
    name = product.get("name", "")
    category = product.get("normalized_category", "").replace("_", " ")
    abv = f"{product.get('abv')}% ABV" if product.get("abv") else ""
    
    # Text format designed for semantic search
    return f"{brand_name} {name}. A {category} beverage. {abv}".strip()

def run_embedding_pipeline():
    print("Fetching products without embeddings from Supabase...")
    
    # We fetch all products, optionally filtering those where embedding is null
    # But since Supabase python client doesn't fully support 'is null' cleanly on vectors without custom filters sometimes,
    # we'll just fetch all and re-embed. Or use select('*, brand(name)')
    
    response = supabase.table("product").select("id, name, normalized_category, abv, brand(name), embedding").execute()
    products = response.data
    
    if not products:
        print("No products found.")
        return

    print(f"Generating embeddings for {len(products)} products...")
    
    # Batch processing
    for i, product in enumerate(products):
        text = get_product_text(product)
        embedding = model.encode(text).tolist()
        
        # Update product in Supabase
        supabase.table("product").update({"embedding": embedding}).eq("id", product["id"]).execute()
        
        if (i + 1) % 10 == 0:
            print(f"Processed {i + 1}/{len(products)}...")

    print("Embedding pipeline complete.")

if __name__ == "__main__":
    run_embedding_pipeline()
