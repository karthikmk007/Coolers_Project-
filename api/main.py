"""
CRACKED — Flavour Recommendation API
=====================================
Architecture:
  1. On startup → load all embedded products from Supabase into RAM
  2. /recommend  → cosine similarity via sklearn (fast, no DB round-trip)
  3. /recommend/pgvector → delegates to Supabase's match_products function
  4. /embed      → re-generates embeddings for all products → stores in pgvector
  5. /health     → liveness + model status

Run:
  python3 -m uvicorn api.main:app --host 0.0.0.0 --port 8000 --reload
"""

import os
import time
import logging
import numpy as np
from typing import Optional
from contextlib import asynccontextmanager

from fastapi import FastAPI, HTTPException, Query
from fastapi.middleware.cors import CORSMiddleware
from pydantic import BaseModel
from sentence_transformers import SentenceTransformer
from sklearn.metrics.pairwise import cosine_similarity
from supabase import create_client, Client
from dotenv import load_dotenv

# ── Env ─────────────────────────────────────────────────────────────
# Load .env.local for local dev; in production (Railway) vars come from environment
env_path = os.path.join(os.path.dirname(os.path.dirname(os.path.abspath(__file__))), ".env.local")
load_dotenv(dotenv_path=env_path)

SUPABASE_URL  = os.environ.get("NEXT_PUBLIC_SUPABASE_URL") or os.environ.get("SUPABASE_URL", "")
SUPABASE_ANON = os.environ.get("NEXT_PUBLIC_SUPABASE_ANON_KEY") or os.environ.get("SUPABASE_ANON_KEY", "")
SUPABASE_SVC  = os.environ.get("SUPABASE_SERVICE_ROLE_KEY", SUPABASE_ANON)

if not SUPABASE_URL or not SUPABASE_ANON:
    raise RuntimeError("Missing Supabase credentials — set NEXT_PUBLIC_SUPABASE_URL and NEXT_PUBLIC_SUPABASE_ANON_KEY")

logging.basicConfig(level=logging.INFO, format="%(asctime)s  %(levelname)s  %(message)s")
log = logging.getLogger("cracked")

# ── In-memory cache ──────────────────────────────────────────────────
class FlavourEngine:
    """
    Loads all products + their pre-computed pgvector embeddings into RAM.
    Falls back to on-the-fly encoding when a product has no stored embedding.
    """
    def __init__(self):
        self.model: Optional[SentenceTransformer] = None
        self.products: list[dict] = []
        self.embeddings: Optional[np.ndarray] = None
        self.id_to_idx: dict[int, int] = {}
        self.ready = False

    def load_model(self):
        log.info("Loading SentenceTransformer all-MiniLM-L6-v2 …")
        t0 = time.time()
        self.model = SentenceTransformer("all-MiniLM-L6-v2")
        log.info(f"Model loaded in {time.time()-t0:.1f}s")

    def product_text(self, p: dict) -> str:
        brand = (p.get("brand") or {}).get("name", "") if isinstance(p.get("brand"), dict) else p.get("brand_name", "")
        name  = p.get("name", "")
        cat   = (p.get("normalized_category") or "").replace("_", " ")
        abv   = f"{p.get('abv')}% ABV" if p.get("abv") else ""
        return f"{brand} {name}. A {cat} beverage. {abv}".strip()

    def warm(self):
        """
        Pull all products from Supabase; use stored pgvector embeddings where
        available, fall back to on-the-fly encoding.

        Works in two modes:
          A) pgvector migration applied → fetches stored embeddings (fast)
          B) No embedding column yet   → encodes all products in-memory (still works!)
        """
        sb: Client = create_client(SUPABASE_URL, SUPABASE_ANON)
        log.info("Fetching products from Supabase …")

        # Try to fetch with embedding column first
        try:
            resp = sb.from_("product").select(
                "id, name, normalized_category, abv, price_cents, image_url, brand(name), embedding"
            ).execute()
            rows = resp.data or []
            has_embedding_col = True
        except Exception:
            # Embedding column not yet created — fetch without it
            log.info("No embedding column found — encoding all products in-memory (apply migration 002 to persist embeddings)")
            resp = sb.from_("product").select(
                "id, name, normalized_category, abv, price_cents, image_url, brand(name)"
            ).execute()
            rows = resp.data or []
            has_embedding_col = False

        log.info(f"Fetched {len(rows)} products — encoding{'(from pgvector)' if has_embedding_col else ' in-memory'} …")

        products, vecs = [], []
        texts_to_encode = []
        needs_encoding  = []

        for row in rows:
            products.append(row)
            if has_embedding_col and row.get("embedding"):
                raw = row["embedding"]
                # Supabase returns pgvector as a string like "[0.1,0.2,...]"
                if isinstance(raw, str):
                    import json
                    raw = json.loads(raw)
                vecs.append(np.array(raw, dtype=np.float32))
            else:
                texts_to_encode.append(self.product_text(row))
                needs_encoding.append(len(vecs))
                vecs.append(None)  # placeholder

        # Batch-encode all products that need it
        if texts_to_encode:
            log.info(f"Encoding {len(texts_to_encode)} products …")
            encoded = self.model.encode(texts_to_encode, batch_size=64, show_progress_bar=True)
            for i, idx in enumerate(needs_encoding):
                vecs[idx] = encoded[i].astype(np.float32)

        self.products  = products
        self.embeddings = np.array(vecs, dtype=np.float32)
        self.id_to_idx  = {p["id"]: i for i, p in enumerate(products)}
        self.ready      = True
        log.info("FlavourEngine is warm ✓")

    def recommend(self, product_id: int, n: int = 5, threshold: float = 0.4) -> list[dict]:
        if not self.ready:
            raise RuntimeError("Engine not ready")
        if product_id not in self.id_to_idx:
            raise ValueError(f"product_id {product_id} not found")

        idx   = self.id_to_idx[product_id]
        query = self.embeddings[idx : idx + 1]                          # (1, 384)
        sims  = cosine_similarity(query, self.embeddings).flatten()     # (N,)

        results = []
        for i in np.argsort(sims)[::-1]:
            if int(self.products[i]["id"]) == product_id:
                continue
            score = float(sims[i])
            if score < threshold:
                break
            p = self.products[i]
            brand = (p.get("brand") or {}).get("name", "") if isinstance(p.get("brand"), dict) else p.get("brand_name", "—")
            results.append({
                "id":                  p["id"],
                "name":                p["name"],
                "brand_name":          brand,
                "normalized_category": p["normalized_category"],
                "abv":                 p.get("abv"),
                "price_cents":         p.get("price_cents"),
                "image_url":           p.get("image_url"),
                "similarity":          round(score, 6),
            })
            if len(results) >= n:
                break
        return results

    def recommend_by_text(self, query_text: str, n: int = 5, threshold: float = 0.4) -> list[dict]:
        if not self.ready:
            raise RuntimeError("Engine not ready")
        q_vec = self.model.encode(query_text)
        sims  = cosine_similarity([q_vec], self.embeddings).flatten()
        results = []
        for i in np.argsort(sims)[::-1]:
            score = float(sims[i])
            if score < threshold:
                break
            p = self.products[i]
            brand = (p.get("brand") or {}).get("name", "") if isinstance(p.get("brand"), dict) else p.get("brand_name", "—")
            results.append({
                "id":                  p["id"],
                "name":                p["name"],
                "brand_name":          brand,
                "normalized_category": p["normalized_category"],
                "abv":                 p.get("abv"),
                "price_cents":         p.get("price_cents"),
                "image_url":           p.get("image_url"),
                "similarity":          round(score, 6),
            })
            if len(results) >= n:
                break
        return results


