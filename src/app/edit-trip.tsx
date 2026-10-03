import { useState } from 'react';
import {
  ActivityIndicator,
  Alert,
  StyleSheet,
  Text,
  TextInput,
  TouchableOpacity,
  View,
} from 'react-native';
import { router, useLocalSearchParams } from 'expo-router';

import { supabase } from '@/services/supabase';

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

  const [saving, setSaving] = useState(false);

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

    setSaving(true);

    const { data, error } = await supabase
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

    setSaving(false);

    console.log('Update result:', data);
    console.log('Update error:', error);
    console.log('Current user:', user.id);
    console.log('Trip ID:', tripId);

    if (error) {
      Alert.alert(
        'Update Failed',
        error.message
      );
      return;
    }

    if (!data) {
      Alert.alert(
        'Update Failed',
        'No trip was updated. You may not be the owner of this trip.'
      );
      return;
    }

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
    <View style={styles.container}>
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

      <TouchableOpacity
        style={styles.saveButton}
        onPress={handleSave}
        disabled={saving}
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