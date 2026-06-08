"""
CRACKED — Step 2: Data Preprocessing & Merging Datasets
=========================================================
Merges user_ratings_df with coolers_df on cooler_id, engineers features,
and outputs a clean merged dataset ready for model training.

Usage:
    python ml/02_preprocessing.py

Outputs:
    ml/merged_dataset.csv        — merged cooler + rating features
    ml/user_item_matrix.csv      — user × cooler rating pivot (for collab filtering)
    ml/content_features.csv      — one-hot + numeric features (for content-based)
"""

import os
import pandas as pd
import numpy as np
from sklearn.preprocessing import LabelEncoder, MinMaxScaler

OUT_DIR = os.path.dirname(os.path.abspath(__file__))


# ══════════════════════════════════════════════════════════════════════════════
# 1. LOAD DATASETS
# ══════════════════════════════════════════════════════════════════════════════
print("\n── Step 1: Load Datasets ─────────────────────────────")

coolers_path     = os.path.join(OUT_DIR, "coolers.csv")
user_ratings_path = os.path.join(OUT_DIR, "user_ratings.csv")

coolers_df     = pd.read_csv(coolers_path)
user_ratings_df = pd.read_csv(user_ratings_path)

print(f"  coolers_df:      {coolers_df.shape[0]} rows × {coolers_df.shape[1]} cols")
print(f"  user_ratings_df: {user_ratings_df.shape[0]} rows × {user_ratings_df.shape[1]} cols")
print("\ncoolers_df sample:")
print(coolers_df[["cooler_id", "name", "brand_name", "normalized_category", "abv", "price_dollars"]].head())
print("\nuser_ratings_df sample:")
print(user_ratings_df[["rating_id", "cooler_id", "user_handle", "rating"]].head())


# ══════════════════════════════════════════════════════════════════════════════
# 2. MERGE DATASETS (left merge on cooler_id)
# ══════════════════════════════════════════════════════════════════════════════
print("\n── Step 2: Merge Datasets ────────────────────────────")

# Left merge: keep all ratings, attach cooler features
merged_df = user_ratings_df.merge(
    coolers_df,
    how="left",
    on="cooler_id",
    suffixes=("_rating", "_cooler")
)

print(f"  merged_df shape: {merged_df.shape[0]} rows × {merged_df.shape[1]} cols")
print(f"  Ratings with matched cooler: {merged_df['name'].notna().sum()} / {len(merged_df)}")
print("\nMerged sample (key columns):")
print(merged_df[[
    "cooler_id", "name", "brand_name", "normalized_category",
    "abv", "price_dollars", "user_handle", "rating"
]].head(8).to_string(index=False))


# ══════════════════════════════════════════════════════════════════════════════
# 3. MISSING VALUES
# ══════════════════════════════════════════════════════════════════════════════
print("\n── Step 3: Handle Missing Values ─────────────────────")

print("Before cleaning:")
print(merged_df[["abv", "price_dollars", "review_body"]].isnull().sum())

# Fill ABV with category median
category_abv_medians = coolers_df.groupby("normalized_category")["abv"].median()
print(f"\nCategory ABV medians:\n{category_abv_medians.to_string()}")

def fill_abv(row):
    if pd.isna(row["abv"]):
        return category_abv_medians.get(row["normalized_category"], 5.0)
    return row["abv"]

merged_df["abv"] = merged_df.apply(fill_abv, axis=1)
coolers_df["abv"] = coolers_df.apply(fill_abv, axis=1)

# Fill missing price with category mean
category_price_means = coolers_df.groupby("normalized_category")["price_dollars"].mean()
merged_df["price_dollars"] = merged_df.groupby("normalized_category")["price_dollars"].transform(
    lambda x: x.fillna(x.mean())
)

# Fill review_body NaN with empty string
merged_df["review_body"] = merged_df["review_body"].fillna("")

print("\nAfter cleaning:")
print(merged_df[["abv", "price_dollars", "review_body"]].isnull().sum())


# ══════════════════════════════════════════════════════════════════════════════
# 4. FEATURE ENGINEERING
# ══════════════════════════════════════════════════════════════════════════════
print("\n── Step 4: Feature Engineering ───────────────────────")

# 4a. Encode category as integer (for tree-based models)
le = LabelEncoder()
merged_df["category_code"] = le.fit_transform(merged_df["normalized_category"])
coolers_df["category_code"] = le.transform(coolers_df["normalized_category"])
print(f"  Category mapping: {dict(zip(le.classes_, le.transform(le.classes_)))}")

# 4b. One-hot encode category (for linear/cosine models)
category_dummies = pd.get_dummies(merged_df["normalized_category"], prefix="cat")
merged_df = pd.concat([merged_df, category_dummies], axis=1)

# 4c. Price tier (budget / mid / premium)
def price_tier(p):
    if pd.isna(p):
        return "unknown"
    if p < 3.00:
        return "budget"
    elif p < 4.00:
        return "mid"
    else:
        return "premium"

merged_df["price_tier"] = merged_df["price_dollars"].apply(price_tier)
coolers_df["price_tier"] = coolers_df["price_dollars"].apply(price_tier)

