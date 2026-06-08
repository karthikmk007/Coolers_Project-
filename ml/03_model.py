"""
CRACKED — Step 3: Recommendation Model Training
=================================================
Three complementary approaches:

  A) Content-Based Filtering   — cosine similarity on cooler features
  B) Collaborative Filtering   — user-item matrix with cosine similarity
  C) Hybrid Model              — weighted blend of A + B

Usage:
    python ml/03_model.py

The trained model state is saved to ml/model_artefacts/ for use
in the FastAPI recommendation API (api/main.py).
"""

import os
import json
import pickle
import numpy as np
import pandas as pd
from sklearn.metrics.pairwise import cosine_similarity
from sklearn.preprocessing import MinMaxScaler
from sklearn.model_selection import KFold

OUT_DIR       = os.path.dirname(os.path.abspath(__file__))
ARTEFACT_DIR  = os.path.join(OUT_DIR, "model_artefacts")
os.makedirs(ARTEFACT_DIR, exist_ok=True)


# ══════════════════════════════════════════════════════════════════════════════
# LOAD PRE-PROCESSED DATA
# ══════════════════════════════════════════════════════════════════════════════
print("\n── Load Data ─────────────────────────────────────────")

merged_df        = pd.read_csv(os.path.join(OUT_DIR, "merged_dataset.csv"))
user_item_matrix = pd.read_csv(os.path.join(OUT_DIR, "user_item_matrix.csv"), index_col=0)
content_df       = pd.read_csv(os.path.join(OUT_DIR, "content_features.csv"))

print(f"  merged_df:        {merged_df.shape}")
print(f"  user_item_matrix: {user_item_matrix.shape}")
print(f"  content_df:       {content_df.shape}")

# ── Numeric feature columns for content model
FEATURE_COLS = [c for c in content_df.columns if c.startswith("cat_")] + ["abv_norm", "price_norm"]
print(f"  Content feature cols: {FEATURE_COLS}")


# ══════════════════════════════════════════════════════════════════════════════
# A) CONTENT-BASED FILTERING
# ══════════════════════════════════════════════════════════════════════════════
print("\n── Model A: Content-Based Filtering ──────────────────")

X_content = content_df[FEATURE_COLS].fillna(0).values   # (n_coolers, n_features)
content_sim_matrix = cosine_similarity(X_content)        # (n_coolers, n_coolers)

cooler_ids     = content_df["cooler_id"].tolist()
cooler_id_to_i = {cid: i for i, cid in enumerate(cooler_ids)}

print(f"  Similarity matrix: {content_sim_matrix.shape}  min={content_sim_matrix.min():.3f}  max={content_sim_matrix.max():.3f}")

def recommend_content(cooler_id: int, n: int = 5) -> pd.DataFrame:
    """Return top-n most content-similar coolers (excluding itself)."""
    if cooler_id not in cooler_id_to_i:
        raise ValueError(f"cooler_id {cooler_id} not in catalogue")
    idx  = cooler_id_to_i[cooler_id]
    sims = content_sim_matrix[idx].copy()
    sims[idx] = -1  # exclude self
    top_n_idx = np.argsort(sims)[::-1][:n]
    recs = []
    for i in top_n_idx:
        cid = cooler_ids[i]
        row = content_df[content_df["cooler_id"] == cid].iloc[0]
        recs.append({
            "cooler_id":           cid,
            "name":                row["name"],
            "brand_name":          row["brand_name"],
            "normalized_category": content_df[content_df["cooler_id"] == cid]["normalized_category"].values[0]
            if "normalized_category" in content_df.columns else "—",
            "similarity_content":  round(float(sims[i]), 4),
        })
    return pd.DataFrame(recs)

# Quick test
test_id = cooler_ids[0]
print(f"\n  Content recs for cooler_id={test_id} ({content_df[content_df['cooler_id']==test_id]['name'].values[0]}):")
print(recommend_content(test_id, n=5).to_string(index=False))


# ══════════════════════════════════════════════════════════════════════════════
# B) COLLABORATIVE FILTERING (User-User cosine similarity)
# ══════════════════════════════════════════════════════════════════════════════
print("\n── Model B: Collaborative Filtering ──────────────────")

# Fill NaN with 0 (means "no rating") for similarity computation
matrix_filled = user_item_matrix.fillna(0).values          # (n_users, n_coolers)
user_sim_matrix = cosine_similarity(matrix_filled)          # (n_users, n_users)

