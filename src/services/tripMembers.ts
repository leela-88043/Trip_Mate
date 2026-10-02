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