# 4d. ABV tier (session / light / standard / strong)
def abv_tier(a):
    if pd.isna(a):
        return "unknown"
    if a <= 3.0:
        return "session"
    elif a <= 4.5:
        return "light"
    elif a <= 6.0:
        return "standard"
    else:
        return "strong"

merged_df["abv_tier"]  = merged_df["abv"].apply(abv_tier)
coolers_df["abv_tier"] = coolers_df["abv"].apply(abv_tier)

# 4e. Normalise numeric features to [0, 1] for distance models
scaler = MinMaxScaler()
merged_df[["abv_norm", "price_norm"]] = scaler.fit_transform(
    merged_df[["abv", "price_dollars"]].fillna(0)
)

# 4f. User-level aggregate stats
user_stats = merged_df.groupby("user_handle")["rating"].agg(
    user_mean_rating="mean",
    user_rating_count="count",
    user_rating_std="std"
).reset_index()
user_stats["user_rating_std"] = user_stats["user_rating_std"].fillna(0)
merged_df = merged_df.merge(user_stats, on="user_handle", how="left")

# 4g. Cooler-level aggregate stats (from user ratings)
cooler_stats = merged_df.groupby("cooler_id")["rating"].agg(
    avg_rating="mean",
    rating_count="count",
).reset_index()
merged_df = merged_df.merge(cooler_stats, on="cooler_id", how="left")

print(f"  New features added: category_code, price_tier, abv_tier, abv_norm, price_norm, user stats, cooler stats")
print(f"  Final merged_df shape: {merged_df.shape}")


# ══════════════════════════════════════════════════════════════════════════════
# 5. RATING DISTRIBUTION ANALYSIS
# ══════════════════════════════════════════════════════════════════════════════
print("\n── Step 5: Rating Distribution ───────────────────────")
print(merged_df["rating"].value_counts().sort_index().to_string())
print(f"\n  Mean rating:   {merged_df['rating'].mean():.2f}")
print(f"  Median rating: {merged_df['rating'].median():.1f}")
print(f"  Unique users:  {merged_df['user_handle'].nunique()}")
print(f"  Unique coolers rated: {merged_df['cooler_id'].nunique()} / {len(coolers_df)}")

print("\nTop 10 rated coolers:")
top_rated = cooler_stats.sort_values("avg_rating", ascending=False).head(10)
top_rated = top_rated.merge(coolers_df[["cooler_id","name","brand_name","normalized_category"]], on="cooler_id")
print(top_rated[["name","brand_name","normalized_category","avg_rating","rating_count"]].to_string(index=False))


# ══════════════════════════════════════════════════════════════════════════════
# 6. USER-ITEM MATRIX (for collaborative filtering)
# ══════════════════════════════════════════════════════════════════════════════
print("\n── Step 6: User-Item Matrix ───────────────────────────")

user_item_matrix = merged_df.pivot_table(
    index="user_handle",
    columns="cooler_id",
    values="rating",
    aggfunc="mean"
)
print(f"  Shape: {user_item_matrix.shape}  ({user_item_matrix.notna().sum().sum()} non-null ratings)")
print(f"  Sparsity: {100 * (1 - user_item_matrix.notna().sum().sum() / user_item_matrix.size):.1f}%")
print(user_item_matrix.iloc[:5, :8].to_string())


# ══════════════════════════════════════════════════════════════════════════════
# 7. CONTENT FEATURES MATRIX (for content-based filtering)
# ══════════════════════════════════════════════════════════════════════════════
print("\n── Step 7: Content Features ───────────────────────────")

# Build per-cooler feature matrix (no user dimension)
cat_dummies_coolers = pd.get_dummies(coolers_df["normalized_category"], prefix="cat")
content_features_df = pd.concat([
    coolers_df[["cooler_id", "name", "brand_name", "abv_norm" if "abv_norm" in coolers_df.columns else "abv",
                "price_tier", "abv_tier", "category_code"]].copy(),
    cat_dummies_coolers,
], axis=1)

# Normalise abv and price for content features
coolers_scaler = MinMaxScaler()
content_features_df[["abv_norm", "price_norm"]] = coolers_scaler.fit_transform(
    coolers_df[["abv", "price_dollars"]].fillna(0)
)

print(f"  Content feature matrix: {content_features_df.shape}")
print(content_features_df.head(5).to_string(index=False))


# ══════════════════════════════════════════════════════════════════════════════
# 8. SAVE OUTPUTS
# ══════════════════════════════════════════════════════════════════════════════
print("\n── Step 8: Save Outputs ───────────────────────────────")

merged_out = os.path.join(OUT_DIR, "merged_dataset.csv")
matrix_out = os.path.join(OUT_DIR, "user_item_matrix.csv")
content_out = os.path.join(OUT_DIR, "content_features.csv")

merged_df.to_csv(merged_out, index=False)
user_item_matrix.to_csv(matrix_out)
content_features_df.to_csv(content_out, index=False)

print(f"  ✓ merged_dataset.csv   → {merged_df.shape[0]} rows")
print(f"  ✓ user_item_matrix.csv → {user_item_matrix.shape}")
print(f"  ✓ content_features.csv → {content_features_df.shape[0]} rows")
print("\nRun ml/03_model.py to train the recommendation model.\n")
