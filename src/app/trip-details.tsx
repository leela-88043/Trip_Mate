import { useEffect, useState } from 'react';
import {
  ActivityIndicator,
  Alert,
  ScrollView,
  StyleSheet,
  Text,
  TouchableOpacity,
  View,
} from 'react-native';
import { router, useLocalSearchParams } from 'expo-router';

import { supabase } from '@/services/supabase';
import {
  joinTrip,
  removeTripMember,
} from '@/services/tripMembers';
import { deleteTrip } from '@/services/trip';

type Trip = {
  id: string;
  name: string;
  destination: string;
  start_date: string;
  end_date: string;
  created_by: string;
};

type TripDestination = {
  id: string;
  trip_id: string;
  name: string;
  visited: boolean;
};

export default function TripDetailsScreen() {
  const { tripId } = useLocalSearchParams();

  const [trip, setTrip] = useState<Trip | null>(null);
  const [members, setMembers] = useState<any[]>([]);
  const [destinations, setDestinations] = useState<
    TripDestination[]
  >([]);

  const [loading, setLoading] = useState(true);
  const [joining, setJoining] = useState(false);
  const [deleting, setDeleting] = useState(false);
  const [removingMember, setRemovingMember] =
    useState<string | null>(null);
  const [updatingPlace, setUpdatingPlace] =
    useState<string | null>(null);
  const [currentUserId, setCurrentUserId] =
    useState('');

  useEffect(() => {
    loadTrip();
  }, []);

  const loadTrip = async () => {
    if (!tripId) {
      Alert.alert(
        'Error',
        'Trip ID is missing.'
      );
      setLoading(false);
      return;
    }

    const {
      data: { user },
    } = await supabase.auth.getUser();

    if (user) {
      setCurrentUserId(user.id);
    }

    const { data, error } = await supabase
      .from('trips')
      .select(
        'id, name, destination, start_date, end_date, created_by'
      )
      .eq('id', String(tripId))
      .maybeSingle();

    if (error) {
      Alert.alert(
        'Trip Loading Error',
        error.message
      );
      setLoading(false);
      return;
    }

    if (!data) {
      Alert.alert(
        'Trip Not Found',
        'This trip could not be found.'
      );
      setLoading(false);
      return;
    }

    setTrip(data);

    const {
      data: destinationData,
      error: destinationError,
    } = await supabase
      .from('trip_destinations')
      .select(
        'id, trip_id, name, visited'
      )
      .eq('trip_id', String(tripId))
      .order('created_at', {
        ascending: true,
      });

    if (destinationError) {
      console.log(
        'Destination error:',
        destinationError.message
      );
    } else {
      setDestinations(
        destinationData ?? []
      );
    }

    const {
      data: memberData,
      error: memberError,
    } = await supabase
      .from('trip_members')
      .select(`
        user_id,
        role,
        profiles (
          full_name,
          email
        )
      `)
      .eq('trip_id', String(tripId));

    if (memberError) {
      console.log(
        'Member error:',
        memberError.message
      );
    } else {
      setMembers(memberData ?? []);
    }

    setLoading(false);
  };

  const handleTogglePlace = async (
    place: TripDestination
  ) => {
    setUpdatingPlace(place.id);

    const newVisited = !place.visited;

    const { error } = await supabase
      .from('trip_destinations')
      .update({
        visited: newVisited,
      })
      .eq('id', place.id);

    setUpdatingPlace(null);

    if (error) {
      Alert.alert(
        'Update Failed',
        error.message
      );
      return;
    }

    setDestinations((current) =>
      current.map((item) =>
        item.id === place.id
          ? {
              ...item,
              visited: newVisited,
            }
          : item
      )
    );
  };

  const handleJoinTrip = async () => {
    if (!tripId) {
      Alert.alert(
        'Error',
        'Trip ID is missing.'
      );
      return;
    }

    const {
      data: { user },
    } = await supabase.auth.getUser();

    if (!user) {
      Alert.alert(
        'Login Required',
        'Please login first.'
      );
      return;
    }

    setJoining(true);

    const { error } = await joinTrip(
      String(tripId),
      user.id
    );

    setJoining(false);

    if (error) {
      Alert.alert(
        'Join Failed',
        error.message
      );
      return;
    }

    Alert.alert(
      'Success',
      'You have joined this trip!'
    );

    loadTrip();
  };

  const handleDeleteTrip = async () => {
    if (!tripId) {
      Alert.alert(
        'Error',
        'Trip ID is missing.'
      );
      return;
    }

    Alert.alert(
      'Delete Trip',
      'Are you sure you want to delete this trip? This action cannot be undone.',
      [
        {
          text: 'Cancel',
          style: 'cancel',
        },
        {
          text: 'Delete',
          style: 'destructive',
          onPress: async () => {
            const {
              data: { user },
            } = await supabase.auth.getUser();

            if (!user) {
              Alert.alert(
                'Login Required',
                'Please login first.'
              );
              return;
            }

            setDeleting(true);

            const { data, error } =
              await deleteTrip(
                String(tripId),
                user.id
              );

            setDeleting(false);

            if (error) {
              Alert.alert(
                'Delete Failed',
                error.message
              );
              return;
            }

            if (!data) {
              Alert.alert(
                'Delete Failed',
                'The trip could not be deleted. You may not be the owner.'
              );
              return;
            }

            Alert.alert(
              'Success',
              'Trip deleted successfully.',
              [
                {
                  text: 'OK',
                  onPress: () =>
                    router.replace('/my-trips'),
                },
              ]
            );
          },
        },
      ]
    );
  };

  const handleRemoveMember = (
    memberUserId: string,
    memberName: string
  ) => {
    if (!tripId) {
      Alert.alert(
        'Error',
        'Trip ID is missing.'
      );
      return;
    }

    if (memberUserId === currentUserId) {
      Alert.alert(
        'Cannot Remove Owner',
        'You are the owner of this trip and cannot remove yourself.'
      );
      return;
    }

    Alert.alert(
      'Remove Member',
      `Are you sure you want to remove ${memberName} from this trip?`,
      [
        {
          text: 'Cancel',
          style: 'cancel',
        },
        {
          text: 'Remove',
          style: 'destructive',
          onPress: async () => {
            setRemovingMember(memberUserId);

            const { data, error } =
              await removeTripMember(
                String(tripId),
                memberUserId
              );

            setRemovingMember(null);

            if (error) {
              Alert.alert(
                'Remove Failed',
                error.message
              );
              return;
            }

            if (!data) {
              Alert.alert(
                'Remove Failed',
                'The member could not be removed.'
              );
              return;
            }

            Alert.alert(
              'Success',
              `${memberName} has been removed from the trip.`
            );

            loadTrip();
          },
        },
      ]
    );
  };

  if (loading) {
    return (
      <View style={styles.center}>
        <ActivityIndicator size="large" />
        <Text>Loading trip...</Text>
      </View>
    );
  }

  if (!trip) {
    return (
      <View style={styles.center}>
        <Text>Trip not found.</Text>
      </View>
    );
  }

  const isOwner =
    currentUserId === trip.created_by;

  const visitedCount = destinations.filter(
    (place) => place.visited
  ).length;

  return (
    <ScrollView
      style={styles.scrollView}
      contentContainerStyle={styles.container}
      showsVerticalScrollIndicator={false}
    >
      <Text style={styles.title}>
        Trip Details
      </Text>

      <Text style={styles.label}>
        Trip Name
      </Text>

      <Text style={styles.value}>
        {trip.name}
      </Text>

      <Text style={styles.label}>
        Destination
      </Text>

      <Text style={styles.value}>
        {trip.destination}
      </Text>

      <Text style={styles.label}>
        Start Date
      </Text>

      <Text style={styles.value}>
        {trip.start_date}
      </Text>

      <Text style={styles.label}>
        End Date
      </Text>

      <Text style={styles.value}>
        {trip.end_date}
      </Text>

      {isOwner && (
        <>
          <TouchableOpacity
            style={styles.editButton}
            onPress={() =>
              router.push({
                pathname: '/edit-trip',
                params: {
                  tripId: trip.id,
                  name: trip.name,
                  destination: trip.destination,
                  startDate: trip.start_date,
                  endDate: trip.end_date,
                },
              })
            }
            disabled={deleting}
          >
            <Text style={styles.editButtonText}>
              Edit Trip
            </Text>
          </TouchableOpacity>

          <TouchableOpacity
            style={styles.deleteButton}
            onPress={handleDeleteTrip}
            disabled={deleting}
          >
            {deleting ? (
              <ActivityIndicator color="#DC2626" />
            ) : (
              <Text style={styles.deleteButtonText}>
                Delete Trip
              </Text>
            )}
          </TouchableOpacity>
        </>
      )}

      {!isOwner && (
        <TouchableOpacity
          style={styles.joinButton}
          onPress={handleJoinTrip}
          disabled={joining}
        >
          <Text style={styles.joinButtonText}>
            {joining
              ? 'Joining...'
              : 'Join This Trip'}
          </Text>
        </TouchableOpacity>
      )}

      <View style={styles.placesHeader}>
        <Text style={styles.placesTitle}>
          Places to Visit
        </Text>

        <Text style={styles.placesProgress}>
          {visitedCount} of {destinations.length}{' '}
          completed
        </Text>
      </View>

      {destinations.length === 0 ? (
        <View style={styles.noPlacesCard}>
          <Text style={styles.noPlacesTitle}>
            No places added
          </Text>

          <Text style={styles.noPlacesText}>
            No places to visit have been added
            to this trip yet.
          </Text>
        </View>
      ) : (
        <View style={styles.placesCard}>
          {destinations.map((place) => (
            <TouchableOpacity
              key={place.id}
              style={styles.placeRow}
              onPress={() =>
                handleTogglePlace(place)
              }
              disabled={
                updatingPlace === place.id
              }
              activeOpacity={0.7}
            >
              <View
                style={[
                  styles.checkbox,
                  place.visited &&
                    styles.checkboxVisited,
                ]}
              >
                {place.visited && (
                  <Text style={styles.checkmark}>
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

              {updatingPlace === place.id && (
                <ActivityIndicator
                  size="small"
                  style={styles.placeLoader}
                />
              )}
            </TouchableOpacity>
          ))}
        </View>
      )}

      <Text style={styles.membersTitle}>
        Trip Members
      </Text>

      {members.length === 0 ? (
        <Text style={styles.noMembers}>
          No members found.
        </Text>
      ) : (
        members.map((member) => {
          const memberName =
            member.profiles?.full_name ||
            'Unknown User';

          const isMemberOwner =
            member.user_id === trip.created_by ||
            member.role === 'owner';

          return (
            <View
              key={member.user_id}
              style={styles.memberCard}
            >
              <View style={styles.memberInfo}>
                <Text style={styles.memberName}>
                  {memberName}
                </Text>

                <Text style={styles.memberEmail}>
                  {member.profiles?.email ||
                    'No email'}
                </Text>

                <Text style={styles.memberRole}>
                  Role: {member.role}
                </Text>
              </View>

              {isOwner && !isMemberOwner && (
                <TouchableOpacity
                  style={styles.removeButton}
                  onPress={() =>
                    handleRemoveMember(
                      member.user_id,
                      memberName
                    )
                  }
                  disabled={
                    removingMember ===
                    member.user_id
                  }
                >
                  {removingMember ===
                  member.user_id ? (
                    <ActivityIndicator
                      size="small"
                      color="#DC2626"
                    />
                  ) : (
                    <Text
                      style={
                        styles.removeButtonText
                      }
                    >
                      Remove
                    </Text>
                  )}
                </TouchableOpacity>
              )}
            </View>
          );
        })
      )}
    </ScrollView>
  );
}

const styles = StyleSheet.create({
  scrollView: {
    flex: 1,
    backgroundColor: '#F5F7FA',
  },

  container: {
    padding: 24,
    paddingBottom: 40,
  },

  center: {
    flex: 1,
    justifyContent: 'center',
    alignItems: 'center',
    gap: 10,
  },

  title: {
    fontSize: 28,
    fontWeight: '700',
    marginBottom: 30,
    color: '#111827',
  },

  label: {
    fontSize: 14,
    fontWeight: '600',
    color: '#6B7280',
    marginTop: 15,
  },

  value: {
    fontSize: 18,
    color: '#111827',
    marginTop: 5,
  },

  editButton: {
    height: 50,
    backgroundColor: '#FFFFFF',
    borderWidth: 1,
    borderColor: '#2563EB',
    borderRadius: 10,
    justifyContent: 'center',
    alignItems: 'center',
    marginTop: 25,
  },

  editButtonText: {
    color: '#2563EB',
    fontSize: 16,
    fontWeight: '700',
  },

  deleteButton: {
    height: 50,
    backgroundColor: '#FFFFFF',
    borderWidth: 1,
    borderColor: '#DC2626',
    borderRadius: 10,
    justifyContent: 'center',
    alignItems: 'center',
    marginTop: 10,
  },

  deleteButtonText: {
    color: '#DC2626',
    fontSize: 16,
    fontWeight: '700',
  },

  joinButton: {
    height: 50,
    backgroundColor: '#2563EB',
    borderRadius: 10,
    justifyContent: 'center',
    alignItems: 'center',
    marginTop: 25,
  },

  joinButtonText: {
    color: '#FFFFFF',
    fontSize: 16,
    fontWeight: '700',
  },

  placesHeader: {
    marginTop: 30,
    marginBottom: 12,
  },

  placesTitle: {
    fontSize: 20,
    fontWeight: '700',
    color: '#111827',
  },

  placesProgress: {
    fontSize: 13,
    color: '#6B7280',
    marginTop: 4,
  },

  placesCard: {
    backgroundColor: '#FFFFFF',
    borderRadius: 12,
    paddingHorizontal: 15,
    borderWidth: 1,
    borderColor: '#E5E7EB',
  },

  placeRow: {
    minHeight: 58,
    flexDirection: 'row',
    alignItems: 'center',
    borderBottomWidth: 1,
    borderBottomColor: '#F3F4F6',
  },

  checkbox: {
    width: 25,
    height: 25,
    borderRadius: 6,
    borderWidth: 2,
    borderColor: '#9CA3AF',
    justifyContent: 'center',
    alignItems: 'center',
    marginRight: 12,
  },

  checkboxVisited: {
    backgroundColor: '#2563EB',
    borderColor: '#2563EB',
  },

  checkmark: {
    color: '#FFFFFF',
    fontSize: 16,
    fontWeight: '700',
  },

  placeName: {
    flex: 1,
    fontSize: 16,
    color: '#111827',
  },

  placeNameVisited: {
    color: '#6B7280',
    textDecorationLine: 'line-through',
  },

  placeLoader: {
    marginLeft: 8,
  },

  noPlacesCard: {
    backgroundColor: '#FFFFFF',
    borderRadius: 12,
    padding: 18,
    borderWidth: 1,
    borderColor: '#E5E7EB',
  },

  noPlacesTitle: {
    fontSize: 16,
    fontWeight: '700',
    color: '#111827',
  },

  noPlacesText: {
    fontSize: 14,
    color: '#6B7280',
    marginTop: 5,
  },

  membersTitle: {
    fontSize: 20,
    fontWeight: '700',
    color: '#111827',
    marginTop: 30,
    marginBottom: 12,
  },

  memberCard: {
    backgroundColor: '#FFFFFF',
    borderRadius: 12,
    padding: 15,
    marginBottom: 10,
    borderWidth: 1,
    borderColor: '#E5E7EB',
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'space-between',
  },

  memberInfo: {
    flex: 1,
    marginRight: 10,
  },

  memberName: {
    fontSize: 16,
    fontWeight: '600',
    color: '#111827',
  },

  memberEmail: {
    fontSize: 14,
    color: '#6B7280',
    marginTop: 4,
  },

  memberRole: {
    fontSize: 14,
    color: '#2563EB',
    marginTop: 4,
    fontWeight: '600',
  },

  removeButton: {
    borderWidth: 1,
    borderColor: '#DC2626',
    borderRadius: 8,
    paddingHorizontal: 12,
    paddingVertical: 8,
  },

  removeButtonText: {
    color: '#DC2626',
    fontSize: 13,
    fontWeight: '700',
  },

  noMembers: {
    fontSize: 15,
    color: '#6B7280',
  },
});

