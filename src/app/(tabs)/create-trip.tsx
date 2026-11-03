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
import { getTodayKey } from '@/utils/tripTimeline';

function isValidDate(value: string) {
  if (!/^\d{4}-\d{2}-\d{2}$/.test(value)) {
    return false;
  }

  const parsed = new Date(`${value}T00:00:00Z`);

  return (
    !Number.isNaN(parsed.getTime()) &&
    parsed.toISOString().slice(0, 10) === value
  );
}

export default function CreateTripScreen() {
  const [name, setName] = useState('');
  const [destination, setDestination] = useState('');
  const [startDate, setStartDate] = useState('');
  const [endDate, setEndDate] = useState('');
  const [places, setPlaces] = useState(['']);
  const [loading, setLoading] = useState(false);
  const [errorMessage, setErrorMessage] = useState('');

  function showError(title: string, message: string) {
    setErrorMessage(message);
    Alert.alert(title, message);
  }

  function addPlace() {
    setPlaces((current) => [...current, '']);
  }

  function updatePlace(index: number, value: string) {
    setPlaces((current) =>
      current.map((place, placeIndex) =>
        placeIndex === index ? value : place
      )
    );
  }

  function removePlace(index: number) {
    setPlaces((current) =>
      current.length === 1
        ? ['']
        : current.filter((_, placeIndex) => placeIndex !== index)
    );
  }

  async function handleCreateTrip() {
    if (loading) return;

    setErrorMessage('');

    const tripName = name.trim();
    const tripDestination = destination.trim();
    const start = startDate.trim();
    const end = endDate.trim();

    if (!tripName || !tripDestination || !start || !end) {
      showError(
        'Missing information',
        'Please enter the trip name, destination, start date, and end date.'
      );
      return;
    }

    if (!isValidDate(start) || !isValidDate(end)) {
      showError(
        'Invalid dates',
        'Please enter valid dates in YYYY-MM-DD format.'
      );
      return;
    }

    if (end < start) {
      showError(
        'Invalid date range',
        'The end date must be on or after the start date.'
      );
      return;
    }

    const today = getTodayKey();

    if (end < today) {
      showError(
        'Trip dates have already passed',
        `This trip would already be completed because its end date is before today (${today}). Please select an end date of today or later.`
      );
      return;
    }

    const cleanedPlaces = places
      .map((place) => place.trim())
      .filter(Boolean);

    if (cleanedPlaces.length === 0) {
      showError(
        'Missing places',
        'Please add at least one place to visit.'
      );
      return;
    }

    setLoading(true);

    try {
      const {
        data: { user },
        error: authError,
      } = await supabase.auth.getUser();

      if (authError) {
        throw new Error(authError.message);
      }

      if (!user) {
        showError('Login Required', 'Please log in first.');
        return;
      }

      // Recheck in case the India date changed while checking login.
      if (end < getTodayKey()) {
        showError(
          'Trip dates have already passed',
          'This trip has already ended. Please update your travel dates.'
        );
        return;
      }

      const { data, error } = await createTrip(
        tripName,
        tripDestination,
        start,
        end,
        user.id
      );

      if (error || !data) {
        throw new Error(error?.message || 'Failed to create trip.');
      }

      const { error: placesError } = await supabase
        .from('trip_destinations')
        .insert(
          cleanedPlaces.map((place) => ({
            trip_id: data.id,
            name: place,
            visited: false,
          }))
        );

      if (placesError) {
        showError(
          'Places could not be saved',
          `The trip was created, but its places could not be saved: ${placesError.message}. Check My Trips before creating another trip.`
        );
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
    } catch (error) {
      showError(
        'Unable to create trip',
        error instanceof Error ? error.message : 'Please try again.'
      );
    } finally {
      setLoading(false);
    }
  }

  return (
    <ScrollView
      style={styles.scrollView}
      contentContainerStyle={styles.container}
      keyboardShouldPersistTaps="handled"
    >
      <Text style={styles.title}>Create Trip</Text>

      <Text style={styles.label}>Trip Name</Text>
      <TextInput
        style={styles.input}
        placeholder="Example: Meghalaya Trip"
        placeholderTextColor="#9CA3AF"
        value={name}
        onChangeText={setName}
        editable={!loading}
      />

      <Text style={styles.label}>Destination</Text>
      <TextInput
        style={styles.input}
        placeholder="Example: Shillong"
        placeholderTextColor="#9CA3AF"
        value={destination}
        onChangeText={setDestination}
        editable={!loading}
      />

      <Text style={styles.label}>Start Date</Text>
      <TextInput
        style={styles.input}
        placeholder="YYYY-MM-DD"
        placeholderTextColor="#9CA3AF"
        value={startDate}
        onChangeText={setStartDate}
        editable={!loading}
        autoCorrect={false}
        autoCapitalize="none"
        maxLength={10}
      />

      <Text style={styles.label}>End Date</Text>
      <TextInput
        style={styles.input}
        placeholder="YYYY-MM-DD"
        placeholderTextColor="#9CA3AF"
        value={endDate}
        onChangeText={setEndDate}
        editable={!loading}
        autoCorrect={false}
        autoCapitalize="none"
        maxLength={10}
      />

      <Text style={styles.help}>
        Dates follow India time. The end date must be today or later.
      </Text>

      <Text style={styles.placesTitle}>Places to Visit</Text>
      <Text style={styles.placesSubtitle}>
        Add the places you want to visit during this trip.
      </Text>

      {places.map((place, index) => (
        <View key={index} style={styles.placeRow}>
          <TextInput
            style={styles.placeInput}
            placeholder={`Place ${index + 1}`}
            placeholderTextColor="#9CA3AF"
            value={place}
            onChangeText={(value) => updatePlace(index, value)}
            editable={!loading}
          />

          <TouchableOpacity
            accessibilityLabel={`Remove place ${index + 1}`}
            style={styles.removeButton}
            onPress={() => removePlace(index)}
            disabled={loading}
          >
            <Text style={styles.removeButtonText}>×</Text>
          </TouchableOpacity>
        </View>
      ))}

      <TouchableOpacity
        style={styles.addButton}
        onPress={addPlace}
        disabled={loading}
      >
        <Text style={styles.addButtonText}>
          + Add another place
        </Text>
      </TouchableOpacity>

      {!!errorMessage && (
        <Text accessibilityLiveRegion="polite" style={styles.error}>
          {errorMessage}
        </Text>
      )}

      <TouchableOpacity
        style={[styles.button, loading && styles.disabled]}
        onPress={() => void handleCreateTrip()}
        disabled={loading}
      >
        <Text style={styles.buttonText}>
          {loading ? 'Creating...' : 'Create Trip'}
        </Text>
      </TouchableOpacity>
    </ScrollView>
  );
}

const styles = StyleSheet.create({
  scrollView: {
    flex: 1,
    backgroundColor: '#08090D',
  },
  container: {
    padding: 22,
    paddingTop: 28,
    paddingBottom: 48,
  },
  title: {
    fontSize: 29,
    fontWeight: '800',
    color: '#F7F8FC',
    letterSpacing: -0.5,
    marginBottom: 10,
  },
  label: {
    fontSize: 13,
    fontWeight: '700',
    color: '#D9DDE7',
    marginTop: 19,
    marginBottom: 9,
  },
  input: {
    minHeight: 53,
    backgroundColor: '#151821',
    borderWidth: 1,
    borderColor: '#292E3B',
    borderRadius: 14,
    paddingHorizontal: 16,
    fontSize: 15,
    color: '#F7F8FC',
  },
  help: {
    color: '#9299A8',
    fontSize: 12,
    lineHeight: 18,
    marginTop: 10,
  },
  placesTitle: {
    fontSize: 19,
    fontWeight: '800',
    color: '#F7F8FC',
    marginTop: 30,
    marginBottom: 6,
  },
  placesSubtitle: {
    fontSize: 13,
    color: '#9299A8',
    marginBottom: 15,
    lineHeight: 19,
  },
  placeRow: {
    flexDirection: 'row',
    alignItems: 'center',
    marginBottom: 10,
  },
  placeInput: {
    flex: 1,
    minHeight: 51,
    backgroundColor: '#151821',
    borderWidth: 1,
    borderColor: '#292E3B',
    borderRadius: 14,
    paddingHorizontal: 15,
    fontSize: 15,
    color: '#F7F8FC',
  },
  removeButton: {
    width: 43,
    height: 43,
    borderRadius: 14,
    backgroundColor: '#382027',
    justifyContent: 'center',
    alignItems: 'center',
    marginLeft: 9,
    borderWidth: 1,
    borderColor: '#59303A',
  },
  removeButtonText: {
    fontSize: 25,
    color: '#FF7B86',
    lineHeight: 27,
  },
  addButton: {
    minHeight: 49,
    borderWidth: 1,
    borderColor: '#4F8CFF',
    borderStyle: 'dashed',
    borderRadius: 14,
    justifyContent: 'center',
    alignItems: 'center',
    marginTop: 5,
    backgroundColor: '#111A2B',
  },
  addButtonText: {
    color: '#78A5FF',
    fontSize: 14,
    fontWeight: '700',
  },
  button: {
    minHeight: 54,
    backgroundColor: '#4F8CFF',
    borderRadius: 15,
    justifyContent: 'center',
    alignItems: 'center',
    marginTop: 30,
  },
  buttonText: {
    color: '#FFFFFF',
    fontSize: 16,
    fontWeight: '800',
  },
  disabled: {
    opacity: 0.6,
  },
  error: {
    color: '#FF9B9B',
    marginTop: 18,
    lineHeight: 21,
  },
});