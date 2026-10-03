import { useEffect, useState } from 'react';
import {
  ActivityIndicator,
  Alert,
  StyleSheet,
  Text,
  TextInput,
  TouchableOpacity,
  View,
} from 'react-native';

import { supabase } from '@/services/supabase';

export default function MyProfileScreen() {
  const [fullName, setFullName] = useState('');
  const [email, setEmail] = useState('');
  const [editName, setEditName] = useState('');
  const [editing, setEditing] = useState(false);
  const [loading, setLoading] = useState(true);
  const [saving, setSaving] = useState(false);

  useEffect(() => {
    loadProfile();
  }, []);

  const loadProfile = async () => {
    const {
      data: { user },
    } = await supabase.auth.getUser();

    if (!user) {
      setLoading(false);
      return;
    }

    const { data: profile } = await supabase
      .from('profiles')
      .select('full_name, email')
      .eq('id', user.id)
      .maybeSingle();

    const name =
      profile?.full_name ||
      user.user_metadata?.full_name ||
      'Traveler';

    setFullName(name);
    setEditName(name);

    setEmail(
      profile?.email ||
      user.email ||
      ''
    );

    setLoading(false);
  };

  const handleSave = async () => {
    const newName = editName.trim();

    if (!newName) {
      Alert.alert(
        'Invalid name',
        'Please enter your name.'
      );
      return;
    }

    const {
      data: { user },
    } = await supabase.auth.getUser();

    if (!user) {
      Alert.alert(
        'Error',
        'User is not logged in.'
      );
      return;
    }

    setSaving(true);

    const { error } = await supabase
      .from('profiles')
      .update({
        full_name: newName,
      })
      .eq('id', user.id);

    if (error) {
      setSaving(false);

      Alert.alert(
        'Update failed',
        error.message
      );
      return;
    }

    await supabase.auth.updateUser({
      data: {
        full_name: newName,
      },
    });

    setFullName(newName);
    setEditName(newName);
    setEditing(false);
    setSaving(false);

    Alert.alert(
      'Success',
      'Your profile has been updated.'
    );
  };

  if (loading) {
    return (
      <View style={styles.loadingContainer}>
        <ActivityIndicator size="large" />

        <Text style={styles.loadingText}>
          Loading profile...
        </Text>
      </View>
    );
  }

  return (
    <View style={styles.container}>
      <Text style={styles.title}>
        My Profile
      </Text>

      <View style={styles.profileCard}>
        <View style={styles.profileCircle}>
          <Text style={styles.profileLetter}>
            {fullName.charAt(0).toUpperCase() || 'T'}
          </Text>
        </View>

        <Text style={styles.name}>
          {fullName}
        </Text>

        <Text style={styles.email}>
          {email}
        </Text>
      </View>

      <View style={styles.infoCard}>
        <Text style={styles.label}>
          FULL NAME
        </Text>

        {editing ? (
          <TextInput
            style={styles.input}
            value={editName}
            onChangeText={setEditName}
            placeholder="Enter your name"
            placeholderTextColor="#9CA3AF"
            autoCapitalize="words"
          />
        ) : (
          <Text style={styles.value}>
            {fullName}
          </Text>
        )}

        <View style={styles.divider} />

        <Text style={styles.label}>
          EMAIL
        </Text>

        <Text style={styles.value}>
          {email}
        </Text>
      </View>

      {!editing ? (
        <TouchableOpacity
          style={styles.editButton}
          onPress={() => setEditing(true)}
        >
          <Text style={styles.buttonText}>
            Edit Profile
          </Text>
        </TouchableOpacity>
      ) : (
        <View style={styles.buttonRow}>
          <TouchableOpacity
            style={styles.cancelButton}
            onPress={() => {
              setEditName(fullName);
              setEditing(false);
            }}
          >
            <Text style={styles.cancelText}>
              Cancel
            </Text>
          </TouchableOpacity>

          <TouchableOpacity
            style={styles.saveButton}
            onPress={handleSave}
            disabled={saving}
          >
            <Text style={styles.buttonText}>
              {saving ? 'Saving...' : 'Save'}
            </Text>
          </TouchableOpacity>
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

  loadingContainer: {
    flex: 1,
    justifyContent: 'center',
    alignItems: 'center',
    backgroundColor: '#F5F7FA',
  },

  loadingText: {
    marginTop: 10,
    color: '#6B7280',
  },

  title: {
    fontSize: 28,
    fontWeight: '700',
    color: '#111827',
    marginBottom: 24,
  },

  profileCard: {
    backgroundColor: '#FFFFFF',
    borderRadius: 16,
    padding: 28,
    alignItems: 'center',
    borderWidth: 1,
    borderColor: '#E5E7EB',
  },

  profileCircle: {
    width: 90,
    height: 90,
    borderRadius: 45,
    backgroundColor: '#2563EB',
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
    color: '#111827',
  },

  email: {
    fontSize: 14,
    color: '#6B7280',
    marginTop: 6,
  },

  infoCard: {
    backgroundColor: '#FFFFFF',
    borderRadius: 16,
    padding: 20,
    marginTop: 18,
    borderWidth: 1,
    borderColor: '#E5E7EB',
  },

  label: {
    fontSize: 11,
    fontWeight: '700',
    color: '#9CA3AF',
  },

  value: {
    fontSize: 16,
    color: '#111827',
    marginTop: 6,
  },

  input: {
    height: 48,
    borderWidth: 1,
    borderColor: '#D1D5DB',
    borderRadius: 10,
    paddingHorizontal: 14,
    marginTop: 8,
    fontSize: 16,
    color: '#111827',
    backgroundColor: '#FFFFFF',
  },

  divider: {
    height: 1,
    backgroundColor: '#E5E7EB',
    marginVertical: 18,
  },

  editButton: {
    height: 52,
    backgroundColor: '#2563EB',
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
    backgroundColor: '#FFFFFF',
    borderWidth: 1,
    borderColor: '#D1D5DB',
    borderRadius: 12,
    justifyContent: 'center',
    alignItems: 'center',
    marginRight: 8,
  },

  saveButton: {
    flex: 1,
    height: 52,
    backgroundColor: '#2563EB',
    borderRadius: 12,
    justifyContent: 'center',
    alignItems: 'center',
    marginLeft: 8,
  },

  buttonText: {
    color: '#FFFFFF',
    fontSize: 16,
    fontWeight: '700',
  },

  cancelText: {
    color: '#374151',
    fontSize: 16,
    fontWeight: '600',
  },
});