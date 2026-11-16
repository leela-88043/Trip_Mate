
import { router, useFocusEffect } from "expo-router";
import { useCallback, useState } from "react";
import {
  ActivityIndicator,
  Image,
  Modal,
  SafeAreaView,
  ScrollView,
  StyleSheet,
  Text,
  TouchableOpacity,
  View,
} from "react-native";

import ProfileButton from "@/components/ProfileButton";
import ProfilePanel from "@/components/ProfilePanel";
import NotificationBell from "@/components/NotificationBell";

import { useTripToday } from "@/hooks/useTripToday";
import { supabase } from "@/services/supabase";
import { getMyTrips } from "@/services/trips";
import { isActiveTrip } from "@/utils/tripTimeline";

type Trip = {
  id: string;
  name: string;
  destination: string;
  start_date: string | null;
  end_date: string | null;
};

type Destination = {
  id: string;
  name: string;
  region: string;
  country: string;
  category: string;
  description: string;
  image_url: string | null;
  best_time_to_visit: string | null;
  highlights: string[];
  travel_tips: string[];
};

const MOUNTAIN_PHOTO =
  "https://images.unsplash.com/photo-1464822759023-fed622ff2c3b?auto=format&fit=crop&w=1200&q=80";

const BEACH_PHOTO =
  "https://images.unsplash.com/photo-1507525428034-b723cf961d3e?auto=format&fit=crop&w=1200&q=80";

const NATURE_PHOTO =
  "https://images.unsplash.com/photo-1441974231531-c6227db76b6e?auto=format&fit=crop&w=1200&q=80";

const SCENERY_COLLECTIONS = [
  {
    name: "Mountain Escapes",
    caption: "High peaks. Fresh air. A different perspective.",
    photo: MOUNTAIN_PHOTO,
  },
  {
    name: "Beach Getaways",
    caption: "Golden sand, blue water and slower days.",
    photo: BEACH_PHOTO,
  },
  {
    name: "Forest Trails",
    caption: "Find a little peace beneath the trees.",
    photo: NATURE_PHOTO,
  },
];

function inspirationPhoto(category: string) {
  if (category === "beach") return BEACH_PHOTO;
  if (category === "nature") return NATURE_PHOTO;
  return MOUNTAIN_PHOTO;
}

function SceneryCard({
  scene,
}: {
  scene: (typeof SCENERY_COLLECTIONS)[number];
}) {
  const [failed, setFailed] = useState(false);

  return (
    <TouchableOpacity
      accessibilityRole="button"
      accessibilityLabel={`${scene.name}. Browse destinations in Explore.`}
      style={styles.sceneryCard}
      onPress={() => router.push("/explore")}
    >
      {failed ? (
        <View style={styles.sceneryFallback}>
          <Text style={styles.secondary}>Photo unavailable</Text>
        </View>
      ) : (
        <Image
          source={{ uri: scene.photo }}
          style={styles.sceneryPhoto}
          resizeMode="cover"
          accessibilityLabel={scene.name}
          onError={() => setFailed(true)}
        />
      )}

      <View style={styles.sceneryContent}>
        <Text style={styles.sceneryName}>{scene.name}</Text>
        <Text style={styles.sceneryCaption}>{scene.caption}</Text>
        <Text style={styles.sceneryLink}>
          Find your destination →
        </Text>
      </View>
    </TouchableOpacity>
  );
}

function DestinationCover({
  destination,
}: {
  destination: Destination;
}) {
  const [failedUri, setFailedUri] = useState<string | null>(null);

  const uri =
    destination.image_url?.trim() ||
    inspirationPhoto(destination.category);

  const failed = failedUri === uri;
  const ownPhoto = !!destination.image_url?.trim();

  return (
    <View style={styles.cover}>
      {failed ? (
        <View style={styles.photoPlaceholder}>
          <Text style={styles.photoIcon}>📍</Text>
          <Text style={styles.secondary}>Photo unavailable</Text>
        </View>
      ) : (
        <Image
          source={{ uri }}
          style={styles.photo}
          resizeMode="cover"
          accessibilityLabel={
            ownPhoto
              ? destination.name
              : "Scenic inspiration photograph"
          }
          onError={() => setFailedUri(uri)}
        />
      )}

      {!ownPhoto && !failed && (
        <View style={styles.photoCaption}>
          <Text style={styles.photoCaptionText}>
            Scenic inspiration · Unsplash
          </Text>
        </View>
      )}
    </View>
  );
}

