import { supabase } from './supabase';

export async function joinTrip(
  tripId: string,
  userId: string
) {
  const { data, error } = await supabase
    .from('trip_members')
    .insert({
      trip_id: tripId,
      user_id: userId,
    })
    .select()
    .single();

  return { data, error };
}

export async function removeTripMember(
  tripId: string,
  userId: string
) {
  const { data, error } = await supabase
    .from('trip_members')
    .delete()
    .eq('trip_id', tripId)
    .eq('user_id', userId)
    .select()
    .maybeSingle();

  return { data, error };
}