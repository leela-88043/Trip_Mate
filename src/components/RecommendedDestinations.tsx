import { useCallback, useState } from 'react';
import {
  ActivityIndicator,
  StyleSheet,
  Text,
  TouchableOpacity,
  View,
} from 'react-native';
import { router, useFocusEffect } from 'expo-router';

import {
  loadTravelPreferences,
  type TravelPreferences,
} from '@/services/travelPreferences';
import {
  recommendDestinations,
  type RecommendationDestination,
} from '@/utils/destinationRecommendations';

type Props<T extends RecommendationDestination> = {
  destinations: T[];
  onSelect: (destination: T) => void;
};

export default function RecommendedDestinations<
  T extends RecommendationDestination,
>({
  destinations,
  onSelect,
}: Props<T>) {
  const [preferences, setPreferences] =
    useState<TravelPreferences | null>(null);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState('');
  const [refresh, setRefresh] = useState(0);

  useFocusEffect(
    useCallback(() => {
      let active = true;

      async function load() {
        setLoading(true);
        setError('');

        try {
          const data = await loadTravelPreferences();

          if (active) {
            setPreferences(data);
          }
        } catch (err) {
          if (active) {
            setPreferences(null);
            setError(
              err instanceof Error
                ? err.message
                : 'Unable to load recommendations.'
            );
          }
        } finally {
          if (active) {
            setLoading(false);
          }
        }
      }

      void load();

      return () => {
        active = false;
      };
    }, [refresh])
  );

  const recommendations = recommendDestinations(
    destinations,
    preferences
  );

  if (loading) {
    return (
      <View style={styles.section}>
        <ActivityIndicator size="small" color="#4F8CFF" />
        <Text style={styles.description}>
          Loading recommendations...
        </Text>
      </View>
    );
  }

  if (error) {
    return (
      <View style={styles.section}>
        <Text style={styles.error}>{error}</Text>

        <TouchableOpacity
          accessibilityRole="button"
          onPress={() => setRefresh((value) => value + 1)}
        >
          <Text style={styles.link}>Retry Recommendations</Text>
        </TouchableOpacity>
      </View>
    );
  }

  return (
    <View style={styles.section}>
      <Text style={styles.title}>
        {recommendations.personalized
          ? 'Recommended for You'
          : 'Featured Destinations'}
      </Text>

      <Text style={styles.description}>
        {recommendations.personalized
          ? 'Based on your preferred destinations and interests.'
          : 'No preference matches yet. Featured destinations are shown when available.'}
      </Text>

      {recommendations.items.map(({ destination, reason }) => (
        <TouchableOpacity
          key={destination.id}
          accessibilityRole="button"
          accessibilityLabel={`Explore ${destination.name}. ${reason}`}
          style={styles.card}
          onPress={() => onSelect(destination)}
        >
          <Text style={styles.name}>{destination.name}</Text>

          <Text style={styles.location}>
            {[destination.region, destination.country]
              .filter(Boolean)
              .join(', ')}
          </Text>

          <Text style={styles.reason}>{reason}</Text>
          <Text style={styles.link}>View Destination →</Text>
        </TouchableOpacity>
      ))}

      {recommendations.items.length === 0 && (
        <Text style={styles.description}>
          No suggestions are available in the current results.
          You can still browse destinations below.
        </Text>
      )}

      <TouchableOpacity
        accessibilityRole="button"
        onPress={() => router.push('/travel-preferences')}
      >
        <Text style={styles.link}>
          Update My Travel Preferences
        </Text>
      </TouchableOpacity>
    </View>
  );
}

const styles = StyleSheet.create({
  section: {
    marginBottom: 24,
  },
  title: {
    color: '#F7F8FC',
    fontSize: 20,
    fontWeight: '700',
  },
  description: {
    color: '#9299A8',
    fontSize: 13,
    lineHeight: 20,
    marginTop: 8,
  },
  card: {
    backgroundColor: '#142035',
    borderWidth: 1,
    borderColor: '#293F64',
    borderRadius: 14,
    padding: 16,
    marginTop: 12,
  },
  name: {
    color: '#F7F8FC',
    fontSize: 17,
    fontWeight: '700',
  },
  location: {
    color: '#9299A8',
    marginTop: 5,
    fontSize: 13,
  },
  reason: {
    color: '#83DCAA',
    marginTop: 10,
    fontSize: 13,
    lineHeight: 20,
  },
  link: {
    color: '#75A2FF',
    fontWeight: '700',
    paddingVertical: 10,
  },
  error: {
    color: '#FF9B9B',
    lineHeight: 20,
  },
});