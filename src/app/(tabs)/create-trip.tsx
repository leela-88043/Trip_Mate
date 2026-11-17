
import { useEffect, useState } from 'react';
import {
  Alert,
  Platform,
  ScrollView,
  StyleSheet,
  Text,
  TextInput,
  TouchableOpacity,
  View,
} from 'react-native';
import DateTimePicker, {
  DateTimePickerEvent,
} from '@react-native-community/datetimepicker';
import { router, useLocalSearchParams } from 'expo-router';

import { supabase } from '@/services/supabase';
import { createTrip } from '@/services/trip';
import { getTodayKey } from '@/utils/tripTimeline';

const TRIP_CATEGORIES = [
  { value: 'beach', label: '🏖️ Beaches' },
  { value: 'mountain', label: '🏔️ Mountains' },
  { value: 'nature', label: '🌿 Nature' },
  { value: 'adventure', label: '🧗 Adventure' },
  { value: 'heritage', label: '🏛️ Heritage' },
  { value: 'city', label: '🌆 Cities' },
  { value: 'other', label: '✨ Other' },
];

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

// Converts a Date object into YYYY-MM-DD using local calendar values.
function formatDateKey(date: Date) {
  const year = date.getFullYear();
  const month = String(date.getMonth() + 1).padStart(2, '0');
  const day = String(date.getDate()).padStart(2, '0');

  return `${year}-${month}-${day}`;
}

// Converts YYYY-MM-DD into a local Date object.
function parseDateKey(value: string) {
  if (!isValidDate(value)) {
    return new Date();
  }

  const [year, month, day] = value.split('-').map(Number);

  return new Date(year, month - 1, day, 12, 0, 0);
}

// Displays dates in a user-friendly format.
function displayDate(value: string) {
  if (!value || !isValidDate(value)) {
    return 'Select date';
  }

  return parseDateKey(value).toLocaleDateString('en-IN', {
    day: 'numeric',
    month: 'long',
    year: 'numeric',
  });
}

