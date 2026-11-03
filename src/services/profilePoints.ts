import { supabase } from '@/services/supabase';

export type ProfilePoints = {
  user_id: string;
  profile_points: number;
  preference_points: number;
  trip_points: number;
  confirmed_trip_count: number;
  total_points: number;
};

export async function loadProfilePoints(
  userIds: string[]
): Promise<ProfilePoints[]> {
  const ids = [...new Set(userIds.filter(Boolean))];

  if (ids.length === 0) return [];

  // The database accepts up to 100 profiles per request.
  const results: ProfilePoints[] = [];

  for (let index = 0; index < ids.length; index += 100) {
    const { data, error } = await supabase.rpc(
      'get_profile_points',
      {
        p_user_ids: ids.slice(index, index + 100),
      }
    );

    if (error) {
      throw new Error(error.message);
    }

    results.push(...((data ?? []) as ProfilePoints[]));
  }

  return results;
}

export async function confirmTripParticipation(
  tripId: string,
  participantId: string
): Promise<string> {
  const { data, error } = await supabase.rpc(
    'confirm_trip_participation',
    {
      p_trip_id: tripId,
      p_user_id: participantId,
    }
  );

  if (error) {
    throw new Error(error.message);
  }

  if (typeof data !== 'string') {
    throw new Error('Participation confirmation was not returned.');
  }

  return data;
}