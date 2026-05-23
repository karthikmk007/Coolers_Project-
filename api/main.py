import os
from fastapi import FastAPI, HTTPException
from fastapi.middleware.cors import CORSMiddleware
from pydantic import BaseModel
from supabase import create_client, Client
from sentence_transformers import SentenceTransformer

app = FastAPI(title="CRACKED Recommendation API")

app.add_middleware(
    CORSMiddleware,
    allow_origins=["*"],  # For portfolio, open CORS. Restrict in prod.
    allow_credentials=True,
    allow_methods=["*"],
    allow_headers=["*"],
)

url = os.environ.get("NEXT_PUBLIC_SUPABASE_URL", "")
key = os.environ.get("NEXT_PUBLIC_SUPABASE_ANON_KEY", "")

# We initialize model at startup to avoid reloading per request
print("Loading model...")
model = SentenceTransformer('all-MiniLM-L6-v2')

class RecommendRequest(BaseModel):
    query: str = None
    product_id: int = None
    limit: int = 5

@app.get("/")
def read_root():
    return {"status": "CRACKED ML API is running", "model": "all-MiniLM-L6-v2"}

@app.post("/recommend")
def recommend(req: RecommendRequest):
    if not url or not key:
        raise HTTPException(status_code=500, detail="Supabase credentials missing in env")
    
    supabase: Client = create_client(url, key)
    
    # If a product_id is provided, fetch its text to use as query
    query_text = req.query
    exclude_id = None
    
    if req.product_id:
        exclude_id = req.product_id
        res = supabase.table("product").select("name, normalized_category, abv, brand(name)").eq("id", req.product_id).single().execute()
        if not res.data:
            raise HTTPException(status_code=404, detail="Product not found")
        
        p = res.data
        brand_name = p.get("brand", {}).get("name", "") if p.get("brand") else ""
        category = p.get("normalized_category", "").replace("_", " ")
        abv = f"{p.get('abv')}%" if p.get("abv") else ""
        query_text = f"{brand_name} {p.get('name')} {category} {abv}"

    if not query_text:
        raise HTTPException(status_code=400, detail="Must provide query or product_id")

    # Generate embedding for the query
    query_embedding = model.encode(query_text).tolist()

    # Call the pgvector match_products function in Supabase
    rpc_res = supabase.rpc("match_products", {
        "query_embedding": query_embedding,
        "match_threshold": 0.5,
        "match_count": req.limit,
        "exclude_product_id": exclude_id
    }).execute()

    return {"results": rpc_res.data}
