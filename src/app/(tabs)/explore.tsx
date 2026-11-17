
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

import CompanionDiscoveryPanel from '@/components/CompanionDiscoveryPanel';
import RecommendedDestinations from '@/components/RecommendedDestinations';
import { useTripToday } from '@/hooks/useTripToday';
import { supabase } from '@/services/supabase';

type Destination = {
  id: string;
  slug: string;
  name: string;
  region: string;
  country: string;
  category: string;
  description: string;
  image_url: string | null;
  best_time_to_visit: string | null;
  highlights: string[];
  travel_tips: string[];
  is_featured: boolean;
};

type Place = {
  id: string;
  name: string;
  visited: boolean;
};

type Trip = {
  id: string;
  name: string;
  destination: string;
  start_date: string | null;
  end_date: string | null;
  created_by: string | null;
  categories: string[];
  destinations: Place[];
};

const CATEGORIES = [
  { value: 'all', label: 'All' },
  { value: 'beach', label: 'Beaches' },
  { value: 'mountain', label: 'Mountains' },
  { value: 'nature', label: 'Nature' },
  { value: 'adventure', label: 'Adventure' },
  { value: 'heritage', label: 'Heritage' },
  { value: 'city', label: 'Cities' },
  { value: 'other', label: 'Other' },
];

function categoryLabel(value: string) {
  return CATEGORIES.find((item) => item.value === value)?.label ?? value;
}

function DestinationPhoto({
  uri,
  name,
}: {
  uri: string | null;
  name: string;
}) {
  const [failed, setFailed] = useState(false);

  useEffect(() => {
    setFailed(false);
  }, [uri]);

  if (!uri || failed) {
    return (
      <View style={styles.photoFallback}>
        <Text style={styles.photoIcon}>📍</Text>
        <Text style={styles.secondary}>{name}</Text>
      </View>
    );
  }

  return (
    <Image
      source={{ uri }}
      style={styles.photo}
      resizeMode="cover"
      accessibilityLabel={name}
      onError={() => setFailed(true)}
    />
  );
}

