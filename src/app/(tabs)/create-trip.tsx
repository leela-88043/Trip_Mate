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
  scrollView: { flex: 1, backgroundColor: '#08090D' },
  container: { padding: 22, paddingTop: 28, paddingBottom: 48 },
  title: { fontSize: 29, fontWeight: '800', color: '#F7F8FC', letterSpacing: -0.5, marginBottom: 10 },
  label: { fontSize: 13, fontWeight: '700', color: '#D9DDE7', marginTop: 19, marginBottom: 9 },
  input: { minHeight: 53, backgroundColor: '#151821', borderWidth: 1, borderColor: '#292E3B', borderRadius: 14, paddingHorizontal: 16, fontSize: 15, color: '#F7F8FC' },
  placesTitle: { fontSize: 19, fontWeight: '800', color: '#F7F8FC', marginTop: 30, marginBottom: 6 },
  placesSubtitle: { fontSize: 13, color: '#9299A8', marginBottom: 15, lineHeight: 19 },
  placeRow: { flexDirection: 'row', alignItems: 'center', marginBottom: 10 },
  placeInput: { flex: 1, minHeight: 51, backgroundColor: '#151821', borderWidth: 1, borderColor: '#292E3B', borderRadius: 14, paddingHorizontal: 15, fontSize: 15, color: '#F7F8FC' },
  removeButton: { width: 43, height: 43, borderRadius: 14, backgroundColor: '#382027', justifyContent: 'center', alignItems: 'center', marginLeft: 9, borderWidth: 1, borderColor: '#59303A' },
  removeButtonText: { fontSize: 25, color: '#FF7B86', lineHeight: 27 },
  addButton: { minHeight: 49, borderWidth: 1, borderColor: '#4F8CFF', borderStyle: 'dashed', borderRadius: 14, justifyContent: 'center', alignItems: 'center', marginTop: 5, backgroundColor: '#111A2B' },
  addButtonText: { color: '#78A5FF', fontSize: 14, fontWeight: '750' },
  button: { minHeight: 54, backgroundColor: '#4F8CFF', borderRadius: 15, justifyContent: 'center', alignItems: 'center', marginTop: 30, shadowColor: '#4F8CFF', shadowOpacity: 0.2, shadowRadius: 12, elevation: 3 },
  buttonText: { color: '#FFFFFF', fontSize: 16, fontWeight: '800' },
});