engine = FlavourEngine()

# ── Lifespan ─────────────────────────────────────────────────────────
@asynccontextmanager
async def lifespan(app: FastAPI):
    engine.load_model()
    try:
        engine.warm()
    except Exception as e:
        log.warning(f"Could not warm engine on startup (run /embed first): {e}")
    yield

# ── App ──────────────────────────────────────────────────────────────
app = FastAPI(title="CRACKED Flavour Recommendation API", version="1.0.0", lifespan=lifespan)

app.add_middleware(
    CORSMiddleware,
    allow_origins=["*"],
    allow_credentials=True,
    allow_methods=["*"],
    allow_headers=["*"],
)

# ── Schemas ──────────────────────────────────────────────────────────
class RecommendRequest(BaseModel):
    product_id: Optional[int] = None
    query: Optional[str] = None
    limit: int = 5
    threshold: float = 0.4

# ── Routes ───────────────────────────────────────────────────────────
@app.get("/")
def root():
    return {
        "status":   "CRACKED ML API",
        "model":    "all-MiniLM-L6-v2",
        "products": len(engine.products),
        "ready":    engine.ready,
    }

@app.get("/health")
def health():
    return {"ok": engine.ready, "products_loaded": len(engine.products)}

@app.post("/recommend")
def recommend(req: RecommendRequest):
    if not engine.ready:
        raise HTTPException(503, "Engine warming up — try again in a moment")

    if req.product_id is not None:
        try:
            results = engine.recommend(req.product_id, n=req.limit, threshold=req.threshold)
        except ValueError as e:
            raise HTTPException(404, str(e))
    elif req.query:
        results = engine.recommend_by_text(req.query, n=req.limit, threshold=req.threshold)
    else:
        raise HTTPException(400, "Provide product_id or query")

    return {"results": results, "model": "all-MiniLM-L6-v2", "engine": "cosine-in-memory"}

@app.get("/recommend")
def recommend_get(
    product_id: Optional[int] = Query(None),
    query: Optional[str]      = Query(None),
    n: int                    = Query(5),
    threshold: float          = Query(0.4),
):
    """GET convenience wrapper — same logic as POST /recommend."""
    req = RecommendRequest(product_id=product_id, query=query, limit=n, threshold=threshold)
    return recommend(req)

@app.post("/embed")
def embed_all():
    """
    Re-generates embeddings for all products and stores them in Supabase pgvector.
    Requires: migration 002_add_pgvector.sql to be applied in Supabase.
    """
    if not engine.model:
        raise HTTPException(503, "Model not loaded")

    sb: Client = create_client(SUPABASE_URL, SUPABASE_SVC)
    resp = sb.from_("product").select("id, name, normalized_category, abv, brand(name)").execute()
    products = resp.data or []

    log.info(f"Embedding {len(products)} products …")
    updated = 0
    for i, p in enumerate(products):
        text = engine.product_text(p)
        vec  = engine.model.encode(text).tolist()
        sb.from_("product").update({"embedding": vec}).eq("id", p["id"]).execute()
        updated += 1
        if (i + 1) % 20 == 0:
            log.info(f"  {i+1}/{len(products)} embedded")

    # Re-warm the in-memory cache
    engine.warm()
    return {"embedded": updated, "status": "done"}


if __name__ == "__main__":
    import uvicorn
    port = int(os.environ.get("PORT", 8000))
    uvicorn.run("api.main:app", host="0.0.0.0", port=port, reload=False)
