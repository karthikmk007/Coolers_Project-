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
      };
    };
    Views: Record<string, never>;
    Functions: Record<string, never>;
    Enums: {
      normalized_category: NormalizedCategory;
    };
  };
}
