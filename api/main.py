"""
CRACKED — Flavour Recommendation API  v2.0
==========================================
Two recommendation engines running in parallel:

  ENGINE A — Semantic (SentenceTransformer all-MiniLM-L6-v2)
    Encodes product text → 384-dim cosine similarity
    Best for: free-text queries ("something tropical and light")

  ENGINE B — Hybrid ML (Content + Collaborative Filtering)
    Feature matrix (category, ABV, price) + user-item rating matrix
    α × content_similarity + β × item_collaborative_similarity
    Best for: "more like this" product-to-product recommendations

Routes:
  GET/POST /recommend            → semantic engine (default)
  GET/POST /recommend/hybrid     → hybrid engine (product_id required)
  POST     /embed                → regenerate all pgvector embeddings
  POST     /hybrid/retrain       → rebuild hybrid model from live Supabase ratings
  GET      /health               → liveness + both engine states
  GET      /                     → API info

Run:
  python3 -m uvicorn api.main:app --host 0.0.0.0 --port 8000 --reload
"""

import os
import io
import time
import json
import pickle
import logging
import subprocess
import numpy as np
from typing import Optional, Literal
from contextlib import asynccontextmanager

from fastapi import FastAPI, HTTPException, Query, BackgroundTasks
from fastapi.middleware.cors import CORSMiddleware
from pydantic import BaseModel, Field
from sentence_transformers import SentenceTransformer
from sklearn.metrics.pairwise import cosine_similarity
from sklearn.preprocessing import MinMaxScaler
from supabase import create_client, Client
from dotenv import load_dotenv

# ── Env ──────────────────────────────────────────────────────────────────────
env_path = os.path.join(os.path.dirname(os.path.dirname(os.path.abspath(__file__))), ".env.local")
load_dotenv(dotenv_path=env_path)

SUPABASE_URL  = os.environ.get("NEXT_PUBLIC_SUPABASE_URL") or os.environ.get("SUPABASE_URL", "")
SUPABASE_ANON = os.environ.get("NEXT_PUBLIC_SUPABASE_ANON_KEY") or os.environ.get("SUPABASE_ANON_KEY", "")
SUPABASE_SVC  = os.environ.get("SUPABASE_SERVICE_ROLE_KEY", SUPABASE_ANON)

if not SUPABASE_URL or not SUPABASE_ANON:
    raise RuntimeError(
        "Missing Supabase credentials — set NEXT_PUBLIC_SUPABASE_URL and NEXT_PUBLIC_SUPABASE_ANON_KEY"
    )

logging.basicConfig(level=logging.INFO, format="%(asctime)s  %(levelname)s  %(message)s")
log = logging.getLogger("cracked")

# Paths
_API_DIR    = os.path.dirname(os.path.abspath(__file__))
_ROOT_DIR   = os.path.dirname(_API_DIR)
_ML_DIR     = os.path.join(_ROOT_DIR, "ml")
_MODEL_PKL  = os.path.join(_ML_DIR, "model_artefacts", "model.pkl")


# ══════════════════════════════════════════════════════════════════════════════
# ENGINE A — Semantic (SentenceTransformer)
# ══════════════════════════════════════════════════════════════════════════════

