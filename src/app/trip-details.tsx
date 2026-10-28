import { useCallback, useState } from 'react';
import {
  ActivityIndicator,
  Alert,
  Modal,
  ScrollView,
  StyleSheet,
  Text,
  TouchableOpacity,
  View,
} from 'react-native';
import { router, useFocusEffect, useLocalSearchParams } from 'expo-router';

import { supabase } from '@/services/supabase';
import {
  joinTrip,
  removeTripMember,
} from '@/services/tripMembers';
import { deleteTrip } from '@/services/trip';
import { useTripToday } from '@/hooks/useTripToday';
import { getTodayKey, getTripStatus } from '@/utils/tripTimeline';

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
  const today = useTripToday();
  const [confirmDelete, setConfirmDelete] = useState(false);
  const [deleteError, setDeleteError] = useState('');

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

  const loadTrip = useCallback(async () => {
    setLoading(true);
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
  }, [tripId]);

  useFocusEffect(useCallback(() => {
    void loadTrip();
  }, [loadTrip]));

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
    if (trip && getTripStatus(trip, getTodayKey()) === 'completed') {
      Alert.alert('Trip Completed', 'This trip has already ended.');
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

    const handleDeleteTrip = () => {
        if (!trip || trip.created_by !== currentUserId || getTripStatus(trip, getTodayKey()) !== 'completed') {
            setDeleteError('Only the owner can delete a completed trip.');
            return;
        }
        setDeleteError('');
        setConfirmDelete(true);
    };
    const confirmDeleteTrip = async () => {
        if (!trip || deleting)
            return;
        setDeleting(true);
        setDeleteError('');
        try {
            const { data: { user }, error: authError } = await supabase.auth.getUser();
            if (authError)
                throw new Error(authError.message);
            if (!user)
                throw new Error('Please log in first.');
            if (trip.created_by !== user.id || getTripStatus(trip, getTodayKey()) !== 'completed') {
                throw new Error('Only the owner can delete a completed trip.');
            }
            const { data, error } = await deleteTrip(trip.id, user.id);
            if (error)
                throw new Error(error.message);
            if (!data)
                throw new Error('Trip was not deleted. Refresh to check its dates and ownership.');
            setConfirmDelete(false);
            router.replace('/my-trips');
        }
        catch (error) {
            setDeleteError(error instanceof Error ? error.message : 'Unable to delete trip.');
        }
        finally {
            setDeleting(false);
        }
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

      <Text style={styles.tripStatus}>
        {getTripStatus(trip, today) === 'completed' ? 'Completed' : getTripStatus(trip, today) === 'ongoing' ? 'Ongoing' : getTripStatus(trip, today) === 'upcoming' ? 'Upcoming' : 'Dates unavailable'}
      </Text>
      {!!deleteError && <Text style={styles.deleteError}>{deleteError}</Text>}

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

          {getTripStatus(trip, today) === 'completed' && (
          <TouchableOpacity
            style={styles.deleteButton}
            onPress={handleDeleteTrip}
            disabled={deleting}
          >
            {deleting ? (
              <ActivityIndicator color="#DC2626" />
            ) : (
              <Text style={styles.deleteButtonText}>
                Delete Completed Trip
              </Text>
            )}
          </TouchableOpacity>
          )}
        </>
      )}

      {!isOwner && getTripStatus(trip, today) !== 'completed' && (
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
<Modal visible={confirmDelete} transparent animationType="fade" onRequestClose={() => {
            if (!deleting)
                setConfirmDelete(false);
        }}>
        <View style={styles.deleteBackdrop}>
          <View style={styles.deleteDialog} accessibilityViewIsModal>
            <Text style={styles.placesTitle}>Delete completed trip?</Text>
            <Text style={styles.noPlacesText}>
              Delete “{trip.name}”? This permanently deletes the trip for all its members.
            </Text>
            {!!deleteError && <Text style={styles.deleteError}>{deleteError}</Text>}
            <TouchableOpacity style={styles.deleteButton} disabled={deleting} onPress={() => void confirmDeleteTrip()}>
              <Text style={styles.deleteButtonText}>{deleting ? 'Deleting...' : 'Delete Trip'}</Text>
            </TouchableOpacity>
            <TouchableOpacity style={styles.editButton} disabled={deleting} onPress={() => setConfirmDelete(false)}>
              <Text style={styles.editButtonText}>Cancel</Text>
            </TouchableOpacity>
          </View>
        </View>
      </Modal>
    </ScrollView>
  );
}

