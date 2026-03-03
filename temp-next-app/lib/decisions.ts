import { getSupabase } from "./supabase";

export async function likeCat(id: string): Promise<void> {
  const { error } = await getSupabase()
    .from("listings")
    .update({ decision: "liked", decided_at: new Date().toISOString() })
    .eq("id", id);

  if (error) {
    console.error("Failed to like cat:", error);
    throw error;
  }
}

export async function dismissCat(id: string): Promise<void> {
  const { error } = await getSupabase()
    .from("listings")
    .update({ decision: "dismissed", decided_at: new Date().toISOString() })
    .eq("id", id);

  if (error) {
    console.error("Failed to dismiss cat:", error);
    throw error;
  }
}
