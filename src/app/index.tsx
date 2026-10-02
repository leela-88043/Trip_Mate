import { useEffect, useState } from 'react';
import {
  ActivityIndicator,
  ScrollView,
  StyleSheet,
  Text,
  TouchableOpacity,
  View,
} from 'react-native';
import { router } from 'expo-router';

import { supabase } from '@/services/supabase';
import { getMyTrips } from '@/services/trips';

type Trip = {
  id: string;
  name: string;
  destination: string;
  start_date: string;
  end_date: string;
};

export default function HomeScreen() {
  const [fullName, setFullName] = useState('Traveler');
  const [upcomingTrip, setUpcomingTrip] = useState<Trip | null>(null);
  const [loading, setLoading] = useState(true);

  useEffect(() => {
    loadDashboard();
  }, []);

  const loadDashboard = async () => {
    const {
      data: { user },
    } = await supabase.auth.getUser();

    if (!user) {
      setLoading(false);
      return;
    }

    // Get user's profile
    const { data: profile } = await supabase
      .from('profiles')
      .select('full_name')
      .eq('id', user.id)
      .maybeSingle();

    if (profile?.full_name) {
      setFullName(profile.full_name);
    }

    // Get user's trips
    const { data } = await getMyTrips(user.id);

    const trips: Trip[] = (data ?? [])
      .map((item: any) => item.trips)
      .filter(Boolean);

    if (trips.length > 0) {
      setUpcomingTrip(trips[0]);
    }

    setLoading(false);
  };

  if (loading) {
    return (
      <View style={styles.loadingContainer}>
        <ActivityIndicator size="large" />
        <Text style={styles.loadingText}>Loading Trip Mate...</Text>
      </View>
    );
  }

  return (
    <ScrollView
      style={styles.container}
      contentContainerStyle={styles.content}
      showsVerticalScrollIndicator={false}
    >
      {/* Header */}
      <View style={styles.header}>
        <View>
          <Text style={styles.greeting}>Welcome back 👋</Text>
          <Text style={styles.name}>{fullName}</Text>
        </View>

        <View style={styles.profileCircle}>
          <Text style={styles.profileText}>
            {fullName.charAt(0).toUpperCase()}
          </Text>
        </View>
      </View>

      {/* Upcoming Trip */}
      <Text style={styles.sectionTitle}>Your Trip</Text>

      {upcomingTrip ? (
        <TouchableOpacity
          style={styles.tripCard}
          onPress={() =>
            router.push(`/trip-details?tripId=${upcomingTrip.id}`)
          }
        >
          <View style={styles.tripTop}>
            <View style={styles.destinationIcon}>
              <Text style={styles.destinationIconText}>📍</Text>
            </View>

            <View style={styles.tripInfo}>
              <Text style={styles.tripName}>
                {upcomingTrip.name}
              </Text>

              <Text style={styles.destination}>
                {upcomingTrip.destination}
              </Text>
            </View>
          </View>

          <View style={styles.tripDivider} />

          <View style={styles.dateRow}>
            <View>
              <Text style={styles.dateLabel}>START</Text>
              <Text style={styles.dateValue}>
                {upcomingTrip.start_date}
              </Text>
            </View>

            <View>
              <Text style={styles.dateLabel}>END</Text>
              <Text style={styles.dateValue}>
                {upcomingTrip.end_date}
              </Text>
            </View>
          </View>

          <Text style={styles.viewTrip}>
            View Trip →
          </Text>
        </TouchableOpacity>
      ) : (
        <View style={styles.emptyCard}>
          <Text style={styles.emptyIcon}>🧳</Text>

          <Text style={styles.emptyTitle}>
            No trips yet
          </Text>

          <Text style={styles.emptyText}>
            Create your first trip and start planning your journey.
          </Text>
        </View>
      )}

      {/* Main Actions */}
      <Text style={styles.sectionTitle}>Trip Management</Text>

      <View style={styles.actionGrid}>
        <TouchableOpacity
          style={styles.actionCard}
          onPress={() => router.push('/create-trip')}
        >
          <Text style={styles.actionIcon}>➕</Text>
          <Text style={styles.actionTitle}>Create Trip</Text>
          <Text style={styles.actionSubtitle}>
            Plan a new journey
          </Text>
        </TouchableOpacity>

        <TouchableOpacity
          style={styles.actionCard}
          onPress={() => router.push('/my-trips')}
        >
          <Text style={styles.actionIcon}>🗺️</Text>
          <Text style={styles.actionTitle}>My Trips</Text>
          <Text style={styles.actionSubtitle}>
            View your trips
          </Text>
        </TouchableOpacity>

        <TouchableOpacity
          style={styles.actionCard}
          onPress={() => router.push('/explore')}
        >
          <Text style={styles.actionIcon}>🔎</Text>
          <Text style={styles.actionTitle}>Explore</Text>
          <Text style={styles.actionSubtitle}>
            Discover trips
          </Text>
        </TouchableOpacity>

        <TouchableOpacity
          style={styles.actionCard}
          onPress={() => {}}
        >
          <Text style={styles.actionIcon}>🛡️</Text>
          <Text style={styles.actionTitle}>Safety</Text>
          <Text style={styles.actionSubtitle}>
            Stay informed
          </Text>
        </TouchableOpacity>
      </View>

      {/* Coming Features */}
      <Text style={styles.sectionTitle}>Trip Mate Features</Text>

      <View style={styles.featureCard}>
        <Text style={styles.featureIcon}>👥</Text>

        <View style={styles.featureContent}>
          <Text style={styles.featureTitle}>
            Travel Together
          </Text>

          <Text style={styles.featureText}>
            Find people travelling to the same destination
            and connect with your travel group.
          </Text>
        </View>
      </View>

      <View style={styles.featureCard}>
        <Text style={styles.featureIcon}>📍</Text>

        <View style={styles.featureContent}>
          <Text style={styles.featureTitle}>
            Live Group Tracking
          </Text>

          <Text style={styles.featureText}>
            Stay connected with your trip members using
            real-time location sharing.
          </Text>
        </View>
      </View>

      <View style={styles.featureCard}>
        <Text style={styles.featureIcon}>⚠️</Text>

        <View style={styles.featureContent}>
          <Text style={styles.featureTitle}>
            Route & Safety Alerts
          </Text>

          <Text style={styles.featureText}>
            Get important information about hazards,
            route changes and temporary stays.
          </Text>
        </View>
      </View>
    </ScrollView>
  );
}

