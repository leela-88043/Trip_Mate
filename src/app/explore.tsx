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

type Trip = {
  id: string;
  name: string;
  destination: string;
  start_date: string;
  end_date: string;
  created_by: string;
};

export default function ExploreScreen() {
  const [search, setSearch] = useState('');
  const [selectedDestination, setSelectedDestination] = useState('');
  const [trips, setTrips] = useState<Trip[]>([]);
  const [popularDestinations, setPopularDestinations] = useState<string[]>([]);
  const [loading, setLoading] = useState(false);
  const [loadingDestinations, setLoadingDestinations] = useState(true);

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
      .order('created_at', { ascending: false });

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

    // Remove duplicate destinations
    const uniqueDestinations = Array.from(
      new Set(
        destinations.map(
          (destination) => destination.toLowerCase()
        )
      )
    ).map((lowercaseDestination) => {
      const original = destinations.find(
        (destination) =>
          destination.toLowerCase() === lowercaseDestination
      );

      return original ?? lowercaseDestination;
    });

    setPopularDestinations(uniqueDestinations.slice(0, 6));
    setLoadingDestinations(false);
  };

  const loadTrips = async (destination: string) => {
    setLoading(true);

    const { data, error } = await supabase
      .from('trips')
      .select(
        'id, name, destination, start_date, end_date, created_by'
      )
      .ilike('destination', `%${destination}%`)
      .order('created_at', { ascending: false });

    if (error) {
      console.log(
        'Error loading trips:',
        error.message
      );

      setTrips([]);
    } else {
      setTrips(data ?? []);
    }

    setLoading(false);
  };

  const handleSearch = () => {
    const destination = search.trim();

    if (!destination) {
      return;
    }

    setSelectedDestination(destination);
  };

  const selectDestination = (destination: string) => {
    setSearch(destination);
    setSelectedDestination(destination);
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

      {/* Search */}
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

      {/* Popular Destinations */}
      {!selectedDestination && (
        <>
          <Text style={styles.sectionTitle}>
            Popular Destinations
          </Text>

          {loadingDestinations ? (
            <View style={styles.destinationLoading}>
              <ActivityIndicator size="small" />

              <Text style={styles.loadingText}>
                Loading destinations...
              </Text>
            </View>
          ) : popularDestinations.length === 0 ? (
            <View style={styles.noDestinations}>
              <Text style={styles.emptyIcon}>
                🧭
              </Text>

              <Text style={styles.emptyTitle}>
                No destinations yet
              </Text>

              <Text style={styles.emptyText}>
                Create a trip to see destinations here.
              </Text>
            </View>
          ) : (
            <View style={styles.destinationGrid}>
              {popularDestinations.map(
                (destination) => (
                  <TouchableOpacity
                    key={destination}
                    style={styles.destinationCard}
                    onPress={() =>
                      selectDestination(destination)
                    }
                  >
                    <Text style={styles.destinationIcon}>
                      📍
                    </Text>

                    <Text style={styles.destinationName}>
                      {destination}
                    </Text>
                  </TouchableOpacity>
                )
              )}
            </View>
          )}
        </>
      )}

      {/* Selected destination */}
      {selectedDestination && (
        <View style={styles.resultsContainer}>
          <View style={styles.resultsHeader}>
            <View>
              <Text style={styles.resultsLabel}>
                TRIPS GOING TO
              </Text>

              <Text style={styles.resultsTitle}>
                {selectedDestination}
              </Text>
            </View>

            <TouchableOpacity onPress={clearSearch}>
              <Text style={styles.clearText}>
                Clear
              </Text>
            </TouchableOpacity>
          </View>

          {loading ? (
            <View style={styles.loadingContainer}>
              <ActivityIndicator size="large" />

              <Text style={styles.loadingText}>
                Finding trips...
              </Text>
            </View>
          ) : trips.length === 0 ? (
            <View style={styles.emptyContainer}>
              <Text style={styles.emptyIcon}>
                🧭
              </Text>

              <Text style={styles.emptyTitle}>
                No trips found
              </Text>

              <Text style={styles.emptyText}>
                There are no trips going to{' '}
                {selectedDestination} yet.
              </Text>

              <Text style={styles.emptyHint}>
                Try searching for another destination.
              </Text>
            </View>
          ) : (
            <FlatList
              data={trips}
              keyExtractor={(item) => item.id}
              showsVerticalScrollIndicator={false}
              contentContainerStyle={styles.list}
              renderItem={({ item }) => (
                <TouchableOpacity
                  style={styles.tripCard}
                  onPress={() =>
                    router.push(
                      `/trip-details?tripId=${item.id}`
                    )
                  }
                >
                  <View style={styles.tripHeader}>
                    <View style={styles.locationCircle}>
                      <Text style={styles.locationIcon}>
                        📍
                      </Text>
                    </View>

                    <View style={styles.tripInfo}>
                      <Text style={styles.tripName}>
                        {item.name}
                      </Text>

                      <Text style={styles.tripDestination}>
                        {item.destination}
                      </Text>
                    </View>
                  </View>

                  <View style={styles.divider} />

                  <View style={styles.dateRow}>
                    <View>
                      <Text style={styles.dateLabel}>
                        START
                      </Text>

                      <Text style={styles.dateValue}>
                        {item.start_date}
                      </Text>
                    </View>

                    <View>
                      <Text style={styles.dateLabel}>
                        END
                      </Text>

                      <Text style={styles.dateValue}>
                        {item.end_date}
                      </Text>
                    </View>
                  </View>

                  <Text style={styles.viewTrip}>
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
  container: {
    flex: 1,
    backgroundColor: '#F5F7FA',
    padding: 24,
  },

  title: {
    fontSize: 28,
    fontWeight: '700',
    color: '#111827',
  },

  subtitle: {
    fontSize: 14,
    color: '#6B7280',
    marginTop: 6,
    marginBottom: 22,
  },

  searchRow: {
    flexDirection: 'row',
    alignItems: 'center',
    marginBottom: 28,
  },

  searchInput: {
    flex: 1,
    height: 50,
    backgroundColor: '#FFFFFF',
    borderWidth: 1,
    borderColor: '#D1D5DB',
    borderRadius: 12,
    paddingHorizontal: 16,
    fontSize: 15,
    color: '#111827',
  },

  searchButton: {
    height: 50,
    backgroundColor: '#2563EB',
    borderRadius: 12,
    justifyContent: 'center',
    alignItems: 'center',
    paddingHorizontal: 16,
    marginLeft: 8,
  },

  searchButtonText: {
    color: '#FFFFFF',
    fontWeight: '700',
    fontSize: 14,
  },

  sectionTitle: {
    fontSize: 19,
    fontWeight: '700',
    color: '#111827',
    marginBottom: 14,
  },

  destinationLoading: {
    alignItems: 'center',
    marginTop: 30,
  },

  destinationGrid: {
    flexDirection: 'row',
    flexWrap: 'wrap',
    justifyContent: 'space-between',
  },

  destinationCard: {
    width: '48%',
    backgroundColor: '#FFFFFF',
    borderRadius: 15,
    padding: 18,
    marginBottom: 12,
    borderWidth: 1,
    borderColor: '#E5E7EB',
    alignItems: 'center',
  },

  destinationIcon: {
    fontSize: 25,
    marginBottom: 8,
  },

  destinationName: {
    fontSize: 15,
    fontWeight: '600',
    color: '#111827',
  },

  resultsContainer: {
    flex: 1,
  },

  resultsHeader: {
    flexDirection: 'row',
    justifyContent: 'space-between',
    alignItems: 'center',
    marginBottom: 18,
  },

  resultsLabel: {
    fontSize: 10,
    fontWeight: '700',
    color: '#9CA3AF',
  },

  resultsTitle: {
    fontSize: 22,
    fontWeight: '700',
    color: '#111827',
    marginTop: 3,
  },

  clearText: {
    color: '#2563EB',
    fontSize: 14,
    fontWeight: '700',
  },

  loadingContainer: {
    alignItems: 'center',
    marginTop: 60,
  },

  loadingText: {
    color: '#6B7280',
    marginTop: 10,
  },

  list: {
    paddingBottom: 30,
  },

  tripCard: {
    backgroundColor: '#FFFFFF',
    borderRadius: 16,
    padding: 18,
    marginBottom: 14,
    borderWidth: 1,
    borderColor: '#E5E7EB',
  },

  tripHeader: {
    flexDirection: 'row',
    alignItems: 'center',
  },

  locationCircle: {
    width: 50,
    height: 50,
    borderRadius: 25,
    backgroundColor: '#EFF6FF',
    justifyContent: 'center',
    alignItems: 'center',
  },

  locationIcon: {
    fontSize: 22,
  },

  tripInfo: {
    flex: 1,
    marginLeft: 14,
  },

  tripName: {
    fontSize: 18,
    fontWeight: '700',
    color: '#111827',
  },

  tripDestination: {
    fontSize: 14,
    color: '#6B7280',
    marginTop: 4,
  },

  divider: {
    height: 1,
    backgroundColor: '#E5E7EB',
    marginVertical: 16,
  },

  dateRow: {
    flexDirection: 'row',
    justifyContent: 'space-between',
  },

  dateLabel: {
    fontSize: 10,
    fontWeight: '700',
    color: '#9CA3AF',
  },

  dateValue: {
    fontSize: 14,
    color: '#374151',
    marginTop: 4,
  },

  viewTrip: {
    color: '#2563EB',
    fontSize: 14,
    fontWeight: '700',
    marginTop: 16,
  },

  emptyContainer: {
    alignItems: 'center',
    marginTop: 70,
    paddingHorizontal: 20,
  },

  noDestinations: {
    alignItems: 'center',
    marginTop: 50,
    paddingHorizontal: 20,
  },

  emptyIcon: {
    fontSize: 50,
  },

  emptyTitle: {
    fontSize: 20,
    fontWeight: '700',
    color: '#111827',
    marginTop: 12,
  },

  emptyText: {
    fontSize: 14,
    color: '#6B7280',
    textAlign: 'center',
    marginTop: 7,
    lineHeight: 20,
  },

  emptyHint: {
    fontSize: 13,
    color: '#9CA3AF',
    textAlign: 'center',
    marginTop: 8,
  },
});