user_ids     = list(user_item_matrix.index)
user_id_to_i = {u: i for i, u in enumerate(user_ids)}

print(f"  User similarity matrix: {user_sim_matrix.shape}")

def recommend_collaborative(user_handle: str, n: int = 5) -> pd.DataFrame:
    """
    For a given user, find the K most similar users, then recommend
    coolers they rated highly that the target user hasn't rated yet.
    """
    if user_handle not in user_id_to_i:
        raise ValueError(f"Unknown user: {user_handle}")

    K = min(5, len(user_ids) - 1)   # k nearest neighbours
    u_idx = user_id_to_i[user_handle]
    sims  = user_sim_matrix[u_idx].copy()
    sims[u_idx] = -1

    top_k_users = np.argsort(sims)[::-1][:K]
    user_already_rated = set(
        user_item_matrix.columns[user_item_matrix.iloc[u_idx].notna()].tolist()
    )

    # Weighted sum of ratings from similar users
    score = np.zeros(len(user_item_matrix.columns))
    weight_sum = np.zeros(len(user_item_matrix.columns))
    for k_idx in top_k_users:
        w = sims[k_idx]
        if w <= 0:
            continue
        ratings_k = user_item_matrix.iloc[k_idx].fillna(0).values
        score     += w * ratings_k
        weight_sum += w * (user_item_matrix.iloc[k_idx].notna().values.astype(float))

    with np.errstate(divide="ignore", invalid="ignore"):
        predicted = np.where(weight_sum > 0, score / weight_sum, 0)

    # Rank unrated coolers
    recs = []
    for i, col in enumerate(user_item_matrix.columns):
        if col in user_already_rated:
            continue
        recs.append({"cooler_id": col, "predicted_rating": round(float(predicted[i]), 3)})

    recs_df = pd.DataFrame(recs).sort_values("predicted_rating", ascending=False).head(n)
    recs_df["cooler_id"] = recs_df["cooler_id"].astype(int)
    recs_df = recs_df.merge(
        content_df[["cooler_id", "name", "brand_name"]],
        on="cooler_id", how="left"
    )
    return recs_df

# Quick test
test_user = user_ids[0]
print(f"\n  Collaborative recs for user '{test_user}':")
try:
    print(recommend_collaborative(test_user, n=5).to_string(index=False))
except Exception as e:
    print(f"  (skipped: {e})")


# ══════════════════════════════════════════════════════════════════════════════
# C) HYBRID MODEL — Weighted Blend
# ══════════════════════════════════════════════════════════════════════════════
print("\n── Model C: Hybrid (Content + Collaborative) ─────────")

# Normalise user-item matrix for item-based cosine similarity
matrix_norm = user_item_matrix.fillna(0)
item_sim_matrix = cosine_similarity(matrix_norm.T)              # (n_coolers, n_coolers)

# Map cooler_ids in matrix columns back to content index
matrix_col_ids = [int(c) for c in user_item_matrix.columns]
matrix_col_to_content_idx = {cid: cooler_id_to_i.get(cid, None) for cid in matrix_col_ids}

def recommend_hybrid(
    cooler_id: int,
    n: int = 5,
    alpha: float = 0.6,   # weight for content-based
    beta: float = 0.4,    # weight for collaborative (item-based)
) -> pd.DataFrame:
    """
    alpha × content_similarity + beta × item_collaborative_similarity
    """
    if cooler_id not in cooler_id_to_i:
        raise ValueError(f"cooler_id {cooler_id} not found in content features")

    # Content scores
    c_idx = cooler_id_to_i[cooler_id]
    content_scores = content_sim_matrix[c_idx].copy()  # indexed by cooler_ids list

    # Collaborative (item-based) scores
    collab_scores_raw  = np.zeros(len(cooler_ids))
    if cooler_id in matrix_col_ids:
        m_idx = matrix_col_ids.index(cooler_id)
        item_sims = item_sim_matrix[m_idx]                 # (n_matrix_cols,)
        for j, mc_id in enumerate(matrix_col_ids):
            c_i = cooler_id_to_i.get(mc_id)
            if c_i is not None:
                collab_scores_raw[c_i] = item_sims[j]

    # Blend
    hybrid_scores = alpha * content_scores + beta * collab_scores_raw
    hybrid_scores[c_idx] = -1  # exclude self

    top_n_idx = np.argsort(hybrid_scores)[::-1][:n]
    recs = []
    for i in top_n_idx:
        cid  = cooler_ids[i]
        row  = content_df[content_df["cooler_id"] == cid].iloc[0]
        cat  = content_df[content_df["cooler_id"] == cid]["normalized_category"].values[0] \
               if "normalized_category" in content_df.columns else "—"
        recs.append({
            "cooler_id":           cid,
            "name":                row["name"],
            "brand_name":          row["brand_name"],
            "normalized_category": cat,
            "hybrid_score":        round(float(hybrid_scores[i]), 4),
            "content_score":       round(float(content_scores[i]), 4),
            "collab_score":        round(float(collab_scores_raw[i]), 4),
        })
    return pd.DataFrame(recs)

