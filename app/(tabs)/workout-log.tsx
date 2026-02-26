import { useState, useCallback, useRef, useEffect } from "react";
import {
  View,
  Text,
  StyleSheet,
  Pressable,
  ScrollView,
  RefreshControl,
  Keyboard,
} from "react-native";
import { BottomSheetTextInput } from "@gorhom/bottom-sheet";
import Animated, { FadeInDown } from "react-native-reanimated";
import { Swipeable } from "react-native-gesture-handler";
import { useSafeAreaInsets } from "react-native-safe-area-context";
import { useRouter } from "expo-router";
import { fmtDate, makeId } from "../../lib/helpers";
import { useWorkouts } from "../../hooks/useWorkouts";
import { Card } from "../../components/Card";
import { Button } from "../../components/Button";
import { EmptyState } from "../../components/EmptyState";
import { CalendarGrid } from "../../components/CalendarGrid";
import { Skeleton } from "../../components/Skeleton";
import { AppBottomSheet } from "../../components/AppBottomSheet";
import { useAppTheme } from "../../contexts/ThemeContext";
import { spacing, radius } from "../../lib/theme";
import type { WorkoutSession } from "../../lib/types";

function today(): string {
  return new Date().toISOString().slice(0, 10);
}

export default function WorkoutLogScreen() {
  const router = useRouter();
  const { theme } = useAppTheme();
  const insets = useSafeAreaInsets();
  const { workouts, loading, addWorkout, deleteWorkout, reload } = useWorkouts();
  const [refreshing, setRefreshing] = useState(false);
  const [modalVisible, setModalVisible] = useState(false);
  const [name, setName] = useState("");
  const [selectedDate, setSelectedDate] = useState<string | null>(null);
  const nameInputRef = useRef<any>(null);

  // Focus the input after the bottom sheet opens
  useEffect(() => {
    if (modalVisible) {
      const timer = setTimeout(() => nameInputRef.current?.focus(), 600);
      return () => clearTimeout(timer);
    }
  }, [modalVisible]);

  function handleDayPress(dateKey: string, daySessions: WorkoutSession[]) {
    if (daySessions.length === 0) return;
    setSelectedDate((prev) => (prev === dateKey ? null : dateKey));
  }

  const displayedWorkouts = selectedDate
    ? workouts.filter((w) => {
        const iso = w.completedAt ?? w.startedAt;
        const key = iso
          ? new Date(iso).toISOString().slice(0, 10)
          : new Date(w.date).toISOString().slice(0, 10);
        return key === selectedDate;
      })
    : workouts;

  function handleAdd() {
    if (!name.trim()) return;
    Keyboard.dismiss();
    const session: WorkoutSession = {
      id: makeId(),
      name: name.trim(),
      date: today(),
      exercises: [],
    };
    addWorkout(session);
    setName("");
    setModalVisible(false);
  }

  function handleCancel() {
    Keyboard.dismiss();
    setName("");
    setModalVisible(false);
  }

  const renderRightActions = useCallback((onDelete: () => void) => (
    <Pressable style={[styles.deleteAction, { backgroundColor: theme.colors.danger }]} onPress={onDelete}>
      <Text style={[styles.deleteText, { color: theme.colors.dangerText }]}>Delete</Text>
    </Pressable>
  ), [theme]);

  return (
      <View style={[styles.container, { backgroundColor: theme.colors.bg, paddingTop: insets.top + 12 }]}>
        <View style={styles.header}>
          <Text style={[styles.title, { color: theme.colors.text }]}>Workout Log</Text>
          <Button label="+ Add" onPress={() => setModalVisible(true)} small />
        </View>

        {loading ? (
          <Skeleton.Group>
            <Skeleton.Rect width="50%" height={20} style={{ marginTop: 48 }} />
            <Skeleton.Card />
            <Skeleton.Card />
            <Skeleton.Card />
          </Skeleton.Group>
        ) : (
          <ScrollView
            showsVerticalScrollIndicator={false}
            refreshControl={
              <RefreshControl
                refreshing={refreshing}
                onRefresh={async () => { setRefreshing(true); await reload(); setRefreshing(false); }}
                tintColor={theme.colors.primary}
              />
            }
          >
            <CalendarGrid sessions={workouts} onDayPress={handleDayPress} />

            {/* List header */}
            <View style={styles.listHeader}>
              {selectedDate ? (
                <Pressable style={styles.dateChip} onPress={() => setSelectedDate(null)}>
                  <Text style={[styles.dateChipText, { color: theme.colors.primary }]}>
                    {new Date(selectedDate + "T12:00:00").toLocaleDateString("en-US", { month: "short", day: "numeric" })}
                  </Text>
                  <Text style={[styles.dateChipClear, { color: theme.colors.muted }]}>  ×</Text>
                </Pressable>
              ) : (
                <Text style={[styles.listTitle, { color: theme.colors.muted }]}>ALL SESSIONS</Text>
              )}
            </View>

            {displayedWorkouts.length === 0 ? (
              <EmptyState
                icon="📋"
                title={selectedDate ? "No sessions on this day" : "No workouts yet"}
                subtitle={selectedDate ? "Tap another day or clear the filter." : "Tap + Add to log your first workout."}
              />
            ) : (
              displayedWorkouts.map((item, index) => (
                <Animated.View key={item.id} entering={FadeInDown.delay(index * 60).duration(300)}>
                  <Swipeable renderRightActions={() => renderRightActions(() => deleteWorkout(item.id))}>
                    <Pressable onPress={() => router.push(`/session/${item.id}`)}>
                      <Card style={styles.row}>
                        <View style={styles.rowContent}>
                          <View style={{ flexDirection: "row", alignItems: "center", gap: 8 }}>
                            <Text style={[styles.rowName, { color: theme.colors.text }]}>{item.name}</Text>
                            {item.completedAt ? (
                              <Text style={{ backgroundColor: theme.colors.success, color: theme.colors.successText, borderRadius: 10, paddingHorizontal: 8, paddingVertical: 2, fontSize: 11, fontWeight: "600", overflow: "hidden" }}>✓ Done</Text>
                            ) : item.isActive ? (
                              <Text style={{ backgroundColor: theme.colors.danger, color: theme.colors.dangerText, borderRadius: 10, paddingHorizontal: 8, paddingVertical: 2, fontSize: 11, fontWeight: "600", overflow: "hidden" }}>● Active</Text>
                            ) : null}
                          </View>
                          <Text style={[styles.rowMeta, { color: theme.colors.muted }]}>
                            {fmtDate(item.date)}
                            {item.exercises.length > 0
                              ? ` · ${item.exercises.length} exercise${item.exercises.length !== 1 ? "s" : ""} · ${item.exercises.reduce((a, ex) => a + ex.sets.filter(s => s.completed).length, 0)}/${item.exercises.reduce((a, ex) => a + ex.sets.length, 0)} sets`
                              : ""}
                          </Text>
                        </View>
                        <Text style={[styles.chevron, { color: theme.colors.muted }]}>›</Text>
                      </Card>
                    </Pressable>
                  </Swipeable>
                </Animated.View>
              ))
            )}
          </ScrollView>
        )}

        <AppBottomSheet visible={modalVisible} onClose={handleCancel}>
          <Text style={[styles.modalTitle, { color: theme.colors.text }]}>New Workout</Text>
          <BottomSheetTextInput
            ref={nameInputRef}
            style={[styles.input, { backgroundColor: theme.colors.bg, color: theme.colors.text }]}
            placeholder="e.g. Upper Body, Run 5k..."
            placeholderTextColor={theme.colors.muted}
            value={name}
            onChangeText={setName}
            returnKeyType="done"
            onSubmitEditing={handleAdd}
          />
          <View style={styles.modalActions}>
            <Button label="Cancel" onPress={handleCancel} variant="secondary" />
            <View style={{ width: 12 }} />
            <Button label="Save" onPress={handleAdd} />
          </View>
        </AppBottomSheet>
      </View>
  );
}