class FlavourEngine:
    """
    Loads all products + pre-computed pgvector embeddings into RAM.
    Falls back to on-the-fly encoding when no stored embedding exists.
    """
    def __init__(self):
        self.model:      Optional[SentenceTransformer] = None
        self.products:   list[dict]                    = []
        self.embeddings: Optional[np.ndarray]          = None
        self.id_to_idx:  dict[int, int]                = {}
        self.ready = False

    def load_model(self):
        log.info("ENGINE A — Loading SentenceTransformer all-MiniLM-L6-v2 …")
        t0 = time.time()
        self.model = SentenceTransformer("all-MiniLM-L6-v2")
        log.info(f"ENGINE A — Model loaded in {time.time()-t0:.1f}s")

    def product_text(self, p: dict) -> str:
        brand = (p.get("brand") or {}).get("name", "") if isinstance(p.get("brand"), dict) \
                else p.get("brand_name", "")
        name  = p.get("name", "")
        cat   = (p.get("normalized_category") or "").replace("_", " ")
        abv   = f"{p.get('abv')}% ABV" if p.get("abv") else ""
        return f"{brand} {name}. A {cat} beverage. {abv}".strip()

    def warm(self):
        sb: Client = create_client(SUPABASE_URL, SUPABASE_ANON)
        log.info("ENGINE A — Fetching products from Supabase …")
        try:
            resp = sb.from_("product").select(
                "id, name, normalized_category, abv, price_cents, image_url, brand(name), embedding"
            ).execute()
            rows = resp.data or []
            has_embedding_col = True
        except Exception:
            log.info("ENGINE A — No embedding column, encoding in-memory")
            resp = sb.from_("product").select(
                "id, name, normalized_category, abv, price_cents, image_url, brand(name)"
            ).execute()
            rows  = resp.data or []
            has_embedding_col = False

        log.info(f"ENGINE A — {len(rows)} products fetched")
        products, vecs, texts_to_encode, needs_encoding = [], [], [], []

        for row in rows:
            products.append(row)
            if has_embedding_col and row.get("embedding"):
                raw = row["embedding"]
                if isinstance(raw, str):
                    raw = json.loads(raw)
                vecs.append(np.array(raw, dtype=np.float32))
            else:
                texts_to_encode.append(self.product_text(row))
                needs_encoding.append(len(vecs))
                vecs.append(None)

        if texts_to_encode:
            log.info(f"ENGINE A — Encoding {len(texts_to_encode)} products …")
            encoded = self.model.encode(texts_to_encode, batch_size=64, show_progress_bar=False)
            for i, idx in enumerate(needs_encoding):
                vecs[idx] = encoded[i].astype(np.float32)

        self.products   = products
        self.embeddings = np.array(vecs, dtype=np.float32)
        self.id_to_idx  = {p["id"]: i for i, p in enumerate(products)}
        self.ready      = True
        log.info(f"ENGINE A — Ready ✓  ({len(products)} products)")

    def recommend(self, product_id: int, n: int = 5, threshold: float = 0.4) -> list[dict]:
        if not self.ready:
            raise RuntimeError("Engine not ready")
        if product_id not in self.id_to_idx:
            raise ValueError(f"product_id {product_id} not found")
        idx   = self.id_to_idx[product_id]
        sims  = cosine_similarity(self.embeddings[idx:idx+1], self.embeddings).flatten()
        results = []
        for i in np.argsort(sims)[::-1]:
            if int(self.products[i]["id"]) == product_id:
                continue
            score = float(sims[i])
            if score < threshold:
                break
            p     = self.products[i]
            brand = (p.get("brand") or {}).get("name", "") if isinstance(p.get("brand"), dict) \
                    else p.get("brand_name", "—")
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
            p     = self.products[i]
            brand = (p.get("brand") or {}).get("name", "") if isinstance(p.get("brand"), dict) \
                    else p.get("brand_name", "—")
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


# ══════════════════════════════════════════════════════════════════════════════
# ENGINE B — Hybrid ML (Content + Collaborative)
# ══════════════════════════════════════════════════════════════════════════════

