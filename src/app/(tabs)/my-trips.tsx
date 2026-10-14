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
  container: { flex: 1, backgroundColor: '#08090D', padding: 22, paddingTop: 28 },
  center: { flex: 1, backgroundColor: '#08090D', justifyContent: 'center', alignItems: 'center', gap: 12 },
  title: { fontSize: 29, fontWeight: '800', color: '#F7F8FC', letterSpacing: -0.5, marginBottom: 22 },
  empty: { color: '#A0A7B5', fontSize: 15, lineHeight: 22, backgroundColor: '#151821', borderColor: '#252A37', borderWidth: 1, borderRadius: 17, padding: 20 },
  card: { backgroundColor: '#151821', borderRadius: 18, padding: 19, marginBottom: 14, borderWidth: 1, borderColor: '#252A37' },
  tripName: { fontSize: 18, fontWeight: '800', color: '#F7F8FC', marginBottom: 9 },
  destination: { fontSize: 14, color: '#AEB6C5', marginBottom: 9 },
  date: { fontSize: 13, color: '#858D9D' },
});
