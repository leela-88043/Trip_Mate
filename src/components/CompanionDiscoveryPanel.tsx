import { useEffect, useState } from 'react';
import {
  ActivityIndicator,
  FlatList,
  Image,
  Modal,
  ScrollView,
  StyleSheet,
  Text,
  TextInput,
  TouchableOpacity,
  View,
} from 'react-native';
import { router } from 'expo-router';

import {
  loadCompanions,
  type Companion,
} from '@/services/companionDiscovery';
import {
  acceptCompanionRequest,
  cancelCompanionRequest,
  declineCompanionRequest,
  loadCompanionRequests,
  sendCompanionRequest,
  type CompanionRequest,
} from '@/services/companionRequests';

const emptyFilters = {
  destination: '',
  style: '',
  start: '',
  end: '',
  min: '',
  max: '',
  currency: 'INR',
};

type Filters = typeof emptyFilters;

const filterFields = [
  {
    key: 'destination',
    label: 'Preferred destination',
    placeholder: 'Manali',
  },
  {
    key: 'style',
    label: 'Travel style',
    placeholder: 'Backpacking, relaxed, adventure...',
  },
  {
    key: 'start',
    label: 'Your travel start date',
    placeholder: 'YYYY-MM-DD',
  },
  {
    key: 'end',
    label: 'Your travel end date',
    placeholder: 'YYYY-MM-DD',
  },
  {
    key: 'min',
    label: 'Minimum total budget per person',
    placeholder: '5000',
  },
  {
    key: 'max',
    label: 'Maximum total budget per person',
    placeholder: '15000',
  },
  {
    key: 'currency',
    label: 'Budget currency',
    placeholder: 'INR',
  },
] as const;

function validDate(value: string) {
  if (!/^\d{4}-\d{2}-\d{2}$/.test(value)) return false;

  const date = new Date(`${value}T00:00:00Z`);

  return (
    !Number.isNaN(date.getTime()) &&
    date.toISOString().slice(0, 10) === value
  );
}

function matchesFilters(person: Companion, filters: Filters) {
  const contains = (value: string, query: string) =>
    value.toLowerCase().includes(query.toLowerCase());

  if (
    filters.destination &&
    !person.preferred_destinations.some((value) =>
      contains(value, filters.destination)
    )
  ) {
    return false;
  }

  if (
    filters.style &&
    !contains(person.travel_style ?? '', filters.style)
  ) {
    return false;
  }

  // Include travellers whose dates overlap the selected period.
  if (filters.start || filters.end) {
    if (!person.travel_start_date || !person.travel_end_date) {
      return false;
    }

    if (
      filters.start &&
      person.travel_end_date < filters.start
    ) {
      return false;
    }

    if (
      filters.end &&
      person.travel_start_date > filters.end
    ) {
      return false;
    }
  }

  // Compare overlapping budget ranges in the same currency.
  if (filters.min !== '' || filters.max !== '') {
    if (
      person.budget_currency.toUpperCase() !==
      filters.currency.toUpperCase()
    ) {
      return false;
    }

    if (person.budget_min === null && person.budget_max === null) {
      return false;
    }

    const personMin = person.budget_min ?? 0;
    const personMax = person.budget_max ?? Infinity;
    const filterMin = filters.min === '' ? 0 : Number(filters.min);
    const filterMax =
      filters.max === '' ? Infinity : Number(filters.max);

    if (personMax < filterMin || personMin > filterMax) {
      return false;
    }
  }

  return true;
}

function budgetLabel(person: Companion) {
  const {
    budget_min: min,
    budget_max: max,
    budget_currency: currency,
  } = person;

  if (min !== null && max !== null) {
    return `${currency} ${min} – ${max}`;
  }

  if (min !== null) return `From ${currency} ${min}`;
  if (max !== null) return `Up to ${currency} ${max}`;

  return 'Not specified';
}

function Avatar({ person }: { person: Companion }) {
  const [failed, setFailed] = useState(false);

  useEffect(() => {
    setFailed(false);
  }, [person.avatar_url]);

  if (person.avatar_url && !failed) {
    return (
      <Image
        source={{ uri: person.avatar_url }}
        style={styles.avatar}
        accessibilityLabel={`${person.full_name}'s profile picture`}
        onError={() => setFailed(true)}
      />
    );
  }

  return (
    <View style={styles.avatarFallback}>
      <Text style={styles.avatarLetter}>
        {person.full_name.charAt(0).toUpperCase()}
      </Text>
    </View>
  );
}

