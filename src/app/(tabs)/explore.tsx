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

import { supabase } from '@/services/supabase';
import CompanionDiscoveryPanel from '@/components/CompanionDiscoveryPanel';
import { useTripToday } from '@/hooks/useTripToday';

type Place = {
  id: string;
  name: string;
  visited: boolean;
};

type Trip = {
  id: string;
  name: string;
  destination: string;
  start_date: string;
  end_date: string;
  created_by: string;
  destinations: Place[];
};

export default function ExploreScreen() {
  const today = useTripToday();

  const [section, setSection] = useState<
    'destinations' | 'companions'
  >('destinations');

  const [search, setSearch] = useState('');
  const [destination, setDestination] = useState('');
  const [popular, setPopular] = useState<string[]>([]);
  const [trips, setTrips] = useState<Trip[]>([]);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState('');
  const [refresh, setRefresh] = useState(0);

  useEffect(() => {
    let active = true;

    async function load() {
      setLoading(true);
      setError('');

      try {
        if (!destination) {
          const { data, error: queryError } = await supabase
            .from('trips')
            .select('destination')
            .gte('end_date', today)
            .order('created_at', { ascending: false });

          if (queryError) {
            throw new Error(queryError.message);
          }

          const names = new Map<string, string>();

          for (const item of data ?? []) {
            const name = item.destination?.trim();

            if (name && !names.has(name.toLowerCase())) {
              names.set(name.toLowerCase(), name);
            }
          }

          if (active) {
            setPopular(Array.from(names.values()).slice(0, 6));
          }
        } else {
          const { data, error: queryError } = await supabase
            .from('trips')
            .select(
              'id, name, destination, start_date, end_date, created_by'
            )
            .gte('end_date', today)
            .ilike('destination', `%${destination}%`)
            .order('start_date', { ascending: true });

          if (queryError) {
            throw new Error(queryError.message);
          }

          const results: Trip[] = await Promise.all(
            (data ?? []).map(async (trip) => {
              const { data: places, error: placesError } =
                await supabase
                  .from('trip_destinations')
                  .select('id, name, visited')
                  .eq('trip_id', trip.id)
                  .order('created_at', { ascending: true });

              if (placesError) {
                throw new Error(placesError.message);
              }

              return {
                ...trip,
                destinations: places ?? [],
              };
            })
          );

          if (active) {
            setTrips(results);
          }
        }
      } catch (err) {
        if (active) {
          setError(
            err instanceof Error
              ? err.message
              : 'Unable to load destinations.'
          );
        }
      } finally {
        if (active) {
          setLoading(false);
        }
      }
    }

    void load();

    return () => {
      active = false;
    };
  }, [destination, refresh, today]);

  function searchDestination(value: string) {
    const name = value.trim();

    if (!name) return;

    setLoading(true);
    setSearch(name);
    setDestination(name);
    setRefresh((current) => current + 1);
  }

  function clearSearch() {
    setLoading(true);
    setSearch('');
    setDestination('');
    setTrips([]);
    setRefresh((current) => current + 1);
  }

  function renderTrip({ item }: { item: Trip }) {
    return (
      <TouchableOpacity
        style={styles.card}
        onPress={() =>
          router.push(`/trip-details?tripId=${item.id}`)
        }
      >
        <Text style={styles.cardTitle}>{item.name}</Text>

        <Text style={styles.secondary}>
          📍 {item.destination}
        </Text>

        <Text style={styles.link}>
          {item.start_date > today ? 'Upcoming' : 'Ongoing'}
        </Text>

        <View style={styles.divider} />

        <View style={styles.dateRow}>
          <View>
            <Text style={styles.label}>START</Text>
            <Text style={styles.value}>{item.start_date}</Text>
          </View>

          <View>
            <Text style={styles.label}>END</Text>
            <Text style={styles.value}>{item.end_date}</Text>
          </View>
        </View>

        <View style={styles.divider} />

        <Text style={styles.smallTitle}>Places to Visit</Text>

        {item.destinations.length === 0 ? (
          <Text style={styles.secondary}>No places added</Text>
        ) : (
          item.destinations.map((place) => (
            <View key={place.id} style={styles.placeRow}>
              <View
                style={[
                  styles.checkbox,
                  place.visited && styles.checked,
                ]}
              >
                {place.visited && (
                  <Text style={styles.checkmark}>✓</Text>
                )}
              </View>

              <Text
                style={[
                  styles.placeName,
                  place.visited && styles.visited,
                ]}
              >
                {place.name}
              </Text>
            </View>
          ))
        )}

        <Text style={styles.link}>View Trip →</Text>
      </TouchableOpacity>
    );
  }

  return (
    <View style={styles.container}>
      <Text style={styles.title}>Explore</Text>

      <Text style={styles.subtitle}>
        Discover destinations and find your travel companions.
      </Text>

      <View style={styles.tabs}>
        {(['destinations', 'companions'] as const).map((tab) => (
          <TouchableOpacity
            key={tab}
            accessibilityRole="tab"
            accessibilityState={{ selected: section === tab }}
            style={[
              styles.tab,
              section === tab && styles.activeTab,
            ]}
            onPress={() => setSection(tab)}
          >
            <Text
              style={[
                styles.tabText,
                section === tab && styles.activeTabText,
              ]}
            >
              {tab === 'destinations' ? 'Destinations' : 'Companions'}
            </Text>
          </TouchableOpacity>
        ))}
      </View>

      {section === 'companions' ? (
        <CompanionDiscoveryPanel />
      ) : (
        <View style={styles.flex}>
          <View style={styles.searchRow}>
            <TextInput
              accessibilityLabel="Search active trips by destination"
              style={styles.input}
              placeholder="Where are you going?"
              placeholderTextColor="#9299A8"
              value={search}
              onChangeText={setSearch}
              onSubmitEditing={() => searchDestination(search)}
              returnKeyType="search"
            />

            <TouchableOpacity
              style={styles.searchButton}
              onPress={() => searchDestination(search)}
            >
              <Text style={styles.buttonText}>Search</Text>
            </TouchableOpacity>
          </View>

          {destination ? (
            <View style={styles.resultsHeader}>
              <View style={styles.flex}>
                <Text style={styles.label}>
                  ACTIVE TRIPS GOING TO
                </Text>
                <Text style={styles.resultsTitle}>
                  {destination}
                </Text>
              </View>

              <TouchableOpacity onPress={clearSearch}>
                <Text style={styles.link}>Clear</Text>
              </TouchableOpacity>
            </View>
          ) : (
            <Text style={styles.sectionTitle}>
              Destinations with Active Trips
            </Text>
          )}

          {loading ? (
            <View style={styles.empty}>
              <ActivityIndicator size="large" color="#4F8CFF" />
              <Text style={styles.secondary}>Loading...</Text>
            </View>
          ) : error ? (
            <View style={styles.empty}>
              <Text style={styles.error}>{error}</Text>

              <TouchableOpacity
                onPress={() => setRefresh((current) => current + 1)}
              >
                <Text style={styles.link}>Try Again</Text>
              </TouchableOpacity>
            </View>
          ) : destination ? (
            <FlatList
              key="trips"
              data={trips.filter((trip) => trip.end_date >= today)}
              keyExtractor={(item) => item.id}
              renderItem={renderTrip}
              contentContainerStyle={styles.list}
              showsVerticalScrollIndicator={false}
              ListEmptyComponent={
                <View style={styles.empty}>
                  <Text style={styles.cardTitle}>
                    No active trips found
                  </Text>
                  <Text style={styles.secondary}>
                    Try another destination. Completed trips are hidden here.
                  </Text>
                </View>
              }
            />
          ) : (
            <FlatList
              key="destinations"
              data={popular}
              numColumns={2}
              keyExtractor={(item) => item}
              contentContainerStyle={styles.list}
              columnWrapperStyle={styles.gridRow}
              renderItem={({ item }) => (
                <TouchableOpacity
                  style={styles.destinationCard}
                  onPress={() => searchDestination(item)}
                >
                  <Text style={styles.destinationIcon}>📍</Text>
                  <Text style={styles.cardTitle}>{item}</Text>
                </TouchableOpacity>
              )}
              ListEmptyComponent={
                <View style={styles.empty}>
                  <Text style={styles.cardTitle}>
                    No active trips yet
                  </Text>
                  <Text style={styles.secondary}>
                    Create a new trip to see its destination here.
                  </Text>
                </View>
              }
            />
          )}
        </View>
      )}
    </View>
  );
}

