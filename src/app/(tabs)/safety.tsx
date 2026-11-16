import { Ionicons } from "@expo/vector-icons";
import { router } from "expo-router";
import {
  SafeAreaView,
  ScrollView,
  StyleSheet,
  Text,
  TouchableOpacity,
  View,
} from "react-native";

export default function SafetyScreen() {
  return (
    <SafeAreaView style={styles.screen}>
      <ScrollView contentContainerStyle={styles.container}>
        <Text style={styles.title}>Trip Safety</Text>

        <Text style={styles.subtitle}>
          Your safety matters throughout your journey.
        </Text>

        {/* Safety Introduction at the Top */}
        <View style={styles.infoCard}>
          <Ionicons name="shield-checkmark" size={25} color="#4F8CFF" />
          <Text style={styles.infoTitle}>Travel Safely</Text>
          <Text style={styles.infoText}>
            Keep emergency contacts accessible and stay prepared throughout your
            trip.
          </Text>
        </View>

        {/* Safety Services */}
        <View style={styles.section}>
          <Text style={styles.sectionTitle}>Safety Services</Text>

          <TouchableOpacity
            style={styles.card}
            onPress={() => router.push("/emergency-contacts")}
            activeOpacity={0.8}
          >
            <View style={styles.iconContainer}>
              <Ionicons name="call" size={25} color="#4F8CFF" />
            </View>

            <View style={styles.cardContent}>
              <Text style={styles.cardTitle}>Emergency Contacts</Text>
              <Text style={styles.cardDescription}>
                Quickly access important emergency numbers.
              </Text>
            </View>

            <Ionicons name="chevron-forward" size={22} color="#858D9D" />
          </TouchableOpacity>

          <TouchableOpacity
            style={styles.card}
            onPress={() => router.push("/safety-alerts")}
            activeOpacity={0.8}
          >
            <View style={styles.iconContainer}>
              <Ionicons name="warning-outline" size={25} color="#4F8CFF" />
            </View>

            <View style={styles.cardContent}>
              <Text style={styles.cardTitle}>Group Safety Alerts</Text>
              <Text style={styles.cardDescription}>
                Share road conditions, hazards and travel warnings with trip
                members.
              </Text>
            </View>

            <Ionicons name="chevron-forward" size={22} color="#858D9D" />
          </TouchableOpacity>
        </View>
      </ScrollView>
    </SafeAreaView>
  );
}

const styles = StyleSheet.create({
  screen: {
    flex: 1,
    backgroundColor: "#08090D",
  },
  container: {
    paddingHorizontal: 28,
    paddingTop: 20,
    paddingBottom: 40,
  },
  title: {
    fontSize: 28,
    fontWeight: "800",
    color: "#F7F8FC",
  },
  subtitle: {
    fontSize: 15,
    color: "#A0A7B5",
    marginTop: 10,
    lineHeight: 22,
  },
  section: {
    marginTop: 32,
  },
  sectionTitle: {
    fontSize: 18,
    fontWeight: "700",
    color: "#F7F8FC",
    marginBottom: 15,
  },
  card: {
    backgroundColor: "#151821",
    borderRadius: 15,
    borderWidth: 1,
    borderColor: "#252A37",
    padding: 17,
    flexDirection: "row",
    alignItems: "center",
  },
  iconContainer: {
    width: 48,
    height: 48,
    borderRadius: 12,
    backgroundColor: "#172B49",
    justifyContent: "center",
    alignItems: "center",
  },
  cardContent: {
    flex: 1,
    marginLeft: 14,
    marginRight: 8,
  },
  cardTitle: {
    color: "#F7F8FC",
    fontSize: 16,
    fontWeight: "700",
  },
  cardDescription: {
    color: "#A0A7B5",
    fontSize: 12,
    marginTop: 5,
    lineHeight: 18,
  },
  infoCard: {
    backgroundColor: "#151E31",
    borderColor: "#263B61",
    borderWidth: 1,
    borderRadius: 15,
    padding: 18,
    marginTop: 25,
    alignItems: "center",
  },
  infoTitle: {
    color: "#F7F8FC",
    fontSize: 16,
    fontWeight: "700",
    marginTop: 10,
  },
  infoText: {
    color: "#A0A7B5",
    fontSize: 13,
    lineHeight: 20,
    textAlign: "center",
    marginTop: 7,
  },
});