export default function CompanionDiscoveryPanel() {
  const [mode, setMode] = useState<'travellers' | 'requests'>('travellers');
  const [people, setPeople] = useState<Companion[]>([]);
  const [requests, setRequests] = useState<CompanionRequest[]>([]);
  const [userId, setUserId] = useState('');
  const [search, setSearch] = useState('');
  const [selectedId, setSelectedId] = useState<string | null>(null);

  const [loading, setLoading] = useState(true);
  const [busy, setBusy] = useState('');
  const [error, setError] = useState('');
  const [message, setMessage] = useState('');

  const [filters, setFilters] = useState<Filters>({ ...emptyFilters });
  const [draft, setDraft] = useState<Filters>({ ...emptyFilters });
  const [filtersVisible, setFiltersVisible] = useState(false);
  const [filterError, setFilterError] = useState('');

  const selectedPerson =
    people.find((person) => person.user_id === selectedId) ?? null;

  const activeFilterCount = [
    filters.destination,
    filters.style,
    filters.start,
    filters.end,
    filters.min,
    filters.max,
  ].filter((value) => value !== '').length;

  async function reload() {
    setLoading(true);
    setError('');

    try {
      const [travellers, requestData] = await Promise.all([
        loadCompanions(),
        loadCompanionRequests(),
      ]);

      setPeople(travellers);
      setRequests(requestData.requests);
      setUserId(requestData.userId);
    } catch (err) {
      setPeople([]);
      setRequests([]);
      setSelectedId(null);
      setError(
        err instanceof Error ? err.message : 'Unable to load discovery.'
      );
    } finally {
      setLoading(false);
    }
  }

  useEffect(() => {
    void reload();
  }, []);

  async function performAction(
    key: string,
    action: () => Promise<unknown>,
    successMessage: string
  ) {
    if (busy) return;

    setBusy(key);
    setMessage('');
    setError('');

    try {
      await action();
      setMessage(successMessage);
      await reload();
    } catch (err) {
      setError(
        err instanceof Error ? err.message : 'Unable to complete request.'
      );
    } finally {
      setBusy('');
    }
  }

  function openFilters() {
    setDraft({ ...filters });
    setFilterError('');
    setFiltersVisible(true);
  }

  function clearFilters() {
    setFilters({ ...emptyFilters });
    setDraft({ ...emptyFilters });
    setFilterError('');
  }

  function applyFilters() {
    const next: Filters = {
      destination: draft.destination.trim(),
      style: draft.style.trim(),
      start: draft.start.trim(),
      end: draft.end.trim(),
      min: draft.min.trim(),
      max: draft.max.trim(),
      currency: draft.currency.trim().toUpperCase(),
    };

    if (
      (next.start && !validDate(next.start)) ||
      (next.end && !validDate(next.end))
    ) {
      setFilterError('Enter valid dates in YYYY-MM-DD format.');
      return;
    }

    if (next.start && next.end && next.end < next.start) {
      setFilterError('End date must be on or after the start date.');
      return;
    }

    const validBudget = (value: string) =>
      value === '' ||
      (/^\d{1,10}(\.\d{1,2})?$/.test(value) &&
        Number.isFinite(Number(value)));

    if (!validBudget(next.min) || !validBudget(next.max)) {
      setFilterError(
        'Budget must be zero or greater, with up to two decimal places.'
      );
      return;
    }

    if (
      next.min !== '' &&
      next.max !== '' &&
      Number(next.max) < Number(next.min)
    ) {
      setFilterError('Maximum budget must be at least the minimum.');
      return;
    }

    if (
      (next.min !== '' || next.max !== '') &&
      !/^[A-Z]{3}$/.test(next.currency)
    ) {
      setFilterError('Enter a three-letter currency code, such as INR.');
      return;
    }

    setFilters(next);
    setFilterError('');
    setFiltersVisible(false);
  }

  const query = search.trim().toLowerCase();

  const filteredPeople = people.filter((person) => {
    const matchesSearch = [
      person.full_name,
      person.bio,
      person.travel_style,
      ...person.interests,
      ...person.preferred_destinations,
    ]
      .filter(Boolean)
      .join(' ')
      .toLowerCase()
      .includes(query);

    return matchesSearch && matchesFilters(person, filters);
  });

  const incomingCount = requests.filter(
    (request) =>
      request.receiver_id === userId && request.status === 'pending'
  ).length;

  function getName(id: string) {
    return (
      people.find((person) => person.user_id === id)?.full_name ||
      `Traveller (${id.slice(0, 8)})`
    );
  }

  function actionButton(
    label: string,
    key: string,
    action: () => Promise<unknown>,
    successMessage: string,
    secondary = false
  ) {
    return (
      <TouchableOpacity
        accessibilityRole="button"
        disabled={!!busy || loading}
        style={[
          styles.button,
          secondary && styles.secondaryButton,
          (!!busy || loading) && styles.disabled,
        ]}
        onPress={() => void performAction(key, action, successMessage)}
      >
        <Text style={styles.buttonText}>
          {busy === key ? 'Please wait...' : label}
        </Text>
      </TouchableOpacity>
    );
  }

  function requestControls(person: Companion) {
    const connection = requests.find(
      (request) =>
        (request.status === 'pending' || request.status === 'accepted') &&
        (
          (request.sender_id === userId &&
            request.receiver_id === person.user_id) ||
          (request.receiver_id === userId &&
            request.sender_id === person.user_id)
        )
    );

    if (!connection) {
      return actionButton(
        'Send Request',
        `send-${person.user_id}`,
        () => sendCompanionRequest(person.user_id),
        'Companion request sent.'
      );
    }

    if (connection.status === 'accepted') {
      return <Text style={styles.status}>Connected ✓</Text>;
    }

    if (connection.sender_id === userId) {
      return (
        <>
          <Text style={styles.status}>Request sent · Pending</Text>
          {actionButton(
            'Cancel Request',
            `cancel-${connection.id}`,
            () => cancelCompanionRequest(connection.id),
            'Request cancelled.',
            true
          )}
        </>
      );
    }

    return (
      <>
        <Text style={styles.status}>This traveller sent you a request</Text>
        {actionButton(
          'Accept',
          `accept-${connection.id}`,
          () => acceptCompanionRequest(connection.id),
          'Request accepted. You are now connected.'
        )}
        {actionButton(
          'Decline',
          `decline-${connection.id}`,
          () => declineCompanionRequest(connection.id),
          'Request declined.',
          true
        )}
      </>
    );
  }

  function profileHeader(person: Companion) {
    return (
      <View style={styles.profileRow}>
        <Avatar person={person} />
        <View style={styles.profileText}>
          <Text style={styles.name}>{person.full_name}</Text>
          <Text style={styles.secondary}>
            {person.travel_style || 'Travel style not specified'}
          </Text>
        </View>
      </View>
    );
  }

  function renderPerson({ item }: { item: Companion }) {
    return (
      <View style={styles.card}>
        {profileHeader(item)}

        <Text style={styles.label}>DESTINATIONS</Text>
        <Text style={styles.body}>
          {item.preferred_destinations.join(', ') || 'Open to suggestions'}
        </Text>

        <Text style={styles.label}>TRAVEL DATES</Text>
        <Text style={styles.body}>
          {item.travel_start_date || 'Flexible start'}
          {' → '}
          {item.travel_end_date || 'Flexible end'}
        </Text>

        <Text style={styles.label}>BUDGET PER PERSON</Text>
        <Text style={styles.body}>{budgetLabel(item)}</Text>

        <TouchableOpacity
          accessibilityRole="button"
          style={[styles.button, styles.secondaryButton]}
          onPress={() => setSelectedId(item.user_id)}
        >
          <Text style={styles.buttonText}>View Profile</Text>
        </TouchableOpacity>

        {requestControls(item)}
      </View>
    );
  }

  function renderRequest({ item }: { item: CompanionRequest }) {
    const received = item.receiver_id === userId;
    const otherId = received ? item.sender_id : item.receiver_id;
    const personAvailable = people.some(
      (person) => person.user_id === otherId
    );

    return (
      <View style={styles.card}>
        <Text style={styles.label}>
          {received ? 'RECEIVED REQUEST' : 'SENT REQUEST'}
        </Text>
        <Text style={styles.name}>{getName(otherId)}</Text>
        <Text style={styles.secondary}>
          {new Date(item.created_at).toLocaleDateString()}
        </Text>
        <Text style={styles.status}>Status: {item.status}</Text>

        {personAvailable && (
          <TouchableOpacity
            style={[styles.button, styles.secondaryButton]}
            onPress={() => setSelectedId(otherId)}
          >
            <Text style={styles.buttonText}>View Profile</Text>
          </TouchableOpacity>
        )}

        {item.status === 'pending' && (
          received ? (
            <>
              {actionButton(
                'Accept',
                `accept-${item.id}`,
                () => acceptCompanionRequest(item.id),
                'Request accepted. You are now connected.'
              )}
              {actionButton(
                'Decline',
                `decline-${item.id}`,
                () => declineCompanionRequest(item.id),
                'Request declined.',
                true
              )}
            </>
          ) : (
            actionButton(
              'Cancel Request',
              `cancel-${item.id}`,
              () => cancelCompanionRequest(item.id),
              'Request cancelled.',
              true
            )
          )
        )}
      </View>
    );
  }

  return (
    <View style={styles.container}>
      <View style={styles.toolbar}>
        <TouchableOpacity
          disabled={!!busy || loading}
          onPress={() => router.push('/travel-preferences')}
        >
          <Text style={styles.link}>My Preferences</Text>
        </TouchableOpacity>

        <TouchableOpacity
          disabled={!!busy || loading}
          onPress={() => {
            setMessage('');
            void reload();
          }}
        >
          <Text style={styles.link}>Refresh</Text>
        </TouchableOpacity>
      </View>

      <View style={styles.tabs}>
        <TouchableOpacity
          style={[styles.tab, mode === 'travellers' && styles.selectedTab]}
          onPress={() => setMode('travellers')}
        >
          <Text style={styles.buttonText}>Travellers</Text>
        </TouchableOpacity>

        <TouchableOpacity
          style={[styles.tab, mode === 'requests' && styles.selectedTab]}
          onPress={() => setMode('requests')}
        >
          <Text style={styles.buttonText}>
            Requests ({incomingCount})
          </Text>
        </TouchableOpacity>
      </View>

      {!!message && (
        <Text accessibilityLiveRegion="polite" style={styles.success}>
          {message}
        </Text>
      )}

      {!!error && (
        <View>
          <Text accessibilityLiveRegion="polite" style={styles.error}>
            {error}
          </Text>
          <TouchableOpacity
            disabled={!!busy || loading}
            onPress={() => void reload()}
          >
            <Text style={styles.link}>Retry / Refresh</Text>
          </TouchableOpacity>
        </View>
      )}

      {loading ? (
        <View style={styles.empty}>
          <ActivityIndicator size="large" color="#4F8CFF" />
          <Text style={styles.secondary}>Loading companions...</Text>
        </View>
      ) : mode === 'travellers' ? (
        <>
          <TextInput
            accessibilityLabel="Search travellers"
            style={styles.input}
            placeholder="Search names, destinations, interests..."
            placeholderTextColor="#9299A8"
            value={search}
            onChangeText={setSearch}
            autoCorrect={false}
          />

          <View style={styles.toolbar}>
            <TouchableOpacity
              accessibilityRole="button"
              onPress={openFilters}
            >
              <Text style={styles.link}>
                Filters
                {activeFilterCount > 0 ? ` (${activeFilterCount})` : ''}
              </Text>
            </TouchableOpacity>

            {activeFilterCount > 0 && (
              <TouchableOpacity onPress={clearFilters}>
                <Text style={styles.link}>Clear Filters</Text>
              </TouchableOpacity>
            )}
          </View>

          <FlatList
            data={filteredPeople}
            keyExtractor={(item) => item.user_id}
            renderItem={renderPerson}
            contentContainerStyle={styles.list}
            keyboardShouldPersistTaps="handled"
            ListHeaderComponent={
              <Text style={styles.secondary}>
                {filteredPeople.length} of {people.length} loaded travellers
                {' · Latest 50 discoverable profiles'}
              </Text>
            }
            ListEmptyComponent={
              <View style={styles.empty}>
                <Text style={styles.name}>No travellers found</Text>
                <Text style={styles.secondary}>
                  {query || activeFilterCount > 0
                    ? 'Try another search or clear your filters.'
                    : 'Other users appear when they enable discovery. Your own account is excluded.'}
                </Text>
              </View>
            }
          />
        </>
      ) : (
        <FlatList
          data={requests}
          keyExtractor={(item) => item.id}
          renderItem={renderRequest}
          contentContainerStyle={styles.list}
          ListEmptyComponent={
            <View style={styles.empty}>
              <Text style={styles.name}>No requests yet</Text>
              <Text style={styles.secondary}>
                Sent and received requests will appear here.
              </Text>
            </View>
          }
        />
      )}

      {/* Filters */}
      <Modal
        visible={filtersVisible}
        transparent
        animationType="slide"
        onRequestClose={() => setFiltersVisible(false)}
      >
        <View style={styles.modalBackdrop}>
          <View style={styles.modalCard} accessibilityViewIsModal>
            <View style={styles.modalHeader}>
              <Text style={styles.name}>Filter Travellers</Text>
              <TouchableOpacity
                accessibilityLabel="Close filters"
                onPress={() => setFiltersVisible(false)}
              >
                <Text style={styles.link}>Close</Text>
              </TouchableOpacity>
            </View>

            <ScrollView
              contentContainerStyle={styles.modalContent}
              keyboardShouldPersistTaps="handled"
            >
              <Text style={styles.secondary}>
                Leave fields blank to include all values.
                Destination and travel style accept partial text.
              </Text>

              {filterFields.map((field) => (
                <View key={field.key}>
                  <Text style={styles.label}>{field.label}</Text>
                  <TextInput
                    accessibilityLabel={field.label}
                    style={styles.input}
                    placeholder={field.placeholder}
                    placeholderTextColor="#9299A8"
                    value={draft[field.key]}
                    onChangeText={(value) => {
                      setDraft((current) => ({
                        ...current,
                        [field.key]: value,
                      }));
                      setFilterError('');
                    }}
                    autoCorrect={false}
                    autoCapitalize={
                      field.key === 'currency' ? 'characters' : 'none'
                    }
                    keyboardType={
                      field.key === 'min' || field.key === 'max'
                        ? 'decimal-pad'
                        : 'default'
                    }
                    maxLength={
                      field.key === 'currency'
                        ? 3
                        : field.key === 'start' || field.key === 'end'
                          ? 10
                          : 100
                    }
                  />
                </View>
              ))}

              <Text style={styles.secondary}>
                Dates match overlapping travel periods. Travellers without
                both dates are excluded when date filters are applied.
              </Text>

              <Text style={styles.secondary}>
                Budgets match overlapping ranges in the same currency.
                Profiles without a budget are excluded when budget
                filters are applied. No currency conversion is performed.
              </Text>

              {!!filterError && (
                <Text accessibilityLiveRegion="polite" style={styles.error}>
                  {filterError}
                </Text>
              )}

              <TouchableOpacity
                style={styles.button}
                onPress={applyFilters}
              >
                <Text style={styles.buttonText}>Apply Filters</Text>
              </TouchableOpacity>

              <TouchableOpacity
                style={[styles.button, styles.secondaryButton]}
                onPress={clearFilters}
              >
                <Text style={styles.buttonText}>Clear All Filters</Text>
              </TouchableOpacity>
            </ScrollView>
          </View>
        </View>
      </Modal>

      {/* Traveller profile */}
      <Modal
        visible={selectedPerson !== null}
        transparent
        animationType="slide"
        onRequestClose={() => setSelectedId(null)}
      >
        <View style={styles.modalBackdrop}>
          <View style={styles.modalCard} accessibilityViewIsModal>
            <View style={styles.modalHeader}>
              <Text style={styles.name}>Traveller Profile</Text>
              <TouchableOpacity
                accessibilityRole="button"
                accessibilityLabel="Close traveller profile"
                onPress={() => setSelectedId(null)}
              >
                <Text style={styles.link}>Close</Text>
              </TouchableOpacity>
            </View>

            {selectedPerson && (
              <ScrollView
                contentContainerStyle={styles.modalContent}
                keyboardShouldPersistTaps="handled"
              >
                {profileHeader(selectedPerson)}

                <Text style={styles.label}>ABOUT</Text>
                <Text style={styles.body}>
                  {selectedPerson.bio || 'No bio added yet.'}
                </Text>

                <Text style={styles.label}>INTERESTS</Text>
                <Text style={styles.body}>
                  {selectedPerson.interests.join(', ') || 'Not specified'}
                </Text>

                <Text style={styles.label}>PREFERRED DESTINATIONS</Text>
                <Text style={styles.body}>
                  {selectedPerson.preferred_destinations.join(', ') ||
                    'Open to suggestions'}
                </Text>

                <Text style={styles.label}>TRAVEL DATES</Text>
                <Text style={styles.body}>
                  {selectedPerson.travel_start_date || 'Flexible start'}
                  {' → '}
                  {selectedPerson.travel_end_date || 'Flexible end'}
                </Text>

                <Text style={styles.label}>TOTAL TRIP BUDGET PER PERSON</Text>
                <Text style={styles.body}>
                  {budgetLabel(selectedPerson)}
                </Text>

                {!!message && (
                  <Text style={styles.success}>{message}</Text>
                )}

                {!!error && (
                  <Text style={styles.error}>{error}</Text>
                )}

                {requestControls(selectedPerson)}
              </ScrollView>
            )}
          </View>
        </View>
      </Modal>
    </View>
  );
}

