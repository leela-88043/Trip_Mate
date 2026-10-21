import { useEffect, useState } from 'react';
import {
  ActivityIndicator,
  ScrollView,
  StyleSheet,
  Switch,
  Text,
  TextInput,
  TouchableOpacity,
  View,
} from 'react-native';

import {
  loadTravelPreferences,
  saveTravelPreferences,
} from '@/services/travelPreferences';

const emptyForm = {
  bio: '',
  interests: '',
  destinations: '',
  startDate: '',
  endDate: '',
  budgetMin: '',
  budgetMax: '',
  currency: 'INR',
  travelStyle: '',
  discoverable: false,
};

function isValidDate(value: string) {
  if (!/^\d{4}-\d{2}-\d{2}$/.test(value)) return false;

  const date = new Date(`${value}T00:00:00Z`);

  return (
    !Number.isNaN(date.getTime()) &&
    date.toISOString().slice(0, 10) === value
  );
}

function splitList(value: string) {
  return Array.from(
    new Set(
      value
        .split(',')
        .map((item) => item.trim())
        .filter(Boolean)
    )
  );
}

export default function TravelPreferencesScreen() {
  const [form, setForm] = useState(emptyForm);
  const [loading, setLoading] = useState(true);
  const [ready, setReady] = useState(false);
  const [saving, setSaving] = useState(false);
  const [message, setMessage] = useState('');
  const [success, setSuccess] = useState(false);

  function change<K extends keyof typeof emptyForm>(
    key: K,
    value: (typeof emptyForm)[K]
  ) {
    setForm((current) => ({ ...current, [key]: value }));
    setMessage('');
  }

  async function load() {
    setLoading(true);
    setReady(false);
    setMessage('');
    setSuccess(false);

    try {
      const data = await loadTravelPreferences();

      setForm(
        data
          ? {
              bio: data.bio ?? '',
              interests: data.interests.join(', '),
              destinations: data.preferred_destinations.join(', '),
              startDate: data.travel_start_date ?? '',
              endDate: data.travel_end_date ?? '',
              budgetMin: data.budget_min?.toString() ?? '',
              budgetMax: data.budget_max?.toString() ?? '',
              currency: data.budget_currency,
              travelStyle: data.travel_style ?? '',
              discoverable: data.discovery_enabled,
            }
          : { ...emptyForm }
      );

      setReady(true);
    } catch (error) {
      setMessage(
        error instanceof Error ? error.message : 'Unable to load preferences.'
      );
    } finally {
      setLoading(false);
    }
  }

  useEffect(() => {
    void load();
  }, []);

  async function save() {
    setSuccess(false);
    setMessage('');

    const start = form.startDate.trim();
    const end = form.endDate.trim();
    const minText = form.budgetMin.trim();
    const maxText = form.budgetMax.trim();

    if (
      (start && !isValidDate(start)) ||
      (end && !isValidDate(end))
    ) {
      setMessage('Enter valid dates in YYYY-MM-DD format.');
      return;
    }

    if (start && end && end < start) {
      setMessage('End date must be on or after the start date.');
      return;
    }

    const validBudget = (value: string) =>
      value === '' ||
      (/^\d{1,10}(\.\d{1,2})?$/.test(value) &&
        Number.isFinite(Number(value)));

    if (!validBudget(minText) || !validBudget(maxText)) {
      setMessage('Enter positive budget amounts with up to two decimals.');
      return;
    }

    const min = minText === '' ? null : Number(minText);
    const max = maxText === '' ? null : Number(maxText);

    if (min !== null && max !== null && max < min) {
      setMessage('Maximum budget must be at least the minimum budget.');
      return;
    }

    setSaving(true);

    try {
      await saveTravelPreferences({
        bio: form.bio.trim() || null,
        interests: splitList(form.interests),
        preferred_destinations: splitList(form.destinations),
        travel_start_date: start || null,
        travel_end_date: end || null,
        budget_min: min,
        budget_max: max,
        budget_currency: form.currency,
        travel_style: form.travelStyle.trim() || null,
        discovery_enabled: form.discoverable,
      });

      setSuccess(true);
      setMessage('Your travel preferences have been saved.');
    } catch (error) {
      setMessage(
        error instanceof Error ? error.message : 'Unable to save preferences.'
      );
    } finally {
      setSaving(false);
    }
  }

  if (loading) {
    return (
      <View style={styles.center}>
        <ActivityIndicator size="large" color="#4F8CFF" />
        <Text style={styles.help}>Loading travel preferences...</Text>
      </View>
    );
  }

  if (!ready) {
    return (
      <View style={styles.center}>
        <Text style={styles.error}>{message}</Text>
        <TouchableOpacity style={styles.button} onPress={() => void load()}>
          <Text style={styles.buttonText}>Retry</Text>
        </TouchableOpacity>
      </View>
    );
  }

  const fields = [
    { key: 'bio', label: 'About you', placeholder: 'Tell other travellers about yourself' },
    { key: 'interests', label: 'Interests', placeholder: 'Hiking, photography, food' },
    { key: 'destinations', label: 'Preferred destinations', placeholder: 'Manali, Goa, Shillong' },
    { key: 'startDate', label: 'Travel start date', placeholder: 'YYYY-MM-DD' },
    { key: 'endDate', label: 'Travel end date', placeholder: 'YYYY-MM-DD' },
    { key: 'budgetMin', label: `Minimum trip budget (${form.currency})`, placeholder: '5000' },
    { key: 'budgetMax', label: `Maximum trip budget (${form.currency})`, placeholder: '15000' },
    { key: 'travelStyle', label: 'Travel style', placeholder: 'Backpacking, relaxed, adventure...' },
  ] as const;

  return (
    <ScrollView
      style={styles.container}
      contentContainerStyle={styles.content}
      keyboardShouldPersistTaps="handled"
    >
      <Text style={styles.title}>Travel Preferences</Text>
      <Text style={styles.help}>
        Add your travel plans to help you find suitable companions.
        All fields are optional.
      </Text>

      <View style={styles.card}>
        {fields.map((field) => (
          <View key={field.key} style={styles.field}>
            <Text style={styles.label}>{field.label}</Text>
            <TextInput
              accessibilityLabel={field.label}
              style={[styles.input, field.key === 'bio' && styles.bio]}
              placeholder={field.placeholder}
              placeholderTextColor="#9299A8"
              value={form[field.key]}
              onChangeText={(value) => change(field.key, value)}
              editable={!saving}
              multiline={field.key === 'bio'}
              maxLength={field.key === 'bio' ? 500 : 200}
              keyboardType={
                field.key === 'budgetMin' || field.key === 'budgetMax'
                  ? 'decimal-pad'
                  : 'default'
              }
            />
          </View>
        ))}

        <Text style={styles.help}>
          Separate interests and destinations with commas.
          Budget means your total budget per person for the trip.
        </Text>
      </View>

      <View style={styles.card}>
        <View style={styles.switchRow}>
          <Text style={styles.switchLabel}>Find travel companions</Text>
          <Switch
            accessibilityLabel="Enable companion discovery"
            value={form.discoverable}
            onValueChange={(value) => change('discoverable', value)}
            disabled={saving}
            trackColor={{ false: '#353B49', true: '#4F8CFF' }}
          />
        </View>
        <Text style={styles.help}>
          When enabled, other logged-in users can discover your travel
          preferences. Turn it off to hide them from new discovery searches.
        </Text>
      </View>

      {!!message && (
        <Text
          accessibilityLiveRegion="polite"
          style={success ? styles.success : styles.error}
        >
          {message}
        </Text>
      )}

      <TouchableOpacity
        accessibilityRole="button"
        style={[styles.button, saving && styles.disabled]}
        onPress={() => void save()}
        disabled={saving}
      >
        <Text style={styles.buttonText}>
          {saving ? 'Saving...' : 'Save Preferences'}
        </Text>
      </TouchableOpacity>
    </ScrollView>
  );
}

