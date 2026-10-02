import { useEffect, useState } from 'react';
import {
  ActivityIndicator,
  Alert,
  StyleSheet,
  Text,
  TouchableOpacity,
  View,
} from 'react-native';
import { useLocalSearchParams } from 'expo-router';

import { supabase } from '@/services/supabase';
import { joinTrip } from '@/services/tripMembers';

type Trip = {
  id: string;
  name: string;
  destination: string;
  start_date: string;
  end_date: string;
};

export default function TripDetailsScreen() {
  const { tripId } = useLocalSearchParams();

  const [trip, setTrip] = useState<Trip | null>(null);
  const [members, setMembers] = useState<any[]>([]);
  const [loading, setLoading] = useState(true);
  const [joining, setJoining] = useState(false);

  useEffect(() => {
    loadTrip();
  }, []);

  const loadTrip = async () => {
    if (!tripId) {
      Alert.alert('Error', 'Trip ID is missing.');
      setLoading(false);
      return;
    }

    const { data, error } = await supabase
      .from('trips')
      .select('id, name, destination, start_date, end_date')
      .eq('id', String(tripId))
      .maybeSingle();

    if (error) {
      console.log('Trip error:', error.message);
      Alert.alert('Trip Loading Error', error.message);
      setLoading(false);
      return;
    }

    if (!data) {
      Alert.alert('Trip Not Found', 'This trip could not be found.');
      setLoading(false);
      return;
    }

    setTrip(data);

    const { data: memberData, error: memberError } = await supabase
      .from('trip_members')
      .select(`
        user_id,
        role,
        profiles (
          full_name,
          email
        )
      `)
      .eq('trip_id', String(tripId));

    if (memberError) {
      console.log('Member error:', memberError.message);
    } else {
      setMembers(memberData ?? []);
    }

    setLoading(false);
  };

  const handleJoinTrip = async () => {
    if (!tripId) {
      Alert.alert('Error', 'Trip ID is missing.');
      return;
    }

    const {
      data: { user },
    } = await supabase.auth.getUser();

    if (!user) {
      Alert.alert('Login Required', 'Please login first.');
      return;
    }

    setJoining(true);

    const { error } = await joinTrip(
      String(tripId),
      user.id
    );

    setJoining(false);

    if (error) {
      Alert.alert('Join Failed', error.message);
      return;
    }

    Alert.alert(
      'Success',
      'You have joined this trip!'
    );

    loadTrip();
  };

  if (loading) {
    return (
      <View style={styles.center}>
        <ActivityIndicator size="large" />
        <Text>Loading trip...</Text>
      </View>
    );
  }

  if (!trip) {
    return (
      <View style={styles.center}>
        <Text>Trip not found.</Text>
      </View>
    );
  }

  return (
    <View style={styles.container}>
      <Text style={styles.title}>Trip Details</Text>

      <Text style={styles.label}>Trip Name</Text>
      <Text style={styles.value}>{trip.name}</Text>

      <Text style={styles.label}>Destination</Text>
      <Text style={styles.value}>{trip.destination}</Text>

      <Text style={styles.label}>Start Date</Text>
      <Text style={styles.value}>{trip.start_date}</Text>

      <Text style={styles.label}>End Date</Text>
      <Text style={styles.value}>{trip.end_date}</Text>

      <TouchableOpacity
        style={styles.joinButton}
        onPress={handleJoinTrip}
        disabled={joining}
      >
        <Text style={styles.joinButtonText}>
          {joining ? 'Joining...' : 'Join This Trip'}
        </Text>
      </TouchableOpacity>

      <Text style={styles.membersTitle}>
        Trip Members
      </Text>

      {members.length === 0 ? (
        <Text style={styles.noMembers}>
          No members found.
        </Text>
      ) : (
        members.map((member) => (
          <View
            key={member.user_id}
            style={styles.memberCard}
          >
            <Text style={styles.memberName}>
              {member.profiles?.full_name || 'Unknown User'}
            </Text>

            <Text style={styles.memberEmail}>
              {member.profiles?.email || 'No email'}
            </Text>

            <Text style={styles.memberRole}>
              Role: {member.role}
            </Text>
          </View>
        ))
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
    marginBottom: 30,
    color: '#111827',
  },

  label: {
    fontSize: 14,
    fontWeight: '600',
    color: '#6B7280',
    marginTop: 15,
  },

  value: {
    fontSize: 18,
    color: '#111827',
    marginTop: 5,
  },

  joinButton: {
    height: 50,
    backgroundColor: '#2563EB',
    borderRadius: 10,
    justifyContent: 'center',
    alignItems: 'center',
    marginTop: 25,
  },

  joinButtonText: {
    color: '#FFFFFF',
    fontSize: 16,
    fontWeight: '700',
  },

  membersTitle: {
    fontSize: 20,
    fontWeight: '700',
    color: '#111827',
    marginTop: 30,
    marginBottom: 12,
  },

  memberCard: {
    backgroundColor: '#FFFFFF',
    borderRadius: 12,
    padding: 15,
    marginBottom: 10,
    borderWidth: 1,
    borderColor: '#E5E7EB',
  },

  memberName: {
    fontSize: 16,
    fontWeight: '600',
    color: '#111827',
  },

  memberEmail: {
    fontSize: 14,
    color: '#6B7280',
    marginTop: 4,
  },

  memberRole: {
    fontSize: 14,
    color: '#2563EB',
    marginTop: 4,
    fontWeight: '600',
  },

  noMembers: {
    fontSize: 15,
    color: '#6B7280',
  },
});