import { StyleSheet, Text, View } from 'react-native';

export default function SafetyScreen() {
  return (
    <View style={styles.container}>
      <Text style={styles.title}>Trip Safety</Text>

      <Text style={styles.subtitle}>
        Your safety matters throughout your journey.
      </Text>

      <Text style={styles.message}>
        Safety features will be available here soon.
      </Text>
    </View>
  );
}

const styles = StyleSheet.create({
  container: {
    flex: 1,
    backgroundColor: '#F5F7FA',
    justifyContent: 'center',
    alignItems: 'center',
    padding: 25,
  },

  title: {
    fontSize: 26,
    fontWeight: '800',
    color: '#111827',
  },

  subtitle: {
    fontSize: 15,
    color: '#6B7280',
    marginTop: 12,
    textAlign: 'center',
  },

  message: {
    fontSize: 14,
    color: '#2563EB',
    marginTop: 25,
  },
});