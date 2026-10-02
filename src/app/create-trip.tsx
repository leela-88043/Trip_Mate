import { useState } from 'react';
import {
  Alert,
  StyleSheet,
  Text,
  TextInput,
  TouchableOpacity,
  View,
} from 'react-native';
import { router } from 'expo-router';

import { supabase } from '@/services/supabase';
import { createTrip } from '@/services/trip';

export default function CreateTripScreen() {
  const [name, setName] = useState('');
  const [destination, setDestination] = useState('');
  const [startDate, setStartDate] = useState('');
  const [endDate, setEndDate] = useState('');
  const [loading, setLoading] = useState(false);

  const handleCreateTrip = async () => {
    if (
      !name.trim() ||
      !destination.trim() ||
      !startDate.trim() ||
      !endDate.trim()
    ) {
      Alert.alert('Missing information', 'Please fill in all fields.');
      return;
    }

    const {
      data: { user },
    } = await supabase.auth.getUser();

    if (!user) {
      Alert.alert('Login Required', 'Please login first.');
      return;
    }

    setLoading(true);

    const { data, error } = await createTrip(
      name.trim(),
      destination.trim(),
      startDate.trim(),
      endDate.trim(),
      user.id
    );

    setLoading(false);

    if (error) {
      Alert.alert('Error', error.message);
      return;
    }

    Alert.alert(
      'Trip Created',
      'Your trip has been created successfully!',
      [
        {
          text: 'View My Trips',
          onPress: () => router.replace('/my-trips'),
        },
      ]
    );
  };

  return (
    <View style={styles.container}>
      <Text style={styles.title}>Create Trip</Text>

      <Text style={styles.label}>Trip Name</Text>
      <TextInput
        style={styles.input}
        placeholder="Example: Meghalaya Trip"
        value={name}
        onChangeText={setName}
      />

      <Text style={styles.label}>Destination</Text>
      <TextInput
        style={styles.input}
        placeholder="Example: Shillong"
        value={destination}
        onChangeText={setDestination}
      />

      <Text style={styles.label}>Start Date</Text>
      <TextInput
        style={styles.input}
        placeholder="YYYY-MM-DD"
        value={startDate}
        onChangeText={setStartDate}
      />

      <Text style={styles.label}>End Date</Text>
      <TextInput
        style={styles.input}
        placeholder="YYYY-MM-DD"
        value={endDate}
        onChangeText={setEndDate}
      />

      <TouchableOpacity
        style={styles.button}
        onPress={handleCreateTrip}
        disabled={loading}
      >
        <Text style={styles.buttonText}>
          {loading ? 'Creating...' : 'Create Trip'}
        </Text>
      </TouchableOpacity>
    </View>
  );
}

const styles = StyleSheet.create({
  container: {
    flex: 1,
    backgroundColor: '#F5F7FA',
    padding: 24,
  },

  title: {
    fontSize: 28,
    fontWeight: '700',
    color: '#111827',
    marginBottom: 30,
  },

  label: {
    fontSize: 14,
    fontWeight: '600',
    color: '#374151',
    marginTop: 14,
    marginBottom: 8,
  },

  input: {
    height: 52,
    backgroundColor: '#FFFFFF',
    borderWidth: 1,
    borderColor: '#D1D5DB',
    borderRadius: 10,
    paddingHorizontal: 16,
    fontSize: 16,
    color: '#111827',
  },

  button: {
    height: 52,
    backgroundColor: '#2563EB',
    borderRadius: 10,
    justifyContent: 'center',
    alignItems: 'center',
    marginTop: 30,
  },

  buttonText: {
    color: '#FFFFFF',
    fontSize: 16,
    fontWeight: '700',
  },
});