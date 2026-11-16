import { useCallback, useRef, useState } from 'react';
import {
  ActivityIndicator,
  Modal,
  ScrollView,
  StyleSheet,
  Text,
  TouchableOpacity,
  View,
} from 'react-native';
import { router, useFocusEffect, useLocalSearchParams } from 'expo-router';

import { useTripToday } from '@/hooks/useTripToday';
import { confirmTripParticipation } from '@/services/profilePoints';
import { supabase } from '@/services/supabase';
import { deleteTrip } from '@/services/trip';
import { joinTrip, removeTripMember } from '@/services/tripMembers';
import { getTodayKey, getTripStatus as getTimelineTripStatus } from '@/utils/tripTimeline';

type Trip = {
  id: string;
  name: string;
  destination: string;
  start_date: string | null;
  end_date: string | null;
  created_by: string | null;
};

type TripDestination = {
  id: string;
  trip_id: string;
  name: string;
  visited: boolean;
};

type MemberProfile = { full_name: string | null; email: string | null };
type Member = { user_id: string; role: string | null; profiles: MemberProfile | null };
type MemberRow = { user_id: string | null; role: string | null; profiles: MemberProfile | MemberProfile[] | null };
type Confirmation = { user_id: string; confirmed_at: string };
type PendingAction = { kind: 'delete' } | { kind: 'confirm' | 'remove'; member: Member } | null;

function tripStatus(trip: Trip, today: string) {
  if (!trip.start_date || !trip.end_date) return 'unknown';
  return getTimelineTripStatus({ start_date: trip.start_date, end_date: trip.end_date }, today);
}

function memberName(member: Member) {
  return member.profiles?.full_name || 'Traveller';
}