export default function CreateTripScreen() {
  const params = useLocalSearchParams<{
    destination?: string | string[];
    planningKey?: string | string[];
  }>();

  const incomingDestination = (
    Array.isArray(params.destination)
      ? params.destination[0]
      : params.destination
  )?.trim() ?? '';

  const planningKey = Array.isArray(params.planningKey)
    ? params.planningKey[0]
    : params.planningKey;

  const [name, setName] = useState('');
  const [destination, setDestination] = useState(incomingDestination);
  const [startDate, setStartDate] = useState('');
  const [endDate, setEndDate] = useState('');
  const [places, setPlaces] = useState(['']);
  const [categories, setCategories] = useState<string[]>([]);
  const [loading, setLoading] = useState(false);
  const [errorMessage, setErrorMessage] = useState('');
  const [createdTripId, setCreatedTripId] = useState<string | null>(null);

  const [showStartPicker, setShowStartPicker] = useState(false);
  const [showEndPicker, setShowEndPicker] = useState(false);

  const today = getTodayKey();
  const todayDate = parseDateKey(today);

  const startPickerValue = startDate
    ? parseDateKey(startDate)
    : todayDate;

  const endPickerValue = endDate
    ? parseDateKey(endDate)
    : startDate
      ? parseDateKey(startDate)
      : todayDate;

  const minimumEndDate = startDate && startDate > today
    ? parseDateKey(startDate)
    : todayDate;

  useEffect(() => {
    if (incomingDestination) {
      setDestination(incomingDestination);
      setErrorMessage('');
    }
  }, [incomingDestination, planningKey]);

  function showError(title: string, message: string) {
    setErrorMessage(message);
    Alert.alert(title, message);
  }

  function toggleCategory(value: string) {
    setCategories((current) =>
      current.includes(value)
        ? current.filter((item) => item !== value)
        : [...current, value]
    );
  }

  function handleStartDateChange(
    event: DateTimePickerEvent,
    selectedDate?: Date
  ) {
    if (Platform.OS === 'android') {
      setShowStartPicker(false);
    }

    if (event.type === 'dismissed' || !selectedDate) {
      return;
    }

    const selectedKey = formatDateKey(selectedDate);
    setStartDate(selectedKey);

    // Keep the end date on or after the selected start date.
    if (endDate && endDate < selectedKey) {
      setEndDate(selectedKey);
    }
  }

  function handleEndDateChange(
    event: DateTimePickerEvent,
    selectedDate?: Date
  ) {
    if (Platform.OS === 'android') {
      setShowEndPicker(false);
    }

    if (event.type === 'dismissed' || !selectedDate) {
      return;
    }

    setEndDate(formatDateKey(selectedDate));
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

  function resetForm() {
    setName('');
    setDestination('');
    setStartDate('');
    setEndDate('');
    setPlaces(['']);
    setCategories([]);
    setErrorMessage('');
    setCreatedTripId(null);
    setShowStartPicker(false);
    setShowEndPicker(false);
  }

  async function handleCreateTrip() {
    if (loading || createdTripId) return;

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
        'Please select valid start and end dates.'
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

    const currentToday = getTodayKey();

    if (end < currentToday) {
      showError(
        'Trip dates have already passed',
        `This trip would already be completed because its end date is before today (${currentToday}). Please select an end date of today or later.`
      );
      return;
    }

    if (categories.length === 0) {
      showError(
        'Select a category',
        'Please select at least one category that describes your trip.'
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
        user.id,
        categories
      );

      if (error || !data) {
        throw new Error(error?.message || 'Failed to create trip.');
      }

      setCreatedTripId(data.id);

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
          `The trip was created, but its places could not be saved: ${placesError.message}. Open the created trip to manage its places.`
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

  const formDisabled = loading || createdTripId !== null;

  return (
    <ScrollView
      style={styles.scrollView}
      contentContainerStyle={styles.container}
      keyboardShouldPersistTaps="handled"
    >
      <Text style={styles.title}>Create Trip</Text>

      <Text style={styles.help}>
        Choose your destination, dates, categories, and places to visit.
      </Text>

      <Text style={styles.label}>Trip Name</Text>
      <TextInput
        style={styles.input}
        placeholder="Example: Meghalaya Trip"
        placeholderTextColor="#9CA3AF"
        value={name}
        onChangeText={setName}
        editable={!formDisabled}
      />

      <Text style={styles.label}>Destination</Text>
      <TextInput
        style={styles.input}
        placeholder="Example: Shillong"
        placeholderTextColor="#9CA3AF"
        value={destination}
        onChangeText={setDestination}
        editable={!formDisabled}
      />

      {/* START DATE PICKER */}
      <Text style={styles.label}>Start Date</Text>

      <TouchableOpacity
        accessibilityRole="button"
        accessibilityLabel={`Choose start date. Current date: ${displayDate(startDate)}`}
        style={[
          styles.dateButton,
          formDisabled && styles.dateButtonDisabled,
        ]}
        onPress={() => {
          setShowEndPicker(false);
          setShowStartPicker(true);
        }}
        disabled={formDisabled}
      >
        <View>
          <Text style={styles.dateButtonLabel}>Departure</Text>
          <Text
            style={[
              styles.dateButtonValue,
              !startDate && styles.datePlaceholder,
            ]}
          >
            {displayDate(startDate)}
          </Text>
        </View>

        <Text style={styles.calendarIcon}>📅</Text>
      </TouchableOpacity>

      {showStartPicker && (
        <View style={styles.pickerContainer}>
          <DateTimePicker
            value={startPickerValue}
            mode="date"
            display={Platform.OS === 'ios' ? 'spinner' : 'default'}
            minimumDate={todayDate}
            onChange={handleStartDateChange}
          />

          {Platform.OS === 'ios' && (
            <TouchableOpacity
              style={styles.pickerDoneButton}
              onPress={() => setShowStartPicker(false)}
            >
              <Text style={styles.pickerDoneText}>Done</Text>
            </TouchableOpacity>
          )}
        </View>
      )}

      {/* END DATE PICKER */}
      <Text style={styles.label}>End Date</Text>

      <TouchableOpacity
        accessibilityRole="button"
        accessibilityLabel={`Choose end date. Current date: ${displayDate(endDate)}`}
        style={[
          styles.dateButton,
          formDisabled && styles.dateButtonDisabled,
        ]}
        onPress={() => {
          setShowStartPicker(false);
          setShowEndPicker(true);
        }}
        disabled={formDisabled}
      >
        <View>
          <Text style={styles.dateButtonLabel}>Return</Text>
          <Text
            style={[
              styles.dateButtonValue,
              !endDate && styles.datePlaceholder,
            ]}
          >
            {displayDate(endDate)}
          </Text>
        </View>

        <Text style={styles.calendarIcon}>📅</Text>
      </TouchableOpacity>

      {showEndPicker && (
        <View style={styles.pickerContainer}>
          <DateTimePicker
            value={endPickerValue}
            mode="date"
            display={Platform.OS === 'ios' ? 'spinner' : 'default'}
            minimumDate={minimumEndDate}
            onChange={handleEndDateChange}
          />

          {Platform.OS === 'ios' && (
            <TouchableOpacity
              style={styles.pickerDoneButton}
              onPress={() => setShowEndPicker(false)}
            >
              <Text style={styles.pickerDoneText}>Done</Text>
            </TouchableOpacity>
          )}
        </View>
      )}

      <Text style={styles.help}>
        Select your dates using the calendar. The return date cannot be
        earlier than your departure date.
      </Text>

      {/* TRIP CATEGORY SELECTION */}
      <Text style={styles.sectionTitle}>Trip Categories</Text>

      <Text style={styles.sectionSubtitle}>
        What kind of experience are you planning? Select all that apply.
      </Text>

      <View style={styles.categoryContainer}>
        {TRIP_CATEGORIES.map((item) => {
          const selected = categories.includes(item.value);

          return (
            <TouchableOpacity
              key={item.value}
              accessibilityRole="checkbox"
              accessibilityState={{ checked: selected }}
              style={[
                styles.categoryChip,
                selected && styles.selectedCategoryChip,
              ]}
              onPress={() => toggleCategory(item.value)}
              disabled={formDisabled}
            >
              <Text
                style={[
                  styles.categoryText,
                  selected && styles.selectedCategoryText,
                ]}
              >
                {item.label}
              </Text>

              {selected && (
                <Text style={styles.categoryCheck}>✓</Text>
              )}
            </TouchableOpacity>
          );
        })}
      </View>

      <Text style={styles.selectionHint}>
        {categories.length === 0
          ? 'Select at least one category'
          : `${categories.length} ${
              categories.length === 1 ? 'category' : 'categories'
            } selected`}
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
            editable={!formDisabled}
          />

          <TouchableOpacity
            accessibilityRole="button"
            accessibilityLabel={`Remove place ${index + 1}`}
            style={styles.removeButton}
            onPress={() => removePlace(index)}
            disabled={formDisabled}
          >
            <Text style={styles.removeButtonText}>×</Text>
          </TouchableOpacity>
        </View>
      ))}

      <TouchableOpacity
        accessibilityRole="button"
        style={styles.addButton}
        onPress={addPlace}
        disabled={formDisabled}
      >
        <Text style={styles.addButtonText}>+ Add another place</Text>
      </TouchableOpacity>

      {!!errorMessage && (
        <Text accessibilityLiveRegion="polite" style={styles.error}>
          {errorMessage}
        </Text>
      )}

      {createdTripId ? (
        <View style={styles.createdCard}>
          <Text style={styles.createdText}>
            Your trip has been created.
          </Text>

          <TouchableOpacity
            accessibilityRole="button"
            style={[styles.button, loading && styles.disabled]}
            disabled={loading}
            onPress={() =>
              router.push(`/trip-details?tripId=${createdTripId}`)
            }
          >
            <Text style={styles.buttonText}>Open Created Trip</Text>
          </TouchableOpacity>

          <TouchableOpacity
            accessibilityRole="button"
            style={styles.resetButton}
            disabled={loading}
            onPress={resetForm}
          >
            <Text style={styles.addButtonText}>
              Start Another Trip
            </Text>
          </TouchableOpacity>
        </View>
      ) : (
        <TouchableOpacity
          accessibilityRole="button"
          style={[styles.button, loading && styles.disabled]}
          onPress={() => void handleCreateTrip()}
          disabled={loading}
        >
          <Text style={styles.buttonText}>
            {loading ? 'Creating...' : 'Create Trip'}
          </Text>
        </TouchableOpacity>
      )}
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
  dateButton: {
    minHeight: 69,
    backgroundColor: '#151821',
    borderWidth: 1,
    borderColor: '#292E3B',
    borderRadius: 14,
    paddingHorizontal: 16,
    paddingVertical: 11,
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'space-between',
  },
  dateButtonDisabled: {
    opacity: 0.6,
  },
  dateButtonLabel: {
    color: '#9299A8',
    fontSize: 11,
    fontWeight: '600',
    marginBottom: 5,
  },
  dateButtonValue: {
    color: '#F7F8FC',
    fontSize: 15,
    fontWeight: '700',
  },
  datePlaceholder: {
    color: '#9CA3AF',
    fontWeight: '500',
  },
  calendarIcon: {
    fontSize: 22,
  },
  pickerContainer: {
    backgroundColor: '#151821',
    borderWidth: 1,
    borderColor: '#292E3B',
    borderRadius: 14,
    marginTop: 10,
    padding: 8,
  },
  pickerDoneButton: {
    alignSelf: 'flex-end',
    backgroundColor: '#4F8CFF',
    paddingHorizontal: 22,
    paddingVertical: 10,
    borderRadius: 10,
    marginTop: 5,
    marginRight: 5,
    marginBottom: 5,
  },
  pickerDoneText: {
    color: '#FFFFFF',
    fontWeight: '800',
  },
  sectionTitle: {
    fontSize: 19,
    fontWeight: '800',
    color: '#F7F8FC',
    marginTop: 30,
    marginBottom: 7,
  },
  sectionSubtitle: {
    fontSize: 13,
    color: '#9299A8',
    lineHeight: 20,
    marginBottom: 15,
  },
  categoryContainer: {
    flexDirection: 'row',
    flexWrap: 'wrap',
    gap: 10,
  },
  categoryChip: {
    flexDirection: 'row',
    alignItems: 'center',
    backgroundColor: '#151821',
    borderWidth: 1,
    borderColor: '#292E3B',
    borderRadius: 22,
    paddingHorizontal: 14,
    paddingVertical: 11,
  },
  selectedCategoryChip: {
    backgroundColor: '#20385F',
    borderColor: '#4F8CFF',
  },
  categoryText: {
    color: '#C5CBD8',
    fontSize: 13,
    fontWeight: '600',
  },
  selectedCategoryText: {
    color: '#FFFFFF',
  },
  categoryCheck: {
    color: '#83B1FF',
    fontWeight: '800',
    marginLeft: 7,
  },
  selectionHint: {
    color: '#9299A8',
    fontSize: 12,
    marginTop: 12,
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
  createdCard: {
    marginTop: 20,
  },
  createdText: {
    color: '#83DCAA',
    fontSize: 15,
    fontWeight: '600',
  },
  resetButton: {
    padding: 16,
    alignItems: 'center',
    marginTop: 8,
  },
});
