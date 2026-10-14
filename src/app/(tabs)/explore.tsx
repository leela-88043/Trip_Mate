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

type TripDestination = {
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
  destinations: TripDestination[];
};

export default function ExploreScreen() {
  const [search, setSearch] = useState('');
  const [selectedDestination, setSelectedDestination] =
    useState('');
  const [trips, setTrips] = useState<Trip[]>([]);
  const [popularDestinations, setPopularDestinations] =
    useState<string[]>([]);
  const [loading, setLoading] = useState(false);
  const [loadingDestinations, setLoadingDestinations] =
    useState(true);

  useEffect(() => {
    loadPopularDestinations();
  }, []);

  useEffect(() => {
    if (selectedDestination) {
      loadTrips(selectedDestination);
    }
  }, [selectedDestination]);

  const loadPopularDestinations = async () => {
    setLoadingDestinations(true);

    const { data, error } = await supabase
      .from('trips')
      .select('destination')
      .order('created_at', {
        ascending: false,
      });

    if (error) {
      console.log(
        'Error loading destinations:',
        error.message
      );

      setPopularDestinations([]);
      setLoadingDestinations(false);
      return;
    }

    const destinations = (data ?? [])
      .map((item) => item.destination?.trim())
      .filter(Boolean);

    const uniqueDestinations = Array.from(
      new Set(
        destinations.map(
          (destination) =>
            destination.toLowerCase()
        )
      )
    ).map((lowercaseDestination) => {
      const original = destinations.find(
        (destination) =>
          destination.toLowerCase() ===
          lowercaseDestination
      );

      return (
        original ?? lowercaseDestination
      );
    });

    setPopularDestinations(
      uniqueDestinations.slice(0, 6)
    );
    setLoadingDestinations(false);
  };

  const loadTrips = async (
    destination: string
  ) => {
    setLoading(true);

    const { data, error } = await supabase
      .from('trips')
      .select(
        'id, name, destination, start_date, end_date, created_by'
      )
      .ilike(
        'destination',
        `%${destination}%`
      )
      .order('created_at', {
        ascending: false,
      });

    if (error) {
      console.log(
        'Error loading trips:',
        error.message
      );

      setTrips([]);
      setLoading(false);
      return;
    }

    const tripsWithDestinations =
      await Promise.all(
        (data ?? []).map(
          async (trip) => {
            const {
              data: destinationData,
              error: destinationError,
            } = await supabase
              .from('trip_destinations')
              .select(
                'id, name, visited'
              )
              .eq('trip_id', trip.id)
              .order('created_at', {
                ascending: true,
              });

            if (destinationError) {
              console.log(
                'Error loading trip places:',
                destinationError.message
              );
            }

            return {
              ...trip,
              destinations:
                destinationData ?? [],
            };
          }
        )
      );

    setTrips(
      tripsWithDestinations
    );

    setLoading(false);
  };

  const handleSearch = () => {
    const destination =
      search.trim();

    if (!destination) {
      return;
    }

    setSelectedDestination(
      destination
    );
  };

  const selectDestination = (
    destination: string
  ) => {
    setSearch(destination);
    setSelectedDestination(
      destination
    );
  };

  const clearSearch = () => {
    setSearch('');
    setSelectedDestination('');
    setTrips([]);

    loadPopularDestinations();
  };

  return (
    <View style={styles.container}>
      <Text style={styles.title}>
        Explore Trips
      </Text>

      <Text style={styles.subtitle}>
        Find travelers going to the same destination.
      </Text>

      <View style={styles.searchRow}>
        <TextInput
          style={styles.searchInput}
          placeholder="Where are you going?"
          placeholderTextColor="#9CA3AF"
          value={search}
          onChangeText={setSearch}
          onSubmitEditing={handleSearch}
          returnKeyType="search"
        />

        <TouchableOpacity
          style={styles.searchButton}
          onPress={handleSearch}
        >
          <Text style={styles.searchButtonText}>
            Search
          </Text>
        </TouchableOpacity>
      </View>

      {!selectedDestination && (
        <>
          <Text style={styles.sectionTitle}>
            Popular Destinations
          </Text>

          {loadingDestinations ? (
            <View
              style={
                styles.destinationLoading
              }
            >
              <ActivityIndicator
                size="small"
              />

              <Text
                style={
                  styles.loadingText
                }
              >
                Loading destinations...
              </Text>
            </View>
          ) : popularDestinations.length ===
            0 ? (
            <View
              style={styles.noDestinations}
            >
              <Text
                style={styles.emptyIcon}
              >
                🧭
              </Text>

              <Text
                style={styles.emptyTitle}
              >
                No destinations yet
              </Text>

              <Text
                style={styles.emptyText}
              >
                Create a trip to see
                destinations here.
              </Text>
            </View>
          ) : (
            <View
              style={styles.destinationGrid}
            >
              {popularDestinations.map(
                (destination) => (
                  <TouchableOpacity
                    key={destination}
                    style={
                      styles.destinationCard
                    }
                    onPress={() =>
                      selectDestination(
                        destination
                      )
                    }
                  >
                    <Text
                      style={
                        styles.destinationIcon
                      }
                    >
                      📍
                    </Text>

                    <Text
                      style={
                        styles.destinationName
                      }
                    >
                      {destination}
                    </Text>
                  </TouchableOpacity>
                )
              )}
            </View>
          )}
        </>
      )}

      {selectedDestination && (
        <View style={styles.resultsContainer}>
          <View
            style={styles.resultsHeader}
          >
            <View>
              <Text
                style={styles.resultsLabel}
              >
                TRIPS GOING TO
              </Text>

              <Text
                style={styles.resultsTitle}
              >
                {selectedDestination}
              </Text>
            </View>

            <TouchableOpacity
              onPress={clearSearch}
            >
              <Text
                style={styles.clearText}
              >
                Clear
              </Text>
            </TouchableOpacity>
          </View>

          {loading ? (
            <View
              style={styles.loadingContainer}
            >
              <ActivityIndicator
                size="large"
              />

              <Text
                style={
                  styles.loadingText
                }
              >
                Finding trips...
              </Text>
            </View>
          ) : trips.length === 0 ? (
            <View
              style={styles.emptyContainer}
            >
              <Text
                style={styles.emptyIcon}
              >
                🧭
              </Text>

              <Text
                style={styles.emptyTitle}
              >
                No trips found
              </Text>

              <Text
                style={styles.emptyText}
              >
                There are no trips going to{' '}
                {selectedDestination} yet.
              </Text>

              <Text
                style={styles.emptyHint}
              >
                Try searching for another
                destination.
              </Text>
            </View>
          ) : (
            <FlatList
              data={trips}
              keyExtractor={(item) =>
                item.id
              }
              showsVerticalScrollIndicator={
                false
              }
              contentContainerStyle={
                styles.list
              }
              renderItem={({ item }) => (
                <TouchableOpacity
                  style={styles.tripCard}
                  onPress={() =>
                    router.push(
                      `/trip-details?tripId=${item.id}`
                    )
                  }
                >
                  <View
                    style={styles.tripHeader}
                  >
                    <View
                      style={
                        styles.locationCircle
                      }
                    >
                      <Text
                        style={
                          styles.locationIcon
                        }
                      >
                        📍
                      </Text>
                    </View>

                    <View
                      style={styles.tripInfo}
                    >
                      <Text
                        style={styles.tripName}
                      >
                        {item.name}
                      </Text>

                      <Text
                        style={
                          styles.tripDestination
                        }
                      >
                        {item.destination}
                      </Text>
                    </View>
                  </View>

                  <View
                    style={styles.divider}
                  />

                  <View
                    style={styles.dateRow}
                  >
                    <View>
                      <Text
                        style={
                          styles.dateLabel
                        }
                      >
                        START
                      </Text>

                      <Text
                        style={
                          styles.dateValue
                        }
                      >
                        {item.start_date}
                      </Text>
                    </View>

                    <View>
                      <Text
                        style={
                          styles.dateLabel
                        }
                      >
                        END
                      </Text>

                      <Text
                        style={
                          styles.dateValue
                        }
                      >
                        {item.end_date}
                      </Text>
                    </View>
                  </View>

                  <View
                    style={
                      styles.placesSection
                    }
                  >
                    <Text
                      style={
                        styles.placesTitle
                      }
                    >
                      Places to Visit
                    </Text>

                    {item.destinations
                      .length === 0 ? (
                      <Text
                        style={
                          styles.noPlacesText
                        }
                      >
                        No places added
                      </Text>
                    ) : (
                      item.destinations.map(
                        (place) => (
                          <View
                            key={place.id}
                            style={
                              styles.placeRow
                            }
                          >
                            <View
                              style={[
                                styles.smallCheckbox,
                                place.visited &&
                                  styles.smallCheckboxVisited,
                              ]}
                            >
                              {place.visited && (
                                <Text
                                  style={
                                    styles.smallCheckmark
                                  }
                                >
                                  ✓
                                </Text>
                              )}
                            </View>

                            <Text
                              style={[
                                styles.placeName,
                                place.visited &&
                                  styles.placeNameVisited,
                              ]}
                            >
                              {place.name}
                            </Text>
                          </View>
                        )
                      )
                    )}
                  </View>

                  <Text
                    style={styles.viewTrip}
                  >
                    View Trip →
                  </Text>
                </TouchableOpacity>
              )}
            />
          )}
        </View>
      )}
    </View>
  );
}