class HybridEngine:
    """
    Loads the trained artefacts from ml/model_artefacts/model.pkl and provides
    fast in-memory recommendations via:
      α × content_cosine_similarity + β × item_collaborative_similarity

    Rebuilds itself from live Supabase data via retrain().
    """

    # Category enum → one-hot index (must match the training encoding)
    _CAT_ORDER = ["cider", "cooler", "hard_seltzer", "other", "radler"]

    def __init__(self):
        self.ready              = False
        self.cooler_ids:        list[int]         = []
        self.cooler_id_to_i:    dict[int, int]    = {}
        self.content_sim:       Optional[np.ndarray] = None   # (N, N)
        self.item_sim:          Optional[np.ndarray] = None   # (N, N)
        self.matrix_col_ids:    list[int]         = []
        self.metadata:          dict              = {}
        # Full product detail lookup (id → row) loaded from Supabase
        self.product_lookup:    dict[int, dict]   = {}

    # ── Load from pickle ────────────────────────────────────────────────────
    def load(self) -> bool:
        if not os.path.exists(_MODEL_PKL):
            log.warning("ENGINE B — model.pkl not found; run POST /hybrid/retrain to build it")
            return False
        try:
            with open(_MODEL_PKL, "rb") as f:
                art = pickle.load(f)
            self.cooler_ids     = [int(c) for c in art["cooler_ids"]]
            self.cooler_id_to_i = {int(k): v for k, v in art["cooler_id_to_i"].items()}
            self.content_sim    = np.array(art["content_sim_matrix"], dtype=np.float32)
            self.item_sim       = np.array(art["item_sim_matrix"],    dtype=np.float32)
            self.matrix_col_ids = [int(c) for c in art["matrix_col_ids"]]
            self.metadata       = art.get("metadata", {})
            self.ready          = True
            log.info(
                f"ENGINE B — Ready ✓  "
                f"({len(self.cooler_ids)} coolers, "
                f"{self.metadata.get('n_ratings', '?')} ratings, "
                f"α={self.metadata.get('alpha', 0.6)} β={self.metadata.get('beta', 0.4)})"
            )
            return True
        except Exception as e:
            log.error(f"ENGINE B — Failed to load model.pkl: {e}")
            return False

    # ── Load product details from Supabase (for response enrichment) ────────
    def warm_product_lookup(self):
        try:
            sb: Client = create_client(SUPABASE_URL, SUPABASE_ANON)
            resp = sb.from_("product").select(
                "id, name, normalized_category, abv, price_cents, image_url, brand(name)"
            ).execute()
            for row in (resp.data or []):
                brand = (row.get("brand") or {}).get("name", "—") \
                        if isinstance(row.get("brand"), dict) else "—"
                self.product_lookup[row["id"]] = {**row, "brand_name": brand}
            log.info(f"ENGINE B — Product lookup warmed ({len(self.product_lookup)} products)")
        except Exception as e:
            log.warning(f"ENGINE B — Could not warm product lookup: {e}")

    # ── Core recommendation ─────────────────────────────────────────────────
    def recommend(
        self,
        cooler_id: int,
        n: int         = 5,
        alpha: float   = 0.6,
        beta:  float   = 0.4,
        threshold: float = 0.3,
    ) -> list[dict]:
        if not self.ready:
            raise RuntimeError("Hybrid engine not ready")
        if cooler_id not in self.cooler_id_to_i:
            raise ValueError(f"cooler_id {cooler_id} not in hybrid model")

        c_idx          = self.cooler_id_to_i[cooler_id]
        content_scores = self.content_sim[c_idx].copy()      # (N,)

        # Item-based collaborative scores (aligned to cooler_ids list)
        collab_scores = np.zeros(len(self.cooler_ids), dtype=np.float32)
        if cooler_id in self.matrix_col_ids:
            m_idx     = self.matrix_col_ids.index(cooler_id)
            item_sims = self.item_sim[m_idx]                  # (n_matrix_cols,)
            for j, mc_id in enumerate(self.matrix_col_ids):
                ci = self.cooler_id_to_i.get(mc_id)
                if ci is not None:
                    collab_scores[ci] = item_sims[j]

        hybrid = alpha * content_scores + beta * collab_scores
        hybrid[c_idx] = -1.0   # exclude self

        results = []
        for i in np.argsort(hybrid)[::-1]:
            score = float(hybrid[i])
            if score < threshold:
                break
            cid = self.cooler_ids[i]
            p   = self.product_lookup.get(cid, {})
            results.append({
                "id":                  cid,
                "name":                p.get("name", f"Product #{cid}"),
                "brand_name":          p.get("brand_name", "—"),
                "normalized_category": p.get("normalized_category", "—"),
                "abv":                 p.get("abv"),
                "price_cents":         p.get("price_cents"),
                "image_url":           p.get("image_url"),
                "hybrid_score":        round(score, 6),
                "content_score":       round(float(content_scores[i]), 6),
                "collab_score":        round(float(collab_scores[i]),  6),
            })
            if len(results) >= n:
                break
        return results

    # ── Retrain from live Supabase data ─────────────────────────────────────
    def retrain(self) -> dict:
        """
        Pull live product + review data from Supabase, run the preprocessing
        and model pipeline, then hot-reload the new artefacts.
        """
        log.info("ENGINE B — Starting retrain …")
        t0 = time.time()

        sb: Client = create_client(SUPABASE_URL, SUPABASE_ANON)

        # ── 1. Fetch products ────────────────────────────────────────────────
        prod_resp = sb.from_("product").select(
            "id, name, normalized_category, abv, price_cents, brand(name)"
        ).execute()
        products = prod_resp.data or []
        if not products:
            raise RuntimeError("No products in database")

        # ── 2. Fetch ratings ─────────────────────────────────────────────────
        rev_resp = sb.from_("review").select(
            "id, product_id, rating, author_name"
        ).execute()
        reviews = rev_resp.data or []
        log.info(f"ENGINE B — Retrain: {len(products)} products, {len(reviews)} ratings")

        # ── 3. Build content feature matrix ─────────────────────────────────
        import pandas as pd

        prod_df = pd.DataFrame([{
            "cooler_id":           p["id"],
            "name":                p["name"],
            "brand_name":          (p.get("brand") or {}).get("name", "—") if isinstance(p.get("brand"), dict) else "—",
            "normalized_category": p["normalized_category"],
            "abv":                 float(p["abv"]) if p.get("abv") else None,
            "price_cents":         p.get("price_cents") or 0,
        } for p in products])

        # Category median ABV imputation
        cat_abv_med = prod_df.groupby("normalized_category")["abv"].median()
        prod_df["abv"] = prod_df.apply(
            lambda r: cat_abv_med.get(r["normalized_category"], 5.0) if pd.isna(r["abv"]) else r["abv"],
            axis=1,
        )
        prod_df["price_dollars"] = prod_df["price_cents"] / 100.0

        # One-hot encode category
        cat_dummies = pd.get_dummies(prod_df["normalized_category"], prefix="cat")

        # Normalise numeric features
        scaler = MinMaxScaler()
        prod_df[["abv_norm", "price_norm"]] = scaler.fit_transform(
            prod_df[["abv", "price_dollars"]].fillna(0)
        )

        feature_cols = list(cat_dummies.columns) + ["abv_norm", "price_norm"]
        X = pd.concat([prod_df[["abv_norm", "price_norm"]], cat_dummies], axis=1).fillna(0).values
        content_sim_matrix = cosine_similarity(X).astype(np.float32)

        cooler_ids     = prod_df["cooler_id"].tolist()
        cooler_id_to_i = {cid: i for i, cid in enumerate(cooler_ids)}

        # ── 4. Build user-item matrix & item similarity ──────────────────────
        item_sim_matrix   = np.eye(len(cooler_ids), dtype=np.float32)  # fallback: identity
        matrix_col_ids    = []

        if reviews:
            rev_df = pd.DataFrame([{
                "user_handle": r.get("author_name", "anon"),
                "cooler_id":   r["product_id"],
                "rating":      r["rating"],
            } for r in reviews])

            user_item = rev_df.pivot_table(
                index="user_handle", columns="cooler_id", values="rating", aggfunc="mean"
            ).fillna(0)

            matrix_col_ids   = [int(c) for c in user_item.columns]
            item_sim_raw     = cosine_similarity(user_item.T.values).astype(np.float32)

            # Map back to full cooler_ids index
            item_sim_matrix  = np.zeros((len(cooler_ids), len(cooler_ids)), dtype=np.float32)
            for j, mc_id in enumerate(matrix_col_ids):
                ci = cooler_id_to_i.get(mc_id)
                if ci is None:
                    continue
                for k, mc_id2 in enumerate(matrix_col_ids):
                    ck = cooler_id_to_i.get(mc_id2)
                    if ck is not None:
                        item_sim_matrix[ci, ck] = item_sim_raw[j, k]

        # ── 5. Persist artefacts ─────────────────────────────────────────────
        os.makedirs(os.path.join(_ML_DIR, "model_artefacts"), exist_ok=True)
        artefacts = {
            "cooler_ids":         cooler_ids,
            "cooler_id_to_i":     cooler_id_to_i,
            "content_sim_matrix": content_sim_matrix.tolist(),
            "item_sim_matrix":    item_sim_matrix.tolist(),
            "matrix_col_ids":     matrix_col_ids,
            "feature_cols":       feature_cols,
            "metadata": {
                "n_coolers":  len(cooler_ids),
                "n_ratings":  len(reviews),
                "model_type": "hybrid_content_collaborative",
                "alpha":      0.6,
                "beta":       0.4,
            },
        }
        with open(_MODEL_PKL, "wb") as f:
            pickle.dump(artefacts, f)
        with open(os.path.join(_ML_DIR, "model_artefacts", "metadata.json"), "w") as f:
            json.dump(artefacts["metadata"], f, indent=2)

        # ── 6. Hot-reload ────────────────────────────────────────────────────
        self.load()
        self.warm_product_lookup()

        elapsed = round(time.time() - t0, 2)
        log.info(f"ENGINE B — Retrain complete in {elapsed}s")
        return {
            "status":    "retrained",
            "n_coolers": len(cooler_ids),
            "n_ratings": len(reviews),
            "elapsed_s": elapsed,
        }


