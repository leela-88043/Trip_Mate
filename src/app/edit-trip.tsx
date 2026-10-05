import { useEffect, useState } from 'react';
import {
  ActivityIndicator,
  Alert,
  ScrollView,
  StyleSheet,
  Text,
  TextInput,
  TouchableOpacity,
  View,
} from 'react-native';
import { router, useLocalSearchParams } from 'expo-router';

import { supabase } from '@/services/supabase';

type EditPlace = {
  id?: string;
  name: string;
  visited: boolean;
};

export default function EditTripScreen() {
  const {
    tripId,
    name,
    destination,
    startDate,
    endDate,
  } = useLocalSearchParams();

  const [tripName, setTripName] = useState(
    String(name ?? '')
  );

  const [tripDestination, setTripDestination] =
    useState(String(destination ?? ''));

  const [start, setStart] = useState(
    String(startDate ?? '')
  );

  const [end, setEnd] = useState(
    String(endDate ?? '')
  );

  const [places, setPlaces] = useState<EditPlace[]>(
    []
  );

  const [loadingPlaces, setLoadingPlaces] =
    useState(true);

  const [saving, setSaving] = useState(false);

  useEffect(() => {
    loadPlaces();
  }, []);

  const loadPlaces = async () => {
    if (!tripId) {
      setLoadingPlaces(false);
      return;
    }

    const { data, error } = await supabase
      .from('trip_destinations')
      .select(
        'id, name, visited'
      )
      .eq('trip_id', String(tripId))
      .order('created_at', {
        ascending: true,
      });

    if (error) {
      console.log(
        'Places loading error:',
        error.message
      );

      Alert.alert(
        'Places Loading Error',
        error.message
      );

      setLoadingPlaces(false);
      return;
    }

    setPlaces(
      (data ?? []).map((place) => ({
        id: place.id,
        name: place.name,
        visited: place.visited,
      }))
    );

    setLoadingPlaces(false);
  };

  const addPlace = () => {
    setPlaces((currentPlaces) => [
      ...currentPlaces,
      {
        name: '',
        visited: false,
      },
    ]);
  };

  const updatePlace = (
    index: number,
    value: string
  ) => {
    setPlaces((currentPlaces) =>
      currentPlaces.map((place, placeIndex) =>
        placeIndex === index
          ? {
              ...place,
              name: value,
            }
          : place
      )
    );
  };

  const removePlace = (index: number) => {
    setPlaces((currentPlaces) =>
      currentPlaces.filter(
        (_, placeIndex) =>
          placeIndex !== index
      )
    );
  };

  const handleSave = async () => {
    if (
      !tripName.trim() ||
      !tripDestination.trim() ||
      !start.trim() ||
      !end.trim()
    ) {
      Alert.alert(
        'Missing information',
        'Please fill in all fields.'
      );
      return;
    }

    if (!tripId) {
      Alert.alert(
        'Error',
        'Trip ID is missing.'
      );
      return;
    }

    const {
      data: { user },
      error: userError,
    } = await supabase.auth.getUser();

    if (userError || !user) {
      Alert.alert(
        'Login Required',
        'Please login first.'
      );
      return;
    }

    const cleanedPlaces = places
      .map((place) => ({
        ...place,
        name: place.name.trim(),
      }))
      .filter((place) => place.name.length > 0);

    setSaving(true);

    const { data: tripData, error: tripError } =
      await supabase
        .from('trips')
        .update({
          name: tripName.trim(),
          destination: tripDestination.trim(),
          start_date: start.trim(),
          end_date: end.trim(),
        })
        .eq('id', String(tripId))
        .eq('created_by', user.id)
        .select()
        .maybeSingle();

    if (tripError) {
      setSaving(false);

      Alert.alert(
        'Update Failed',
        tripError.message
      );
      return;
    }

    if (!tripData) {
      setSaving(false);

      Alert.alert(
        'Update Failed',
        'No trip was updated. You may not be the owner of this trip.'
      );
      return;
    }

    const {
      data: existingPlaces,
      error: existingPlacesError,
    } = await supabase
      .from('trip_destinations')
      .select(
        'id, name, visited'
      )
      .eq('trip_id', String(tripId));

    if (existingPlacesError) {
      setSaving(false);

      Alert.alert(
        'Update Failed',
        existingPlacesError.message
      );
      return;
    }

    const existingIds = new Set(
      (existingPlaces ?? []).map(
        (place) => place.id
      )
    );

    const currentExistingIds = new Set(
      cleanedPlaces
        .filter((place) => place.id)
        .map((place) => place.id)
    );

    const placesToDelete =
      (existingPlaces ?? []).filter(
        (place) =>
          !currentExistingIds.has(place.id)
      );

    for (const place of placesToDelete) {
      const { error } = await supabase
        .from('trip_destinations')
        .delete()
        .eq('id', place.id)
        .eq('trip_id', String(tripId));

      if (error) {
        setSaving(false);

        Alert.alert(
          'Places Update Failed',
          error.message
        );
        return;
      }
    }

    for (const place of cleanedPlaces) {
      if (
        place.id &&
        existingIds.has(place.id)
      ) {
        const { error } = await supabase
          .from('trip_destinations')
          .update({
            name: place.name,
          })
          .eq('id', place.id)
          .eq('trip_id', String(tripId));

        if (error) {
          setSaving(false);

          Alert.alert(
            'Places Update Failed',
            error.message
          );
          return;
        }
      }
    }

    const newPlaces = cleanedPlaces.filter(
      (place) => !place.id
    );

    if (newPlaces.length > 0) {
      const { error } = await supabase
        .from('trip_destinations')
        .insert(
          newPlaces.map((place) => ({
            trip_id: String(tripId),
            name: place.name,
            visited: false,
          }))
        );

      if (error) {
        setSaving(false);

        Alert.alert(
          'Places Update Failed',
          error.message
        );
        return;
      }
    }

    setSaving(false);

    Alert.alert(
      'Success',
      'Trip updated successfully.',
      [
        {
          text: 'OK',
          onPress: () => router.back(),
        },
      ]
    );
  };

  return (
    <ScrollView
      style={styles.scrollView}
      contentContainerStyle={styles.container}
      keyboardShouldPersistTaps="handled"
      showsVerticalScrollIndicator={false}
    >
      <Text style={styles.title}>
        Edit Trip
      </Text>

      <Text style={styles.label}>
        Trip Name
      </Text>

      <TextInput
        style={styles.input}
        value={tripName}
        onChangeText={setTripName}
        placeholder="Enter trip name"
        placeholderTextColor="#9CA3AF"
      />

      <Text style={styles.label}>
        Destination
      </Text>

      <TextInput
        style={styles.input}
        value={tripDestination}
        onChangeText={setTripDestination}
        placeholder="Enter destination"
        placeholderTextColor="#9CA3AF"
      />

      <Text style={styles.label}>
        Start Date
      </Text>

      <TextInput
        style={styles.input}
        value={start}
        onChangeText={setStart}
        placeholder="YYYY-MM-DD"
        placeholderTextColor="#9CA3AF"
      />

      <Text style={styles.label}>
        End Date
      </Text>

      <TextInput
        style={styles.input}
        value={end}
        onChangeText={setEnd}
        placeholder="YYYY-MM-DD"
        placeholderTextColor="#9CA3AF"
      />

      <Text style={styles.placesTitle}>
        Places to Visit
      </Text>

      <Text style={styles.placesSubtitle}>
        Add, remove, or rename places for this
        trip.
      </Text>

      {loadingPlaces ? (
        <View style={styles.loadingPlaces}>
          <ActivityIndicator />
          <Text style={styles.loadingText}>
            Loading places...
          </Text>
        </View>
      ) : (
        <>
          {places.map((place, index) => (
            <View
              key={
                place.id ??
                `new-place-${index}`
              }
              style={styles.placeRow}
            >
              <View style={styles.placeInputContainer}>
                <TextInput
                  style={styles.placeInput}
                  value={place.name}
                  onChangeText={(value) =>
                    updatePlace(
                      index,
                      value
                    )
                  }
                  placeholder={`Place ${index + 1}`}
                  placeholderTextColor="#9CA3AF"
                />

                {place.visited && (
                  <Text
                    style={styles.visitedText}
                  >
                    ✓ Visited
                  </Text>
                )}
              </View>

              <TouchableOpacity
                style={styles.removeButton}
                onPress={() =>
                  removePlace(index)
                }
                disabled={saving}
              >
                <Text
                  style={
                    styles.removeButtonText
                  }
                >
                  ×
                </Text>
              </TouchableOpacity>
            </View>
          ))}

          <TouchableOpacity
            style={styles.addButton}
            onPress={addPlace}
            disabled={saving}
          >
            <Text
              style={styles.addButtonText}
            >
              + Add another place
            </Text>
          </TouchableOpacity>
        </>
      )}

      <TouchableOpacity
        style={styles.saveButton}
        onPress={handleSave}
        disabled={
          saving || loadingPlaces
        }
      >
        {saving ? (
          <ActivityIndicator color="#FFFFFF" />
        ) : (
          <Text style={styles.saveText}>
            Save Changes
          </Text>
        )}
      </TouchableOpacity>

      <TouchableOpacity
        style={styles.cancelButton}
        onPress={() => router.back()}
        disabled={saving}
      >
        <Text style={styles.cancelText}>
          Cancel
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
    marginBottom: 25,
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
    borderRadius: 12,
    paddingHorizontal: 16,
    fontSize: 16,
    color: '#111827',
  },

  placesTitle: {
    fontSize: 20,
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

  loadingPlaces: {
    backgroundColor: '#FFFFFF',
    borderRadius: 12,
    padding: 20,
    alignItems: 'center',
    borderWidth: 1,
    borderColor: '#E5E7EB',
  },

  loadingText: {
    fontSize: 14,
    color: '#6B7280',
    marginTop: 8,
  },

  placeRow: {
    flexDirection: 'row',
    alignItems: 'center',
    marginBottom: 10,
  },

  placeInputContainer: {
    flex: 1,
  },

  placeInput: {
    height: 50,
    backgroundColor: '#FFFFFF',
    borderWidth: 1,
    borderColor: '#D1D5DB',
    borderRadius: 10,
    paddingHorizontal: 16,
    fontSize: 16,
    color: '#111827',
  },

  visitedText: {
    fontSize: 12,
    color: '#2563EB',
    fontWeight: '600',
    marginTop: 4,
    marginLeft: 4,
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

  saveButton: {
    height: 52,
    backgroundColor: '#2563EB',
    borderRadius: 12,
    justifyContent: 'center',
    alignItems: 'center',
    marginTop: 28,
  },

  saveText: {
    color: '#FFFFFF',
    fontSize: 16,
    fontWeight: '700',
  },

  cancelButton: {
    height: 52,
    backgroundColor: '#FFFFFF',
    borderWidth: 1,
    borderColor: '#D1D5DB',
    borderRadius: 12,
    justifyContent: 'center',
    alignItems: 'center',
    marginTop: 12,
  },

  cancelText: {
    color: '#374151',
    fontSize: 16,
    fontWeight: '600',
  },
});