const styles = StyleSheet.create({
  container: {
    flex: 1,
    paddingTop: 0,
    paddingHorizontal: spacing.lg,
  },
  header: {
    flexDirection: "row",
    justifyContent: "space-between",
    alignItems: "center",
    marginBottom: spacing.lg,
  },
  title: { fontSize: 32, fontWeight: "700" },
  row: { marginBottom: 0, flexDirection: "row", alignItems: "center" },
  rowContent: { flex: 1 },
  rowName: { fontSize: 16, fontWeight: "600" },
  rowMeta: { fontSize: 12, marginTop: 2 },
  chevron: { fontSize: 20 },
  deleteAction: {
    justifyContent: "center",
    alignItems: "center",
    width: 80,
    borderRadius: radius.md,
    marginBottom: spacing.sm + 4,
  },
  deleteText: { fontWeight: "700", fontSize: 14 },
  listHeader: { flexDirection: "row", alignItems: "center", marginBottom: 8, marginTop: 4 },
  listTitle: { fontSize: 11, fontWeight: "700", textTransform: "uppercase", letterSpacing: 1.0 },
  dateChip: { flexDirection: "row", alignItems: "center" },
  dateChipText: { fontSize: 13, fontWeight: "700" },
  dateChipClear: { fontSize: 16, fontWeight: "400" },
  modalTitle: { fontSize: 22, fontWeight: "700", marginBottom: spacing.md },
  input: {
    borderRadius: radius.md,
    padding: 14,
    fontSize: 16,
    marginBottom: spacing.md + 4,
  },
  modalActions: { flexDirection: "row" },
});
