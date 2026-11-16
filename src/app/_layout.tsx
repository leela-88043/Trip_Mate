import type { Session } from "@supabase/supabase-js";
import {
  Stack,
  router,
  useRootNavigationState,
  useSegments,
} from "expo-router";
import { useEffect, useState } from "react";
import {
  ActivityIndicator,
  StyleSheet,
  Text,
  TouchableOpacity,
  View,
} from "react-native";

import { getSafetyAlertSenderName } from "@/services/safetyAlerts";
import { supabase } from "@/services/supabase";
import { getMyTrips } from "@/services/trips";
import { isActiveTrip } from "@/utils/tripTimeline";

type SafetyNotification = {
  id: string;
  alert_type: string;
  message: string;
  sender_name: string;
};

type ActiveTrip = {
  id: string;
  start_date: string;
  end_date: string;
};

export default function RootLayout() {
  const segments = useSegments();
  const navigationState = useRootNavigationState();

  const [session, setSession] = useState<Session | null>(null);
  const [checkingAuth, setCheckingAuth] = useState(true);
  const [notification, setNotification] = useState<SafetyNotification | null>(
    null,
  );

  // Automatically hide the banner after 5 seconds.
  useEffect(() => {
    if (!notification) return;

    const timer = setTimeout(() => {
      setNotification(null);
    }, 5000);

    return () => clearTimeout(timer);
  }, [notification]);

  // Global Safety Alert Realtime Listener
  useEffect(() => {
    if (!session?.user.id) {
      setNotification(null);
      return;
    }

    let active = true;
    const channels: ReturnType<typeof supabase.channel>[] = [];

    async function setupSafetyListeners() {
      try {
        const { data, error } = await getMyTrips(session!.user.id);

        if (error) throw error;
        if (!active) return;

        const rows = (data ?? []) as unknown as {
          trips: ActiveTrip | ActiveTrip[] | null;
        }[];

        const tripList = rows.flatMap((row) =>
          !row.trips ? [] : Array.isArray(row.trips) ? row.trips : [row.trips],
        );

        const uniqueTrips = Array.from(
          new Map(tripList.map((trip) => [trip.id, trip])).values(),
        );

        const activeTrips = uniqueTrips.filter((trip) => isActiveTrip(trip));

        activeTrips.forEach((trip) => {
          if (!active) return;

          const channel = supabase
            .channel(`global-safety-${trip.id}-${session!.user.id}`)
            .on(
              "postgres_changes",
              {
                event: "INSERT",
                schema: "public",
                table: "safety_alerts",
                filter: `trip_id=eq.${trip.id}`,
              },
              async (payload) => {
                if (!active) return;

                const newAlert = payload.new as {
                  id: string;
                  user_id: string;
                  alert_type: string;
                  message: string;
                };

                // Do not show alerts sent by the current user.
                if (newAlert.user_id === session!.user.id) return;

                const senderName = await getSafetyAlertSenderName(
                  newAlert.user_id,
                );

                if (!active) return;

                setNotification({
                  id: newAlert.id,
                  alert_type: newAlert.alert_type,
                  message: newAlert.message,
                  sender_name: senderName,
                });
              },
            )
            .subscribe((status) => {
              console.log(`Global Safety Listener (${trip.id}):`, status);
            });

          channels.push(channel);
        });
      } catch (error) {
        console.error("Global Safety Listener Error:", error);
      }
    }

    void setupSafetyListeners();

    return () => {
      active = false;
      channels.forEach((channel) => {
        void supabase.removeChannel(channel);
      });
    };
  }, [session?.user.id]);

  // Authentication Listener
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

    async function checkSession() {
      const { data, error } = await supabase.auth.getSession();

      if (!mounted) return;

      if (error) {
        console.error("Session check failed:", error.message);
      }

      setSession(data.session);
      setCheckingAuth(false);
    }

    void checkSession();

    return () => {
      mounted = false;
      subscription.unsubscribe();
    };
  }, []);

  // Navigation Protection
  useEffect(() => {
    if (checkingAuth || !navigationState?.key) {
      return;
    }

    const currentScreen = segments[0];

    const isPublicScreen =
      currentScreen === "welcome" ||
      currentScreen === "login" ||
      currentScreen === "signup";

    if (!session && !isPublicScreen) {
      router.replace("/welcome");
    } else if (session && isPublicScreen) {
      router.replace("/");
    }
  }, [session, checkingAuth, segments, navigationState?.key]);

  return (
    <View style={styles.container}>
      <Stack
        screenOptions={{
          headerShown: true,
          headerStyle: {
            backgroundColor: "#08090D",
          },
          headerTintColor: "#F7F8FC",
          headerTitleStyle: {
            color: "#F7F8FC",
            fontWeight: "700",
          },
          contentStyle: {
            backgroundColor: "#08090D",
          },
        }}
      >
        <Stack.Screen name="welcome" options={{ headerShown: false }} />
        <Stack.Screen name="login" options={{ title: "Login" }} />
        <Stack.Screen name="signup" options={{ title: "Sign Up" }} />
        <Stack.Screen name="(tabs)" options={{ headerShown: false }} />
        <Stack.Screen name="edit-trip" options={{ title: "Edit Trip" }} />
        <Stack.Screen name="trip-details" options={{ title: "Trip Details" }} />
        <Stack.Screen name="my-profile" options={{ title: "My Profile" }} />
        <Stack.Screen
          name="travel-preferences"
          options={{ title: "Travel Preferences" }}
        />
        <Stack.Screen
          name="companions"
          options={{ title: "Find Companions" }}
        />
        <Stack.Screen name="trip-test" options={{ title: "Trip Test" }} />
        <Stack.Screen
          name="trip-budget"
          options={{ title: "Trip Budget & Expenses" }}
        />
      </Stack>

      {/* Global Safety Notification Banner */}
      {notification && (
        <View style={styles.notificationContainer}>
          <TouchableOpacity
            activeOpacity={0.9}
            style={styles.notificationBanner}
            onPress={() => setNotification(null)}
          >
            <View style={styles.notificationIcon}>
              <Text style={styles.notificationIconText}>!</Text>
            </View>

            <View style={styles.notificationContent}>
              <Text style={styles.notificationTitle}>
                Safety Alert · {notification.alert_type}
              </Text>

              <Text style={styles.notificationSender}>
                From {notification.sender_name}
              </Text>

              <Text style={styles.notificationMessage}>
                {notification.message}
              </Text>
            </View>

            <Text style={styles.closeButton}>✕</Text>
          </TouchableOpacity>
        </View>
      )}

      {checkingAuth && (
        <View style={styles.loadingOverlay}>
          <ActivityIndicator size="large" color="#4F8CFF" />
        </View>
      )}
    </View>
  );
}

