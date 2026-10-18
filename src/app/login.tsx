import { useState } from 'react';
import {
  Alert,
  KeyboardAvoidingView,
  Platform,
  StyleSheet,
  Text,
  TextInput,
  TouchableOpacity,
  View,
} from 'react-native';
import { router } from 'expo-router';

import { signIn } from '@/services/auth';

export default function LoginScreen() {
  const [email, setEmail] = useState('');
  const [password, setPassword] = useState('');
  const [loading, setLoading] = useState(false);

  const handleLogin = async () => {
    if (!email.trim() || !password) {
      Alert.alert(
        'Missing information',
        'Please enter your email and password.'
      );
      return;
    }

    setLoading(true);

    const { error } = await signIn(
      email.trim(),
      password
    );

    setLoading(false);

    if (error) {
      Alert.alert(
        'Login failed',
        error.message
      );
      return;
    }

    // Login successful → go directly to dashboard
    router.replace('/');
  };

  return (
    <KeyboardAvoidingView
      style={styles.container}
      behavior={
        Platform.OS === 'ios'
          ? 'padding'
          : undefined
      }
    >
      <View style={styles.content}>
        <Text style={styles.logo}>
          TRIP MATE
        </Text>

        <Text style={styles.title}>
          Welcome back 👋
        </Text>

        <Text style={styles.subtitle}>
          Login to continue your journey
        </Text>

        <View style={styles.form}>
          <Text style={styles.label}>
            Email
          </Text>

          <TextInput
            style={styles.input}
            placeholder="Enter your email"
            placeholderTextColor="#858D9D"
            value={email}
            onChangeText={setEmail}
            autoCapitalize="none"
            keyboardType="email-address"
          />

          <Text style={styles.label}>
            Password
          </Text>

          <TextInput
            style={styles.input}
            placeholder="Enter your password"
            placeholderTextColor="#858D9D"
            value={password}
            onChangeText={setPassword}
            secureTextEntry
          />

          <TouchableOpacity
            style={styles.button}
            onPress={handleLogin}
            disabled={loading}
          >
            <Text style={styles.buttonText}>
              {loading
                ? 'Logging in...'
                : 'Login'}
            </Text>
          </TouchableOpacity>
        </View>

        <TouchableOpacity
          onPress={() => router.push('/signup')}
        >
          <Text style={styles.signupText}>
            Don't have an account?{' '}
            <Text style={styles.signupLink}>
              Sign Up
            </Text>
          </Text>
        </TouchableOpacity>
      </View>
    </KeyboardAvoidingView>
  );
}

const styles = StyleSheet.create({
  container: {
    flex: 1,
    backgroundColor: '#08090D',
  },

  content: {
    flex: 1,
    justifyContent: 'center',
    paddingHorizontal: 28,
  },

  logo: {
    fontSize: 18,
    fontWeight: '800',
    letterSpacing: 2,
    color: '#4F8CFF',
    textAlign: 'center',
    marginBottom: 35,
  },

  title: {
    fontSize: 30,
    fontWeight: '700',
    color: '#F7F8FC',
    textAlign: 'center',
  },

  subtitle: {
    fontSize: 15,
    color: '#9299A8',
    textAlign: 'center',
    marginTop: 8,
    marginBottom: 35,
  },

  form: {
    width: '100%',
  },

  label: {
    fontSize: 14,
    fontWeight: '600',
    color: '#D9DDE7',
    marginBottom: 8,
    marginTop: 14,
  },

  input: {
    height: 52,
    backgroundColor: '#151821',
    borderWidth: 1,
    borderColor: '#303646',
    borderRadius: 12,
    paddingHorizontal: 16,
    fontSize: 16,
    color: '#F7F8FC',
  },

  button: {
    height: 52,
    backgroundColor: '#2563EB',
    borderRadius: 12,
    justifyContent: 'center',
    alignItems: 'center',
    marginTop: 28,
  },

  buttonText: {
    color: '#FFFFFF',
    fontSize: 16,
    fontWeight: '700',
  },

  signupText: {
    textAlign: 'center',
    color: '#9299A8',
    fontSize: 14,
    marginTop: 25,
  },

  signupLink: {
    color: '#4F8CFF',
    fontWeight: '700',
  },
});