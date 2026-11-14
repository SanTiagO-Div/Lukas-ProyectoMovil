import { requireSupabase } from "./supabase";
import type { AppState } from "./types";

export async function readFinancialState(userId: string): Promise<unknown | null> {
  const { data, error } = await requireSupabase()
    .from("user_financial_state")
    .select("financial_state")
    .eq("user_id", userId)
    .maybeSingle();

  if (error) throw error;
  return data?.financial_state ?? null;
}

export async function writeFinancialState(userId: string, financialState: AppState) {
  const { error } = await requireSupabase()
    .from("user_financial_state")
    .upsert(
      {
        user_id: userId,
        financial_state: financialState,
        updated_at: new Date().toISOString(),
      },
      { onConflict: "user_id" }
    );

  if (error) throw error;
}
