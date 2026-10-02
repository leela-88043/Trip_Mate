import { Stack } from 'expo-router';

export default function RootLayout() {
  return (
    <Stack>
      <Stack.Screen name="index" options={{ headerShown: false }} />
      <Stack.Screen name="my-trips" options={{ title: 'My Trips' }} />
      <Stack.Screen name="trip-details" options={{ title: 'Trip Details' }} />
      <Stack.Screen name="create-trip" options={{ title: 'Create Trip' }} />
      <Stack.Screen name="trip-test" options={{ title: 'Trip Test' }} />
      <Stack.Screen name="login" options={{ title: 'Login' }} />
      <Stack.Screen name="signup" options={{ title: 'Sign Up' }} />
      <Stack.Screen name="explore" options={{ title: 'Explore' }} />
    </Stack>
  );
}
