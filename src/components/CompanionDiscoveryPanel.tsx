import { useEffect, useState } from 'react';
import {
  ActivityIndicator,
  FlatList,
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

type Mode = 'travellers' | 'requests';

export default function CompanionDiscoveryPanel() {
  const [mode, setMode] = useState<Mode>('travellers');
  const [people, setPeople] = useState<Companion[]>([]);
  const [requests, setRequests] = useState<CompanionRequest[]>([]);
  const [userId, setUserId] = useState('');
  const [search, setSearch] = useState('');
  const [loading, setLoading] = useState(true);
  const [busy, setBusy] = useState('');
  const [error, setError] = useState('');
  const [message, setMessage] = useState('');

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

  const query = search.trim().toLowerCase();

  const filteredPeople = people.filter((person) =>
    [
      person.full_name,
      person.bio,
      person.travel_style,
      ...person.interests,
      ...person.preferred_destinations,
    ]
      .filter(Boolean)
      .join(' ')
      .toLowerCase()
      .includes(query)
  );

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

  function renderPerson({ item }: { item: Companion }) {
    const connection = requests.find(
      (request) =>
        (request.status === 'pending' || request.status === 'accepted') &&
        (
          (request.sender_id === userId &&
            request.receiver_id === item.user_id) ||
          (request.receiver_id === userId &&
            request.sender_id === item.user_id)
        )
    );

    return (
      <View style={styles.card}>
        <Text style={styles.name}>{item.full_name}</Text>
        <Text style={styles.secondary}>
          {item.travel_style || 'Travel style not specified'}
        </Text>

        {!!item.bio && <Text style={styles.body}>{item.bio}</Text>}

        <Text style={styles.label}>DESTINATIONS</Text>
        <Text style={styles.body}>
          {item.preferred_destinations.join(', ') || 'Open to suggestions'}
        </Text>

        <Text style={styles.label}>INTERESTS</Text>
        <Text style={styles.body}>
          {item.interests.join(', ') || 'Not specified'}
        </Text>

        <Text style={styles.label}>TRAVEL DATES</Text>
        <Text style={styles.body}>
          {item.travel_start_date || 'Flexible start'}
          {' → '}
          {item.travel_end_date || 'Flexible end'}
        </Text>

        <Text style={styles.label}>BUDGET PER PERSON</Text>
        <Text style={styles.body}>
          {item.budget_min === null && item.budget_max === null
            ? 'Not specified'
            : `${item.budget_currency} ${
                item.budget_min ?? 'No minimum'
              } – ${item.budget_max ?? 'No maximum'}`}
        </Text>

        {!connection ? (
          actionButton(
            'Send Request',
            `send-${item.user_id}`,
            () => sendCompanionRequest(item.user_id),
            'Companion request sent.'
          )
        ) : connection.status === 'accepted' ? (
          <Text style={styles.status}>Connected ✓</Text>
        ) : connection.sender_id === userId ? (
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
        ) : (
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
        )}
      </View>
    );
  }

  function renderRequest({ item }: { item: CompanionRequest }) {
    const received = item.receiver_id === userId;
    const otherId = received ? item.sender_id : item.receiver_id;

    return (
      <View style={styles.card}>
        <Text style={styles.label}>
          {received ? 'RECEIVED REQUEST' : 'SENT REQUEST'}
        </Text>
        <Text style={styles.name}>{getName(otherId)}</Text>
        <Text style={styles.secondary}>
          {new Date(item.created_at).toLocaleDateString()}
        </Text>
        <Text style={styles.status}>
          Status: {item.status}
        </Text>

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
          <Text style={styles.secondary}>Loading companions and requests...</Text>
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

          <FlatList
            data={filteredPeople}
            keyExtractor={(item) => item.user_id}
            renderItem={renderPerson}
            contentContainerStyle={styles.list}
            ListHeaderComponent={
              <Text style={styles.secondary}>
                Searching the latest 50 discoverable travellers
              </Text>
            }
            ListEmptyComponent={
              <View style={styles.empty}>
                <Text style={styles.name}>No travellers found</Text>
                <Text style={styles.secondary}>
                  {query
                    ? 'Try another search.'
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
                Sent and received companion requests will appear here.
              </Text>
            </View>
          }
        />
      )}
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
    backgroundColor: '#151821',
    borderWidth: 1,
    borderColor: '#252A37',
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
    fontSize: 10,
    fontWeight: '700',
    marginTop: 14,
    marginBottom: 5,
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
  success: { color: '#83DCAA', marginBottom: 12 },
  error: { color: '#FF9B9B', marginBottom: 8 },
  empty: { paddingVertical: 30, alignItems: 'center' },
});