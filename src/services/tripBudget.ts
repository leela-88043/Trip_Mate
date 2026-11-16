import { supabase } from "./supabase";

// Fetch the initial budget for a trip
export async function getTripBudget(tripId: string) {
  const { data, error } = await supabase
    .from("trip_budgets")
    .select(
      `
      id,
      trip_id,
      total_initial_budget,
      initial_member_count,
      per_member_allowance,
      created_by,
      created_at
    `,
    )
    .eq("trip_id", tripId)
    .maybeSingle();

  return { data, error };
}

// Fetch individual member allowances
export async function getMemberBudgets(tripId: string) {
  const { data, error } = await supabase
    .from("member_budgets")
    .select(
      `
      id,
      trip_id,
      user_id,
      initial_allowance,
      joined_at
    `,
    )
    .eq("trip_id", tripId);

  return { data, error };
}
// Create the initial trip budget
export async function createTripBudget(tripId: string, totalBudget: number) {
  const { error } = await supabase.rpc("create_trip_budget", {
    p_trip_id: tripId,
    p_total_initial_budget: totalBudget,
  });

  return { error };
}
