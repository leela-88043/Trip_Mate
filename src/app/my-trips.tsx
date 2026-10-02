import { useEffect, useState } from 'react';
import {
  ActivityIndicator,
  FlatList,
  StyleSheet,
  Text,
  TouchableOpacity,
  View,
} from 'react-native';

import { supabase } from '@/services/supabase';
import { getMyTrips } from '@/services/trips';
import { router } from 'expo-router';
type Trip = {
  id: string;
  name: string;
  destination: string;
  start_date: string;
  end_date: string;
};

export default function MyTripsScreen() {
  const [trips, setTrips] = useState<Trip[]>([]);
  const [loading, setLoading] = useState(true);

  useEffect(() => {
    loadTrips();
  }, []);

  const loadTrips = async () => {
    const {
      data: { user },
    } = await supabase.auth.getUser();

    if (!user) {
      setLoading(false);
      return;
    }

    const { data, error } = await getMyTrips(user.id);

    if (error) {
      console.log('Error loading trips:', error.message);
      setLoading(false);
      return;
    }

    const tripList = (data ?? [])
      .map((item: any) => item.trips)
      .filter(Boolean);

    setTrips(tripList);
    setLoading(false);
  };

  if (loading) {
    return (
      <View style={styles.center}>
        <ActivityIndicator size="large" />
        <Text>Loading trips...</Text>
      </View>
    );
  }

  return (
    <View style={styles.container}>
      <Text style={styles.title}>My Trips</Text>

      {trips.length === 0 ? (
        <Text style={styles.empty}>
          You haven't joined any trips yet.
        </Text>
      ) : (
        <FlatList
          data={trips}
          keyExtractor={(item) => item.id}
          renderItem={({ item }) => (
            <TouchableOpacity
                style={styles.card}
                onPress={() => router.push(`/trip-details?tripId=${item.id}`)}
              >
              <Text style={styles.tripName}>{item.name}</Text>
              <Text style={styles.destination}>
                📍 {item.destination}
              </Text>
              <Text style={styles.date}>
                {item.start_date} → {item.end_date}
              </Text>
            </TouchableOpacity>
          )}
        />
      )}
    </View>
  );
}

const styles = StyleSheet.create({
  container: {
    flex: 1,
    backgroundColor: '#F5F7FA',
    padding: 24,
  },
  center: {
    flex: 1,
    justifyContent: 'center',
    alignItems: 'center',
    gap: 10,
  },
  title: {
    fontSize: 28,
    fontWeight: '700',
    color: '#111827',
    marginBottom: 20,
  },
  empty: {
    color: '#6B7280',
    fontSize: 16,
  },
  card: {
    backgroundColor: '#FFFFFF',
    borderRadius: 14,
    padding: 18,
    marginBottom: 14,
    borderWidth: 1,
    borderColor: '#E5E7EB',
  },
  tripName: {
    fontSize: 20,
    fontWeight: '700',
    color: '#111827',
    marginBottom: 8,
  },
  destination: {
    fontSize: 16,
    color: '#374151',
    marginBottom: 8,
  },
  date: {
    fontSize: 14,
    color: '#6B7280',
  },
});