import { useState } from 'react';
import {
  Alert,
  ScrollView,
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

  const [places, setPlaces] = useState(['']);

  const [loading, setLoading] = useState(false);

  const addPlace = () => {
    setPlaces((currentPlaces) => [
      ...currentPlaces,
      '',
    ]);
  };

  const updatePlace = (
    index: number,
    value: string
  ) => {
    setPlaces((currentPlaces) =>
      currentPlaces.map((place, placeIndex) =>
        placeIndex === index
          ? value
          : place
      )
    );
  };

  const removePlace = (index: number) => {
    if (places.length === 1) {
      setPlaces(['']);
      return;
    }

    setPlaces((currentPlaces) =>
      currentPlaces.filter(
        (_, placeIndex) =>
          placeIndex !== index
      )
    );
  };

  const handleCreateTrip = async () => {
    if (
      !name.trim() ||
      !destination.trim() ||
      !startDate.trim() ||
      !endDate.trim()
    ) {
      Alert.alert(
        'Missing information',
        'Please fill in all fields.'
      );
      return;
    }

    const cleanedPlaces = places
      .map((place) => place.trim())
      .filter(Boolean);

    if (cleanedPlaces.length === 0) {
      Alert.alert(
        'Missing places',
        'Please add at least one place to visit.'
      );
      return;
    }

    const {
      data: { user },
    } = await supabase.auth.getUser();

    if (!user) {
      Alert.alert(
        'Login Required',
        'Please login first.'
      );
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

    if (error || !data) {
      setLoading(false);

      Alert.alert(
        'Error',
        error?.message ||
          'Failed to create trip.'
      );
      return;
    }

    const tripId = data.id;

    const { error: placesError } =
      await supabase
        .from('trip_destinations')
        .insert(
          cleanedPlaces.map((place) => ({
            trip_id: tripId,
            name: place,
            visited: false,
          }))
        );

    setLoading(false);

    if (placesError) {
      Alert.alert(
        'Error',
        `Trip was created, but places could not be saved: ${placesError.message}`
      );
      return;
    }

    Alert.alert(
      'Trip Created',
      'Your trip has been created successfully!',
      [
        {
          text: 'View My Trips',
          onPress: () =>
            router.replace('/my-trips'),
        },
      ]
    );
  };

  return (
    <ScrollView
      style={styles.scrollView}
      contentContainerStyle={styles.container}
      keyboardShouldPersistTaps="handled"
    >
      <Text style={styles.title}>
        Create Trip
      </Text>

      <Text style={styles.label}>
        Trip Name
      </Text>

      <TextInput
        style={styles.input}
        placeholder="Example: Meghalaya Trip"
        placeholderTextColor="#9CA3AF"
        value={name}
        onChangeText={setName}
      />

      <Text style={styles.label}>
        Destination
      </Text>

      <TextInput
        style={styles.input}
        placeholder="Example: Shillong"
        placeholderTextColor="#9CA3AF"
        value={destination}
        onChangeText={setDestination}
      />

      <Text style={styles.label}>
        Start Date
      </Text>

      <TextInput
        style={styles.input}
        placeholder="YYYY-MM-DD"
        placeholderTextColor="#9CA3AF"
        value={startDate}
        onChangeText={setStartDate}
      />

      <Text style={styles.label}>
        End Date
      </Text>

      <TextInput
        style={styles.input}
        placeholder="YYYY-MM-DD"
        placeholderTextColor="#9CA3AF"
        value={endDate}
        onChangeText={setEndDate}
      />

      <Text style={styles.placesTitle}>
        Places to Visit
      </Text>

      <Text style={styles.placesSubtitle}>
        Add the places you want to visit during this trip.
      </Text>

      {places.map((place, index) => (
        <View
          key={index}
          style={styles.placeRow}
        >
          <TextInput
            style={styles.placeInput}
            placeholder={`Place ${index + 1}`}
            placeholderTextColor="#9CA3AF"
            value={place}
            onChangeText={(value) =>
              updatePlace(index, value)
            }
          />

          <TouchableOpacity
            style={styles.removeButton}
            onPress={() =>
              removePlace(index)
            }
          >
            <Text style={styles.removeButtonText}>
              ×
            </Text>
          </TouchableOpacity>
        </View>
      ))}

      <TouchableOpacity
        style={styles.addButton}
        onPress={addPlace}
      >
        <Text style={styles.addButtonText}>
          + Add another place
        </Text>
      </TouchableOpacity>

      <TouchableOpacity
        style={styles.button}
        onPress={handleCreateTrip}
        disabled={loading}
      >
        <Text style={styles.buttonText}>
          {loading
            ? 'Creating...'
            : 'Create Trip'}
        </Text>
      </TouchableOpacity>
    </ScrollView>
  );
}

const styles = StyleSheet.create({
  scrollView: {
    flex: 1,
    backgroundColor: '#F5F7FA',
  },

  container: {
    padding: 24,
    paddingBottom: 40,
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

  placesTitle: {
    fontSize: 18,
    fontWeight: '700',
    color: '#111827',
    marginTop: 28,
    marginBottom: 5,
  },

  placesSubtitle: {
    fontSize: 13,
    color: '#6B7280',
    marginBottom: 12,
  },

  placeRow: {
    flexDirection: 'row',
    alignItems: 'center',
    marginBottom: 10,
  },

  placeInput: {
    flex: 1,
    height: 50,
    backgroundColor: '#FFFFFF',
    borderWidth: 1,
    borderColor: '#D1D5DB',
    borderRadius: 10,
    paddingHorizontal: 16,
    fontSize: 16,
    color: '#111827',
  },

  removeButton: {
    width: 42,
    height: 42,
    borderRadius: 21,
    backgroundColor: '#FEE2E2',
    justifyContent: 'center',
    alignItems: 'center',
    marginLeft: 8,
  },

  removeButtonText: {
    fontSize: 25,
    color: '#DC2626',
    lineHeight: 27,
  },

  addButton: {
    height: 48,
    borderWidth: 1,
    borderColor: '#2563EB',
    borderRadius: 10,
    justifyContent: 'center',
    alignItems: 'center',
    marginTop: 4,
  },

  addButtonText: {
    color: '#2563EB',
    fontSize: 15,
    fontWeight: '700',
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
