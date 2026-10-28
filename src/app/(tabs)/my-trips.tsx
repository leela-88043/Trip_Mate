import { useCallback, useState } from 'react';
import { ActivityIndicator, FlatList, Modal, StyleSheet, Text, TouchableOpacity, View, } from 'react-native';
import { router, useFocusEffect } from 'expo-router';
import { supabase } from '@/services/supabase';
import { getMyTrips } from '@/services/trips';
import { deleteTrip } from '@/services/trip';
import { useTripToday } from '@/hooks/useTripToday';
import { getTodayKey, getTripStatus, isActiveTrip } from '@/utils/tripTimeline';
type Trip = {
    id: string;
    name: string;
    destination: string;
    start_date: string;
    end_date: string;
    created_by: string;
};
export default function MyTripsScreen() {
    const today = useTripToday();
    const [trips, setTrips] = useState<Trip[]>([]);
    const [userId, setUserId] = useState('');
    const [tab, setTab] = useState<'active' | 'completed'>('active');
    const [loading, setLoading] = useState(true);
    const [error, setError] = useState('');
    const [refresh, setRefresh] = useState(0);
    const [pendingDelete, setPendingDelete] = useState<Trip | null>(null);
    const [deleting, setDeleting] = useState(false);
    useFocusEffect(useCallback(() => {
        let active = true;
        async function load() {
            setLoading(true);
            setError('');
            try {
                const { data: { user }, error: authError } = await supabase.auth.getUser();
                if (authError)
                    throw new Error(authError.message);
                if (!user)
                    throw new Error('Please log in to view your trips.');
                const { data, error: tripError } = await getMyTrips(user.id);
                if (tripError)
                    throw new Error(tripError.message);
                const rows = (data ?? []) as unknown as {
                    trips: Trip | Trip[] | null;
                }[];
                const list = rows.flatMap((row) => !row.trips ? [] : Array.isArray(row.trips) ? row.trips : [row.trips]);
                if (active) {
                    setUserId(user.id);
                    setTrips(Array.from(new Map(list.map((trip) => [trip.id, trip])).values()));
                }
            }
            catch (err) {
                if (active) {
                    setTrips([]);
                    setError(err instanceof Error ? err.message : 'Unable to load trips.');
                }
            }
            finally {
                if (active)
                    setLoading(false);
            }
        }
        void load();
        return () => { active = false; };
        // Refresh is an intentional reload key for this focus effect.
        // eslint-disable-next-line react-hooks/exhaustive-deps
    }, [refresh]));
    const activeTrips = trips.filter((trip) => isActiveTrip(trip, today))
        .sort((a, b) => a.start_date.localeCompare(b.start_date));
    const completedTrips = trips.filter((trip) => getTripStatus(trip, today) === 'completed')
        .sort((a, b) => b.end_date.localeCompare(a.end_date));
    const invalidCount = trips.filter((trip) => getTripStatus(trip, today) === 'unknown').length;
    const visibleTrips = tab === 'active' ? activeTrips : completedTrips;
    async function confirmDelete() {
        if (!pendingDelete || deleting)
            return;
        const target = pendingDelete;
        if (target.created_by !== userId || getTripStatus(target, getTodayKey()) !== 'completed') {
            setError('Only the owner can delete a completed trip.');
            setPendingDelete(null);
            return;
        }
        setDeleting(true);
        setError('');
        try {
            const { data, error: deleteError } = await deleteTrip(target.id, userId);
            if (deleteError)
                throw new Error(deleteError.message);
            if (!data)
                throw new Error('Trip was not deleted. Refresh to check its dates and ownership.');
            setTrips((current) => current.filter((trip) => trip.id !== target.id));
            setPendingDelete(null);
        }
        catch (err) {
            setError(err instanceof Error ? err.message : 'Unable to delete trip.');
        }
        finally {
            setDeleting(false);
        }
    }
    return (<View style={styles.container}>
      <View style={styles.header}>
        <Text style={styles.title}>My Trips</Text>
        <TouchableOpacity disabled={loading || deleting} onPress={() => setRefresh((value) => value + 1)}>
          <Text style={styles.link}>Refresh</Text>
        </TouchableOpacity>
      </View>
      <Text style={styles.secondary}>Trip status follows India time. Trips ending today remain active.</Text>
      <View style={styles.tabs}>
        <TouchableOpacity style={[styles.tab, tab === 'active' && styles.selected]} onPress={() => setTab('active')}>
          <Text style={styles.buttonText}>Active ({activeTrips.length})</Text>
        </TouchableOpacity>
        <TouchableOpacity style={[styles.tab, tab === 'completed' && styles.selected]} onPress={() => setTab('completed')}>
          <Text style={styles.buttonText}>Completed ({completedTrips.length})</Text>
        </TouchableOpacity>
      </View>
      {!!error && <Text accessibilityLiveRegion="polite" style={styles.error}>{error}</Text>}
      {invalidCount > 0 && <Text style={styles.secondary}>{invalidCount} trips have missing or invalid dates and need correction.</Text>}
      {loading ? (<View style={styles.center}>
          <ActivityIndicator size="large" color="#4F8CFF"/>
          <Text style={styles.secondary}>Loading trips...</Text>
        </View>) : (<FlatList data={visibleTrips} keyExtractor={(item) => item.id} contentContainerStyle={styles.list} ListEmptyComponent={<Text style={styles.secondary}>{tab === 'active' ? 'No upcoming or ongoing trips.' : 'No completed trips.'}</Text>} renderItem={({ item }) => (<View style={styles.card}>
              <TouchableOpacity onPress={() => router.push(`/trip-details?tripId=${item.id}`)}>
                <Text style={styles.name}>{item.name}</Text>
                <Text style={styles.secondary}>📍 {item.destination}</Text>
                <Text style={styles.secondary}>{item.start_date} → {item.end_date}</Text>
                <Text style={styles.status}>
                  {getTripStatus(item, today) === 'completed' ? 'Completed' : getTripStatus(item, today) === 'ongoing' ? 'Ongoing' : 'Upcoming'}
                </Text>
                <Text style={styles.link}>View Trip →</Text>
              </TouchableOpacity>
              {getTripStatus(item, today) === 'completed' && item.created_by === userId && (<TouchableOpacity style={styles.deleteButton} disabled={deleting} onPress={() => { setError(''); setPendingDelete(item); }}>
                  <Text style={styles.deleteText}>Delete Completed Trip</Text>
                </TouchableOpacity>)}
            </View>)}/>)}
      <Modal visible={pendingDelete !== null} transparent animationType="fade" onRequestClose={() => {
            if (!deleting)
                setPendingDelete(null);
        }}>
        <View style={styles.backdrop}>
          <View style={styles.dialog} accessibilityViewIsModal>
            <Text style={styles.name}>Delete completed trip?</Text>
            <Text style={styles.secondary}>Delete “{pendingDelete?.name}”? This permanently deletes the trip for all its members.</Text>
            {!!error && <Text style={styles.error}>{error}</Text>}
            <TouchableOpacity disabled={deleting} style={styles.deleteButton} onPress={() => void confirmDelete()}>
              <Text style={styles.deleteText}>{deleting ? 'Deleting...' : 'Delete Trip'}</Text>
            </TouchableOpacity>
            <TouchableOpacity disabled={deleting} onPress={() => setPendingDelete(null)}>
              <Text style={styles.link}>Cancel</Text>
            </TouchableOpacity>
          </View>
        </View>
      </Modal>
    </View>);
}
const styles = StyleSheet.create({
    container: { flex: 1, backgroundColor: '#08090D', padding: 22, paddingTop: 28 },
    header: { flexDirection: 'row', justifyContent: 'space-between', alignItems: 'center' },
    title: { fontSize: 29, fontWeight: '800', color: '#F7F8FC' },
    secondary: { color: '#9299A8', marginTop: 9, lineHeight: 21 },
    link: { color: '#75A2FF', fontWeight: '700', paddingVertical: 10 },
    tabs: { flexDirection: 'row', backgroundColor: '#151821', borderRadius: 12, padding: 4, marginVertical: 18 },
    tab: { flex: 1, padding: 12, alignItems: 'center', borderRadius: 9 },
    selected: { backgroundColor: '#293F64' },
    buttonText: { color: '#FFFFFF', fontWeight: '700' },
    center: { flex: 1, justifyContent: 'center', alignItems: 'center' },
    list: { paddingBottom: 40 },
    card: { backgroundColor: '#151821', borderRadius: 18, padding: 19, marginBottom: 14, borderWidth: 1, borderColor: '#252A37' },
    name: { color: '#F7F8FC', fontSize: 18, fontWeight: '700' },
    status: { color: '#83DCAA', fontWeight: '700', marginTop: 12 },
    deleteButton: { borderWidth: 1, borderColor: '#59303A', borderRadius: 10, padding: 13, alignItems: 'center', marginTop: 12 },
    deleteText: { color: '#FF7B86', fontWeight: '700' },
    error: { color: '#FF9B9B', marginVertical: 10 },
    backdrop: { flex: 1, backgroundColor: 'rgba(0,0,0,0.75)', justifyContent: 'center', alignItems: 'center', padding: 24 },
    dialog: { width: '100%', maxWidth: 460, backgroundColor: '#151821', borderRadius: 18, padding: 22 },
});