const styles = StyleSheet.create({
  container: { flex: 1 },
  toolbar: {
    flexDirection: 'row',
    justifyContent: 'space-between',
    marginBottom: 16,
  },
  link: { color: '#75A2FF', fontWeight: '700', paddingVertical: 8 },
  tabs: {
    flexDirection: 'row',
    backgroundColor: '#151821',
    padding: 4,
    borderRadius: 12,
    marginBottom: 14,
  },
  tab: { flex: 1, padding: 12, alignItems: 'center', borderRadius: 9 },
  selectedTab: { backgroundColor: '#293F64' },
  input: {
    color: '#F7F8FC',
    backgroundColor: '#08090D',
    borderWidth: 1,
    borderColor: '#303646',
    borderRadius: 12,
    padding: 14,
    marginBottom: 12,
  },
  list: { paddingBottom: 30 },
  card: {
    backgroundColor: '#151821',
    borderWidth: 1,
    borderColor: '#252A37',
    borderRadius: 16,
    padding: 18,
    marginTop: 14,
  },
  name: { color: '#F7F8FC', fontSize: 18, fontWeight: '700' },
  secondary: { color: '#9299A8', marginTop: 7, lineHeight: 20 },
  label: {
    color: '#9299A8',
    fontSize: 11,
    fontWeight: '700',
    marginTop: 18,
    marginBottom: 8,
  },
  body: { color: '#D7DBE5', marginTop: 6, lineHeight: 21 },
  status: { color: '#A9C5FF', marginTop: 16, fontWeight: '600' },
  button: {
    backgroundColor: '#4F8CFF',
    borderRadius: 10,
    padding: 13,
    alignItems: 'center',
    marginTop: 12,
  },
  secondaryButton: {
    backgroundColor: '#252A37',
    borderWidth: 1,
    borderColor: '#3B4354',
  },
  buttonText: { color: '#FFFFFF', fontWeight: '700' },
  disabled: { opacity: 0.5 },
  success: { color: '#83DCAA', marginVertical: 12 },
  error: { color: '#FF9B9B', marginTop: 12, marginBottom: 8 },
  empty: { paddingVertical: 30, alignItems: 'center' },
  profileRow: { flexDirection: 'row', alignItems: 'center' },
  profileText: { flex: 1, marginLeft: 12 },
  avatar: {
    width: 60,
    height: 60,
    borderRadius: 30,
    backgroundColor: '#203456',
  },
  avatarFallback: {
    width: 60,
    height: 60,
    borderRadius: 30,
    backgroundColor: '#203456',
    justifyContent: 'center',
    alignItems: 'center',
  },
  avatarLetter: { color: '#A9C5FF', fontSize: 25, fontWeight: '700' },
  modalBackdrop: {
    flex: 1,
    backgroundColor: 'rgba(0,0,0,0.75)',
    justifyContent: 'center',
    alignItems: 'center',
    padding: 24,
  },
  modalCard: {
    width: '100%',
    maxWidth: 560,
    maxHeight: '85%',
    backgroundColor: '#151821',
    borderRadius: 20,
    borderWidth: 1,
    borderColor: '#303646',
  },
  modalHeader: {
    flexDirection: 'row',
    justifyContent: 'space-between',
    alignItems: 'center',
    padding: 18,
    borderBottomWidth: 1,
    borderBottomColor: '#252A37',
  },
  modalContent: { padding: 20, paddingBottom: 30 },
});