import {
    Alert,
    Linking,
    ScrollView,
    StyleSheet,
    Text,
    TouchableOpacity,
    View,
} from "react-native";

const emergencyContacts = [
  {
    title: "National Emergency Helpline",
    description: "Police, fire and medical emergencies",
    number: "112",
  },
  {
    title: "Ambulance",
    description: "Medical emergencies",
    number: "108",
  },
  {
    title: "Fire Service",
    description: "Fire-related emergencies",
    number: "101",
  },
  {
    title: "Women Helpline",
    description: "Assistance for women in distress",
    number: "181",
  },
];

export default function EmergencyContactsScreen() {
  const handleCall = (number: string) => {
    Alert.alert("Make Emergency Call", `Do you want to call ${number}?`, [
      { text: "Cancel", style: "cancel" },
      {
        text: "Call",
        onPress: async () => {
          try {
            await Linking.openURL(`tel:${number}`);
          } catch {
            Alert.alert(
              "Unable to Call",
              "Your device could not open the phone app.",
            );
          }
        },
      },
    ]);
  };

  return (
    <ScrollView style={styles.screen} contentContainerStyle={styles.container}>
      <Text style={styles.heading}>Emergency Contacts</Text>
      <Text style={styles.subtitle}>
        Important emergency numbers to help you during your trip.
      </Text>

      <View style={styles.notice}>
        <Text style={styles.noticeText}>
          In an emergency, call 112 for immediate assistance.
        </Text>
      </View>

      {emergencyContacts.map((contact) => (
        <View key={contact.number} style={styles.card}>
          <View style={styles.contactInfo}>
            <Text style={styles.contactTitle}>{contact.title}</Text>
            <Text style={styles.description}>{contact.description}</Text>
            <Text style={styles.number}>{contact.number}</Text>
          </View>

          <TouchableOpacity
            style={styles.callButton}
            onPress={() => handleCall(contact.number)}
          >
            <Text style={styles.callButtonText}>Call</Text>
          </TouchableOpacity>
        </View>
      ))}

      <Text style={styles.footer}>
        Emergency numbers and availability may vary by location. Use 112 as the
        primary national emergency number in India.
      </Text>
    </ScrollView>
  );
}

const styles = StyleSheet.create({
  screen: {
    flex: 1,
    backgroundColor: "#000000",
  },
  container: {
    padding: 20,
    paddingBottom: 40,
  },
  heading: {
    color: "#FFFFFF",
    fontSize: 25,
    fontWeight: "bold",
    marginBottom: 8,
  },
  subtitle: {
    color: "#A3A3A3",
    fontSize: 14,
    lineHeight: 21,
    marginBottom: 20,
  },
  notice: {
    backgroundColor: "#172B49",
    borderRadius: 10,
    padding: 15,
    marginBottom: 20,
  },
  noticeText: {
    color: "#93C5FD",
    fontSize: 14,
    fontWeight: "600",
  },
  card: {
    backgroundColor: "#171717",
    borderRadius: 12,
    padding: 16,
    marginBottom: 14,
    flexDirection: "row",
    alignItems: "center",
    justifyContent: "space-between",
  },
  contactInfo: {
    flex: 1,
    paddingRight: 10,
  },
  contactTitle: {
    color: "#FFFFFF",
    fontSize: 16,
    fontWeight: "600",
    marginBottom: 5,
  },
  description: {
    color: "#A3A3A3",
    fontSize: 12,
    marginBottom: 8,
  },
  number: {
    color: "#60A5FA",
    fontSize: 20,
    fontWeight: "bold",
  },
  callButton: {
    backgroundColor: "#0866FF",
    paddingVertical: 10,
    paddingHorizontal: 22,
    borderRadius: 8,
  },
  callButtonText: {
    color: "#FFFFFF",
    fontWeight: "600",
    fontSize: 14,
  },
  footer: {
    color: "#737373",
    fontSize: 12,
    lineHeight: 18,
    marginTop: 12,
  },
});
