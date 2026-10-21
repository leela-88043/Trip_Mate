import { supabase } from './supabase';

export type TravelPreferences = {
  user_id: string;
  bio: string | null;
  interests: string[];
  preferred_destinations: string[];
  travel_start_date: string | null;
  travel_end_date: string | null;
  budget_min: number | null;
  budget_max: number | null;
  budget_currency: string;
  travel_style: string | null;
  discovery_enabled: boolean;
};

export type TravelPreferencesInput =
  Omit<TravelPreferences, 'user_id'>;

async function getCurrentUserId(): Promise<string> {
  const {
    data: { user },
    error,
  } = await supabase.auth.getUser();

  if (error) {
    throw new Error(error.message);
  }

  if (!user) {
    throw new Error('Please log in to manage travel preferences.');
  }

  return user.id;
}

export async function loadTravelPreferences():
  Promise<TravelPreferences | null> {
  const userId = await getCurrentUserId();

  const { data, error } = await supabase
    .from('travel_preferences')
    .select(
      `user_id, bio, interests, preferred_destinations,
       travel_start_date, travel_end_date,
       budget_min, budget_max, budget_currency,
       travel_style, discovery_enabled`
    )
    .eq('user_id', userId)
    .maybeSingle();

  if (error) {
    throw new Error(error.message);
  }

  return data;
}

export async function saveTravelPreferences(
  preferences: TravelPreferencesInput
): Promise<void> {
  const userId = await getCurrentUserId();

  const { error } = await supabase
    .from('travel_preferences')
    .upsert(
      {
        ...preferences,
        user_id: userId,
      },
      {
        onConflict: 'user_id',
      }
    );

  if (error) {
    throw new Error(error.message);
  }
}