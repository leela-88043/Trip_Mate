import { supabase } from "./supabase";

export async function joinTrip(tripId: string, userId: string) {
  const { error } = await supabase.rpc("join_trip_with_budget", {
    p_trip_id: tripId,
  });

  return { data: null, error };
}

export async function removeTripMember(tripId: string, userId: string) {
  const { data, error } = await supabase
    .from("trip_members")
    .delete()
    .eq("trip_id", tripId)
    .eq("user_id", userId)
    .select()
    .maybeSingle();

  return { data, error };
}