export default function HomeScreen() {
  const today = useTripToday();

  const [fullName, setFullName] = useState("Traveler");
  const [email, setEmail] = useState("");
  const [userId, setUserId] = useState("");

  const [allTrips, setAllTrips] = useState<Trip[]>([]);
  const [destinations, setDestinations] = useState<Destination[]>([]);

  const [selected, setSelected] = useState<Destination | null>(null);

  const [loading, setLoading] = useState(true);
  const [error, setError] = useState("");
  const [destinationError, setDestinationError] = useState("");

  const [profileVisible, setProfileVisible] = useState(false);

  const upcomingTrip =
    allTrips
      .filter(
        (trip) =>
          !!trip.start_date &&
          !!trip.end_date &&
          isActiveTrip(
            {
              start_date: trip.start_date,
              end_date: trip.end_date,
            },
            today
          )
      )
      .sort((a, b) =>
        (a.start_date ?? "").localeCompare(b.start_date ?? "")
      )[0] ?? null;

  const loadDashboard = useCallback(async () => {
    setLoading(true);
    setError("");
    setDestinationError("");
    setAllTrips([]);
    setDestinations([]);

    try {
      const {
        data: { user },
        error: authError,
      } = await supabase.auth.getUser();

      if (authError) {
        throw new Error(authError.message);
      }

      if (!user) {
        setUserId("");
        setFullName("Traveler");
        setEmail("");
        throw new Error("Please log in to view your dashboard.");
      }

      setUserId(user.id);

      setFullName(
        user.user_metadata?.full_name ||
          user.user_metadata?.name ||
          "Traveler"
      );

      setEmail(user.email ?? "");

      const [profileResult, tripsResult, destinationResult] =
        await Promise.allSettled([
          supabase
            .from("profiles")
            .select("full_name, email")
            .eq("id", user.id)
            .maybeSingle(),

          getMyTrips(user.id),

          supabase
            .from("destination_catalog")
            .select(
              "id, name, region, country, category, description, image_url, best_time_to_visit, highlights, travel_tips"
            )
            .order("is_featured", { ascending: false })
            .order("name", { ascending: true })
            .limit(6),
        ]);

      if (profileResult.status === "fulfilled") {
        const {
          data: profile,
          error: profileError,
        } = profileResult.value;

        if (!profileError) {
          if (profile?.full_name) {
            setFullName(profile.full_name);
          }

          setEmail(user.email || profile?.email || "");
        } else {
          console.log("Profile error:", profileError.message);
        }
      }

      if (tripsResult.status === "rejected") {
        setError("Unable to load your trips. Please refresh.");
      } else if (tripsResult.value.error) {
        setError(tripsResult.value.error.message);
      } else {
        const rows =
          (tripsResult.value.data ?? []) as unknown as {
            trips: Trip | Trip[] | null;
          }[];

        const loadedTrips = rows.flatMap((row) => {
          if (!row.trips) return [];

          return Array.isArray(row.trips)
            ? row.trips
            : [row.trips];
        });

        setAllTrips(loadedTrips);
      }

      if (destinationResult.status === "rejected") {
        setDestinationError(
          "Unable to load destinations. Please refresh."
        );
      } else if (destinationResult.value.error) {
        setDestinationError(destinationResult.value.error.message);
      } else {
        const rows =
          (destinationResult.value.data ?? []) as unknown as Destination[];

        setDestinations(
          rows.map((item) => ({
            ...item,
            highlights: item.highlights ?? [],
            travel_tips: item.travel_tips ?? [],
          }))
        );
      }
    } catch (err) {
      setError(
        err instanceof Error
          ? err.message
          : "Unable to load your dashboard."
      );
    } finally {
      setLoading(false);
    }
  }, []);

  useFocusEffect(
    useCallback(() => {
      void loadDashboard();
    }, [loadDashboard])
  );

  function planTrip(destination: Destination) {
    setSelected(null);

    router.push({
      pathname: "/create-trip",
      params: {
        destination: destination.name,
        planningKey: Date.now().toString(),
      },
    });
  }

  if (loading) {
    return (
      <View style={styles.loadingContainer}>
        <ActivityIndicator size="large" color="#4F8CFF" />
        <Text style={styles.secondary}>
          Loading Trip Mate...
        </Text>
      </View>
    );
  }

  return (
    <SafeAreaView style={styles.screen}>
      <ScrollView
        contentContainerStyle={styles.content}
        showsVerticalScrollIndicator={false}
      >
        {/* Dashboard header */}
        <View style={styles.header}>
          <View style={styles.greetingBlock}>
            <Text style={styles.greeting}>
              Welcome back 👋
            </Text>

            <Text style={styles.name} numberOfLines={1}>
              {fullName}
            </Text>
          </View>

          <View style={styles.headerActions}>
            <NotificationBell
              key={userId || "guest"}
              userId={userId}
            />

            <ProfileButton
              fullName={fullName}
              onPress={() => setProfileVisible(true)}
            />
          </View>
        </View>

        {/* Upcoming trip */}
        <View style={styles.sectionHeader}>
          <Text style={styles.sectionTitle}>Your Trip</Text>

          <TouchableOpacity
            accessibilityRole="button"
            onPress={() => router.push("/my-trips")}
          >
            <Text style={styles.link}>View All</Text>
          </TouchableOpacity>
        </View>

        {error ? (
          <View style={styles.tripCard}>
            <Text style={styles.error}>{error}</Text>

            <TouchableOpacity
              accessibilityRole="button"
              onPress={() => void loadDashboard()}
            >
              <Text style={styles.link}>Refresh Dashboard</Text>
            </TouchableOpacity>
          </View>
        ) : upcomingTrip ? (
          <TouchableOpacity
            accessibilityRole="button"
            style={styles.tripCard}
            onPress={() =>
              router.push(
                `/trip-details?tripId=${upcomingTrip.id}`
              )
            }
          >
            <View style={styles.tripTop}>
              <View style={styles.destinationIcon}>
                <Text style={styles.destinationIconText}>📍</Text>
              </View>

              <View style={styles.tripInfo}>
                <Text style={styles.tripName}>
                  {upcomingTrip.name}
                </Text>

                <Text style={styles.secondary}>
                  {upcomingTrip.destination}
                </Text>
              </View>
            </View>

            <View style={styles.divider} />

            <View style={styles.dateRow}>
              <View>
                <Text style={styles.dateLabel}>START</Text>
                <Text style={styles.dateValue}>
                  {upcomingTrip.start_date}
                </Text>
              </View>

              <View>
                <Text style={styles.dateLabel}>END</Text>
                <Text style={styles.dateValue}>
                  {upcomingTrip.end_date}
                </Text>
              </View>
            </View>

            <Text style={styles.viewTrip}>View Trip →</Text>
          </TouchableOpacity>
        ) : (
          <View style={styles.emptyCard}>
            <Text style={styles.emptyIcon}>🧳</Text>
            <Text style={styles.emptyTitle}>No active trips</Text>

            <Text style={styles.emptyText}>
              Create a new trip to plan your next journey.
              Completed trips are available in My Trips.
            </Text>

            <TouchableOpacity
              accessibilityRole="button"
              onPress={() => router.push("/create-trip")}
            >
              <Text style={styles.link}>Plan a Trip →</Text>
            </TouchableOpacity>
          </View>
        )}

        {/* Scenic inspiration */}
        <Text style={styles.eyebrow}>
          A LITTLE INSPIRATION
        </Text>

        <View style={styles.sectionHeader}>
          <Text style={[styles.sectionTitle, styles.escapeTitle]}>
            Find Your Next Escape
          </Text>

          <TouchableOpacity
            accessibilityRole="button"
            onPress={() => router.push("/explore")}
          >
            <Text style={styles.link}>Explore</Text>
          </TouchableOpacity>
        </View>

        <Text style={styles.sectionDescription}>
          Beautiful destinations. New stories.
          Your next trip starts here.
        </Text>

        <ScrollView
          horizontal
          showsHorizontalScrollIndicator={false}
          contentContainerStyle={styles.sceneryRow}
        >
          {SCENERY_COLLECTIONS.map((scene) => (
            <SceneryCard key={scene.name} scene={scene} />
          ))}
        </ScrollView>

        <Text style={styles.sceneryNote}>
          Scenic inspiration · Photos from Unsplash
          {" · Swipe to explore"}
        </Text>

        {/* Destination catalogue */}
        <Text
          style={[styles.sectionTitle, styles.catalogueHeading]}
        >
          Destinations to Discover
        </Text>

        {destinationError ? (
          <View style={styles.tripCard}>
            <Text style={styles.error}>
              {destinationError}
            </Text>

            <TouchableOpacity
              accessibilityRole="button"
              onPress={() => void loadDashboard()}
            >
              <Text style={styles.link}>Retry Destinations</Text>
            </TouchableOpacity>
          </View>
        ) : destinations.length === 0 ? (
          <View style={styles.tripCard}>
            <Text style={styles.secondary}>
              No destinations have been added to the catalogue yet.
            </Text>

            <TouchableOpacity
              accessibilityRole="button"
              onPress={() => router.push("/explore")}
            >
              <Text style={styles.link}>Open Explore →</Text>
            </TouchableOpacity>
          </View>
        ) : (
          destinations.map((destination) => (
            <TouchableOpacity
              key={destination.id}
              accessibilityRole="button"
              accessibilityLabel={`Explore ${destination.name}`}
              style={styles.destinationCard}
              onPress={() => setSelected(destination)}
            >
              <DestinationCover destination={destination} />

              <View style={styles.destinationContent}>
                <Text style={styles.category}>
                  {destination.category.toUpperCase()}
                </Text>

                <Text style={styles.destinationName}>
                  {destination.name}
                </Text>

                <Text style={styles.secondary}>
                  {[destination.region, destination.country]
                    .filter(Boolean)
                    .join(", ")}
                </Text>

                <Text
                  style={styles.destinationDescription}
                  numberOfLines={2}
                >
                  {destination.description}
                </Text>

                <Text style={styles.viewTrip}>
                  Discover this destination →
                </Text>
              </View>
            </TouchableOpacity>
          ))
        )}

        {/* Group 3 feature introduction */}
        <Text style={styles.featureSectionTitle}>
          Trip Mate Features
        </Text>

        <View style={styles.featureCard}>
          <Text style={styles.featureIcon}>👥</Text>

          <View style={styles.featureContent}>
            <Text style={styles.featureTitle}>
              Travel Together
            </Text>

            <Text style={styles.featureText}>
              Find people travelling to the same destination
              and connect with your travel group.
            </Text>
          </View>
        </View>

        <View style={styles.featureCard}>
          <Text style={styles.featureIcon}>💰</Text>

          <View style={styles.featureContent}>
            <Text style={styles.featureTitle}>
              Trip Expense Management
            </Text>

            <Text style={styles.featureText}>
              Manage your trip budget, track shared expenses
              and monitor individual spending.
            </Text>
          </View>
        </View>

        <View style={styles.featureCard}>
          <Text style={styles.featureIcon}>⚠️</Text>

          <View style={styles.featureContent}>
            <Text style={styles.featureTitle}>
              Route & Safety Alerts
            </Text>

            <Text style={styles.featureText}>
              Share road conditions, hazards, accidents and
              important safety updates with your trip members.
            </Text>
          </View>
        </View>
      </ScrollView>

      {/* Profile panel */}
      <ProfilePanel
        visible={profileVisible}
        fullName={fullName}
        email={email}
        onClose={() => setProfileVisible(false)}
      />

      {/* Destination details modal */}
      <Modal
        visible={selected !== null}
        transparent
        animationType="slide"
        onRequestClose={() => setSelected(null)}
      >
        <View style={styles.backdrop}>
          <View
            style={styles.modalCard}
            accessibilityViewIsModal
          >
            <View style={styles.modalHeader}>
              <Text style={styles.sectionTitle}>
                Your Next Escape
              </Text>

              <TouchableOpacity
                accessibilityRole="button"
                onPress={() => setSelected(null)}
              >
                <Text style={styles.link}>Close</Text>
              </TouchableOpacity>
            </View>

            {selected && (
              <ScrollView
                contentContainerStyle={styles.modalContent}
              >
                <DestinationCover destination={selected} />

                <Text style={styles.detailTitle}>
                  {selected.name}
                </Text>

                <Text style={styles.secondary}>
                  {[selected.region, selected.country]
                    .filter(Boolean)
                    .join(", ")}
                </Text>

                <Text style={styles.body}>
                  {selected.description}
                </Text>

                <Text style={styles.detailHeading}>
                  Best Time to Visit
                </Text>

                <Text style={styles.body}>
                  {selected.best_time_to_visit ||
                    "Not specified yet."}
                </Text>

                <Text style={styles.detailHeading}>
                  Highlights
                </Text>

                {selected.highlights.length > 0 ? (
                  selected.highlights.map((item, index) => (
                    <Text key={index} style={styles.body}>
                      • {item}
                    </Text>
                  ))
                ) : (
                  <Text style={styles.secondary}>
                    No highlights added yet.
                  </Text>
                )}

                <Text style={styles.detailHeading}>
                  Travel Tips
                </Text>

                {selected.travel_tips.length > 0 ? (
                  selected.travel_tips.map((item, index) => (
                    <Text key={index} style={styles.body}>
                      • {item}
                    </Text>
                  ))
                ) : (
                  <Text style={styles.secondary}>
                    No travel tips added yet.
                  </Text>
                )}

                <TouchableOpacity
                  accessibilityRole="button"
                  style={styles.primaryButton}
                  onPress={() => planTrip(selected)}
                >
                  <Text style={styles.buttonText}>
                    Plan a Trip Here
                  </Text>
                </TouchableOpacity>
              </ScrollView>
            )}
          </View>
        </View>
      </Modal>
    </SafeAreaView>
  );
}

