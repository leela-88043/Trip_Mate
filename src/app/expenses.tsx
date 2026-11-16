import { router, useFocusEffect, useLocalSearchParams } from "expo-router";
import { useCallback, useState } from "react";
import {
    ActivityIndicator,
    Alert,
    ScrollView,
    StyleSheet,
    Text,
    TouchableOpacity,
    View,
} from "react-native";
import { supabase } from "../services/supabase";

type Expense = {
  id: string;
  description: string;
  amount: number;
  category: string | null;
  paid_by: string | null;
  created_at: string;
};

export default function ExpensesScreen() {
  const { tripId } = useLocalSearchParams<{ tripId: string }>();

  const [expenses, setExpenses] = useState<Expense[]>([]);
  const [loading, setLoading] = useState(true);
  const [total, setTotal] = useState(0);

  const loadExpenses = useCallback(async () => {
    if (!tripId) {
      setLoading(false);
      return;
    }

    setLoading(true);

    const { data, error } = await supabase
      .from("expenses")
      .select("id, description, amount, category, paid_by, created_at")
      .eq("trip_id", tripId)
      .order("created_at", { ascending: false });

    if (error) {
      Alert.alert("Error", error.message);
    } else {
      const records = (data ?? []) as Expense[];
      setExpenses(records);
      setTotal(
        records.reduce((sum, expense) => sum + Number(expense.amount), 0),
      );
    }

    setLoading(false);
  }, [tripId]);

  useFocusEffect(
    useCallback(() => {
      loadExpenses();
    }, [loadExpenses]),
  );

  return (
    <View style={styles.container}>
      <View style={styles.header}>
        <TouchableOpacity onPress={() => router.back()}>
          <Text style={styles.backText}>‹ Back</Text>
        </TouchableOpacity>
        <Text style={styles.title}>Expenses</Text>
        <View style={{ width: 55 }} />
      </View>

      <ScrollView contentContainerStyle={styles.content}>
        <View style={styles.summaryCard}>
          <Text style={styles.summaryLabel}>Total Group Expenses</Text>
          <Text style={styles.totalAmount}>
            ₹
            {total.toLocaleString("en-IN", {
              minimumFractionDigits: 2,
              maximumFractionDigits: 2,
            })}
          </Text>
          <Text style={styles.summaryNote}>
            Total common expenses recorded for this trip
          </Text>
        </View>

        <TouchableOpacity
          style={styles.addButton}
          onPress={() =>
            Alert.alert(
              "Coming next",
              "We will add the expense entry form in the next step.",
            )
          }
        >
          <Text style={styles.addButtonText}>+ Add Expense</Text>
        </TouchableOpacity>

        <Text style={styles.sectionTitle}>Expense History</Text>

        {loading ? (
          <ActivityIndicator color="#0866FF" size="large" />
        ) : expenses.length === 0 ? (
          <View style={styles.emptyCard}>
            <Text style={styles.emptyTitle}>No expenses yet</Text>
            <Text style={styles.emptyText}>
              Your trip expenses will appear here.
            </Text>
          </View>
        ) : (
          expenses.map((expense) => (
            <View key={expense.id} style={styles.expenseCard}>
              <View style={styles.expenseInfo}>
                <Text style={styles.expenseName}>{expense.description}</Text>
                <Text style={styles.category}>
                  {expense.category || "Other"}
                </Text>
                <Text style={styles.date}>
                  {new Date(expense.created_at).toLocaleDateString("en-IN")}
                </Text>
              </View>

              <Text style={styles.expenseAmount}>
                ₹
                {Number(expense.amount).toLocaleString("en-IN", {
                  minimumFractionDigits: 2,
                  maximumFractionDigits: 2,
                })}
              </Text>
            </View>
          ))
        )}
      </ScrollView>
    </View>
  );
}

const styles = StyleSheet.create({
  container: {
    flex: 1,
    backgroundColor: "#000000",
  },
  header: {
    flexDirection: "row",
    justifyContent: "space-between",
    alignItems: "center",
    paddingHorizontal: 20,
    paddingTop: 55,
    paddingBottom: 20,
  },
  backText: {
    color: "#0866FF",
    fontSize: 16,
  },
  title: {
    color: "#FFFFFF",
    fontSize: 22,
    fontWeight: "bold",
  },
  content: {
    padding: 20,
    paddingBottom: 40,
  },
  summaryCard: {
    backgroundColor: "#171717",
    borderRadius: 16,
    padding: 20,
    marginBottom: 20,
  },
  summaryLabel: {
    color: "#AAAAAA",
    fontSize: 14,
  },
  totalAmount: {
    color: "#FFFFFF",
    fontSize: 30,
    fontWeight: "bold",
    marginTop: 8,
  },
  summaryNote: {
    color: "#888888",
    fontSize: 12,
    marginTop: 8,
  },
  addButton: {
    backgroundColor: "#0866FF",
    borderRadius: 12,
    padding: 16,
    alignItems: "center",
    marginBottom: 28,
  },
  addButtonText: {
    color: "#FFFFFF",
    fontSize: 16,
    fontWeight: "bold",
  },
  sectionTitle: {
    color: "#FFFFFF",
    fontSize: 19,
    fontWeight: "bold",
    marginBottom: 15,
  },
  emptyCard: {
    backgroundColor: "#171717",
    padding: 25,
    borderRadius: 14,
    alignItems: "center",
  },
  emptyTitle: {
    color: "#FFFFFF",
    fontSize: 16,
    fontWeight: "600",
  },
  emptyText: {
    color: "#999999",
    marginTop: 8,
  },
  expenseCard: {
    backgroundColor: "#171717",
    borderRadius: 14,
    padding: 17,
    marginBottom: 12,
    flexDirection: "row",
    justifyContent: "space-between",
    alignItems: "center",
  },
  expenseInfo: {
    flex: 1,
  },
  expenseName: {
    color: "#FFFFFF",
    fontSize: 16,
    fontWeight: "600",
  },
  category: {
    color: "#0866FF",
    fontSize: 13,
    marginTop: 6,
  },
  date: {
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
});