export default function TripDetailsScreen() {
  const params = useLocalSearchParams<{ tripId?: string | string[] }>();
  const tripId = Array.isArray(params.tripId) ? params.tripId[0] : params.tripId;
  const today = useTripToday();
  const [trip, setTrip] = useState<Trip | null>(null);
  const [members, setMembers] = useState<Member[]>([]);
  const [destinations, setDestinations] = useState<TripDestination[]>([]);
  const [confirmations, setConfirmations] = useState<Confirmation[]>([]);
  const [currentUserId, setCurrentUserId] = useState('');
  const [loading, setLoading] = useState(true);
  const [loadError, setLoadError] = useState('');
  const [confirmationError, setConfirmationError] = useState('');
  const [actionError, setActionError] = useState('');
  const [message, setMessage] = useState('');
  const [pendingAction, setPendingAction] = useState<PendingAction>(null);
  const [busy, setBusy] = useState('');
  const actionLock = useRef(false);

  const loadTrip = useCallback(async () => {
    setLoading(true);
    setLoadError('');
    setConfirmationError('');
    setTrip(null);
    setMembers([]);
    setDestinations([]);
    setConfirmations([]);
    setCurrentUserId('');
    try {
      if (!tripId) throw new Error('Trip ID is missing.');
      const { data: { user }, error: authError } = await supabase.auth.getUser();
      if (authError) throw new Error(authError.message);
      if (!user) throw new Error('Please log in to view this trip.');
      setCurrentUserId(user.id);

      const { data: tripData, error: tripError } = await supabase
        .from('trips')
        .select('id, name, destination, start_date, end_date, created_by')
        .eq('id', tripId)
        .maybeSingle();
      if (tripError) throw new Error(tripError.message);
      if (!tripData) throw new Error('This trip could not be found.');

      const [destinationResult, memberResult, confirmationResult] = await Promise.all([
        supabase.from('trip_destinations').select('id, trip_id, name, visited').eq('trip_id', tripId).order('created_at', { ascending: true }),
        supabase.from('trip_members').select('user_id, role, profiles(full_name, email)').eq('trip_id', tripId),
        supabase.from('trip_participation_confirmations').select('user_id, confirmed_at').eq('trip_id', tripId),
      ]);
      if (destinationResult.error) throw new Error(destinationResult.error.message);
      if (memberResult.error) throw new Error(memberResult.error.message);
      const rows = (memberResult.data ?? []) as unknown as MemberRow[];
      const normalized: Member[] = rows.flatMap((row) => row.user_id ? [{
        user_id: row.user_id,
        role: row.role,
        profiles: Array.isArray(row.profiles) ? row.profiles[0] ?? null : row.profiles,
      }] : []);
      setTrip(tripData);
      setDestinations(destinationResult.data ?? []);
      setMembers(normalized);
      if (confirmationResult.error) setConfirmationError(confirmationResult.error.message);
      else setConfirmations(confirmationResult.data ?? []);
    } catch (error) {
      setLoadError(error instanceof Error ? error.message : 'Unable to load trip.');
    } finally {
      setLoading(false);
    }
  }, [tripId]);

  useFocusEffect(useCallback(() => { void loadTrip(); }, [loadTrip]));

  const status = trip ? tripStatus(trip, today) : 'unknown';
  const isOwner = !!currentUserId && currentUserId === trip?.created_by;
  const isMember = members.some((member) => member.user_id === currentUserId);
  const completed = status === 'completed';
  const canJoin = status === 'upcoming' || status === 'ongoing';
  const visitedCount = destinations.filter((place) => place.visited).length;
  const isConfirmed = (userId: string) => confirmations.some((item) => item.user_id === userId);

  function openAction(action: PendingAction) {
    if (actionLock.current) return;
    setActionError('');
    setMessage('');
    setPendingAction(action);
  }

  async function handleTogglePlace(place: TripDestination) {
    if (actionLock.current) return;
    actionLock.current = true;
    setBusy(`place-${place.id}`);
    setActionError('');
    try {
      const newVisited = !place.visited;
      const { data, error } = await supabase.from('trip_destinations')
        .update({ visited: newVisited }).eq('id', place.id).eq('trip_id', place.trip_id).select('id').maybeSingle();
      if (error) throw new Error(error.message);
      if (!data) throw new Error('The place could not be updated. Check your permissions.');
      setDestinations((current) => current.map((item) => item.id === place.id ? { ...item, visited: newVisited } : item));
    } catch (error) {
      setActionError(error instanceof Error ? error.message : 'Unable to update place.');
    } finally {
      setBusy('');
      actionLock.current = false;
    }
  }

  async function handleJoinTrip() {
    if (!trip || actionLock.current) return;
    actionLock.current = true;
    setBusy('join');
    setActionError('');
    setMessage('');
    try {
      if (!canJoin) throw new Error('Only upcoming or ongoing trips can be joined.');
      const { data: { user }, error: authError } = await supabase.auth.getUser();
      if (authError) throw new Error(authError.message);
      if (!user) throw new Error('Please log in first.');
      const { error } = await joinTrip(trip.id, user.id);
      if (error) throw new Error(error.message);
      await loadTrip();
      setMessage('You have joined this trip.');
    } catch (error) {
      setActionError(error instanceof Error ? error.message : 'Unable to join trip.');
    } finally {
      setBusy('');
      actionLock.current = false;
    }
  }

  async function handleConfirmedAction() {
    if (!trip || !pendingAction || actionLock.current) return;
    const action = pendingAction;
    actionLock.current = true;
    setBusy(action.kind);
    setActionError('');
    setMessage('');
    try {
      const { data: { user }, error: authError } = await supabase.auth.getUser();
      if (authError) throw new Error(authError.message);
      if (!user) throw new Error('Please log in first.');
      if (trip.created_by !== user.id) throw new Error('Only the trip organiser can do this.');
      const currentlyCompleted = tripStatus(trip, getTodayKey()) === 'completed';
      if (action.kind === 'delete') {
        if (!currentlyCompleted) throw new Error('Only completed trips can be deleted.');
        const { data, error } = await deleteTrip(trip.id, user.id);
        if (error) throw new Error(error.message);
        if (!data) throw new Error('Trip was not deleted. Refresh its dates and ownership.');
        setPendingAction(null);
        router.replace('/my-trips');
        return;
      }
      if (action.member.user_id === user.id) throw new Error('You cannot confirm or remove yourself as the organiser.');
      if (action.kind === 'confirm') {
        if (!currentlyCompleted) throw new Error('Participation can only be confirmed after the trip ends.');
        await confirmTripParticipation(trip.id, action.member.user_id);
        setConfirmations((current) => current.some((item) => item.user_id === action.member.user_id) ? current : [...current, { user_id: action.member.user_id, confirmed_at: new Date().toISOString() }]);
        setMessage(`Participation confirmed for ${memberName(action.member)}. Their profile points will reflect the award, subject to the participation cap.`);
      } else {
        const { data, error } = await removeTripMember(trip.id, action.member.user_id);
        if (error) throw new Error(error.message);
        if (!data) throw new Error('The member could not be removed.');
        setMembers((current) => current.filter((member) => member.user_id !== action.member.user_id));
        setMessage(`${memberName(action.member)} has been removed from the trip.`);
      }
      setPendingAction(null);
    } catch (error) {
      setActionError(error instanceof Error ? error.message : 'Unable to complete this action.');
    } finally {
      setBusy('');
      actionLock.current = false;
    }
  }

  if (loading) return <View style={styles.center}><ActivityIndicator size="large" color="#4F8CFF" /><Text style={styles.secondary}>Loading trip...</Text></View>;
  if (!trip) return <View style={styles.center}><Text style={styles.error}>{loadError || 'Trip not found.'}</Text><TouchableOpacity accessibilityRole="button" onPress={() => void loadTrip()}><Text style={styles.link}>Try Again</Text></TouchableOpacity></View>;

  const dialogTitle = pendingAction?.kind === 'delete' ? 'Delete completed trip?' : pendingAction?.kind === 'confirm' ? 'Confirm participation?' : 'Remove member?';
  const dialogMessage = pendingAction?.kind === 'delete'
    ? `Delete “${trip.name}”? This permanently deletes the trip for all members. Already confirmed participation points are preserved.`
    : pendingAction?.kind === 'confirm'
      ? `Confirm that ${memberName(pendingAction.member)} participated in this completed trip. This awards points up to the participation cap.`
      : pendingAction?.kind === 'remove'
        ? `Remove ${memberName(pendingAction.member)} from this trip? Removing a member does not revoke previously confirmed points.` : '';

  return (
    <ScrollView style={styles.scrollView} contentContainerStyle={styles.container} showsVerticalScrollIndicator={false}>
      <Text style={styles.title}>Trip Details</Text>
      <Text style={styles.tripStatus}>{status === 'completed' ? 'Completed' : status === 'ongoing' ? 'Ongoing' : status === 'upcoming' ? 'Upcoming' : 'Dates unavailable'}</Text>
      {!!message && <Text accessibilityLiveRegion="polite" style={styles.success}>{message}</Text>}
      {!!actionError && !pendingAction && <Text accessibilityLiveRegion="polite" style={styles.error}>{actionError}</Text>}
      <Text style={styles.label}>Trip Name</Text><Text style={styles.value}>{trip.name}</Text>
      <Text style={styles.label}>Destination</Text><Text style={styles.value}>{trip.destination}</Text>
      <Text style={styles.label}>Start Date</Text><Text style={styles.value}>{trip.start_date || 'Not specified'}</Text>
      <Text style={styles.label}>End Date</Text><Text style={styles.value}>{trip.end_date || 'Not specified'}</Text>

      {isOwner && <>
        <TouchableOpacity accessibilityRole="button" style={styles.editButton} disabled={!!busy} onPress={() => router.push({ pathname: '/edit-trip', params: { tripId: trip.id, name: trip.name, destination: trip.destination, startDate: trip.start_date ?? '', endDate: trip.end_date ?? '' } })}><Text style={styles.editButtonText}>Edit Trip</Text></TouchableOpacity>
        <TouchableOpacity accessibilityRole="button" style={styles.editButton} onPress={() => router.push({ pathname: '/trip-budget', params: { tripId: trip.id } })}><Text style={styles.editButtonText}>Trip Budget &amp; Expenses</Text></TouchableOpacity>
        {completed && <TouchableOpacity accessibilityRole="button" style={styles.deleteButton} disabled={!!busy} onPress={() => openAction({ kind: 'delete' })}><Text style={styles.deleteButtonText}>Delete Completed Trip</Text></TouchableOpacity>}
      </>}

      {!isOwner && !isMember && canJoin && <TouchableOpacity accessibilityRole="button" style={styles.primaryButton} disabled={!!busy} onPress={() => void handleJoinTrip()}><Text style={styles.buttonText}>{busy === 'join' ? 'Joining...' : 'Join This Trip'}</Text></TouchableOpacity>}
      {!isOwner && isMember && <Text style={styles.success}>You are a member of this trip.</Text>}

      <View style={styles.placesHeader}><Text style={styles.sectionTitle}>Places to Visit</Text><Text style={styles.secondary}>{visitedCount} of {destinations.length} completed</Text></View>
      {destinations.length === 0 ? <View style={styles.card}><Text style={styles.memberName}>No places added</Text><Text style={styles.secondary}>No places to visit have been added to this trip yet.</Text></View> : <View style={styles.placesCard}>{destinations.map((place) => <TouchableOpacity key={place.id} accessibilityRole="checkbox" accessibilityState={{ checked: place.visited }} accessibilityLabel={place.name} style={styles.placeRow} disabled={!!busy} onPress={() => void handleTogglePlace(place)}><View style={[styles.checkbox, place.visited && styles.checkboxVisited]}>{place.visited && <Text style={styles.checkmark}>✓</Text>}</View><Text style={[styles.placeName, place.visited && styles.placeNameVisited]}>{place.name}</Text>{busy === `place-${place.id}` && <ActivityIndicator size="small" color="#4F8CFF" />}</TouchableOpacity>)}</View>}

      <Text style={styles.membersTitle}>Trip Members</Text>
      {completed && isOwner && <View style={styles.infoCard}><Text style={styles.memberName}>Confirm Participation</Text><Text style={styles.secondary}>Confirm only members who actually participated. Each eligible trip contributes 160 points, for up to five trips. You cannot confirm your own participation.</Text></View>}
      {completed && !isOwner && <Text style={styles.secondary}>The organiser can confirm your participation after the trip ends.</Text>}
      {!!confirmationError && <View style={styles.infoCard}><Text style={styles.error}>Participation records could not be loaded: {confirmationError}</Text><TouchableOpacity accessibilityRole="button" disabled={!!busy} onPress={() => void loadTrip()}><Text style={styles.link}>Retry Participation Records</Text></TouchableOpacity></View>}
      {members.length === 0 ? <Text style={styles.secondary}>No members found.</Text> : members.map((member) => {
        const organiser = member.user_id === trip.created_by || member.role === 'owner';
        const confirmed = isConfirmed(member.user_id);
        const canViewConfirmation = isOwner || member.user_id === currentUserId;
        return <View key={member.user_id} style={styles.card}>
          <Text style={styles.memberName}>{memberName(member)}{member.user_id === currentUserId ? ' (You)' : ''}</Text>
          {!!member.profiles?.email && <Text style={styles.secondary}>{member.profiles.email}</Text>}
          <Text style={styles.memberRole}>{organiser ? 'Organiser' : member.role || 'Member'}</Text>
          {canViewConfirmation && confirmed && <Text style={styles.confirmedText}>✓ Participation Confirmed</Text>}
          {completed && canViewConfirmation && !organiser && !confirmed && !confirmationError && <Text style={styles.secondary}>Participation not confirmed yet.</Text>}
          {isOwner && !organiser && <>
            {completed && !confirmed && <TouchableOpacity accessibilityRole="button" style={[styles.confirmButton, (!!busy || !!confirmationError) && styles.disabled]} disabled={!!busy || !!confirmationError} onPress={() => openAction({ kind: 'confirm', member })}><Text style={styles.buttonText}>Confirm Participation</Text></TouchableOpacity>}
            <TouchableOpacity accessibilityRole="button" style={styles.removeButton} disabled={!!busy} onPress={() => openAction({ kind: 'remove', member })}><Text style={styles.deleteButtonText}>Remove Member</Text></TouchableOpacity>
          </>}
        </View>;
      })}

      <Modal visible={pendingAction !== null} transparent animationType="fade" onRequestClose={() => { if (!actionLock.current) { setPendingAction(null); setActionError(''); } }}>
        <View style={styles.backdrop}><View style={styles.dialog} accessibilityViewIsModal>
          <Text style={styles.sectionTitle}>{dialogTitle}</Text><Text style={styles.dialogText}>{dialogMessage}</Text>
          {!!actionError && <Text accessibilityLiveRegion="polite" style={styles.error}>{actionError}</Text>}
          <TouchableOpacity accessibilityRole="button" style={pendingAction?.kind === 'confirm' ? styles.primaryButton : styles.deleteButton} disabled={!!busy} onPress={() => void handleConfirmedAction()}><Text style={pendingAction?.kind === 'confirm' ? styles.buttonText : styles.deleteButtonText}>{busy ? 'Please wait...' : pendingAction?.kind === 'confirm' ? 'Confirm Participation' : pendingAction?.kind === 'delete' ? 'Delete Trip' : 'Remove Member'}</Text></TouchableOpacity>
          <TouchableOpacity accessibilityRole="button" style={styles.editButton} disabled={!!busy} onPress={() => { setPendingAction(null); setActionError(''); }}><Text style={styles.editButtonText}>Cancel</Text></TouchableOpacity>
        </View></View>
      </Modal>
    </ScrollView>
  );
}