const styles = StyleSheet.create({
  screen: {
    flex: 1,
    backgroundColor: "#08090D",
  },
  content: {
    padding: 24,
    paddingBottom: 48,
  },
  loadingContainer: {
    flex: 1,
    justifyContent: "center",
    alignItems: "center",
    backgroundColor: "#08090D",
  },
  header: {
    flexDirection: "row",
    justifyContent: "space-between",
    alignItems: "center",
    marginBottom: 28,
  },
  greetingBlock: {
    flex: 1,
    marginRight: 12,
  },
  headerActions: {
    flexDirection: "row",
    alignItems: "center",
  },
  greeting: {
    color: "#9299A8",
    fontSize: 14,
  },
  name: {
    fontSize: 25,
    fontWeight: "700",
    color: "#F7F8FC",
    marginTop: 5,
  },
  sectionHeader: {
    flexDirection: "row",
    alignItems: "center",
    justifyContent: "space-between",
    marginBottom: 12,
  },
  sectionTitle: {
    fontSize: 20,
    fontWeight: "700",
    color: "#F7F8FC",
  },
  escapeTitle: {
    flex: 1,
    marginRight: 10,
  },
  link: {
    color: "#75A2FF",
    fontWeight: "700",
    paddingVertical: 8,
  },
  secondary: {
    color: "#9299A8",
    fontSize: 14,
    marginTop: 7,
    lineHeight: 21,
  },
  tripCard: {
    backgroundColor: "#151821",
    borderRadius: 18,
    padding: 20,
    marginBottom: 28,
    borderWidth: 1,
    borderColor: "#252A37",
  },
  tripTop: {
    flexDirection: "row",
    alignItems: "center",
  },
  destinationIcon: {
    width: 52,
    height: 52,
    borderRadius: 18,
    backgroundColor: "#202D49",
    justifyContent: "center",
    alignItems: "center",
  },
  destinationIconText: {
    fontSize: 23,
  },
  tripInfo: {
    marginLeft: 14,
    flex: 1,
  },
  tripName: {
    fontSize: 19,
    fontWeight: "700",
    color: "#F7F8FC",
  },
  divider: {
    height: 1,
    backgroundColor: "#252A37",
    marginVertical: 18,
  },
  dateRow: {
    flexDirection: "row",
    justifyContent: "space-between",
  },
  dateLabel: {
    fontSize: 11,
    fontWeight: "700",
    color: "#858D9D",
  },
  dateValue: {
    fontSize: 14,
    color: "#D9DDE7",
    marginTop: 4,
  },
  viewTrip: {
    color: "#75A2FF",
    fontSize: 14,
    fontWeight: "700",
    marginTop: 18,
  },
  emptyCard: {
    backgroundColor: "#151821",
    borderRadius: 18,
    padding: 25,
    alignItems: "center",
    marginBottom: 28,
    borderWidth: 1,
    borderColor: "#252A37",
  },
  emptyIcon: {
    fontSize: 40,
  },
  emptyTitle: {
    fontSize: 19,
    fontWeight: "700",
    color: "#F7F8FC",
    marginTop: 10,
  },
  emptyText: {
    textAlign: "center",
    color: "#9299A8",
    marginTop: 6,
    lineHeight: 21,
  },
  eyebrow: {
    color: "#75A2FF",
    fontSize: 10,
    fontWeight: "800",
    letterSpacing: 2,
    marginBottom: 10,
  },
  sectionDescription: {
    color: "#9299A8",
    lineHeight: 21,
    marginBottom: 20,
  },
  sceneryRow: {
    paddingBottom: 8,
    paddingRight: 8,
  },
  sceneryCard: {
    width: 270,
    height: 340,
    borderRadius: 22,
    overflow: "hidden",
    backgroundColor: "#202D49",
    marginRight: 14,
    borderWidth: 1,
    borderColor: "#354056",
  },
  sceneryPhoto: {
    position: "absolute",
    width: "100%",
    height: "100%",
  },
  sceneryFallback: {
    flex: 1,
    alignItems: "center",
    justifyContent: "center",
  },
  sceneryContent: {
    position: "absolute",
    left: 0,
    right: 0,
    bottom: 0,
    backgroundColor: "rgba(5,10,18,0.78)",
    padding: 20,
  },
  sceneryName: {
    color: "#FFFFFF",
    fontSize: 24,
    fontWeight: "800",
  },
  sceneryCaption: {
    color: "#D5DDEA",
    lineHeight: 20,
    marginTop: 7,
    fontSize: 13,
  },
  sceneryLink: {
    color: "#A9C5FF",
    fontWeight: "700",
    marginTop: 14,
    fontSize: 13,
  },
  sceneryNote: {
    color: "#9299A8",
    fontSize: 11,
    marginTop: 6,
    lineHeight: 18,
  },
  catalogueHeading: {
    marginTop: 28,
    marginBottom: 18,
  },
  destinationCard: {
    borderRadius: 22,
    backgroundColor: "#151821",
    borderWidth: 1,
    borderColor: "#252A37",
    overflow: "hidden",
    marginBottom: 20,
  },
  cover: {
    height: 220,
    backgroundColor: "#202D49",
    overflow: "hidden",
  },
  photo: {
    width: "100%",
    height: "100%",
  },
  photoPlaceholder: {
    flex: 1,
    alignItems: "center",
    justifyContent: "center",
  },
  photoIcon: {
    fontSize: 34,
  },
  photoCaption: {
    position: "absolute",
    bottom: 10,
    right: 10,
    backgroundColor: "rgba(0,0,0,0.65)",
    paddingVertical: 4,
    paddingHorizontal: 8,
    borderRadius: 6,
  },
  photoCaptionText: {
    color: "#FFFFFF",
    fontSize: 10,
  },
  destinationContent: {
    padding: 20,
  },
  category: {
    color: "#A9C5FF",
    fontSize: 10,
    letterSpacing: 1.5,
    fontWeight: "800",
  },
  destinationName: {
    color: "#F7F8FC",
    fontSize: 26,
    fontWeight: "800",
    marginTop: 8,
  },
  destinationDescription: {
    color: "#BCC3D0",
    lineHeight: 21,
    marginTop: 10,
  },
  error: {
    color: "#FF9B9B",
    lineHeight: 21,
  },
  featureSectionTitle: {
    fontSize: 20,
    fontWeight: "700",
    color: "#F7F8FC",
    marginTop: 28,
    marginBottom: 14,
  },
  featureCard: {
    backgroundColor: "#151821",
    borderRadius: 16,
    padding: 18,
    flexDirection: "row",
    marginBottom: 12,
    borderWidth: 1,
    borderColor: "#252A37",
  },
  featureIcon: {
    fontSize: 28,
    marginRight: 15,
  },
  featureContent: {
    flex: 1,
  },
  featureTitle: {
    fontSize: 15,
    fontWeight: "700",
    color: "#F7F8FC",
  },
  featureText: {
    fontSize: 13,
    color: "#9299A8",
    lineHeight: 19,
    marginTop: 5,
  },
  backdrop: {
    flex: 1,
    backgroundColor: "rgba(0,0,0,0.75)",
    padding: 20,
    justifyContent: "center",
    alignItems: "center",
  },
  modalCard: {
    width: "100%",
    maxWidth: 600,
    maxHeight: "90%",
    backgroundColor: "#151821",
    borderRadius: 20,
    overflow: "hidden",
  },
  modalHeader: {
    flexDirection: "row",
    justifyContent: "space-between",
    alignItems: "center",
    padding: 18,
  },
  modalContent: {
    padding: 18,
    paddingBottom: 30,
  },
  detailTitle: {
    color: "#F7F8FC",
    fontSize: 28,
    fontWeight: "800",
    marginTop: 20,
  },
  detailHeading: {
    color: "#F7F8FC",
    fontSize: 17,
    fontWeight: "700",
    marginTop: 24,
  },
  body: {
    color: "#BCC3D0",
    lineHeight: 22,
    marginTop: 10,
  },
  primaryButton: {
    backgroundColor: "#4F8CFF",
    padding: 16,
    borderRadius: 12,
    alignItems: "center",
    marginTop: 24,
  },
  buttonText: {
    color: "#FFFFFF",
    fontSize: 16,
    fontWeight: "700",
  },
});
