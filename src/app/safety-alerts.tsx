import { useTripToday } from "@/hooks/useTripToday";
import {
    createSafetyAlert,
    getSafetyAlerts,
    getSafetyAlertSenderName,
    subscribeToSafetyAlerts,
    unsubscribeFromSafetyAlerts,
} from "@/services/safetyAlerts";
import { supabase } from "@/services/supabase";
import { getMyTrips } from "@/services/trips";
import { isActiveTrip } from "@/utils/tripTimeline";
import { useFocusEffect } from "expo-router";
import { useCallback, useEffect, useState } from "react";
import {
    ActivityIndicator,
    Alert,
    ScrollView,
    StyleSheet,
    Text,
    TextInput,
    TouchableOpacity,
    View,
} from "react-native";
const ALERT_TYPES = [
  { label: "Traffic", message: "Heavy traffic ahead", icon: "car-outline" },
  {
    label: "Road Blocked",
    message: "Road blocked ahead",
    icon: "alert-circle-outline",
  },
  {
    label: "Accident",
    message: "Accident reported ahead",
    icon: "warning-outline",
  },
  {
    label: "Bad Weather",
    message: "Bad weather in this area",
    icon: "rainy-outline",
  },
  { label: "Road Hazard", message: "Road hazard ahead", icon: "alert-outline" },
  {
    label: "Route Diversion",
    message: "Route diversion ahead",
    icon: "git-branch-outline",
  },
  {
    label: "Temporary Stop",
    message: "Waiting at this location",
    icon: "location-outline",
  },
  {
    label: "Break",
    message: "Stopping for food or a break",
    icon: "cafe-outline",
  },
];
type Trip = {
  id: string;
  name: string;
  destination: string;
  start_date: string;
  end_date: string;
  created_by: string;
};

type SafetyAlert = {
  id: string;
  trip_id: string;
  user_id: string;
  alert_type: string;
  message: string;
  created_at: string;
  sender_name?: string;
};

