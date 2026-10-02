import { Alert, StyleSheet, Text, TouchableOpacity, View } from 'react-native';
import { supabase } from '@/services/supabase';
import { createTrip } from '@/services/trip';

export default function TripTestScreen() {
  const handleCreateTrip = async () => {
    const {
      data: { user },
    } = await supabase.auth.getUser();

    if (!user) {
      Alert.alert('Error', 'No user is logged in.');
      return;
    }

    const { data, error } = await createTrip(
      'Test Trip',
      'Shillong',
      '2026-10-10',
      '2026-10-12',
      user.id
    );

    if (error) {
      Alert.alert('Error', error.message);
      return;
    }

    console.log('Trip created:', data);
    Alert.alert('Success', 'Trip created successfully!');
  };

  return (
    <View style={styles.container}>
      <Text style={styles.title}>Trip Test</Text>

      <TouchableOpacity
        style={styles.button}
        onPress={handleCreateTrip}
      >
        <Text style={styles.buttonText}>Create Test Trip</Text>
      </TouchableOpacity>
    </View>
  );
}

const styles = StyleSheet.create({
  container: {
    flex: 1,
    justifyContent: 'center',
    alignItems: 'center',
    padding: 24,
  },
  title: {
    fontSize: 24,
    fontWeight: '700',
    marginBottom: 30,
  },
  button: {
    backgroundColor: '#2563EB',
    paddingHorizontal: 25,
    paddingVertical: 15,
    borderRadius: 10,
  },
  buttonText: {
    color: '#FFFFFF',
    fontSize: 16,
    fontWeight: '700',
  },
});