# ── Instantiate both engines ─────────────────────────────────────────────────
engine = FlavourEngine()
hybrid = HybridEngine()


# ── Lifespan ─────────────────────────────────────────────────────────────────
@asynccontextmanager
async def lifespan(app: FastAPI):
    # Engine A — semantic
    engine.load_model()
    try:
        engine.warm()
    except Exception as e:
        log.warning(f"ENGINE A — Could not warm on startup: {e}")

    # Engine B — hybrid
    if hybrid.load():
        hybrid.warm_product_lookup()
    yield


# ── App ───────────────────────────────────────────────────────────────────────
app = FastAPI(
    title="CRACKED Flavour Recommendation API",
    version="2.0.0",
    description="Dual-engine RTD recommendation: semantic (SentenceTransformer) + hybrid ML (content × collaborative)",
    lifespan=lifespan,
)

_raw_origins   = os.environ.get("ALLOWED_ORIGINS", "http://localhost:3000")
_allowed_origins = [o.strip() for o in _raw_origins.split(",") if o.strip()]

app.add_middleware(
    CORSMiddleware,
    allow_origins=_allowed_origins,
    allow_credentials=False,
    allow_methods=["GET", "POST"],
    allow_headers=["Content-Type"],
)


# ── Schemas ───────────────────────────────────────────────────────────────────
class RecommendRequest(BaseModel):
    product_id: Optional[int]   = Field(None, description="Recommend by product ID (semantic engine)")
    query:      Optional[str]   = Field(None, description="Recommend by free-text query")
    limit:      int             = Field(5,    ge=1, le=50)
    threshold:  float           = Field(0.4,  ge=0.0, le=1.0)

