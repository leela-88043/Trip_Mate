import type { TravelPreferences } from '@/services/travelPreferences';

export type RecommendationDestination = {
  id: string;
  name: string;
  region: string;
  country: string;
  category: string;
  description: string;
  highlights: string[];
  is_featured: boolean;
};

type Preferences = Pick<
  TravelPreferences,
  'interests' | 'preferred_destinations'
>;

const CATEGORY_INTERESTS: Record<string, string[]> = {
  beach: ['beach', 'beaches', 'surfing', 'swimming', 'sea'],
  mountain: ['mountain', 'mountains', 'hiking', 'trekking'],
  nature: ['nature', 'wildlife', 'birdwatching', 'forest'],
  adventure: ['adventure', 'hiking', 'trekking', 'rafting', 'camping'],
  heritage: ['heritage', 'history', 'culture', 'architecture'],
  city: ['city', 'cities', 'shopping', 'urban'],
};

function normalize(value: string) {
  return value
    .toLowerCase()
    .replace(/[^\p{L}\p{N}]+/gu, ' ')
    .trim();
}

function containsPhrase(text: string, phrase: string) {
  const term = normalize(phrase);

  return (
    term.length > 1 &&
    ` ${normalize(text)} `.includes(` ${term} `)
  );
}

export function recommendDestinations<
  T extends RecommendationDestination,
>(
  destinations: T[],
  preferences: Preferences | null
): {
  personalized: boolean;
  items: { destination: T; reason: string }[];
} {
  const ranked = destinations.map((destination) => {
    const location = [
      destination.name,
      destination.region,
      destination.country,
    ].join(' ');

    const preferred =
      preferences?.preferred_destinations.find((value) =>
        containsPhrase(location, value)
      );

    const searchable = [
      location,
      destination.category,
      destination.description,
      ...destination.highlights,
    ].join(' ');

    const interests = [
      ...new Set(preferences?.interests ?? []),
    ].filter(
      (interest) =>
        containsPhrase(searchable, interest) ||
        (
          CATEGORY_INTERESTS[destination.category] ?? []
        ).includes(normalize(interest))
    );

    const score =
      (preferred ? 100 : 0) +
      Math.min(interests.length, 5) * 10;

    const reason = preferred
      ? `Matches your preferred destination: ${preferred}`
      : interests.length > 0
        ? `Matches your interest: ${interests[0]}`
        : 'Featured in the destination catalogue';

    return { destination, reason, score };
  });

  const matches = ranked.filter((item) => item.score > 0);
  const personalized = matches.length > 0;

  const candidates = personalized
    ? matches
    : ranked.filter((item) => item.destination.is_featured);

  candidates.sort(
    (a, b) =>
      b.score - a.score ||
      Number(b.destination.is_featured) -
        Number(a.destination.is_featured) ||
      a.destination.name.localeCompare(b.destination.name) ||
      a.destination.id.localeCompare(b.destination.id)
  );

  return {
    personalized,
    items: candidates
      .slice(0, 4)
      .map(({ destination, reason }) => ({
        destination,
        reason,
      })),
  };
}