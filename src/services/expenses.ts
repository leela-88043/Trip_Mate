import { supabase } from "./supabase";

// Create a common trip expense and split it equally
// among the selected participants.
export async function createTripExpense(
  tripId: string,
  description: string,
  amount: number,
  category: string,
  participantIds: string[],
) {
  const { data, error } = await supabase.rpc("create_trip_expense", {
    p_trip_id: tripId,
    p_description: description,
    p_amount: amount,
    p_category: category,
    p_participant_ids: participantIds,
  });

  return { data, error };
}

// Delete a trip expense.
export async function deleteTripExpense(expenseId: string) {
  const { data, error } = await supabase
    .from("expenses")
    .delete()
    .eq("id", expenseId)
    .select();

  return { data, error };
}
