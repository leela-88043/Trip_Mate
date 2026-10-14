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
  container: { flex: 1, backgroundColor: '#08090D', justifyContent: 'center', alignItems: 'center', padding: 26 },
  title: { fontSize: 28, fontWeight: '800', color: '#F7F8FC', letterSpacing: -0.4, textAlign: 'center' },
  subtitle: { fontSize: 15, color: '#A0A7B5', marginTop: 12, textAlign: 'center', lineHeight: 22 },
  message: { fontSize: 14, color: '#78A5FF', marginTop: 24, textAlign: 'center', backgroundColor: '#151E31', borderColor: '#263B61', borderWidth: 1, borderRadius: 14, paddingHorizontal: 18, paddingVertical: 13, overflow: 'hidden' },
});
