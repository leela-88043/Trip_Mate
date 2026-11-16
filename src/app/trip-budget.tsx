import { createTripExpense, deleteTripExpense } from "@/services/expenses";
import { supabase } from "@/services/supabase";
import {
    createTripBudget,
    getMemberBudgets,
    getTripBudget,
} from "@/services/tripBudget";
import { useFocusEffect, useLocalSearchParams } from "expo-router";
import { useCallback, useState } from "react";
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

type Expense = {
  id: string;
  description: string;
  amount: number;
  category: string | null;
  paid_by: string | null;
  created_at: string;
};

type Participant = {
  user_id: string;
  profiles:
    | {
        full_name: string | null;
      }[]
    | null;
};

const CATEGORIES = ["Travel", "Fuel", "Accommodation", "Other"];

export default function TripBudgetScreen() {
  const { tripId } = useLocalSearchParams<{ tripId: string }>();

  const [loading, setLoading] = useState(true);
  const [saving, setSaving] = useState(false);
  const [currentUserId, setCurrentUserId] = useState("");
  const [isOwner, setIsOwner] = useState(false);

  const [budget, setBudget] = useState<any>(null);
  const [memberBudget, setMemberBudget] = useState<any>(null);

  const [totalBudget, setTotalBudget] = useState("");
  const [expenses, setExpenses] = useState<Expense[]>([]);
  const [participants, setParticipants] = useState<Participant[]>([]);
  const [selectedParticipants, setSelectedParticipants] = useState<string[]>(
    [],
  );

  const [mySpent, setMySpent] = useState(0);
  const [showExpenseForm, setShowExpenseForm] = useState(false);

  const [description, setDescription] = useState("");
  const [amount, setAmount] = useState("");
  const [category, setCategory] = useState("Other");

  const loadBudget = useCallback(async () => {
    if (!tripId) {
      setLoading(false);
      return;
    }

    setLoading(true);

    try {
      const {
        data: { user },
      } = await supabase.auth.getUser();

      if (!user) {
        setLoading(false);
        return;
      }

      setCurrentUserId(user.id);

      const { data: trip } = await supabase
        .from("trips")
        .select("created_by")
        .eq("id", String(tripId))
        .maybeSingle();

      setIsOwner(trip?.created_by === user.id);

      const [
        budgetResult,
        memberBudgetResult,
        membersResult,
        expensesResult,
        splitsResult,
      ] = await Promise.all([
        getTripBudget(String(tripId)),
        getMemberBudgets(String(tripId)),
        supabase
          .from("trip_members")
          .select("user_id")
          .eq("trip_id", String(tripId)),
        supabase
          .from("expenses")
          .select("id, description, amount, category, paid_by, created_at")
          .eq("trip_id", String(tripId))
          .order("created_at", { ascending: false }),
        supabase
          .from("expense_splits")
          .select("user_id, share_amount, expenses!inner(trip_id)")
          .eq("user_id", user.id)
          .eq("expenses.trip_id", String(tripId)),
      ]);

      if (budgetResult.error) {
        Alert.alert("Budget Error", budgetResult.error.message);
      } else {
        setBudget(budgetResult.data);
      }

      if (memberBudgetResult.error) {
        Alert.alert("Allowance Error", memberBudgetResult.error.message);
      } else {
        setMemberBudget(
          memberBudgetResult.data?.find((item) => item.user_id === user.id) ??
            null,
        );
      }

      if (membersResult.error) {
        Alert.alert("Members Error", membersResult.error.message);
      } else {
        const memberIds = (membersResult.data ?? []).map(
          (member) => member.user_id,
        );

        const { data: profilesData, error: profilesError } = await supabase
          .from("profiles")
          .select("id, full_name")
          .in("id", memberIds);

        if (profilesError) {
          Alert.alert("Profiles Error", profilesError.message);
        } else {
          const memberList: Participant[] = memberIds.map((userId) => ({
            user_id: userId,
            profiles: (profilesData ?? [])
              .filter((profile) => profile.id === userId)
              .map((profile) => ({ full_name: profile.full_name })),
          }));

          setParticipants(memberList);
          setSelectedParticipants(memberIds);
        }
      }

      if (expensesResult.error) {
        Alert.alert("Expenses Error", expensesResult.error.message);
      } else {
        setExpenses((expensesResult.data ?? []) as Expense[]);
      }

      if (splitsResult.error) {
        Alert.alert("Expense Split Error", splitsResult.error.message);
      } else {
        const spent = (splitsResult.data ?? []).reduce(
          (sum: number, item: any) => sum + Number(item.share_amount),
          0,
        );
        setMySpent(spent);
      }
    } catch (error: any) {
      Alert.alert("Error", error.message || "Unable to load trip budget.");
    } finally {
      setLoading(false);
    }
  }, [tripId]);

  useFocusEffect(
    useCallback(() => {
      void loadBudget();
    }, [loadBudget]),
  );

  const handleCreateBudget = async () => {
    const value = Number(totalBudget);

    if (!Number.isFinite(value) || value <= 0) {
      Alert.alert("Invalid Budget", "Enter a valid budget greater than zero.");
      return;
    }

    setSaving(true);

    const { error } = await createTripBudget(String(tripId), value);

    setSaving(false);

    if (error) {
      Alert.alert("Budget Setup Failed", error.message);
      return;
    }

    Alert.alert("Success", "Initial trip budget created.");
    setTotalBudget("");
    await loadBudget();
  };
  const handleDeleteExpense = (expenseId: string) => {
    Alert.alert(
      "Delete Expense",
      "Are you sure you want to delete this expense? This will also remove its expense splits.",
      [
        {
          text: "Cancel",
          style: "cancel",
        },
        {
          text: "Delete",
          style: "destructive",
          onPress: async () => {
            const { error } = await deleteTripExpense(expenseId);

            if (error) {
              Alert.alert("Delete Failed", error.message);
              return;
            }

            Alert.alert("Success", "Expense deleted successfully.");
            await loadBudget();
          },
        },
      ],
    );
  };
  const toggleParticipant = (userId: string) => {
    setSelectedParticipants((current) =>
      current.includes(userId)
        ? current.filter((id) => id !== userId)
        : [...current, userId],
    );
  };

  const handleAddExpense = async () => {
    const numericAmount = Number(amount);

    if (!description.trim()) {
      Alert.alert("Missing Description", "Enter an expense description.");
      return;
    }

    if (!Number.isFinite(numericAmount) || numericAmount <= 0) {
      Alert.alert("Invalid Amount", "Enter a valid amount.");
      return;
    }

    if (selectedParticipants.length === 0) {
      Alert.alert("Select Participants", "Choose at least one participant.");
      return;
    }

    setSaving(true);

    const { error } = await createTripExpense(
      String(tripId),
      description.trim(),
      numericAmount,
      category,
      selectedParticipants,
    );

    setSaving(false);

    if (error) {
      Alert.alert("Expense Failed", error.message);
      return;
    }

    Alert.alert("Success", "Expense added and split successfully.");

    setDescription("");
    setAmount("");
    setCategory("Other");
    setShowExpenseForm(false);

    await loadBudget();
  };

  if (loading) {
    return (
      <View style={styles.center}>
        <ActivityIndicator size="large" color="#0866FF" />
        <Text style={styles.secondaryText}>Loading trip budget...</Text>
      </View>
    );
  }

  const initialAllowance = Number(memberBudget?.initial_allowance ?? 0);
  const myRemaining = initialAllowance - mySpent;

  const memberCount = participants.length;
  const extraMembers = Math.max(
    0,
    memberCount - Number(budget?.initial_member_count ?? 0),
  );

  const groupBudget = budget
    ? Number(budget.total_initial_budget) +
      extraMembers * Number(budget.per_member_allowance)
    : 0;

  const groupSpent = expenses.reduce(
    (sum, expense) => sum + Number(expense.amount),
    0,
  );

  const groupRemaining = groupBudget - groupSpent;

  return (
    <ScrollView
      style={styles.screen}
      contentContainerStyle={styles.container}
      keyboardShouldPersistTaps="handled"
    >
      <Text style={styles.title}>Trip Budget & Expenses</Text>
      <Text style={{ color: "#FFFFFF", marginBottom: 12 }}>
        Owner: {isOwner ? "Yes" : "No"} | Budget:{" "}
        {budget ? "Created" : "Not created"}
      </Text>

      {!budget ? (
        <View style={styles.card}>
          <Text style={styles.sectionTitle}>Initial Trip Budget</Text>

          {isOwner ? (
            <>
              <Text style={styles.secondaryText}>
                Set the initial total budget. It will be divided equally among
                the current trip members.
              </Text>

              <TextInput
                style={styles.input}
                placeholder="Enter total budget (₹)"
                placeholderTextColor="#888888"
                keyboardType="decimal-pad"
                value={totalBudget}
                onChangeText={setTotalBudget}
              />

              <TouchableOpacity
                style={styles.primaryButton}
                onPress={handleCreateBudget}
                disabled={saving}
              >
                {saving ? (
                  <ActivityIndicator color="#FFFFFF" />
                ) : (
                  <Text style={styles.buttonText}>Set Initial Budget</Text>
                )}
              </TouchableOpacity>
            </>
          ) : (
            <Text style={styles.secondaryText}>
              The trip owner has not set the initial budget yet.
            </Text>
          )}
        </View>
      ) : (
        <>
          <View style={styles.card}>
            <Text style={styles.sectionTitle}>Group Budget</Text>

            <Text style={styles.amount}>₹{groupBudget.toFixed(2)}</Text>

            <Text style={styles.secondaryText}>Total allocated budget</Text>

            <View style={styles.divider} />

            <View style={styles.statRow}>
              <Text style={styles.secondaryText}>Total group expenses</Text>
              <Text style={styles.statValue}>₹{groupSpent.toFixed(2)}</Text>
            </View>

            <View style={styles.statRow}>
              <Text style={styles.secondaryText}>Remaining group budget</Text>
              <Text style={styles.remainingValue}>
                ₹{groupRemaining.toFixed(2)}
              </Text>
            </View>

            <Text style={styles.secondaryText}>
              Current trip members: {memberCount}
            </Text>
          </View>

          <View style={styles.card}>
            <Text style={styles.sectionTitle}>Your Allowance</Text>

            {memberBudget ? (
              <>
                <Text style={styles.amount}>
                  ₹{initialAllowance.toFixed(2)}
                </Text>

                <View style={styles.statRow}>
                  <Text style={styles.secondaryText}>Your expense shares</Text>
                  <Text style={styles.statValue}>₹{mySpent.toFixed(2)}</Text>
                </View>

                <View style={styles.statRow}>
                  <Text style={styles.secondaryText}>
                    Your remaining allowance
                  </Text>
                  <Text style={styles.remainingValue}>
                    ₹{myRemaining.toFixed(2)}
                  </Text>
                </View>
              </>
            ) : (
              <Text style={styles.secondaryText}>
                Your allowance has not been allocated yet.
              </Text>
            )}
          </View>

          {isOwner && (
            <TouchableOpacity
              style={styles.primaryButton}
              onPress={() => setShowExpenseForm((current) => !current)}
            >
              <Text style={styles.buttonText}>
                {showExpenseForm ? "Cancel" : "+ Add Expense"}
              </Text>
            </TouchableOpacity>
          )}

          {showExpenseForm && isOwner && (
            <View style={styles.card}>
              <Text style={styles.sectionTitle}>Add Common Expense</Text>

              <Text style={styles.fieldLabel}>Description</Text>
              <TextInput
                style={styles.input}
                placeholder="e.g. Hotel booking"
                placeholderTextColor="#888888"
                value={description}
                onChangeText={setDescription}
              />

              <Text style={styles.fieldLabel}>Amount (₹)</Text>
              <TextInput
                style={styles.input}
                placeholder="Enter amount"
                placeholderTextColor="#888888"
                keyboardType="decimal-pad"
                value={amount}
                onChangeText={setAmount}
              />

              <Text style={styles.fieldLabel}>Category</Text>
              <View style={styles.categoryContainer}>
                {CATEGORIES.map((item) => (
                  <TouchableOpacity
                    key={item}
                    style={[
                      styles.categoryButton,
                      category === item && styles.selectedCategory,
                    ]}
                    onPress={() => setCategory(item)}
                  >
                    <Text
                      style={[
                        styles.categoryText,
                        category === item && styles.selectedCategoryText,
                      ]}
                    >
                      {item}
                    </Text>
                  </TouchableOpacity>
                ))}
              </View>

              <Text style={styles.fieldLabel}>Split among</Text>

              {participants.map((member) => (
                <TouchableOpacity
                  key={member.user_id}
                  style={styles.participantRow}
                  onPress={() => toggleParticipant(member.user_id)}
                >
                  <Text style={styles.participantText}>
                    {member.user_id === currentUserId
                      ? "You"
                      : member.profiles?.[0]?.full_name || "Unknown Member"}
                  </Text>

                  <Text style={styles.checkbox}>
                    {selectedParticipants.includes(member.user_id) ? "☑" : "☐"}
                  </Text>
                </TouchableOpacity>
              ))}

              <Text style={styles.secondaryText}>
                Each selected participant will receive an equal share.
              </Text>

              <TouchableOpacity
                style={styles.primaryButton}
                onPress={handleAddExpense}
                disabled={saving}
              >
                {saving ? (
                  <ActivityIndicator color="#FFFFFF" />
                ) : (
                  <Text style={styles.buttonText}>Save Expense</Text>
                )}
              </TouchableOpacity>
            </View>
          )}

          <View style={styles.historyHeader}>
            <Text style={styles.sectionTitle}>Expense History</Text>
            <Text style={styles.secondaryText}>{expenses.length} expenses</Text>
          </View>

          {expenses.length === 0 ? (
            <View style={styles.card}>
              <Text style={styles.emptyText}>No expenses recorded yet.</Text>
            </View>
          ) : (
            expenses.map((expense) => (
              <View key={expense.id} style={styles.expenseCard}>
                <View style={styles.expenseInfo}>
                  <Text style={styles.expenseTitle}>{expense.description}</Text>

                  <Text style={styles.categoryLabel}>
                    {expense.category || "Other"}
                  </Text>

                  <Text style={styles.dateText}>
                    {new Date(expense.created_at).toLocaleDateString("en-IN")}
                  </Text>
                </View>

                <View style={styles.expenseActions}>
                  <Text style={styles.expenseAmount}>
                    ₹{Number(expense.amount).toFixed(2)}
                  </Text>

                  {isOwner && (
                    <TouchableOpacity
                      onPress={() => handleDeleteExpense(expense.id)}
                      style={styles.deleteButton}
                    >
                      <Text style={styles.deleteButtonText}>Delete</Text>
                    </TouchableOpacity>
                  )}
                </View>
              </View>
            ))
          )}
        </>
      )}
    </ScrollView>
  );
}

