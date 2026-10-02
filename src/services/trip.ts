import { supabase } from './supabase';

export async function createTrip(
  name: string,
  destination: string,
  startDate: string,
  endDate: string,
  userId: string
) {
  // Create the trip
  const { data: trip, error: tripError } = await supabase
    .from('trips')
    .insert({
      name,
      destination,
      start_date: startDate,
      end_date: endDate,
      created_by: userId,
    })
    .select()
    .single();

  if (tripError) {
    return { data: null, error: tripError };
  }

  // Add creator as trip member
  const { error: memberError } = await supabase
    .from('trip_members')
    .insert({
      trip_id: trip.id,
      user_id: userId,
      role: 'owner',
    });

  if (memberError) {
    return { data: null, error: memberError };
  }

  return { data: trip, error: null };
}