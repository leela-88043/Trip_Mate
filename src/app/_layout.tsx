import { useEffect, useState } from 'react';

import {
  ActivityIndicator,
  StyleSheet,
  View,
} from 'react-native';

import {
  Stack,
  router,
  useSegments,
  useRootNavigationState,
} from 'expo-router';

import { Session } from '@supabase/supabase-js';

import { supabase } from '@/services/supabase';

export default function RootLayout() {
  const segments = useSegments();
  const navigationState = useRootNavigationState();

  const [session, setSession] = useState<Session | null>(null);
  const [checkingAuth, setCheckingAuth] = useState(true);

  // Check authentication session
  useEffect(() => {
    let mounted = true;

    const {
      data: { subscription },
    } = supabase.auth.onAuthStateChange((_event, newSession) => {
      if (mounted) {
        setSession(newSession);
        setCheckingAuth(false);
      }
    });

    const checkSession = async () => {
      const { data, error } = await supabase.auth.getSession();

      if (!mounted) return;

      if (error) {
        console.error('Session check failed:', error.message);
      }

      setSession(data.session);
      setCheckingAuth(false);
    };

    checkSession();

    return () => {
      mounted = false;
      subscription.unsubscribe();
    };
  }, []);

  // Authentication-based navigation
  useEffect(() => {
    if (checkingAuth || !navigationState?.key) {
      return;
    }

    const currentScreen = segments[0];

    const isPublicScreen =
      currentScreen === 'welcome' ||
      currentScreen === 'login' ||
      currentScreen === 'signup';

    if (!session && !isPublicScreen) {
      router.replace('/welcome');
    } else if (session && isPublicScreen) {
      router.replace('/');
    }
  }, [
    session,
    checkingAuth,
    segments,
    navigationState?.key,
  ]);

  return (
    <View style={styles.container}>
      <Stack
          screenOptions={{
            headerShown: true,
            headerStyle: { backgroundColor: '#08090D' },
            headerTintColor: '#F7F8FC',
            headerTitleStyle: { color: '#F7F8FC', fontWeight: '700' },
            contentStyle: { backgroundColor: '#08090D' },
          }}
        >
        <Stack.Screen
          name="welcome"
          options={{ headerShown: false }}
        />

        <Stack.Screen
          name="login"
          options={{ title: 'Login' }}
        />

        <Stack.Screen
          name="signup"
          options={{ title: 'Sign Up' }}
        />

        <Stack.Screen
          name="(tabs)"
          options={{ headerShown: false }}
        />

        <Stack.Screen
          name="edit-trip"
          options={{ title: 'Edit Trip' }}
        />

        <Stack.Screen
          name="trip-details"
          options={{ title: 'Trip Details' }}
        />

        <Stack.Screen
          name="my-profile"
          options={{ title: 'My Profile' }}
        />

        <Stack.Screen
          name="trip-test"
          options={{ title: 'Trip Test' }}
        />
      </Stack>

      {checkingAuth && (
        <View style={styles.loadingOverlay}>
          <ActivityIndicator
            size="large"
            color="#4F8CFF"
          />
        </View>
      )}
    </View>
  );
}

const styles = StyleSheet.create({
  container: {
    flex: 1,
  },

  loadingOverlay: {
  position: 'absolute',
  top: 0,
  left: 0,
  right: 0,
  bottom: 0,
  justifyContent: 'center',
  alignItems: 'center',
  backgroundColor: '#08090D',
},
});