const styles = StyleSheet.create({
  container: { flex: 1, backgroundColor: '#08090D', padding: 22, paddingTop: 28 },
  title: { fontSize: 29, fontWeight: '800', color: '#F7F8FC', letterSpacing: -0.5 },
  subtitle: { fontSize: 14, color: '#9299A8', marginTop: 7, marginBottom: 22, lineHeight: 20 },
  searchRow: { flexDirection: 'row', alignItems: 'center', marginBottom: 28 },
  searchInput: { flex: 1, height: 52, backgroundColor: '#151821', borderWidth: 1, borderColor: '#292E3B', borderRadius: 15, paddingHorizontal: 16, fontSize: 15, color: '#F7F8FC' },
  searchButton: { height: 52, backgroundColor: '#4F8CFF', borderRadius: 15, justifyContent: 'center', alignItems: 'center', paddingHorizontal: 17, marginLeft: 9 },
  searchButtonText: { color: '#FFFFFF', fontWeight: '700', fontSize: 14 },
  sectionTitle: { fontSize: 18, fontWeight: '750', color: '#F7F8FC', marginBottom: 15 },
  destinationLoading: { alignItems: 'center', marginTop: 30 },
  destinationGrid: { flexDirection: 'row', flexWrap: 'wrap', justifyContent: 'space-between' },
  destinationCard: { width: '48%', minHeight: 105, backgroundColor: '#151821', borderRadius: 17, padding: 17, marginBottom: 12, borderWidth: 1, borderColor: '#252A37', alignItems: 'flex-start', justifyContent: 'center' },
  destinationIcon: { fontSize: 22, marginBottom: 9 },
  destinationName: { fontSize: 15, fontWeight: '650', color: '#F0F2F8' },
  resultsContainer: { flex: 1 },
  resultsHeader: { flexDirection: 'row', justifyContent: 'space-between', alignItems: 'center', marginBottom: 18 },
  resultsLabel: { fontSize: 10, fontWeight: '800', letterSpacing: 1.2, color: '#858D9D' },
  resultsTitle: { fontSize: 23, fontWeight: '800', color: '#F7F8FC', marginTop: 5 },
  clearText: { color: '#6FA0FF', fontSize: 14, fontWeight: '700' },
  loadingContainer: { alignItems: 'center', marginTop: 60 },
  loadingText: { color: '#9299A8', marginTop: 10 },
  list: { paddingBottom: 30 },
  tripCard: { backgroundColor: '#151821', borderRadius: 18, padding: 18, marginBottom: 14, borderWidth: 1, borderColor: '#252A37' },
  tripHeader: { flexDirection: 'row', alignItems: 'center' },
  locationCircle: { width: 48, height: 48, borderRadius: 16, backgroundColor: '#202D49', justifyContent: 'center', alignItems: 'center' },
  locationIcon: { fontSize: 21 },
  tripInfo: { flex: 1, marginLeft: 13 },
  tripName: { fontSize: 17, fontWeight: '750', color: '#F7F8FC' },
  tripDestination: { fontSize: 13, color: '#9AA2B2', marginTop: 4 },
  divider: { height: 1, backgroundColor: '#292E3B', marginVertical: 16 },
  dateRow: { flexDirection: 'row', justifyContent: 'space-between' },
  dateLabel: { fontSize: 10, fontWeight: '800', letterSpacing: 1, color: '#858D9D' },
  dateValue: { fontSize: 13, color: '#D7DBE5', marginTop: 5 },
  placesSection: { marginTop: 18, paddingTop: 14, borderTopWidth: 1, borderTopColor: '#292E3B' },
  placesTitle: { fontSize: 14, fontWeight: '750', color: '#F0F2F8', marginBottom: 10 },
  smallCheckbox: { width: 19, height: 19, borderRadius: 5, borderWidth: 1.5, borderColor: '#697386', justifyContent: 'center', alignItems: 'center', marginRight: 9 },
  smallCheckboxVisited: { backgroundColor: '#4F8CFF', borderColor: '#4F8CFF' },
  smallCheckmark: { color: '#FFFFFF', fontSize: 12, fontWeight: '700' },
  placeRow: { flexDirection: 'row', alignItems: 'center', marginBottom: 7 },
  placeName: { flex: 1, fontSize: 13, color: '#D7DBE5' },
  placeNameVisited: { color: '#777F90', textDecorationLine: 'line-through' },
  noPlacesText: { fontSize: 13, color: '#858D9D' },
  viewTrip: { color: '#75A2FF', fontSize: 14, fontWeight: '750', marginTop: 16 },
  emptyContainer: { alignItems: 'center', marginTop: 65, paddingHorizontal: 20, backgroundColor: '#151821', borderRadius: 18, borderWidth: 1, borderColor: '#252A37', paddingVertical: 30 },
  noDestinations: { alignItems: 'center', marginTop: 45, paddingHorizontal: 20, backgroundColor: '#151821', borderRadius: 18, borderWidth: 1, borderColor: '#252A37', paddingVertical: 28 },
  emptyIcon: { fontSize: 42 },
  emptyTitle: { fontSize: 19, fontWeight: '750', color: '#F7F8FC', marginTop: 12 },
  emptyText: { fontSize: 14, color: '#A0A7B5', textAlign: 'center', marginTop: 7, lineHeight: 21 },
  emptyHint: { fontSize: 13, color: '#858D9D', textAlign: 'center', marginTop: 8 },
});