const styles = StyleSheet.create({
  screen: {
    flex: 1,
    backgroundColor: "#000000",
  },
  container: {
    flexGrow: 1,
    padding: 20,
    paddingBottom: 40,
  },
  center: {
    flex: 1,
    justifyContent: "center",
    alignItems: "center",
    backgroundColor: "#000000",
  },
  title: {
    fontSize: 24,
    fontWeight: "bold",
    marginBottom: 24,
    color: "#FFFFFF",
  },
  card: {
    backgroundColor: "#171717",
    padding: 20,
    borderRadius: 14,
    marginBottom: 18,
  },
  sectionTitle: {
    fontSize: 18,
    fontWeight: "600",
    marginBottom: 14,
    color: "#FFFFFF",
  },
  amount: {
    fontSize: 28,
    fontWeight: "bold",
    color: "#FFFFFF",
    marginBottom: 10,
  },
  secondaryText: {
    fontSize: 13,
    color: "#AAAAAA",
    marginBottom: 8,
  },
  input: {
    borderWidth: 1,
    borderColor: "#444444",
    backgroundColor: "#222222",
    color: "#FFFFFF",
    borderRadius: 9,
    padding: 14,
    fontSize: 16,
    marginTop: 8,
    marginBottom: 16,
  },
  primaryButton: {
    backgroundColor: "#0866FF",
    padding: 16,
    borderRadius: 10,
    alignItems: "center",
    marginBottom: 18,
  },
  buttonText: {
    color: "#FFFFFF",
    fontWeight: "600",
    fontSize: 16,
  },
  divider: {
    height: 1,
    backgroundColor: "#333333",
    marginVertical: 14,
  },
  statRow: {
    flexDirection: "row",
    justifyContent: "space-between",
    alignItems: "center",
    marginBottom: 12,
  },
  statValue: {
    color: "#FFFFFF",
    fontWeight: "600",
  },
  remainingValue: {
    color: "#35D07F",
    fontWeight: "bold",
  },
  fieldLabel: {
    color: "#FFFFFF",
    fontSize: 14,
    fontWeight: "600",
    marginTop: 8,
  },
  categoryContainer: {
    flexDirection: "row",
    flexWrap: "wrap",
    gap: 8,
    marginVertical: 12,
  },
  categoryButton: {
    borderWidth: 1,
    borderColor: "#444444",
    paddingHorizontal: 12,
    paddingVertical: 9,
    borderRadius: 20,
  },
  selectedCategory: {
    backgroundColor: "#0866FF",
    borderColor: "#0866FF",
  },
  categoryText: {
    color: "#CCCCCC",
    fontSize: 13,
  },
  selectedCategoryText: {
    color: "#FFFFFF",
  },
  participantRow: {
    flexDirection: "row",
    justifyContent: "space-between",
    paddingVertical: 12,
    borderBottomWidth: 1,
    borderBottomColor: "#333333",
  },
  participantText: {
    color: "#FFFFFF",
    fontSize: 14,
  },
  checkbox: {
    color: "#0866FF",
    fontSize: 20,
  },
  historyHeader: {
    flexDirection: "row",
    justifyContent: "space-between",
    alignItems: "center",
    marginTop: 12,
  },
  expenseCard: {
    backgroundColor: "#171717",
    borderRadius: 12,
    padding: 16,
    marginBottom: 12,
    flexDirection: "row",
    justifyContent: "space-between",
    alignItems: "center",
  },
  expenseInfo: {
    flex: 1,
  },
  expenseTitle: {
    color: "#FFFFFF",
    fontSize: 16,
    fontWeight: "600",
  },
  categoryLabel: {
    color: "#4B91FF",
    fontSize: 13,
    marginTop: 6,
  },
  dateText: {
    color: "#888888",
    fontSize: 12,
    marginTop: 5,
  },
  expenseAmount: {
    color: "#FFFFFF",
    fontSize: 17,
    fontWeight: "bold",
    marginLeft: 10,
  },
  emptyText: {
    color: "#AAAAAA",
    textAlign: "center",
  },
  expenseActions: {
    alignItems: "flex-end",
    justifyContent: "center",
    gap: 10,
  },
  deleteButton: {
    backgroundColor: "#3A1717",
    paddingVertical: 6,
    paddingHorizontal: 12,
    borderRadius: 6,
  },
  deleteButtonText: {
    color: "#FF6B6B",
    fontSize: 12,
    fontWeight: "600",
  },
});