export default function SafetyAlertsScreen() {
  const today = useTripToday();
  const [trips, setTrips] = useState<Trip[]>([]);
  const [selectedTrip, setSelectedTrip] = useState<Trip | null>(null);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState("");
  const [customMessage, setCustomMessage] = useState("");
  const [sending, setSending] = useState(false);
  const [alerts, setAlerts] = useState<SafetyAlert[]>([]);
  const [alertsLoading, setAlertsLoading] = useState(false);

  useFocusEffect(
    useCallback(() => {
      let active = true;

      async function loadTrips() {
        setLoading(true);
        setError("");

        try {
          const {
            data: { user },
            error: authError,
          } = await supabase.auth.getUser();

          if (authError) throw new Error(authError.message);
          if (!user) throw new Error("Please log in to view your trips.");

          const { data, error: tripError } = await getMyTrips(user.id);

          if (tripError) throw new Error(tripError.message);

          const rows = (data ?? []) as unknown as {
            trips: Trip | Trip[] | null;
          }[];

          const list = rows.flatMap((row) =>
            !row.trips
              ? []
              : Array.isArray(row.trips)
                ? row.trips
                : [row.trips],
          );

          const uniqueTrips = Array.from(
            new Map(list.map((trip) => [trip.id, trip])).values(),
          );

          if (active) {
            setTrips(uniqueTrips.filter((trip) => isActiveTrip(trip, today)));
          }
        } catch (err) {
          if (active) {
            setTrips([]);
            setError(
              err instanceof Error ? err.message : "Unable to load trips.",
            );
          }
        } finally {
          if (active) setLoading(false);
        }
      }

      void loadTrips();

      return () => {
        active = false;
      };
    }, [today]),
  );
  async function sendAlert(alertType: string, message: string) {
    if (!selectedTrip) {
      Alert.alert("Select a trip", "Please select a trip first.");
      return;
    }

    if (!message.trim()) {
      Alert.alert("Empty message", "Please enter an alert message.");
      return;
    }

    setSending(true);

    try {
      const { error } = await createSafetyAlert(
        selectedTrip.id,
        alertType,
        message.trim(),
      );

      if (error) throw error;

      Alert.alert(
        "Alert sent",
        "Your safety alert has been shared with trip members.",
      );
      setCustomMessage("");
    } catch (err) {
      Alert.alert(
        "Unable to send alert",
        err instanceof Error ? err.message : "Something went wrong.",
      );
    } finally {
      setSending(false);
    }
  }
  useEffect(() => {
    if (!selectedTrip) {
      setAlerts([]);
      return;
    }

    let active = true;

    setAlertsLoading(true);

    getSafetyAlerts(selectedTrip.id)
      .then(({ data, error }) => {
        if (!active) return;

        if (error) {
          Alert.alert("Error", error.message);
          return;
        }

        setAlerts((data ?? []) as SafetyAlert[]);
      })
      .finally(() => {
        if (active) setAlertsLoading(false);
      });

    const channel = subscribeToSafetyAlerts(
      selectedTrip.id,
      async (newAlert) => {
        if (!active) return;

        const senderName = await getSafetyAlertSenderName(newAlert.user_id);

        if (!active) return;

        setAlerts((current) => {
          const updated = [
            {
              ...newAlert,
              sender_name: senderName,
            } as SafetyAlert,
            ...current.filter((item) => item.id !== newAlert.id),
          ];

          return updated;
        });
      },
    );

    return () => {
      active = false;
      void unsubscribeFromSafetyAlerts(channel);
    };
  }, [selectedTrip]);
  return (
    <ScrollView
      style={styles.container}
      contentContainerStyle={{ paddingBottom: 40 }}
      keyboardShouldPersistTaps="handled"
    >
      <Text style={styles.title}>Group Safety Alerts</Text>
      <Text style={styles.subtitle}>
        Select a trip to share safety updates with its members.
      </Text>
      {loading ? (
        <View style={styles.center}>
          <ActivityIndicator size="large" color="#4F8CFF" />
          <Text style={styles.subtitle}>Loading your trips...</Text>
        </View>
      ) : error ? (
        <Text style={styles.error}>{error}</Text>
      ) : trips.length === 0 ? (
        <Text style={styles.subtitle}>
          You haven't joined any active trips yet.
        </Text>
      ) : (
        trips.map((item) => (
          <TouchableOpacity
            key={item.id}
            style={[
              styles.card,
              selectedTrip?.id === item.id && styles.selectedCard,
            ]}
            onPress={() => setSelectedTrip(item)}
          >
            <Text style={styles.tripName}>{item.name}</Text>
            <Text style={styles.subtitle}>📍 {item.destination}</Text>
            <Text style={styles.date}>
              {item.start_date} → {item.end_date}
            </Text>
            <Text style={styles.selectText}>
              {selectedTrip?.id === item.id ? "Selected ✓" : "Select Trip →"}
            </Text>
          </TouchableOpacity>
        ))
      )}

      {selectedTrip && (
        <View style={styles.alertSection}>
          <Text style={styles.selectedTitle}>
            Safety Alerts — {selectedTrip.name}
          </Text>

          <Text style={styles.subtitle}>
            Select an alert to share it with your trip members.
          </Text>

          <View style={styles.alertGrid}>
            {ALERT_TYPES.map((item) => (
              <TouchableOpacity
                key={item.label}
                style={styles.alertButton}
                disabled={sending}
                onPress={() => sendAlert(item.label, item.message)}
              >
                <Text style={styles.alertButtonText}>{item.label}</Text>
              </TouchableOpacity>
            ))}
          </View>
          <Text style={styles.customTitle}>Custom Safety Message</Text>

          <TextInput
            style={styles.customInput}
            placeholder="Describe the road condition or safety update..."
            placeholderTextColor="#858D9D"
            value={customMessage}
            onChangeText={setCustomMessage}
            multiline
            maxLength={250}
          />

          <TouchableOpacity
            style={[styles.sendButton, sending && { opacity: 0.5 }]}
            disabled={sending || !customMessage.trim()}
            onPress={() => sendAlert("Custom", customMessage)}
          >
            <Text style={styles.sendButtonText}>
              {sending ? "Sending..." : "Send Custom Alert"}
            </Text>
          </TouchableOpacity>
        </View>
      )}
      {selectedTrip && (
        <View style={styles.historySection}>
          <Text style={styles.selectedTitle}>Recent Safety Alerts</Text>

          {alertsLoading ? (
            <ActivityIndicator size="small" color="#4F8CFF" />
          ) : alerts.length === 0 ? (
            <Text style={styles.subtitle}>No safety alerts shared yet.</Text>
          ) : (
            alerts.map((item) => (
              <View key={item.id} style={styles.historyCard}>
                <Text style={styles.historyType}>{item.alert_type}</Text>
                <Text style={styles.historySender}>
                  Sent by: {item.sender_name || "Unknown member"}
                </Text>
                <Text style={styles.historyMessage}>{item.message}</Text>

                <Text style={styles.historyDate}>
                  {new Date(item.created_at).toLocaleString("en-IN")}
                </Text>
              </View>
            ))
          )}
        </View>
      )}
    </ScrollView>
  );
}

