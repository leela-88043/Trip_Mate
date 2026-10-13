import { StyleSheet, Text, TouchableOpacity, View } from 'react-native';
import { router } from 'expo-router';

export default function WelcomeScreen() {
  return (
    <View style={styles.container}>
      <View style={styles.content}>
        <Text style={styles.logo}>TRIP MATE</Text>

        <Text style={styles.emoji}>🌍</Text>

        <Text style={styles.title}>
          Your Journey,{'\n'}Your People,{'\n'}Your Memories.
        </Text>

        <Text style={styles.subtitle}>
          Discover destinations, find travel companions,
          and plan unforgettable trips together.
        </Text>

        <TouchableOpacity
          style={styles.loginButton}
          onPress={() => router.push('/login')}
        >
          <Text style={styles.loginButtonText}>Login</Text>
        </TouchableOpacity>

        <TouchableOpacity
          style={styles.signupButton}
          onPress={() => router.push('/signup')}
        >
          <Text style={styles.signupButtonText}>Create Account</Text>
        </TouchableOpacity>

        <Text style={styles.footer}>
          Travel Together. Explore Together.
        </Text>
      </View>
    </View>
  );
}

const styles = StyleSheet.create({
  container: {
    flex: 1,
    backgroundColor: '#F5F7FA',
  },

  content: {
    flex: 1,
    justifyContent: 'center',
    alignItems: 'center',
    paddingHorizontal: 28,
  },

  logo: {
    fontSize: 22,
    fontWeight: '900',
    letterSpacing: 3,
    color: '#2563EB',
    marginBottom: 55,
  },

  emoji: {
    fontSize: 75,
    marginBottom: 25,
  },

  title: {
    fontSize: 32,
    fontWeight: '800',
    color: '#111827',
    textAlign: 'center',
    lineHeight: 42,
  },

  subtitle: {
    fontSize: 15,
    color: '#6B7280',
    textAlign: 'center',
    lineHeight: 24,
    marginTop: 18,
    marginBottom: 40,
  },

  loginButton: {
    width: '100%',
    height: 54,
    backgroundColor: '#2563EB',
    borderRadius: 14,
    justifyContent: 'center',
    alignItems: 'center',
  },

  loginButtonText: {
    color: '#FFFFFF',
    fontSize: 17,
    fontWeight: '700',
  },

  signupButton: {
    width: '100%',
    height: 54,
    backgroundColor: '#FFFFFF',
    borderWidth: 1.5,
    borderColor: '#2563EB',
    borderRadius: 14,
    justifyContent: 'center',
    alignItems: 'center',
    marginTop: 15,
  },

  signupButtonText: {
    color: '#2563EB',
    fontSize: 17,
    fontWeight: '700',
  },

  footer: {
    color: '#9CA3AF',
    fontSize: 12,
    marginTop: 45,
  },
});