class HybridRecommendRequest(BaseModel):
    product_id: int             = Field(..., description="Source product ID")
    limit:      int             = Field(5,   ge=1, le=50)
    threshold:  float           = Field(0.3, ge=0.0, le=1.0)
    alpha:      float           = Field(0.6, ge=0.0, le=1.0, description="Weight for content similarity")
    beta:       float           = Field(0.4, ge=0.0, le=1.0, description="Weight for collaborative similarity")


# ── Routes ────────────────────────────────────────────────────────────────────

@app.get("/", tags=["meta"])
def root():
    return {
        "api":     "CRACKED Flavour Recommendation API",
        "version": "2.0.0",
        "engines": {
            "semantic": {
                "model":    "all-MiniLM-L6-v2",
                "products": len(engine.products),
                "ready":    engine.ready,
            },
            "hybrid": {
                "model":    "content+collaborative",
                "coolers":  len(hybrid.cooler_ids),
                "ratings":  hybrid.metadata.get("n_ratings", 0),
                "ready":    hybrid.ready,
                "alpha":    hybrid.metadata.get("alpha", 0.6),
                "beta":     hybrid.metadata.get("beta", 0.4),
            },
        },
    }


@app.get("/health", tags=["meta"])
def health():
    return {
        "ok":               engine.ready or hybrid.ready,
        "semantic_ready":   engine.ready,
        "semantic_products": len(engine.products),
        "hybrid_ready":     hybrid.ready,
        "hybrid_coolers":   len(hybrid.cooler_ids),
        "hybrid_ratings":   hybrid.metadata.get("n_ratings", 0),
    }


# ── Semantic engine ───────────────────────────────────────────────────────────