test_id = cooler_ids[0]
print(f"\n  Hybrid recs for cooler_id={test_id} ({content_df[content_df['cooler_id']==test_id]['name'].values[0]}):")
print(recommend_hybrid(test_id, n=5).to_string(index=False))


# ══════════════════════════════════════════════════════════════════════════════
# D) MODEL EVALUATION — Leave-One-Out cross-validation
# ══════════════════════════════════════════════════════════════════════════════
print("\n── Model Evaluation (Leave-One-Out) ──────────────────")

ratings = merged_df[["user_handle", "cooler_id", "rating"]].dropna()
kf      = KFold(n_splits=5, shuffle=True, random_state=42)

errors = []
for fold, (train_idx, test_idx) in enumerate(kf.split(ratings)):
    train = ratings.iloc[train_idx]
    test  = ratings.iloc[test_idx]

    # Build train matrix
    fold_matrix = train.pivot_table(
        index="user_handle", columns="cooler_id", values="rating", aggfunc="mean"
    ).fillna(0)

    # Predict: use item mean from train as baseline
    item_means = train.groupby("cooler_id")["rating"].mean()
    global_mean = train["rating"].mean()

    preds, actuals = [], []
    for _, row in test.iterrows():
        pred = item_means.get(row["cooler_id"], global_mean)
        preds.append(pred)
        actuals.append(row["rating"])

    mae  = np.mean(np.abs(np.array(preds) - np.array(actuals)))
    rmse = np.sqrt(np.mean((np.array(preds) - np.array(actuals)) ** 2))
    errors.append({"fold": fold + 1, "mae": mae, "rmse": rmse})

eval_df = pd.DataFrame(errors)
print(eval_df.to_string(index=False))
print(f"\n  Mean MAE:  {eval_df['mae'].mean():.4f}")
print(f"  Mean RMSE: {eval_df['rmse'].mean():.4f}")


# ══════════════════════════════════════════════════════════════════════════════
# E) SAVE MODEL ARTEFACTS
# ══════════════════════════════════════════════════════════════════════════════
print("\n── Save Model Artefacts ──────────────────────────────")

artefacts = {
    "cooler_ids":          cooler_ids,
    "cooler_id_to_i":      cooler_id_to_i,
    "content_sim_matrix":  content_sim_matrix.tolist(),
    "item_sim_matrix":     item_sim_matrix.tolist(),
    "matrix_col_ids":      matrix_col_ids,
    "feature_cols":        FEATURE_COLS,
    "metadata": {
        "n_coolers":  len(cooler_ids),
        "n_users":    len(user_ids),
        "n_ratings":  len(ratings),
        "model_type": "hybrid_content_collaborative",
        "alpha":      0.6,
        "beta":       0.4,
    }
}

with open(os.path.join(ARTEFACT_DIR, "model.pkl"), "wb") as f:
    pickle.dump(artefacts, f)

with open(os.path.join(ARTEFACT_DIR, "metadata.json"), "w") as f:
    json.dump(artefacts["metadata"], f, indent=2)

content_df.to_csv(os.path.join(ARTEFACT_DIR, "content_features.csv"), index=False)

print(f"  ✓ model.pkl      saved to {ARTEFACT_DIR}")
print(f"  ✓ metadata.json  saved")
print(f"  ✓ content_features.csv saved")
print("\nTraining complete. The hybrid model is ready.\n")
print("To wire this into the FastAPI API (api/main.py), load model.pkl on startup")
print("and route /recommend requests through recommend_hybrid().\n")
