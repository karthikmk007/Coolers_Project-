/* Auto-generated types matching the Supabase schema.
   Run `npx supabase gen types typescript` after schema changes to refresh. */

export type Json =
  | string
  | number
  | boolean
  | null
  | { [key: string]: Json | undefined }
  | Json[];

export type NormalizedCategory =
  | "hard_seltzer"
  | "cooler"
  | "cider"
  | "radler"
  | "other";

export interface Database {
  public: {
    Tables: {
      brand: {
        Row: {
          id: number;
          name: string;
          created_at: string;
        };
        Insert: {
          id?: number;
          name: string;
          created_at?: string;
        };
        Update: {
          id?: number;
          name?: string;
        };
        Relationships: [];
      };

      product: {
        Row: {
          id: number;
          name: string;
          brand_id: number;
          normalized_category: NormalizedCategory;
          abv: number | null;
          price_cents: number | null;
          image_url: string | null;
          lcbo_id: string | null;
          created_at: string;
          updated_at: string;
        };
        Insert: {
          id?: number;
          name: string;
          brand_id: number;
          normalized_category: NormalizedCategory;
          abv?: number | null;
          price_cents?: number | null;
          image_url?: string | null;
          lcbo_id?: string | null;
          created_at?: string;
          updated_at?: string;
        };
        Update: {
          id?: number;
          name?: string;
          brand_id?: number;
          normalized_category?: NormalizedCategory;
          abv?: number | null;
          price_cents?: number | null;
          image_url?: string | null;
          lcbo_id?: string | null;
          updated_at?: string;
        };
        Relationships: [
          {
            foreignKeyName: "product_brand_id_fkey";
            columns: ["brand_id"];
            isOneToOne: false;
            referencedRelation: "brand";
            referencedColumns: ["id"];
          }
        ];
      };

      scrape_run: {
        Row: {
          id: number;
          started_at: string;
          finished_at: string | null;
          status: "running" | "success" | "failed";
          products_upserted: number;
          products_skipped: number;
          error_message: string | null;
        };
        Insert: {
          id?: number;
          started_at?: string;
          finished_at?: string | null;
          status: "running" | "success" | "failed";
          products_upserted?: number;
          products_skipped?: number;
          error_message?: string | null;
        };
        Update: {
          finished_at?: string | null;
          status?: "running" | "success" | "failed";
          products_upserted?: number;
          products_skipped?: number;
          error_message?: string | null;
        };
        Relationships: [];
      };

      products: {
        Row: {
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
        };
        Insert: {
          id?:                string;
          lcbo_id:            string;
          brand:              string;
          name:               string;
          style?:             string | null;
          abv?:               number | null;
          region?:            string | null;
          country?:           string | null;
          price?:             number | null;
          image_url?:         string | null;
          thumbnail_url?:     string | null;
          description?:       string | null;
          tags?:              string[];
          taste_sweet?:       number;
          taste_bold?:        number;
          taste_carb?:        number;
          flavor_notes?:      string[];
          pairs_with?:        string[];
          is_lcbo_exclusive?: boolean;
          created_at?:        string;
          updated_at?:        string;
        };
        Update: {
          lcbo_id?:           string;
          brand?:             string;
          name?:              string;
          style?:             string | null;
          abv?:               number | null;
          price?:             number | null;
          image_url?:         string | null;
          thumbnail_url?:     string | null;
          tags?:              string[];
          taste_sweet?:       number;
          taste_bold?:        number;
          taste_carb?:        number;
          flavor_notes?:      string[];
          pairs_with?:        string[];
          updated_at?:        string;
        };
        Relationships: [];
      };

      ratings: {
        Row: {
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
        };
        Insert: {
          id?:               string;
          user_id?:          string | null;
          product_id:        string;
          score:             number;
          review_text?:      string | null;
          flavor_tags?:      string[];
          taste_sweet_user?: number | null;
          taste_bold_user?:  number | null;
          taste_carb_user?:  number | null;
          helpful_count?:    number;
          created_at?:       string;
        };
        Update: {
          score?:            number;
          review_text?:      string | null;
          flavor_tags?:      string[];
          taste_sweet_user?: number | null;
          taste_bold_user?:  number | null;
          taste_carb_user?:  number | null;
          helpful_count?:    number;
        };
        Relationships: [{
          foreignKeyName: "ratings_product_id_fkey";
          columns: ["product_id"];
          isOneToOne: false;
          referencedRelation: "products";
          referencedColumns: ["id"];
        }];
      };

      profiles: {
        Row: {
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
        };
        Insert: {
          id:                string;
          username?:         string | null;
          display_name?:     string | null;
          avatar_url?:       string | null;
          is_pro?:           boolean;
          taste_sweet_pref?: number;
          taste_bold_pref?:  number;
          taste_carb_pref?:  number;
          favorite_styles?:  string[];
          followers_count?:  number;
          following_count?:  number;
          ratings_count?:    number;
          created_at?:       string;
        };
        Update: {
          username?:         string | null;
          display_name?:     string | null;
          avatar_url?:       string | null;
          is_pro?:           boolean;
          taste_sweet_pref?: number;
          taste_bold_pref?:  number;
          taste_carb_pref?:  number;
          favorite_styles?:  string[];
          followers_count?:  number;
          following_count?:  number;
          ratings_count?:    number;
        };
        Relationships: [];
      };

      wishlists: {
        Row: {
          user_id:    string;
          product_id: string;
          added_at:   string;
        };
        Insert: {
          user_id:    string;
          product_id: string;
          added_at?:  string;
        };
        Update: never;
        Relationships: [{
          foreignKeyName: "wishlists_product_id_fkey";
          columns: ["product_id"];
          isOneToOne: false;
          referencedRelation: "products";
          referencedColumns: ["id"];
        }];
      };

      review: {
        Row: {
          id: number;
          product_id: number;
          rating: number;
          body: string | null;
          author_name: string;
          created_at: string;
        };
        Insert: {
          id?: number;
          product_id: number;
          rating: number;
          body?: string | null;
          author_name?: string;
          created_at?: string;
        };
        Update: {
          rating?: number;
          body?: string | null;
          author_name?: string;
        };
        Relationships: [
          {
            foreignKeyName: "review_product_id_fkey";
            columns: ["product_id"];
            isOneToOne: false;
            referencedRelation: "product";
            referencedColumns: ["id"];
          }
        ];
      };
    };
    Views: Record<string, never>;
    Functions: Record<string, never>;
    Enums: {
      normalized_category: NormalizedCategory;
    };
  };
}
