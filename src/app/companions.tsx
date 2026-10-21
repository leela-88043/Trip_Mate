import { useEffect, useState } from 'react';
import {
  ActivityIndicator,
  FlatList,
  Image,
  StyleSheet,
  Text,
  TextInput,
  TouchableOpacity,
  View,
} from 'react-native';

import {
  loadCompanions,
  type Companion,
} from '@/services/companionDiscovery';

function budgetLabel(person: Companion) {
  const { budget_min: min, budget_max: max, budget_currency: currency } =
    person;

  if (min !== null && max !== null) {
    return `${currency} ${min} – ${max}`;
  }

  if (min !== null) return `From ${currency} ${min}`;
  if (max !== null) return `Up to ${currency} ${max}`;

  return 'Budget not specified';
}

export default function CompanionsScreen() {
  const [companions, setCompanions] = useState<Companion[]>([]);
  const [search, setSearch] = useState('');
  const [loading, setLoading] = useState(true);
  const [refreshing, setRefreshing] = useState(false);
  const [error, setError] = useState('');

  async function load(refresh = false) {
    if (refresh) {
      setRefreshing(true);
    } else {
      setLoading(true);
    }

    setError('');

    try {
      const people = await loadCompanions();
      setCompanions(people);
    } catch (err) {
      setCompanions([]);
      setError(
        err instanceof Error
          ? err.message
          : 'Unable to load companions.'
      );
    } finally {
      setLoading(false);
      setRefreshing(false);
    }
  }

  useEffect(() => {
    void load();
  }, []);

  const query = search.trim().toLowerCase();

  const filteredCompanions = companions.filter((person) => {
    const searchableText = [
      person.full_name,
      person.bio,
      person.travel_style,
      ...person.interests,
      ...person.preferred_destinations,
    ]
      .filter(Boolean)
      .join(' ')
      .toLowerCase();

    return searchableText.includes(query);
  });

  function renderCompanion({ item }: { item: Companion }) {
    return (
      <View style={styles.card}>
        <View style={styles.profileRow}>
          {item.avatar_url ? (
            <Image
              source={{ uri: item.avatar_url }}
              style={styles.avatar}
              accessibilityLabel={`${item.full_name}'s profile picture`}
            />
          ) : (
            <View style={styles.avatarFallback}>
              <Text style={styles.avatarLetter}>
                {item.full_name.charAt(0).toUpperCase()}
              </Text>
            </View>
          )}

          <View style={styles.profileInfo}>
            <Text style={styles.name}>{item.full_name}</Text>
            <Text style={styles.subtitle}>
              {item.travel_style || 'Travel style not specified'}
            </Text>
          </View>
        </View>

        {!!item.bio && (
          <Text style={styles.bio}>{item.bio}</Text>
        )}

        <Text style={styles.label}>PREFERRED DESTINATIONS</Text>
        <Text style={styles.value}>
          {item.preferred_destinations.length
            ? item.preferred_destinations.join(', ')
            : 'Open to suggestions'}
        </Text>

        <Text style={styles.label}>TRAVEL DATES</Text>
        <Text style={styles.value}>
          {item.travel_start_date || 'Flexible start'}
          {' → '}
          {item.travel_end_date || 'Flexible end'}
        </Text>

        <Text style={styles.label}>TRIP BUDGET PER PERSON</Text>
        <Text style={styles.value}>{budgetLabel(item)}</Text>

        {item.interests.length > 0 && (
          <View style={styles.tags}>
            {item.interests.map((interest) => (
              <View key={interest} style={styles.tag}>
                <Text style={styles.tagText}>{interest}</Text>
              </View>
            ))}
          </View>
        )}
      </View>
    );
  }

  return (
    <View style={styles.screen}>
      <Text style={styles.title}>Find Companions</Text>

      <Text style={styles.description}>
        Discover travellers who are open to travelling together.
      </Text>

      <TextInput
        accessibilityLabel="Search companions"
        style={styles.search}
        value={search}
        onChangeText={setSearch}
        placeholder="Search names, destinations, interests..."
        placeholderTextColor="#9299A8"
        autoCorrect={false}
      />

      {loading ? (
        <View style={styles.center}>
          <ActivityIndicator size="large" color="#4F8CFF" />
          <Text style={styles.subtitle}>Finding travellers...</Text>
        </View>
      ) : error ? (
        <View style={styles.center}>
          <Text style={styles.error}>{error}</Text>

          <TouchableOpacity
            style={styles.button}
            onPress={() => void load()}
          >
            <Text style={styles.buttonText}>Try Again</Text>
          </TouchableOpacity>
        </View>
      ) : (
        <FlatList
          data={filteredCompanions}
          keyExtractor={(item) => item.user_id}
          renderItem={renderCompanion}
          refreshing={refreshing}
          onRefresh={() => void load(true)}
          showsVerticalScrollIndicator={false}
          contentContainerStyle={styles.list}
          ListHeaderComponent={
            <Text style={styles.count}>
              {filteredCompanions.length} travellers shown
              {' · '}
              Latest 50 discoverable profiles
            </Text>
          }
          ListEmptyComponent={
            <View style={styles.empty}>
              <Text style={styles.emptyTitle}>
                {query ? 'No matching travellers' : 'No companions yet'}
              </Text>

              <Text style={styles.description}>
                {query
                  ? 'Try another name, destination, or interest.'
                  : 'Other travellers will appear when they enable companion discovery. Your own account is excluded.'}
              </Text>
            </View>
          }
          ListFooterComponent={
            <TouchableOpacity
              style={styles.button}
              onPress={() => void load(true)}
              disabled={refreshing}
            >
              <Text style={styles.buttonText}>
                {refreshing ? 'Refreshing...' : 'Refresh Travellers'}
              </Text>
            </TouchableOpacity>
          }
        />
      )}
    </View>
  );
}

