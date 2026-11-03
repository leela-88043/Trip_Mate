import { useCallback, useState } from 'react';
import {
  ActivityIndicator,
  Alert,
  ScrollView,
  StyleSheet,
  Text,
  TextInput,
  TouchableOpacity,
  View,
} from 'react-native';
import { router, useFocusEffect } from 'expo-router';

import ProfilePointsBar from '@/components/ProfilePointsBar';
import {
  loadProfilePoints,
  type ProfilePoints,
} from '@/services/profilePoints';
import { supabase } from '@/services/supabase';

export default function MyProfileScreen() {
  const [fullName, setFullName] = useState('');
  const [email, setEmail] = useState('');
  const [editName, setEditName] = useState('');
  const [editing, setEditing] = useState(false);
  const [loading, setLoading] = useState(true);
  const [saving, setSaving] = useState(false);

  const [points, setPoints] = useState<ProfilePoints | null>(null);
  const [pointsLoading, setPointsLoading] = useState(true);
  const [pointsError, setPointsError] = useState('');
  const [profileError, setProfileError] = useState('');
  const [refresh, setRefresh] = useState(0);

  useFocusEffect(
    useCallback(() => {
      let active = true;

      async function loadProfile() {
        setLoading(true);
        setProfileError('');
        setPointsError('');
        setPoints(null);
        setPointsLoading(true);

        try {
          const {
            data: { user },
            error: authError,
          } = await supabase.auth.getUser();

          if (authError) throw authError;
          if (!user) throw new Error('Please log in to view your profile.');

          const { data: profile, error } = await supabase
            .from('profiles')
            .select('full_name, email')
            .eq('id', user.id)
            .maybeSingle();

          if (error) throw error;

          if (!active) return;

          const name =
            profile?.full_name ||
            user.user_metadata?.full_name ||
            'Traveler';

          setFullName(name);
          setEditName(name);
          setEmail(profile?.email || user.email || '');
          setEditing(false);
          setLoading(false);

          try {
            const scores = await loadProfilePoints([user.id]);

            if (active) {
              const ownPoints = scores.find(
                (score) => score.user_id === user.id
              );

              setPoints(ownPoints ?? null);

              if (!ownPoints) {
                setPointsError(
                  'No points record was returned. Check that your profile exists.'
                );
              }
            }
          } catch (err) {
            if (active) {
              setPointsError(
                err instanceof Error
                  ? err.message
                  : 'Unable to load profile points.'
              );
            }
          }
        } catch (err) {
          if (active) {
            setProfileError(
              err instanceof Error
                ? err.message
                : 'Unable to load your profile.'
            );
          }
        } finally {
          if (active) {
            setLoading(false);
            setPointsLoading(false);
          }
        }
      }

      void loadProfile();

      return () => {
        active = false;
      };
    }, [refresh])
  );

  async function handleSave() {
    if (saving) return;

    const newName = editName.trim();

    if (!newName) {
      Alert.alert('Invalid name', 'Please enter your name.');
      return;
    }

    setSaving(true);
    setProfileError('');

    try {
      const {
        data: { user },
        error: authError,
      } = await supabase.auth.getUser();

      if (authError) throw authError;
      if (!user) throw new Error('User is not logged in.');

      const { data: updatedProfile, error } = await supabase
        .from('profiles')
        .update({ full_name: newName })
        .eq('id', user.id)
        .select('id, full_name')
        .maybeSingle();

      if (error) throw error;

      if (!updatedProfile) {
        throw new Error(
          'Your profile could not be updated. Check the profile record and update permissions.'
        );
      }

      setFullName(updatedProfile.full_name || newName);
      setEditName(updatedProfile.full_name || newName);
      setEditing(false);

      const { error: metadataError } = await supabase.auth.updateUser({
        data: { full_name: newName },
      });

      setPointsLoading(true);
      setPointsError('');

      try {
        const scores = await loadProfilePoints([user.id]);
        const ownPoints = scores.find(
          (score) => score.user_id === user.id
        );

        setPoints(ownPoints ?? null);

        if (!ownPoints) {
          setPointsError('Unable to find your profile points.');
        }
      } catch (err) {
        setPoints(null);
        setPointsError(
          err instanceof Error
            ? err.message
            : 'Unable to refresh profile points.'
        );
      } finally {
        setPointsLoading(false);
      }

      Alert.alert(
        'Profile saved',
        metadataError
          ? 'Your profile was saved, but the account display name could not be synced. Please try saving again later.'
          : 'Your profile has been updated.'
      );
    } catch (err) {
      const message =
        err instanceof Error ? err.message : 'Unable to save your profile.';

      setProfileError(message);
      Alert.alert('Update failed', message);
    } finally {
      setSaving(false);
    }
  }

  if (loading) {
    return (
      <View style={styles.loadingContainer}>
        <ActivityIndicator size="large" color="#4F8CFF" />

        <Text style={styles.loadingText}>Loading profile...</Text>
      </View>
    );
  }

  if (profileError && !fullName) {
    return (
      <View style={styles.loadingContainer}>
        <Text style={styles.errorText}>{profileError}</Text>

        <TouchableOpacity
          accessibilityRole="button"
          onPress={() => setRefresh((value) => value + 1)}
        >
          <Text style={styles.link}>Try Again</Text>
        </TouchableOpacity>
      </View>
    );
  }

  return (
    <ScrollView
      style={styles.container}
      contentContainerStyle={styles.content}
      keyboardShouldPersistTaps="handled"
    >
      <Text style={styles.title}>My Profile</Text>

      <View style={styles.profileCard}>
        <View style={styles.profileCircle}>
          <Text style={styles.profileLetter}>
            {fullName.charAt(0).toUpperCase() || 'T'}
          </Text>
        </View>

        <Text style={styles.name}>{fullName}</Text>
        <Text style={styles.email}>{email}</Text>
      </View>

      <ProfilePointsBar
        points={points?.total_points ?? null}
        loading={pointsLoading}
      />

      {!!pointsError && (
        <View style={styles.notice}>
          <Text style={styles.errorText}>{pointsError}</Text>

          <TouchableOpacity
            accessibilityRole="button"
            disabled={saving}
            onPress={() => setRefresh((value) => value + 1)}
          >
            <Text style={styles.link}>Retry Points</Text>
          </TouchableOpacity>
        </View>
      )}

      {points && !pointsLoading && (
        <View style={styles.infoCard}>
          <Text style={styles.breakdownTitle}>Your Points Breakdown</Text>

          <View style={styles.pointsRow}>
            <Text style={styles.pointsLabel}>Profile setup</Text>
            <Text style={styles.pointsValue}>
              {points.profile_points} / 100
            </Text>
          </View>

          <View style={styles.pointsRow}>
            <Text style={styles.pointsLabel}>Travel preferences</Text>
            <Text style={styles.pointsValue}>
              {points.preference_points} / 100
            </Text>
          </View>

          <View style={styles.pointsRow}>
            <Text style={styles.pointsLabel}>Confirmed participation</Text>
            <Text style={styles.pointsValue}>
              {points.trip_points} / 800
            </Text>
          </View>

          <View style={styles.divider} />

          <Text style={styles.explanation}>
            Name and profile picture: 50 points each.
            {'\n'}
            Interests and travel style: 50 points each.
            {'\n'}
            Organiser-confirmed participation: 160 points per completed
            trip, for up to five trips.
          </Text>

          <Text style={styles.confirmedCount}>
            Confirmed trips: {points.confirmed_trip_count}
          </Text>

          <Text style={styles.explanation}>
            Points reflect recorded activity and do not guarantee safety.
          </Text>
        </View>
      )}

      <View style={styles.infoCard}>
        <Text style={styles.label}>FULL NAME</Text>

        {editing ? (
          <TextInput
            accessibilityLabel="Full name"
            style={styles.input}
            value={editName}
            onChangeText={setEditName}
            placeholder="Enter your name"
            placeholderTextColor="#858D9D"
            autoCapitalize="words"
            editable={!saving}
          />
        ) : (
          <Text style={styles.value}>{fullName}</Text>
        )}

        <View style={styles.divider} />

        <Text style={styles.label}>EMAIL</Text>
        <Text style={styles.value}>{email}</Text>
      </View>

      {!!profileError && (
        <Text style={[styles.errorText, styles.notice]}>
          {profileError}
        </Text>
      )}

      {!editing ? (
        <TouchableOpacity
          accessibilityRole="button"
          style={styles.editButton}
          onPress={() => setEditing(true)}
        >
          <Text style={styles.buttonText}>Edit Profile</Text>
        </TouchableOpacity>
      ) : (
        <View style={styles.buttonRow}>
          <TouchableOpacity
            accessibilityRole="button"
            style={styles.cancelButton}
            disabled={saving}
            onPress={() => {
              setEditName(fullName);
              setEditing(false);
            }}
          >
            <Text style={styles.cancelText}>Cancel</Text>
          </TouchableOpacity>

          <TouchableOpacity
            accessibilityRole="button"
            style={[
              styles.saveButton,
              saving && styles.disabledButton,
            ]}
            onPress={() => void handleSave()}
            disabled={saving}
          >
            <Text style={styles.buttonText}>
              {saving ? 'Saving...' : 'Save'}
            </Text>
          </TouchableOpacity>
        </View>
      )}

      <TouchableOpacity
        accessibilityRole="button"
        style={styles.featureButton}
        onPress={() => router.push('/companions')}
        disabled={saving}
      >
        <View style={styles.featureText}>
          <Text style={styles.featureTitle}>Find Companions</Text>

          <Text style={styles.featureSubtitle}>
            Discover travellers with similar interests and travel plans.
          </Text>
        </View>

        <Text style={styles.arrow}>›</Text>
      </TouchableOpacity>

      <TouchableOpacity
        accessibilityRole="button"
        style={styles.featureButton}
        onPress={() => router.push('/travel-preferences')}
        disabled={saving}
      >
        <View style={styles.featureText}>
          <Text style={styles.featureTitle}>Travel Preferences</Text>

          <Text style={styles.featureSubtitle}>
            Manage your interests, destinations, budget, and companion
            discovery.
          </Text>
        </View>

        <Text style={styles.arrow}>›</Text>
      </TouchableOpacity>
    </ScrollView>
  );
}