const styles = StyleSheet.create({
  scrollView: { flex: 1, backgroundColor: '#08090D' }, container: { padding: 24, paddingBottom: 48 },
  center: { flex: 1, backgroundColor: '#08090D', justifyContent: 'center', alignItems: 'center', padding: 24 },
  title: { fontSize: 28, fontWeight: '700', marginBottom: 16, color: '#F7F8FC' },
  tripStatus: { color: '#83DCAA', fontWeight: '700', marginBottom: 12 },
  label: { fontSize: 14, fontWeight: '600', color: '#9299A8', marginTop: 15 }, value: { fontSize: 18, color: '#F7F8FC', marginTop: 5 },
  secondary: { fontSize: 14, color: '#9299A8', marginTop: 6, lineHeight: 21 }, error: { color: '#FF9B9B', marginVertical: 12, lineHeight: 21 },
  success: { color: '#83DCAA', marginVertical: 12, lineHeight: 21 }, link: { color: '#75A2FF', fontWeight: '700', paddingVertical: 12 },
  editButton: { minHeight: 50, backgroundColor: '#151821', borderWidth: 1, borderColor: '#4F8CFF', borderRadius: 10, justifyContent: 'center', alignItems: 'center', padding: 12, marginTop: 20 },
  editButtonText: { color: '#75A2FF', fontSize: 16, fontWeight: '700' }, deleteButton: { minHeight: 50, backgroundColor: '#151821', borderWidth: 1, borderColor: '#59303A', borderRadius: 10, justifyContent: 'center', alignItems: 'center', padding: 12, marginTop: 12 },
  deleteButtonText: { color: '#FF7B86', fontSize: 14, fontWeight: '700' }, primaryButton: { minHeight: 50, backgroundColor: '#4F8CFF', borderRadius: 10, justifyContent: 'center', alignItems: 'center', padding: 12, marginTop: 20 },
  buttonText: { color: '#FFFFFF', fontSize: 15, fontWeight: '700', textAlign: 'center' }, placesHeader: { marginTop: 30, marginBottom: 12 }, sectionTitle: { fontSize: 20, fontWeight: '700', color: '#F7F8FC' },
  placesCard: { backgroundColor: '#151821', borderRadius: 12, paddingHorizontal: 15, borderWidth: 1, borderColor: '#252A37' }, placeRow: { minHeight: 58, flexDirection: 'row', alignItems: 'center', borderBottomWidth: 1, borderBottomColor: '#252A37' },
  checkbox: { width: 25, height: 25, borderRadius: 6, borderWidth: 2, borderColor: '#697386', justifyContent: 'center', alignItems: 'center', marginRight: 12 }, checkboxVisited: { backgroundColor: '#4F8CFF', borderColor: '#4F8CFF' }, checkmark: { color: '#FFFFFF', fontSize: 16, fontWeight: '700' },
  placeName: { flex: 1, fontSize: 16, color: '#F7F8FC', paddingVertical: 12, marginRight: 8 }, placeNameVisited: { color: '#9299A8', textDecorationLine: 'line-through' },
  membersTitle: { fontSize: 20, fontWeight: '700', color: '#F7F8FC', marginTop: 30, marginBottom: 12 }, card: { backgroundColor: '#151821', borderRadius: 12, padding: 16, marginBottom: 12, borderWidth: 1, borderColor: '#252A37' },
  infoCard: { backgroundColor: '#142035', borderRadius: 12, padding: 16, marginBottom: 14, borderWidth: 1, borderColor: '#293F64' }, memberName: { fontSize: 16, fontWeight: '700', color: '#F7F8FC' }, memberRole: { fontSize: 13, color: '#75A2FF', marginTop: 8, fontWeight: '600' },
  confirmedText: { color: '#83DCAA', marginTop: 14, fontWeight: '700' }, confirmButton: { backgroundColor: '#4F8CFF', borderRadius: 10, padding: 13, alignItems: 'center', marginTop: 16 }, removeButton: { borderWidth: 1, borderColor: '#59303A', borderRadius: 10, padding: 12, alignItems: 'center', marginTop: 10 },
  disabled: { opacity: 0.5 }, backdrop: { flex: 1, backgroundColor: 'rgba(0,0,0,0.75)', justifyContent: 'center', alignItems: 'center', padding: 24 }, dialog: { width: '100%', maxWidth: 460, backgroundColor: '#151821', borderRadius: 18, padding: 22, borderWidth: 1, borderColor: '#252A37' }, dialogText: { color: '#9299A8', fontSize: 14, marginTop: 12, lineHeight: 22 },
});