const styles = StyleSheet.create({
  screen: {
    flex: 1,
    backgroundColor: '#08090D',
    padding: 24,
  },
  title: {
    color: '#F7F8FC',
    fontSize: 28,
    fontWeight: '700',
  },
  description: {
    color: '#9299A8',
    fontSize: 14,
    lineHeight: 21,
    marginTop: 8,
  },
  search: {
    backgroundColor: '#151821',
    borderColor: '#252A37',
    borderWidth: 1,
    borderRadius: 12,
    color: '#F7F8FC',
    paddingHorizontal: 15,
    paddingVertical: 14,
    marginTop: 20,
    marginBottom: 16,
    fontSize: 14,
  },
  list: {
    paddingBottom: 40,
  },
  count: {
    color: '#9299A8',
    fontSize: 12,
    marginBottom: 14,
  },
  card: {
    backgroundColor: '#151821',
    borderColor: '#252A37',
    borderWidth: 1,
    borderRadius: 18,
    padding: 18,
    marginBottom: 16,
  },
  profileRow: {
    flexDirection: 'row',
    alignItems: 'center',
  },
  avatar: {
    width: 54,
    height: 54,
    borderRadius: 27,
    backgroundColor: '#252A37',
  },
  avatarFallback: {
    width: 54,
    height: 54,
    borderRadius: 27,
    backgroundColor: '#203456',
    justifyContent: 'center',
    alignItems: 'center',
  },
  avatarLetter: {
    color: '#86B0FF',
    fontSize: 24,
    fontWeight: '700',
  },
  profileInfo: {
    flex: 1,
    marginLeft: 12,
  },
  name: {
    color: '#F7F8FC',
    fontSize: 18,
    fontWeight: '700',
  },
  subtitle: {
    color: '#9299A8',
    fontSize: 13,
    marginTop: 6,
  },
  bio: {
    color: '#D9DDE7',
    fontSize: 14,
    lineHeight: 21,
    marginTop: 16,
  },
  label: {
    color: '#9299A8',
    fontSize: 10,
    fontWeight: '700',
    letterSpacing: 1,
    marginTop: 18,
  },
  value: {
    color: '#F7F8FC',
    fontSize: 14,
    marginTop: 6,
  },
  tags: {
    flexDirection: 'row',
    flexWrap: 'wrap',
    marginTop: 16,
  },
  tag: {
    backgroundColor: '#20304C',
    borderRadius: 20,
    paddingHorizontal: 11,
    paddingVertical: 6,
    marginRight: 7,
    marginBottom: 7,
  },
  tagText: {
    color: '#A9C5FF',
    fontSize: 12,
  },
  center: {
    flex: 1,
    justifyContent: 'center',
    alignItems: 'center',
  },
  empty: {
    paddingVertical: 30,
    alignItems: 'center',
  },
  emptyTitle: {
    color: '#F7F8FC',
    fontSize: 18,
    fontWeight: '700',
  },
  error: {
    color: '#FF9B9B',
    textAlign: 'center',
  },
  button: {
    backgroundColor: '#4F8CFF',
    borderRadius: 12,
    padding: 15,
    alignItems: 'center',
    marginTop: 14,
  },
  buttonText: {
    color: '#FFFFFF',
    fontWeight: '700',
    fontSize: 14,
  },
});