export default function ExploreScreen() {
  const today = useTripToday();

  const [section, setSection] = useState<'destinations' | 'companions'>(
    'destinations'
  );

  const [search, setSearch] = useState('');
  const [category, setCategory] = useState('all');

  const [catalogue, setCatalogue] = useState<Destination[]>([]);
  const [catalogueLoading, setCatalogueLoading] = useState(true);
  const [catalogueError, setCatalogueError] = useState('');
  const [catalogueRefresh, setCatalogueRefresh] = useState(0);

  const [selectedDestination, setSelectedDestination] =
    useState<Destination | null>(null);

  // Trips displayed using the shared category filters
  const [discoveryTrips, setDiscoveryTrips] = useState<Trip[]>([]);
  const [discoveryTripsLoading, setDiscoveryTripsLoading] = useState(false);
  const [discoveryTripsError, setDiscoveryTripsError] = useState('');
  const [discoveryTripsRefresh, setDiscoveryTripsRefresh] = useState(0);

  // Existing destination-specific trip states
  const [tripDestination, setTripDestination] = useState('');
  const [trips, setTrips] = useState<Trip[]>([]);
  const [tripsLoading, setTripsLoading] = useState(false);
  const [tripsError, setTripsError] = useState('');
  const [tripsRefresh, setTripsRefresh] = useState(0);

  // Load destination catalogue
  useEffect(() => {
    let active = true;

    async function loadCatalogue() {
      setCatalogueLoading(true);
      setCatalogueError('');

      try {
        const { data, error } = await supabase
          .from('destination_catalog')
          .select(
            'id, slug, name, region, country, category, description, image_url, best_time_to_visit, highlights, travel_tips, is_featured'
          )
          .order('is_featured', { ascending: false })
          .order('name', { ascending: true });

        if (error) throw new Error(error.message);

        const rows = (data ?? []) as unknown as Destination[];

        if (active) {
          setCatalogue(
            rows.map((item) => ({
              ...item,
              highlights: item.highlights ?? [],
              travel_tips: item.travel_tips ?? [],
            }))
          );
        }
      } catch (err) {
        if (active) {
          setCatalogueError(
            err instanceof Error ? err.message : 'Unable to load destinations.'
          );
        }
      } finally {
        if (active) setCatalogueLoading(false);
      }
    }

    void loadCatalogue();

    return () => {
      active = false;
    };
  }, [catalogueRefresh]);

  // Load all upcoming and ongoing trips
  useEffect(() => {
    let active = true;

    async function loadDiscoveryTrips() {
      setDiscoveryTripsLoading(true);
      setDiscoveryTripsError('');

      try {
        const { data, error } = await supabase
          .from('trips')
          .select(
            'id, name, destination, start_date, end_date, created_by, categories'
          )
          .gte('end_date', today)
          .order('start_date', { ascending: true });

        if (error) throw new Error(error.message);

        const tripRows = (data ?? []).map((trip) => ({
          ...trip,
          categories: Array.isArray(trip.categories)
            ? trip.categories
            : [],
        })) as Omit<Trip, 'destinations'>[];

        const ids = tripRows.map((trip) => trip.id);
        const placesByTrip = new Map<string, Place[]>();

        if (ids.length > 0) {
          const { data: places, error: placesError } = await supabase
            .from('trip_destinations')
            .select('id, trip_id, name, visited')
            .in('trip_id', ids)
            .order('created_at', { ascending: true });

          if (placesError) throw new Error(placesError.message);

          for (const place of places ?? []) {
            if (!place.trip_id) continue;

            const existing = placesByTrip.get(place.trip_id) ?? [];

            existing.push({
              id: place.id,
              name: place.name,
              visited: place.visited === true,
            });

            placesByTrip.set(place.trip_id, existing);
          }
        }

        if (active) {
          setDiscoveryTrips(
            tripRows.map((trip) => ({
              ...trip,
              destinations: placesByTrip.get(trip.id) ?? [],
            }))
          );
        }
      } catch (err) {
        if (active) {
          setDiscoveryTrips([]);
          setDiscoveryTripsError(
            err instanceof Error ? err.message : 'Unable to load trips.'
          );
        }
      } finally {
        if (active) setDiscoveryTripsLoading(false);
      }
    }

    void loadDiscoveryTrips();

    return () => {
      active = false;
    };
  }, [discoveryTripsRefresh, today]);

  // Load trips for a selected destination
  useEffect(() => {
    let active = true;

    if (!tripDestination) return;

    async function loadTrips() {
      setTripsLoading(true);
      setTripsError('');

      try {
        const escapedDestination = tripDestination.replace(
          /[\\%_]/g,
          '\\$&'
        );

        const { data, error } = await supabase
          .from('trips')
          .select(
            'id, name, destination, start_date, end_date, created_by, categories'
          )
          .gte('end_date', today)
          .ilike('destination', `%${escapedDestination}%`)
          .order('start_date', { ascending: true });

        if (error) throw new Error(error.message);

        const tripRows = (data ?? []).map((trip) => ({
          ...trip,
          categories: Array.isArray(trip.categories)
            ? trip.categories
            : [],
        })) as Omit<Trip, 'destinations'>[];

        const ids = tripRows.map((trip) => trip.id);
        const placesByTrip = new Map<string, Place[]>();

        if (ids.length > 0) {
          const { data: places, error: placesError } = await supabase
            .from('trip_destinations')
            .select('id, trip_id, name, visited')
            .in('trip_id', ids)
            .order('created_at', { ascending: true });

          if (placesError) throw new Error(placesError.message);

          for (const place of places ?? []) {
            if (!place.trip_id) continue;

            const existing = placesByTrip.get(place.trip_id) ?? [];

            existing.push({
              id: place.id,
              name: place.name,
              visited: place.visited === true,
            });

            placesByTrip.set(place.trip_id, existing);
          }
        }

        if (active) {
          setTrips(
            tripRows.map((trip) => ({
              ...trip,
              destinations: placesByTrip.get(trip.id) ?? [],
            }))
          );
        }
      } catch (err) {
        if (active) {
          setTrips([]);
          setTripsError(
            err instanceof Error ? err.message : 'Unable to load trips.'
          );
        }
      } finally {
        if (active) setTripsLoading(false);
      }
    }

    void loadTrips();

    return () => {
      active = false;
    };
  }, [tripDestination, tripsRefresh, today]);

  const query = search.trim().toLowerCase();

  // Filter destinations
  const filteredDestinations = catalogue.filter((item) => {
    const matchesCategory =
      category === 'all' || item.category === category;

    const searchableText = [
      item.name,
      item.region,
      item.country,
      item.category,
      item.description,
      ...item.highlights,
    ]
      .join(' ')
      .toLowerCase();

    return matchesCategory && searchableText.includes(query);
  });

  // Filter trips using the same category and search
  const filteredDiscoveryTrips = discoveryTrips.filter((trip) => {
    const matchesCategory =
      category === 'all' || trip.categories.includes(category);

    const searchableText = [
      trip.name,
      trip.destination,
      ...trip.categories,
      ...trip.destinations.map((place) => place.name),
    ]
      .join(' ')
      .toLowerCase();

    return matchesCategory && searchableText.includes(query);
  });

  function findTrips(value: string) {
    const name = value.trim();
    if (!name) return;

    setSelectedDestination(null);
    setTrips([]);
    setTripsError('');
    setTripsLoading(true);
    setTripDestination(name);
    setTripsRefresh((current) => current + 1);
  }

  function backToDestinations() {
    setTripDestination('');
    setTrips([]);
    setTripsError('');
    setTripsLoading(false);
  }

  function planTripHere(name: string) {
    setSelectedDestination(null);

    router.push({
      pathname: '/create-trip',
      params: {
        destination: name,
        planningKey: Date.now().toString(),
      },
    });
  }

  function renderDestination({ item }: { item: Destination }) {
    return (
      <TouchableOpacity
        accessibilityRole="button"
        accessibilityLabel={`Explore ${item.name}`}
        style={styles.destinationCard}
        onPress={() => setSelectedDestination(item)}
      >
        <DestinationPhoto uri={item.image_url} name={item.name} />

        <View style={styles.cardContent}>
          <View style={styles.badgeRow}>
            <Text style={styles.badge}>{categoryLabel(item.category)}</Text>

            {item.is_featured && (
              <Text style={styles.featured}>Featured</Text>
            )}
          </View>

          <Text style={styles.cardTitle}>{item.name}</Text>

          <Text style={styles.secondary}>
            {[item.region, item.country].filter(Boolean).join(', ')}
          </Text>

          <Text style={styles.body} numberOfLines={3}>
            {item.description}
          </Text>

          <Text style={styles.link}>View Destination →</Text>
        </View>
      </TouchableOpacity>
    );
  }

  function renderTrip({ item }: { item: Trip }) {
    return (
      <TouchableOpacity
        accessibilityRole="button"
        style={styles.card}
        onPress={() => router.push(`/trip-details?tripId=${item.id}`)}
      >
        <Text style={styles.cardTitle}>{item.name}</Text>

        <Text style={styles.secondary}>📍 {item.destination}</Text>

        {item.categories.length > 0 && (
          <View style={styles.tripCategoryRow}>
            {item.categories.map((value) => (
              <View key={value} style={styles.tripCategoryBadge}>
                <Text style={styles.tripCategoryText}>
                  {categoryLabel(value)}
                </Text>
              </View>
            ))}
          </View>
        )}

        <Text style={styles.link}>
          {!item.start_date
            ? 'Start date not specified'
            : item.start_date > today
              ? 'Upcoming'
              : 'Ongoing'}
        </Text>

        <View style={styles.divider} />

        <View style={styles.dateRow}>
          <View>
            <Text style={styles.label}>START</Text>
            <Text style={styles.value}>
              {item.start_date || 'Not specified'}
            </Text>
          </View>

          <View>
            <Text style={styles.label}>END</Text>
            <Text style={styles.value}>
              {item.end_date || 'Not specified'}
            </Text>
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

  // Header shown inside the destination list
  const destinationsHeader = (
    <View>
      <View style={styles.tripSectionHeader}>
        <View>
          <Text style={styles.sectionTitle}>Trips to Explore</Text>
          <Text style={styles.secondary}>
            Trips matching your selected category
          </Text>
        </View>

        <TouchableOpacity
          accessibilityRole="button"
          onPress={() => router.push('/create-trip')}
        >
          <Text style={styles.link}>+ Create Trip</Text>
        </TouchableOpacity>
      </View>

      {discoveryTripsLoading ? (
        <ActivityIndicator
          size="small"
          color="#4F8CFF"
          style={styles.tripLoader}
        />
      ) : discoveryTripsError ? (
        <View style={styles.empty}>
          <Text style={styles.error}>{discoveryTripsError}</Text>

          <TouchableOpacity
            accessibilityRole="button"
            onPress={() =>
              setDiscoveryTripsRefresh((current) => current + 1)
            }
          >
            <Text style={styles.link}>Try Again</Text>
          </TouchableOpacity>
        </View>
      ) : filteredDiscoveryTrips.length === 0 ? (
        <Text style={styles.emptyText}>
          No trips match this category yet. Be the first to create one!
        </Text>
      ) : (
        filteredDiscoveryTrips.map((trip) => (
          <View key={trip.id}>{renderTrip({ item: trip })}</View>
        ))
      )}

      <View style={styles.destinationSectionHeader}>
        <Text style={styles.sectionTitle}>Explore Destinations</Text>
        <Text style={styles.secondary}>
          Discover places for your next journey
        </Text>
      </View>

      <RecommendedDestinations
        destinations={filteredDestinations}
        onSelect={(item) => setSelectedDestination(item)}
      />

      <Text style={styles.resultCount}>
        {filteredDestinations.length} destinations ·{' '}
        {filteredDiscoveryTrips.length} trips
      </Text>
    </View>
  );

  return (
    <View style={styles.container}>
      <Text style={styles.title}>Explore</Text>

      <Text style={styles.subtitle}>
        Discover destinations and find your travel companions.
      </Text>

      {/* Only two tabs */}
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
      ) : tripDestination ? (
        <View style={styles.flex}>
          <TouchableOpacity
            accessibilityRole="button"
            onPress={backToDestinations}
          >
            <Text style={styles.backText}>← Back to Destinations</Text>
          </TouchableOpacity>

          <Text style={styles.label}>UPCOMING AND ONGOING TRIPS TO</Text>
          <Text style={styles.resultsTitle}>{tripDestination}</Text>

          <TouchableOpacity
            accessibilityRole="button"
            style={styles.secondaryButton}
            onPress={() => planTripHere(tripDestination)}
          >
            <Text style={styles.buttonText}>Plan Your Own Trip Here</Text>
          </TouchableOpacity>

          {tripsLoading ? (
            <View style={styles.empty}>
              <ActivityIndicator size="large" color="#4F8CFF" />
              <Text style={styles.secondary}>Finding trips...</Text>
            </View>
          ) : tripsError ? (
            <View style={styles.empty}>
              <Text style={styles.error}>{tripsError}</Text>

              <TouchableOpacity
                accessibilityRole="button"
                onPress={() =>
                  setTripsRefresh((current) => current + 1)
                }
              >
                <Text style={styles.link}>Try Again</Text>
              </TouchableOpacity>
            </View>
          ) : (
            <FlatList
              key="trips"
              style={styles.tripList}
              data={trips.filter(
                (trip) => trip.end_date !== null && trip.end_date >= today
              )}
              keyExtractor={(item) => item.id}
              renderItem={renderTrip}
              contentContainerStyle={styles.list}
              showsVerticalScrollIndicator={false}
              ListEmptyComponent={
                <View style={styles.empty}>
                  <Text style={styles.cardTitle}>No active trips found</Text>
                  <Text style={styles.emptyText}>
                    No upcoming or ongoing trips match this destination.
                    You can plan your own trip using the button above.
                  </Text>
                </View>
              }
            />
          )}
        </View>
      ) : (
        <View style={styles.flex}>
          {/* Search */}
          <TextInput
            accessibilityLabel="Search destinations and trips"
            style={styles.input}
            placeholder="Search destinations, trips, regions..."
            placeholderTextColor="#9299A8"
            value={search}
            onChangeText={setSearch}
            autoCorrect={false}
            returnKeyType="search"
          />

          {!!search.trim() && (
            <View style={styles.searchActions}>
              <TouchableOpacity
                accessibilityRole="button"
                style={styles.findTripsButton}
                onPress={() => findTrips(search)}
              >
                <Text style={styles.buttonText}>
                  Find Trips to “{search.trim()}”
                </Text>
              </TouchableOpacity>

              <TouchableOpacity
                accessibilityRole="button"
                style={styles.clearButton}
                onPress={() => setSearch('')}
              >
                <Text style={styles.closeText}>Clear</Text>
              </TouchableOpacity>
            </View>
          )}

          {/* Visible category filter bar */}
          <View style={styles.categoryBar}>
            <ScrollView
              horizontal
              style={styles.categoryScroll}
              contentContainerStyle={styles.categories}
              showsHorizontalScrollIndicator={false}
              keyboardShouldPersistTaps="handled"
              nestedScrollEnabled
            >
              {CATEGORIES.map((item) => {
                const isSelected = category === item.value;

                return (
                  <TouchableOpacity
                    key={item.value}
                    accessibilityRole="button"
                    accessibilityState={{ selected: isSelected }}
                    style={[
                      styles.categoryChip,
                      isSelected && styles.selectedCategory,
                    ]}
                    onPress={() => setCategory(item.value)}
                  >
                    <Text
                      style={[
                        styles.categoryText,
                        isSelected && styles.selectedCategoryText,
                      ]}
                    >
                      {item.label}
                    </Text>
                  </TouchableOpacity>
                );
              })}
            </ScrollView>
          </View>

          {catalogueLoading ? (
            <View style={styles.empty}>
              <ActivityIndicator size="large" color="#4F8CFF" />
              <Text style={styles.secondary}>Loading destinations...</Text>
            </View>
          ) : catalogueError ? (
            <View style={styles.empty}>
              <Text style={styles.error}>{catalogueError}</Text>

              <TouchableOpacity
                accessibilityRole="button"
                onPress={() =>
                  setCatalogueRefresh((current) => current + 1)
                }
              >
                <Text style={styles.link}>Try Again</Text>
              </TouchableOpacity>
            </View>
          ) : (
            <FlatList
              key="destinations"
              style={styles.flex}
              data={filteredDestinations}
              keyExtractor={(item) => item.id}
              renderItem={renderDestination}
              contentContainerStyle={styles.list}
              showsVerticalScrollIndicator={false}
              keyboardShouldPersistTaps="handled"
              onRefresh={() => {
                setCatalogueRefresh((current) => current + 1);
                setDiscoveryTripsRefresh((current) => current + 1);
              }}
              refreshing={catalogueLoading || discoveryTripsLoading}
              ListHeaderComponent={destinationsHeader}
              ListEmptyComponent={
                <View style={styles.empty}>
                  <Text style={styles.cardTitle}>
                    {catalogue.length === 0
                      ? 'No destinations available yet'
                      : 'No matching destinations'}
                  </Text>

                  <Text style={styles.emptyText}>
                    Try another search or category. You can also create a trip.
                  </Text>

                  {(!!search || category !== 'all') && (
                    <TouchableOpacity
                      accessibilityRole="button"
                      onPress={() => {
                        setSearch('');
                        setCategory('all');
                      }}
                    >
                      <Text style={styles.link}>Reset Filters</Text>
                    </TouchableOpacity>
                  )}
                </View>
              }
            />
          )}
        </View>
      )}

      {/* Destination details modal */}
      <Modal
        visible={selectedDestination !== null}
        transparent
        animationType="slide"
        onRequestClose={() => setSelectedDestination(null)}
      >
        <View style={styles.modalBackdrop}>
          <View style={styles.modalCard} accessibilityViewIsModal>
            <View style={styles.modalHeader}>
              <Text style={styles.cardTitle}>Destination Details</Text>

              <TouchableOpacity
                accessibilityRole="button"
                accessibilityLabel="Close destination details"
                onPress={() => setSelectedDestination(null)}
              >
                <Text style={styles.closeText}>Close</Text>
              </TouchableOpacity>
            </View>

            {selectedDestination && (
              <ScrollView
                contentContainerStyle={styles.modalContent}
                showsVerticalScrollIndicator={false}
                keyboardShouldPersistTaps="handled"
              >
                <DestinationPhoto
                  uri={selectedDestination.image_url}
                  name={selectedDestination.name}
                />

                <Text style={styles.detailTitle}>
                  {selectedDestination.name}
                </Text>

                <Text style={styles.secondary}>
                  {[selectedDestination.region, selectedDestination.country]
                    .filter(Boolean)
                    .join(', ')}
                </Text>

                <Text style={styles.link}>
                  {categoryLabel(selectedDestination.category)}
                  {selectedDestination.is_featured ? ' · Featured' : ''}
                </Text>

                <Text style={styles.body}>
                  {selectedDestination.description}
                </Text>

                <Text style={styles.detailHeading}>Best Time to Visit</Text>
                <Text style={styles.body}>
                  {selectedDestination.best_time_to_visit || 'Not specified yet.'}
                </Text>

                <Text style={styles.detailHeading}>Highlights</Text>

                {selectedDestination.highlights.length > 0 ? (
                  selectedDestination.highlights.map((highlight, index) => (
                    <Text key={`${index}-${highlight}`} style={styles.body}>
                      • {highlight}
                    </Text>
                  ))
                ) : (
                  <Text style={styles.secondary}>
                    No highlights added yet.
                  </Text>
                )}

                <Text style={styles.detailHeading}>Travel Tips</Text>

                {selectedDestination.travel_tips.length > 0 ? (
                  selectedDestination.travel_tips.map((tip, index) => (
                    <Text key={`${index}-${tip}`} style={styles.body}>
                      • {tip}
                    </Text>
                  ))
                ) : (
                  <Text style={styles.secondary}>
                    No travel tips added yet.
                  </Text>
                )}

                <TouchableOpacity
                  accessibilityRole="button"
                  style={styles.primaryButton}
                  onPress={() => planTripHere(selectedDestination.name)}
                >
                  <Text style={styles.buttonText}>Plan a Trip Here</Text>
                </TouchableOpacity>

                <TouchableOpacity
                  accessibilityRole="button"
                  style={styles.secondaryButton}
                  onPress={() => findTrips(selectedDestination.name)}
                >
                  <Text style={styles.buttonText}>Find Trips Here</Text>
                </TouchableOpacity>
              </ScrollView>
            )}
          </View>
        </View>
      </Modal>
    </View>
  );
}

