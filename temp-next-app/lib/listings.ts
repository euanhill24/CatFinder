import { getSupabase } from "./supabase";

export interface Listing {
  id: string;
  source: string;
  external_url: string;
  title: string | null;
  price: number | null;
  age_months: number | null;
  sex: string | null;
  location_raw: string | null;
  description: string | null;
  photo_urls: string[] | null;
  listed_at: string | null;
  ingested_at: string;
  score_alone: number | null;
  score_friendly: number | null;
  score_vibe: number | null;
  score_distance: number | null;
  score_age: number | null;
  score_overall: number | null;
  score_rationale: {
    alone: string;
    friendly: string;
    vibe: string;
    distance: string;
    age: string;
  } | null;
  decision: string | null;
  decided_at: string | null;
}

export async function getUndecidedListings(): Promise<Listing[]> {
  const { data, error } = await getSupabase()
    .from("listings")
    .select("*")
    .is("decision", null)
    .order("score_overall", { ascending: false });

  if (error) throw error;
  return (data as Listing[]) ?? [];
}
