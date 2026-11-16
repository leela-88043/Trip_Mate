import { supabase } from "./supabase";

export async function createSafetyAlert(
  tripId: string,
  alertType: string,
  message: string,
) {
  const {
    data: { user },
  } = await supabase.auth.getUser();

  if (!user) {
    return {
      data: null,
      error: new Error("You must be logged in to send a safety alert."),
    };
  }

  const { data, error } = await supabase
    .from("safety_alerts")
    .insert({
      trip_id: tripId,
      user_id: user.id,
      alert_type: alertType,
      message,
    })
    .select()
    .single();

  return { data, error };
}

export async function getSafetyAlerts(tripId: string) {
  const { data: alerts, error } = await supabase
    .from("safety_alerts")
    .select("*")
    .eq("trip_id", tripId)
    .order("created_at", { ascending: false });

  if (error) return { data: null, error };

  if (!alerts || alerts.length === 0) {
    return { data: [], error: null };
  }

  const userIds = [...new Set(alerts.map((alert) => alert.user_id))];

  const { data: profiles, error: profileError } = await supabase
    .from("profiles")
    .select("id, full_name")
    .in("id", userIds);

  if (profileError) return { data: null, error: profileError };

  const enrichedAlerts = alerts.map((alert) => ({
    ...alert,
    sender_name:
      profiles?.find((profile) => profile.id === alert.user_id)?.full_name ||
      "Unknown member",
  }));

  return { data: enrichedAlerts, error: null };
}
export function subscribeToSafetyAlerts(
  tripId: string,
  onNewAlert: (alert: any) => void,
) {
  const channel = supabase
    .channel(`safety-alerts-${tripId}`)
    .on(
      "postgres_changes",
      {
        event: "INSERT",
        schema: "public",
        table: "safety_alerts",
        filter: `trip_id=eq.${tripId}`,
      },
      (payload) => {
        console.log("New Safety Alert received:", payload.new);
        onNewAlert(payload.new);
      },
    )
    .subscribe((status) => {
      console.log("Safety Alerts Realtime status:", status);
    });

  return channel;
}

export async function unsubscribeFromSafetyAlerts(channel: any) {
  await supabase.removeChannel(channel);
}
export async function getSafetyAlertSenderName(userId: string) {
  const { data, error } = await supabase
    .from("profiles")
    .select("full_name")
    .eq("id", userId)
    .single();

  if (error) {
    console.log("Unable to fetch sender name:", error.message);
    return "Unknown member";
  }

  return data?.full_name || "Unknown member";
}