const styles = StyleSheet.create({
  container: {
    flex: 1,
    backgroundColor: '#08090D',
    paddingHorizontal: 22,
    paddingTop: 28,
  },

  flex: {
    flex: 1,
    minHeight: 0,
  },

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
    marginBottom: 14,
  },

  tab: {
    flex: 1,
    paddingVertical: 12,
    borderRadius: 10,
    alignItems: 'center',
  },

  activeTab: {
    backgroundColor: '#4F8CFF',
  },

  tabText: {
    color: '#9299A8',
    fontWeight: '700',
  },

  activeTabText: {
    color: '#FFFFFF',
  },

  input: {
    color: '#F7F8FC',
    backgroundColor: '#151821',
    borderWidth: 1,
    borderColor: '#292E3B',
    borderRadius: 14,
    paddingHorizontal: 15,
    paddingVertical: 14,
  },

  searchActions: {
    flexDirection: 'row',
    alignItems: 'center',
    marginTop: 10,
  },

  findTripsButton: {
    flex: 1,
    backgroundColor: '#293F64',
    borderRadius: 10,
    padding: 12,
  },

  clearButton: {
    padding: 12,
  },

  buttonText: {
    color: '#FFFFFF',
    fontWeight: '700',
    textAlign: 'center',
  },

  // Category filter container
  categoryBar: {
    height: 62,
    flexShrink: 0,
    justifyContent: 'center',
    backgroundColor: '#08090D',
    zIndex: 20,
    elevation: 8,
  },

  categoryScroll: {
    flexGrow: 0,
    flexShrink: 0,
    height: 58,
  },

  categories: {
    flexDirection: 'row',
    alignItems: 'center',
    paddingHorizontal: 2,
    paddingVertical: 8,
  },

  categoryChip: {
    minHeight: 40,
    justifyContent: 'center',
    alignItems: 'center',
    borderWidth: 1,
    borderColor: '#454D60',
    backgroundColor: '#202637',
    paddingHorizontal: 16,
    paddingVertical: 9,
    borderRadius: 22,
    marginRight: 9,
  },

  selectedCategory: {
    backgroundColor: '#293F64',
    borderColor: '#4F8CFF',
  },

  categoryText: {
    color: '#FFFFFF',
    fontSize: 13,
    fontWeight: '700',
  },

  selectedCategoryText: {
    color: '#FFFFFF',
  },

  resultCount: {
    color: '#9299A8',
    marginBottom: 12,
  },

  list: {
    paddingBottom: 30,
  },

  tripList: {
    flex: 1,
    marginTop: 16,
  },

  destinationCard: {
    backgroundColor: '#151821',
    borderRadius: 17,
    overflow: 'hidden',
    marginBottom: 16,
    borderWidth: 1,
    borderColor: '#252A37',
  },

  photo: {
    width: '100%',
    height: 180,
    backgroundColor: '#202D49',
    borderRadius: 12,
  },

  photoFallback: {
    height: 150,
    backgroundColor: '#202D49',
    alignItems: 'center',
    justifyContent: 'center',
    borderRadius: 12,
  },

  photoIcon: {
    fontSize: 30,
    marginBottom: 8,
  },

  cardContent: {
    padding: 18,
  },

  badgeRow: {
    flexDirection: 'row',
    flexWrap: 'wrap',
    alignItems: 'center',
    marginBottom: 10,
  },

  badge: {
    color: '#A9C5FF',
    backgroundColor: '#243450',
    borderRadius: 8,
    paddingHorizontal: 10,
    paddingVertical: 5,
    marginRight: 10,
    fontSize: 12,
  },

  featured: {
    color: '#EAC875',
    fontSize: 12,
    fontWeight: '700',
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

  body: {
    color: '#D7DBE5',
    marginTop: 10,
    lineHeight: 22,
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

  backText: {
    color: '#75A2FF',
    fontWeight: '700',
    paddingVertical: 12,
    marginBottom: 12,
  },

  resultsTitle: {
    color: '#F7F8FC',
    fontSize: 23,
    fontWeight: '700',
    marginTop: 6,
  },

  empty: {
    padding: 24,
    alignItems: 'center',
  },

  emptyText: {
    color: '#9299A8',
    marginTop: 10,
    lineHeight: 21,
    textAlign: 'center',
  },

  error: {
    color: '#FF9B9B',
    textAlign: 'center',
  },

  modalBackdrop: {
    flex: 1,
    backgroundColor: 'rgba(0,0,0,0.75)',
    justifyContent: 'center',
    alignItems: 'center',
    padding: 20,
  },

  modalCard: {
    width: '100%',
    maxWidth: 600,
    maxHeight: '90%',
    backgroundColor: '#151821',
    borderRadius: 18,
    borderWidth: 1,
    borderColor: '#252A37',
    overflow: 'hidden',
  },

  modalHeader: {
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'space-between',
    padding: 18,
    borderBottomWidth: 1,
    borderBottomColor: '#252A37',
  },

  closeText: {
    color: '#75A2FF',
    fontWeight: '700',
  },

  modalContent: {
    padding: 18,
    paddingBottom: 32,
  },

  detailTitle: {
    color: '#F7F8FC',
    fontSize: 26,
    fontWeight: '800',
    marginTop: 18,
  },

  detailHeading: {
    color: '#F7F8FC',
    fontSize: 17,
    fontWeight: '700',
    marginTop: 24,
  },

  primaryButton: {
    backgroundColor: '#4F8CFF',
    borderRadius: 12,
    padding: 16,
    alignItems: 'center',
    marginTop: 24,
  },

  secondaryButton: {
    backgroundColor: '#252A37',
    borderWidth: 1,
    borderColor: '#3B4354',
    borderRadius: 12,
    padding: 16,
    alignItems: 'center',
    marginTop: 12,
  },

  tripCategoryRow: {
    flexDirection: 'row',
    flexWrap: 'wrap',
    marginTop: 12,
    gap: 7,
  },

  tripCategoryBadge: {
    backgroundColor: '#243450',
    borderWidth: 1,
    borderColor: '#38547D',
    borderRadius: 8,
    paddingHorizontal: 10,
    paddingVertical: 5,
  },

  tripCategoryText: {
    color: '#A9C5FF',
    fontSize: 11,
    fontWeight: '700',
  },

  tripSectionHeader: {
    flexDirection: 'row',
    justifyContent: 'space-between',
    alignItems: 'center',
    marginTop: 6,
    marginBottom: 12,
  },

  destinationSectionHeader: {
    marginTop: 20,
    marginBottom: 12,
  },

  sectionTitle: {
    color: '#F7F8FC',
    fontSize: 19,
    fontWeight: '800',
  },

  tripLoader: {
    marginVertical: 20,
  },
});