const styles = StyleSheet.create({
  container: {
    flex: 1,
    backgroundColor: '#08090D',
  },
  content: {
    padding: 24,
    paddingBottom: 60,
  },
  loadingContainer: {
    flex: 1,
    justifyContent: 'center',
    alignItems: 'center',
    backgroundColor: '#08090D',
    padding: 24,
  },
  loadingText: {
    marginTop: 10,
    color: '#9299A8',
  },
  title: {
    fontSize: 28,
    fontWeight: '700',
    color: '#F7F8FC',
    marginBottom: 24,
  },
  profileCard: {
    backgroundColor: '#151821',
    borderRadius: 16,
    padding: 28,
    alignItems: 'center',
    borderWidth: 1,
    borderColor: '#252A37',
  },
  profileCircle: {
    width: 90,
    height: 90,
    borderRadius: 45,
    backgroundColor: '#4F8CFF',
    justifyContent: 'center',
    alignItems: 'center',
    marginBottom: 15,
  },
  profileLetter: {
    color: '#FFFFFF',
    fontSize: 38,
    fontWeight: '700',
  },
  name: {
    fontSize: 22,
    fontWeight: '700',
    color: '#F7F8FC',
  },
  email: {
    fontSize: 14,
    color: '#9299A8',
    marginTop: 6,
  },
  infoCard: {
    backgroundColor: '#151821',
    borderRadius: 16,
    padding: 20,
    marginTop: 18,
    borderWidth: 1,
    borderColor: '#252A37',
  },
  breakdownTitle: {
    color: '#F7F8FC',
    fontSize: 16,
    fontWeight: '700',
    marginBottom: 6,
  },
  pointsRow: {
    flexDirection: 'row',
    justifyContent: 'space-between',
    alignItems: 'center',
    marginTop: 14,
  },
  pointsLabel: {
    flex: 1,
    color: '#9299A8',
    fontSize: 13,
    marginRight: 12,
  },
  pointsValue: {
    color: '#A9C5FF',
    fontSize: 13,
    fontWeight: '700',
  },
  explanation: {
    color: '#9299A8',
    fontSize: 12,
    lineHeight: 20,
  },
  confirmedCount: {
    color: '#D9DDE7',
    fontSize: 13,
    marginVertical: 12,
  },
  label: {
    fontSize: 11,
    fontWeight: '700',
    color: '#858D9D',
  },
  value: {
    fontSize: 16,
    color: '#F7F8FC',
    marginTop: 6,
  },
  input: {
    height: 48,
    borderWidth: 1,
    borderColor: '#303646',
    borderRadius: 10,
    paddingHorizontal: 14,
    marginTop: 8,
    fontSize: 16,
    color: '#F7F8FC',
    backgroundColor: '#151821',
  },
  divider: {
    height: 1,
    backgroundColor: '#252A37',
    marginVertical: 18,
  },
  editButton: {
    height: 52,
    backgroundColor: '#4F8CFF',
    borderRadius: 12,
    justifyContent: 'center',
    alignItems: 'center',
    marginTop: 18,
  },
  buttonRow: {
    flexDirection: 'row',
    marginTop: 18,
  },
  cancelButton: {
    flex: 1,
    height: 52,
    backgroundColor: '#151821',
    borderWidth: 1,
    borderColor: '#303646',
    borderRadius: 12,
    justifyContent: 'center',
    alignItems: 'center',
    marginRight: 8,
  },
  saveButton: {
    flex: 1,
    height: 52,
    backgroundColor: '#4F8CFF',
    borderRadius: 12,
    justifyContent: 'center',
    alignItems: 'center',
    marginLeft: 8,
  },
  disabledButton: {
    opacity: 0.6,
  },
  buttonText: {
    color: '#FFFFFF',
    fontSize: 16,
    fontWeight: '700',
  },
  cancelText: {
    color: '#D9DDE7',
    fontSize: 16,
    fontWeight: '600',
  },
  featureButton: {
    flexDirection: 'row',
    alignItems: 'center',
    backgroundColor: '#151821',
    borderWidth: 1,
    borderColor: '#252A37',
    borderRadius: 16,
    padding: 20,
    marginTop: 18,
  },
  featureText: {
    flex: 1,
  },
  featureTitle: {
    color: '#F7F8FC',
    fontSize: 17,
    fontWeight: '700',
  },
  featureSubtitle: {
    color: '#9299A8',
    fontSize: 13,
    lineHeight: 20,
    marginTop: 6,
  },
  arrow: {
    color: '#4F8CFF',
    fontSize: 32,
    marginLeft: 14,
  },
  notice: {
    marginTop: 12,
  },
  errorText: {
    color: '#FF9B9B',
    lineHeight: 20,
  },
  link: {
    color: '#75A2FF',
    fontWeight: '700',
    paddingVertical: 12,
  },
});