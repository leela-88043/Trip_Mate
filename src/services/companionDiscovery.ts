import { supabase } from './supabase';
import type { TravelPreferences } from './travelPreferences';

export type Companion = TravelPreferences & {
  full_name: string;
  avatar_url: string | null;
};

export async function loadCompanions(): Promise<Companion[]> {
  const {
    data: { user },
    error: authError,
  } = await supabase.auth.getUser();

  if (authError) {
    throw new Error(authError.message);
  }

  if (!user) {
    throw new Error('Please log in to discover companions.');
  }

  const { data: preferences, error: preferencesError } =
    await supabase
      .from('travel_preferences')
      .select(
        `user_id, bio, interests, preferred_destinations,
         travel_start_date, travel_end_date,
         budget_min, budget_max, budget_currency,
         travel_style, discovery_enabled`
      )
      .eq('discovery_enabled', true)
      .neq('user_id', user.id)
      .order('created_at', { ascending: false })
      .limit(50);

  if (preferencesError) {
    throw new Error(preferencesError.message);
  }

  if (!preferences?.length) {
    return [];
  }

  const userIds = preferences.map((item) => item.user_id);

  const { data: profiles, error: profilesError } = await supabase
    .from('profiles')
    .select('id, full_name, avatar_url')
    .in('id', userIds);

  if (profilesError) {
    throw new Error(profilesError.message);
  }

  const profileMap = new Map<
    string,
    { full_name: string | null; avatar_url: string | null }
  >();

  for (const profile of profiles ?? []) {
    profileMap.set(profile.id, {
      full_name: profile.full_name,
      avatar_url: profile.avatar_url,
    });
  }

  return preferences.map((preference) => {
    const profile = profileMap.get(preference.user_id);

    return {
      ...preference,
      full_name: profile?.full_name?.trim() || 'Traveller',
      avatar_url: profile?.avatar_url ?? null,
    };
  });
}