const styles = StyleSheet.create({
  container: {
    flex: 1,
    backgroundColor: '#08090D',
    padding: 22,
    paddingTop: 28,
  },
  flex: { flex: 1 },
  title: {
    fontSize: 29,
    fontWeight: '800',
    color: '#F7F8FC',
  },
  subtitle: {
    color: '#9299A8',
    marginTop: 7,
    marginBottom: 20,
    lineHeight: 20,
  },
  tabs: {
    flexDirection: 'row',
    backgroundColor: '#151821',
    borderRadius: 14,
    padding: 5,
    marginBottom: 20,
  },
  tab: {
    flex: 1,
    paddingVertical: 12,
    borderRadius: 10,
    alignItems: 'center',
  },
  activeTab: { backgroundColor: '#4F8CFF' },
  tabText: { color: '#9299A8', fontWeight: '700' },
  activeTabText: { color: '#FFFFFF' },
  searchRow: {
    flexDirection: 'row',
    marginBottom: 20,
  },
  input: {
    flex: 1,
    color: '#F7F8FC',
    backgroundColor: '#151821',
    borderWidth: 1,
    borderColor: '#292E3B',
    borderRadius: 14,
    paddingHorizontal: 15,
    paddingVertical: 14,
  },
  searchButton: {
    justifyContent: 'center',
    backgroundColor: '#4F8CFF',
    borderRadius: 14,
    paddingHorizontal: 16,
    marginLeft: 9,
  },
  buttonText: { color: '#FFFFFF', fontWeight: '700' },
  sectionTitle: {
    fontSize: 18,
    fontWeight: '700',
    color: '#F7F8FC',
    marginBottom: 15,
  },
  resultsHeader: {
    flexDirection: 'row',
    alignItems: 'center',
    marginBottom: 18,
  },
  resultsTitle: {
    color: '#F7F8FC',
    fontSize: 23,
    fontWeight: '700',
    marginTop: 5,
  },
  list: { paddingBottom: 30 },
  gridRow: { justifyContent: 'space-between' },
  destinationCard: {
    width: '48%',
    minHeight: 105,
    backgroundColor: '#151821',
    borderRadius: 17,
    padding: 17,
    marginBottom: 12,
    borderWidth: 1,
    borderColor: '#252A37',
  },
  destinationIcon: {
    fontSize: 22,
    marginBottom: 10,
  },
  card: {
    backgroundColor: '#151821',
    borderRadius: 18,
    padding: 18,
    marginBottom: 14,
    borderWidth: 1,
    borderColor: '#252A37',
  },
  cardTitle: {
    color: '#F7F8FC',
    fontSize: 17,
    fontWeight: '700',
  },
  secondary: {
    color: '#9299A8',
    marginTop: 7,
    lineHeight: 20,
  },
  divider: {
    height: 1,
    backgroundColor: '#292E3B',
    marginVertical: 16,
  },
  dateRow: {
    flexDirection: 'row',
    justifyContent: 'space-between',
  },
  label: {
    color: '#858D9D',
    fontSize: 10,
    fontWeight: '700',
  },
  value: {
    color: '#D7DBE5',
    fontSize: 13,
    marginTop: 6,
  },
  smallTitle: {
    color: '#F7F8FC',
    fontWeight: '700',
    marginBottom: 10,
  },
  placeRow: {
    flexDirection: 'row',
    alignItems: 'center',
    marginBottom: 7,
  },
  checkbox: {
    width: 19,
    height: 19,
    borderRadius: 5,
    borderWidth: 1.5,
    borderColor: '#697386',
    alignItems: 'center',
    justifyContent: 'center',
    marginRight: 9,
  },
  checked: {
    backgroundColor: '#4F8CFF',
    borderColor: '#4F8CFF',
  },
  checkmark: {
    color: '#FFFFFF',
    fontSize: 12,
  },
  placeName: {
    flex: 1,
    color: '#D7DBE5',
    fontSize: 13,
  },
  visited: {
    color: '#777F90',
    textDecorationLine: 'line-through',
  },
  link: {
    color: '#75A2FF',
    fontWeight: '700',
    marginTop: 12,
  },
  empty: {
    padding: 24,
    alignItems: 'center',
  },
  error: {
    color: '#FF9B9B',
    textAlign: 'center',
  },
});