@app.post("/recommend", tags=["semantic"])
def recommend_post(req: RecommendRequest):
    """Semantic recommendations via SentenceTransformer cosine similarity."""
    if not engine.ready:
        raise HTTPException(503, "Semantic engine warming up — try again shortly")
    if req.product_id is not None:
        try:
            results = engine.recommend(req.product_id, n=req.limit, threshold=req.threshold)
        except ValueError as e:
            raise HTTPException(404, str(e))
    elif req.query:
        results = engine.recommend_by_text(req.query, n=req.limit, threshold=req.threshold)
    else:
        raise HTTPException(400, "Provide product_id or query")
    return {"results": results, "engine": "semantic", "model": "all-MiniLM-L6-v2"}


@app.get("/recommend", tags=["semantic"])
def recommend_get(
    product_id: Optional[int] = Query(None),
    query:      Optional[str] = Query(None),
    n:          int           = Query(5),
    threshold:  float         = Query(0.4),
):
    """GET convenience wrapper for the semantic engine."""
    return recommend_post(RecommendRequest(product_id=product_id, query=query, limit=n, threshold=threshold))


# ── Hybrid engine ─────────────────────────────────────────────────────────────

@app.post("/recommend/hybrid", tags=["hybrid"])
def recommend_hybrid_post(req: HybridRecommendRequest):
    """
    Hybrid recommendations: α × content_similarity + β × item_collaborative_similarity.
    Requires a product_id. Returns hybrid_score, content_score, and collab_score per result.
    """
    if not hybrid.ready:
        raise HTTPException(
            503,
            "Hybrid engine not ready — run POST /hybrid/retrain to build the model, "
            "or ensure ml/model_artefacts/model.pkl exists."
        )
    try:
        results = hybrid.recommend(
            req.product_id,
            n=req.limit,
            alpha=req.alpha,
            beta=req.beta,
            threshold=req.threshold,
        )
    except ValueError as e:
        raise HTTPException(404, str(e))
    return {
        "results": results,
        "engine":  "hybrid",
        "alpha":   req.alpha,
        "beta":    req.beta,
        "source_product_id": req.product_id,
    }


@app.get("/recommend/hybrid", tags=["hybrid"])
def recommend_hybrid_get(
    product_id: int   = Query(...),
    n:          int   = Query(5),
    alpha:      float = Query(0.6),
    beta:       float = Query(0.4),
    threshold:  float = Query(0.3),
):
    """GET convenience wrapper for the hybrid engine."""
    return recommend_hybrid_post(
        HybridRecommendRequest(
            product_id=product_id, limit=n, alpha=alpha, beta=beta, threshold=threshold
        )
    )


@app.post("/hybrid/retrain", tags=["hybrid"])
def retrain_hybrid(background_tasks: BackgroundTasks):
    """
    Pulls live product + review data from Supabase, rebuilds the hybrid model
    (preprocessing + cosine similarity matrices), and hot-reloads into memory.
    Runs in the background — check GET /health for readiness.
    """
    if not hybrid.ready and not os.path.exists(_MODEL_PKL):
        # First-time build: run synchronously so we can return the result
        try:
            result = hybrid.retrain()
            return {**result, "mode": "sync"}
        except Exception as e:
            raise HTTPException(500, f"Retrain failed: {e}")

    # Incremental rebuild: run in background so the request returns immediately
    def _bg_retrain():
        try:
            hybrid.retrain()
        except Exception as e:
            log.error(f"ENGINE B — Background retrain failed: {e}")

    background_tasks.add_task(_bg_retrain)
    return {
        "status":  "retrain_started",
        "message": "Hybrid model rebuilding in background. Check GET /health for 'hybrid_ready: true'.",
    }


# ── Embed (re-generate pgvector embeddings) ───────────────────────────────────

@app.post("/embed", tags=["semantic"])
def embed_all():
    """
    Re-generates SentenceTransformer embeddings for all products and stores
    them in Supabase pgvector. Requires migration 002_add_pgvector.sql.
    """
    if not engine.model:
        raise HTTPException(503, "Semantic model not loaded")

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

    engine.warm()
    return {"embedded": updated, "status": "done"}


if __name__ == "__main__":
    import uvicorn
    port = int(os.environ.get("PORT", 8000))
    uvicorn.run("api.main:app", host="0.0.0.0", port=port, reload=False)
