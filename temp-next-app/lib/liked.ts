import { getSupabase } from "./supabase";
import { Listing } from "./listings";

export async function getLikedListings(): Promise<Listing[]> {
  const { data, error } = await getSupabase()
    .from("listings")
    .select("*")
    .eq("decision", "liked")
    .order("decided_at", { ascending: false });

  if (error) throw error;
  return (data as Listing[]) ?? [];
}