const styles = StyleSheet.create({
  container: {
    flex: 1,
    backgroundColor: "#08090D",
  },
  loadingOverlay: {
    position: "absolute",
    top: 0,
    left: 0,
    right: 0,
    bottom: 0,
    justifyContent: "center",
    alignItems: "center",
    backgroundColor: "#08090D",
  },
  notificationContainer: {
    position: "absolute",
    top: 55,
    left: 14,
    right: 14,
    zIndex: 9999,
    elevation: 20,
  },
  notificationBanner: {
    flexDirection: "row",
    alignItems: "center",
    backgroundColor: "#151821",
    borderWidth: 1,
    borderColor: "#4F8CFF",
    borderRadius: 14,
    padding: 14,
  },
  notificationIcon: {
    width: 34,
    height: 34,
    borderRadius: 17,
    backgroundColor: "#4F8CFF",
    alignItems: "center",
    justifyContent: "center",
    marginRight: 12,
  },
  notificationIconText: {
    color: "#FFFFFF",
    fontSize: 20,
    fontWeight: "bold",
  },
  notificationContent: {
    flex: 1,
  },
  notificationTitle: {
    color: "#FFFFFF",
    fontSize: 14,
    fontWeight: "700",
  },
  notificationSender: {
    color: "#4F8CFF",
    fontSize: 12,
    marginTop: 3,
  },
  notificationMessage: {
    color: "#D1D5DB",
    fontSize: 13,
    marginTop: 4,
  },
  closeButton: {
    color: "#9CA3AF",
    fontSize: 16,
    marginLeft: 8,
  },
});