const styles = StyleSheet.create({
  tripStatus: { color: '#83DCAA', fontWeight: '700', marginBottom: 12 },
  deleteError: { color: '#FF9B9B', marginVertical: 10 },
  deleteBackdrop: { flex: 1, backgroundColor: 'rgba(0,0,0,0.75)', justifyContent: 'center', alignItems: 'center', padding: 24 },
  deleteDialog: { width: '100%', maxWidth: 460, backgroundColor: '#151821', borderRadius: 18, padding: 22 },
  scrollView: {
    flex: 1,
    backgroundColor: '#08090D',
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
    color: '#F7F8FC',
  },

  label: {
    fontSize: 14,
    fontWeight: '600',
    color: '#9299A8',
    marginTop: 15,
  },

  value: {
    fontSize: 18,
    color: '#F7F8FC',
    marginTop: 5,
  },

  editButton: {
    height: 50,
    backgroundColor: '#151821',
    borderWidth: 1,
    borderColor: '#4F8CFF',
    borderRadius: 10,
    justifyContent: 'center',
    alignItems: 'center',
    marginTop: 25,
  },

  editButtonText: {
    color: '#4F8CFF',
    fontSize: 16,
    fontWeight: '700',
  },

  deleteButton: {
    height: 50,
    backgroundColor: '#151821',
    borderWidth: 1,
    borderColor: '#59303A',
    borderRadius: 10,
    justifyContent: 'center',
    alignItems: 'center',
    marginTop: 10,
  },

  deleteButtonText: {
    color: '#FF7B86',
    fontSize: 16,
    fontWeight: '700',
  },

  joinButton: {
    height: 50,
    backgroundColor: '#4F8CFF',
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
    color: '#F7F8FC',
  },

  placesProgress: {
    fontSize: 13,
    color: '#9299A8',
    marginTop: 4,
  },

  placesCard: {
    backgroundColor: '#151821',
    borderRadius: 12,
    paddingHorizontal: 15,
    borderWidth: 1,
    borderColor: '#252A37',
  },

  placeRow: {
    minHeight: 58,
    flexDirection: 'row',
    alignItems: 'center',
    borderBottomWidth: 1,
    borderBottomColor: '#252A37',
  },

  checkbox: {
    width: 25,
    height: 25,
    borderRadius: 6,
    borderWidth: 2,
    borderColor: '#697386',
    justifyContent: 'center',
    alignItems: 'center',
    marginRight: 12,
  },

  checkboxVisited: {
    backgroundColor: '#4F8CFF',
    borderColor: '#4F8CFF',
  },

  checkmark: {
    color: '#FFFFFF',
    fontSize: 16,
    fontWeight: '700',
  },

  placeName: {
    flex: 1,
    fontSize: 16,
    color: '#F7F8FC',
  },

  placeNameVisited: {
    color: '#9299A8',
    textDecorationLine: 'line-through',
  },

  placeLoader: {
    marginLeft: 8,
  },

  noPlacesCard: {
    backgroundColor: '#151821',
    borderRadius: 12,
    padding: 18,
    borderWidth: 1,
    borderColor: '#252A37',
  },

  noPlacesTitle: {
    fontSize: 16,
    fontWeight: '700',
    color: '#F7F8FC',
  },

  noPlacesText: {
    fontSize: 14,
    color: '#9299A8',
    marginTop: 5,
  },

  membersTitle: {
    fontSize: 20,
    fontWeight: '700',
    color: '#F7F8FC',
    marginTop: 30,
    marginBottom: 12,
  },

  memberCard: {
    backgroundColor: '#151821',
    borderRadius: 12,
    padding: 15,
    marginBottom: 10,
    borderWidth: 1,
    borderColor: '#252A37',
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
    color: '#F7F8FC',
  },

  memberEmail: {
    fontSize: 14,
    color: '#9299A8',
    marginTop: 4,
  },

  memberRole: {
    fontSize: 14,
    color: '#4F8CFF',
    marginTop: 4,
    fontWeight: '600',
  },

  removeButton: {
    borderWidth: 1,
    borderColor: '#59303A',
    borderRadius: 8,
    paddingHorizontal: 12,
    paddingVertical: 8,
  },

  removeButtonText: {
    color: '#FF7B86',
    fontSize: 13,
    fontWeight: '700',
  },

  noMembers: {
    fontSize: 15,
    color: '#9299A8',
  },
});