const styles = StyleSheet.create({
  container: { flex: 1, backgroundColor: '#08090D' },
  content: { padding: 24, paddingBottom: 60 },
  center: {
    flex: 1,
    backgroundColor: '#08090D',
    justifyContent: 'center',
    alignItems: 'center',
    padding: 24,
  },
  title: { color: '#F7F8FC', fontSize: 28, fontWeight: '700' },
  help: { color: '#9299A8', fontSize: 14, lineHeight: 21, marginTop: 8 },
  card: {
    backgroundColor: '#151821',
    borderColor: '#252A37',
    borderWidth: 1,
    borderRadius: 16,
    padding: 18,
    marginTop: 20,
  },
  field: { marginBottom: 16 },
  label: { color: '#F7F8FC', fontSize: 14, marginBottom: 8 },
  input: {
    color: '#F7F8FC',
    backgroundColor: '#08090D',
    borderColor: '#303646',
    borderWidth: 1,
    borderRadius: 10,
    paddingHorizontal: 14,
    paddingVertical: 13,
    fontSize: 15,
  },
  bio: { minHeight: 90, textAlignVertical: 'top' },
  switchRow: {
    flexDirection: 'row',
    justifyContent: 'space-between',
    alignItems: 'center',
  },
  switchLabel: { color: '#F7F8FC', fontSize: 16, flex: 1 },
  button: {
    backgroundColor: '#4F8CFF',
    borderRadius: 12,
    padding: 16,
    alignItems: 'center',
    marginTop: 20,
  },
  buttonText: { color: '#FFFFFF', fontSize: 16, fontWeight: '700' },
  disabled: { opacity: 0.6 },
  error: { color: '#FF9B9B', marginTop: 16 },
  success: { color: '#83DCAA', marginTop: 16 },
});