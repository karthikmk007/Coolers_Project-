/**
 * CRACKED v3 — Supabase TypeScript types
 * Generated from the v3.0 schema (005_discover_products.sql + master schema)
 * Re-run: npx supabase gen types typescript --linked > src/lib/supabase/types.ts
 */

export type Json =
  | string
  | number
  | boolean
  | null
  | { [key: string]: Json | undefined }
  | Json[];

// ── Row types ─────────────────────────────────────────────────

export interface Product {
  id:                string;
  lcbo_id:           string;
  brand:             string;
  name:              string;
  style:             string | null;
  abv:               number | null;
  region:            string | null;
  country:           string | null;
  price:             number | null;
  image_url:         string | null;
  thumbnail_url:     string | null;
  description:       string | null;
  tags:              string[];
  taste_sweet:       number;
  taste_bold:        number;
  taste_carb:        number;
  flavor_notes:      string[];
  pairs_with:        string[];
  is_lcbo_exclusive: boolean;
  created_at:        string;
  updated_at:        string;
}

export interface Rating {
  id:               string;
  user_id:          string | null;
  product_id:       string;
  score:            number;
  review_text:      string | null;
  flavor_tags:      string[];
  taste_sweet_user: number | null;
  taste_bold_user:  number | null;
  taste_carb_user:  number | null;
  helpful_count:    number;
  created_at:       string;
}

export interface Profile {
  id:               string;
  username:         string | null;
  display_name:     string | null;
  avatar_url:       string | null;
  is_pro:           boolean;
  taste_sweet_pref: number;
  taste_bold_pref:  number;
  taste_carb_pref:  number;
  favorite_styles:  string[];
  followers_count:  number;
  following_count:  number;
  ratings_count:    number;
  created_at:       string;
}

export interface Wishlist {
  user_id:    string;
  product_id: string;
  added_at:   string;
}

export interface ProductStats {
  product_id:   string;
  rating_count: number;
  avg_score:    number | null;
  count_5:      number;
  count_4:      number;
  count_3:      number;
  count_2:      number;
  count_1:      number;
}

// ── Joined types (common query shapes) ───────────────────────

export type ProductWithStats = Product & {
  product_stats: ProductStats | null;
};

export type RatingWithProfile = Rating & {
  profiles: Pick<Profile, "username" | "display_name" | "avatar_url" | "is_pro"> | null;
};

// ── Supabase Database interface ───────────────────────────────

export interface Database {
  public: {
    Tables: {
      products: {
        Row:    Product;
        Insert: Omit<Product, "id" | "created_at" | "updated_at"> & { id?: string };
        Update: Partial<Omit<Product, "id">>;
        Relationships: [];
      };
      ratings: {
        Row:    Rating;
        Insert: Omit<Rating, "id" | "created_at" | "helpful_count"> & { id?: string };
        Update: Partial<Omit<Rating, "id" | "user_id" | "product_id">>;
        Relationships: [
          { foreignKeyName: "ratings_product_id_fkey"; columns: ["product_id"]; isOneToOne: false; referencedRelation: "products"; referencedColumns: ["id"] },
          { foreignKeyName: "ratings_user_id_fkey";    columns: ["user_id"];    isOneToOne: false; referencedRelation: "users";    referencedColumns: ["id"] }
        ];
      };
      profiles: {
        Row:    Profile;
        Insert: Partial<Profile> & { id: string };
        Update: Partial<Omit<Profile, "id">>;
        Relationships: [
          { foreignKeyName: "profiles_id_fkey"; columns: ["id"]; isOneToOne: true; referencedRelation: "users"; referencedColumns: ["id"] }
        ];
      };
      wishlists: {
        Row:    Wishlist;
        Insert: Omit<Wishlist, "added_at"> & { added_at?: string };
        Update: never;
        Relationships: [
          { foreignKeyName: "wishlists_product_id_fkey"; columns: ["product_id"]; isOneToOne: false; referencedRelation: "products"; referencedColumns: ["id"] },
          { foreignKeyName: "wishlists_user_id_fkey";    columns: ["user_id"];    isOneToOne: false; referencedRelation: "users";    referencedColumns: ["id"] }
        ];
      };
    };
    Views: {
      product_stats: {
        Row: ProductStats;
      };
    };
    Functions:  Record<string, never>;
    Enums:      Record<string, never>;
  };
}