const styles = StyleSheet.create({
  container: {
    flex: 1,
    backgroundColor: '#F5F7FA',
  },

  content: {
    padding: 24,
    paddingBottom: 40,
  },

  loadingContainer: {
    flex: 1,
    justifyContent: 'center',
    alignItems: 'center',
    backgroundColor: '#F5F7FA',
  },

  loadingText: {
    marginTop: 10,
    color: '#6B7280',
  },

  header: {
    flexDirection: 'row',
    justifyContent: 'space-between',
    alignItems: 'center',
    marginBottom: 30,
  },

  greeting: {
    fontSize: 15,
    color: '#6B7280',
  },

  name: {
    fontSize: 26,
    fontWeight: '700',
    color: '#111827',
    marginTop: 4,
  },

  profileCircle: {
    width: 48,
    height: 48,
    borderRadius: 24,
    backgroundColor: '#2563EB',
    justifyContent: 'center',
    alignItems: 'center',
  },

  profileText: {
    color: '#FFFFFF',
    fontSize: 20,
    fontWeight: '700',
  },

  sectionTitle: {
    fontSize: 20,
    fontWeight: '700',
    color: '#111827',
    marginBottom: 14,
    marginTop: 8,
  },

  tripCard: {
    backgroundColor: '#FFFFFF',
    borderRadius: 18,
    padding: 20,
    marginBottom: 28,
    borderWidth: 1,
    borderColor: '#E5E7EB',
  },

  tripTop: {
    flexDirection: 'row',
    alignItems: 'center',
  },

  destinationIcon: {
    width: 52,
    height: 52,
    borderRadius: 26,
    backgroundColor: '#EFF6FF',
    justifyContent: 'center',
    alignItems: 'center',
  },

  destinationIconText: {
    fontSize: 23,
  },

  tripInfo: {
    marginLeft: 14,
    flex: 1,
  },

  tripName: {
    fontSize: 19,
    fontWeight: '700',
    color: '#111827',
  },

  destination: {
    fontSize: 15,
    color: '#6B7280',
    marginTop: 4,
  },

  tripDivider: {
    height: 1,
    backgroundColor: '#E5E7EB',
    marginVertical: 18,
  },

  dateRow: {
    flexDirection: 'row',
    justifyContent: 'space-between',
  },

  dateLabel: {
    fontSize: 11,
    fontWeight: '700',
    color: '#9CA3AF',
  },

  dateValue: {
    fontSize: 14,
    color: '#374151',
    marginTop: 4,
  },

  viewTrip: {
    color: '#2563EB',
    fontSize: 14,
    fontWeight: '700',
    marginTop: 18,
  },

  emptyCard: {
    backgroundColor: '#FFFFFF',
    borderRadius: 18,
    padding: 25,
    alignItems: 'center',
    marginBottom: 28,
    borderWidth: 1,
    borderColor: '#E5E7EB',
  },

  emptyIcon: {
    fontSize: 40,
  },

  emptyTitle: {
    fontSize: 19,
    fontWeight: '700',
    color: '#111827',
    marginTop: 10,
  },

  emptyText: {
    textAlign: 'center',
    color: '#6B7280',
    marginTop: 6,
    lineHeight: 21,
  },

  actionGrid: {
    flexDirection: 'row',
    flexWrap: 'wrap',
    justifyContent: 'space-between',
    marginBottom: 28,
  },

  actionCard: {
    width: '48%',
    backgroundColor: '#FFFFFF',
    borderRadius: 16,
    padding: 18,
    marginBottom: 12,
    borderWidth: 1,
    borderColor: '#E5E7EB',
  },

  actionIcon: {
    fontSize: 25,
    marginBottom: 12,
  },

  actionTitle: {
    fontSize: 16,
    fontWeight: '700',
    color: '#111827',
  },

  actionSubtitle: {
    fontSize: 12,
    color: '#6B7280',
    marginTop: 5,
  },

  featureCard: {
    backgroundColor: '#FFFFFF',
    borderRadius: 16,
    padding: 18,
    flexDirection: 'row',
    marginBottom: 12,
    borderWidth: 1,
    borderColor: '#E5E7EB',
  },

  featureIcon: {
    fontSize: 28,
    marginRight: 15,
  },

  featureContent: {
    flex: 1,
  },

  featureTitle: {
    fontSize: 16,
    fontWeight: '700',
    color: '#111827',
  },

  featureText: {
    fontSize: 13,
    color: '#6B7280',
    lineHeight: 19,
    marginTop: 5,
  },
});