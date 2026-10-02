import { supabase } from './supabase';

export async function getMyTrips(userId: string) {
  const { data, error } = await supabase
    .from('trip_members')
    .select(`
      trip_id,
      role,
      trips (
        id,
        name,
        destination,
        start_date,
        end_date,
        created_by,
        created_at
      )
    `)
    .eq('user_id', userId);

  return { data, error };
}