const styles = StyleSheet.create({
  container: {
    flex: 1,
    backgroundColor: "#08090D",
    padding: 22,
    paddingTop: 35,
  },
  title: {
    color: "#F7F8FC",
    fontSize: 25,
    fontWeight: "800",
  },
  subtitle: {
    color: "#A0A7B5",
    fontSize: 14,
    lineHeight: 21,
    marginTop: 9,
  },
  center: {
    flex: 1,
    justifyContent: "center",
    alignItems: "center",
  },
  list: {
    paddingTop: 20,
    paddingBottom: 25,
  },
  card: {
    backgroundColor: "#151821",
    borderWidth: 1,
    borderColor: "#252A37",
    borderRadius: 15,
    padding: 17,
    marginBottom: 13,
  },
  selectedCard: {
    borderColor: "#4F8CFF",
  },
  tripName: {
    color: "#F7F8FC",
    fontSize: 18,
    fontWeight: "700",
  },
  date: {
    color: "#9299A8",
    marginTop: 7,
    fontSize: 12,
  },
  selectText: {
    color: "#75A2FF",
    fontWeight: "700",
    marginTop: 12,
  },
  selectedInfo: {
    backgroundColor: "#151821",
    borderRadius: 14,
    padding: 16,
    marginBottom: 10,
  },
  selectedTitle: {
    color: "#F7F8FC",
    fontSize: 16,
    fontWeight: "700",
  },
  error: {
    color: "#FF9B9B",
    marginTop: 20,
  },
  alertSection: {
    backgroundColor: "#151821",
    borderRadius: 15,
    padding: 16,
    marginTop: 15,
    marginBottom: 20,
  },
  alertGrid: {
    flexDirection: "row",
    flexWrap: "wrap",
    gap: 10,
    marginTop: 18,
  },
  alertButton: {
    width: "48%",
    backgroundColor: "#293F64",
    borderRadius: 10,
    padding: 14,
    alignItems: "center",
  },
  alertButtonText: {
    color: "#FFFFFF",
    fontWeight: "700",
    fontSize: 13,
  },
  customTitle: {
    color: "#F7F8FC",
    fontSize: 16,
    fontWeight: "700",
    marginTop: 24,
  },
  customInput: {
    backgroundColor: "#08090D",
    color: "#FFFFFF",
    borderWidth: 1,
    borderColor: "#343B4B",
    borderRadius: 10,
    padding: 13,
    minHeight: 90,
    textAlignVertical: "top",
    marginTop: 12,
  },
  sendButton: {
    backgroundColor: "#4F8CFF",
    borderRadius: 10,
    padding: 14,
    alignItems: "center",
    marginTop: 12,
  },
  sendButtonText: {
    color: "#FFFFFF",
    fontWeight: "700",
  },
  historySection: {
    marginTop: 20,
    marginBottom: 30,
  },
  historyCard: {
    backgroundColor: "#151821",
    borderWidth: 1,
    borderColor: "#252A37",
    borderRadius: 12,
    padding: 15,
    marginTop: 12,
  },
  historyType: {
    color: "#75A2FF",
    fontSize: 14,
    fontWeight: "700",
  },
  historyMessage: {
    color: "#F7F8FC",
    fontSize: 15,
    marginTop: 7,
  },
  historyDate: {
    color: "#858D9D",
    fontSize: 11,
    marginTop: 9,
  },
  historySender: {
    color: "#AAB4C5",
    fontSize: 12,
    marginTop: 6,
  },
});
