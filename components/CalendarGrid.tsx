import { useState, useEffect } from "react";
import { View, Text, Pressable, StyleSheet } from "react-native";
import Animated, {
  useSharedValue,
  useAnimatedStyle,
  withRepeat,
  withTiming,
} from "react-native-reanimated";
import { useAppTheme } from "../contexts/ThemeContext";
import type { WorkoutSession } from "../lib/types";

type Props = {
  sessions: WorkoutSession[];
  onDayPress: (dateKey: string, sessions: WorkoutSession[]) => void;
};

const WEEKDAYS = ["Su", "Mo", "Tu", "We", "Th", "Fr", "Sa"];

function toDateKey(d: Date): string {
  const y = d.getFullYear();
  const m = String(d.getMonth() + 1).padStart(2, "0");
  const day = String(d.getDate()).padStart(2, "0");
  return `${y}-${m}-${day}`;
}

function parseSessionDate(session: WorkoutSession): string | null {
  // Try completedAt/startedAt (ISO string) first
  const iso = session.completedAt ?? session.startedAt;
  if (iso) {
    const d = new Date(iso);
    if (!isNaN(d.getTime())) return toDateKey(d);
  }
  // Try parsing the date field (locale string like "Feb 24, 2026" or ISO)
  const d = new Date(session.date);
  if (!isNaN(d.getTime())) return toDateKey(d);
  return null;
}

function buildSessionMap(sessions: WorkoutSession[]): Record<string, WorkoutSession[]> {
  const map: Record<string, WorkoutSession[]> = {};
  for (const s of sessions) {
    const key = parseSessionDate(s);
    if (!key) continue;
    if (!map[key]) map[key] = [];
    map[key].push(s);
  }
  return map;
}

function PulsingDot({ color }: { color: string }) {
  const opacity = useSharedValue(1);
  useEffect(() => {
    opacity.value = withRepeat(withTiming(0.3, { duration: 800 }), -1, true);
  }, []);
  const style = useAnimatedStyle(() => ({ opacity: opacity.value }));
  return (
    <Animated.View
      style={[
        { width: 6, height: 6, borderRadius: 3, backgroundColor: color, position: "absolute", top: 2, right: 2 },
        style,
      ]}
    />
  );
}

export function CalendarGrid({ sessions, onDayPress }: Props) {
  const { theme } = useAppTheme();
  const [currentMonth, setCurrentMonth] = useState(() => {
    const now = new Date();
    return new Date(now.getFullYear(), now.getMonth(), 1);
  });

  const sessionMap = buildSessionMap(sessions);
  const todayKey = toDateKey(new Date());

  const year = currentMonth.getFullYear();
  const month = currentMonth.getMonth();
  const daysInMonth = new Date(year, month + 1, 0).getDate();
  const startDay = new Date(year, month, 1).getDay();

  const monthLabel = currentMonth.toLocaleDateString("en-US", { month: "short", year: "numeric" });

  function prevMonth() {
    setCurrentMonth(new Date(year, month - 1, 1));
  }
  function nextMonth() {
    setCurrentMonth(new Date(year, month + 1, 1));
  }

  const cells: (number | null)[] = [];
  for (let i = 0; i < startDay; i++) cells.push(null);
  for (let d = 1; d <= daysInMonth; d++) cells.push(d);

  return (
    <View style={styles.container}>
      {/* Header */}
      <View style={styles.headerRow}>
        <Pressable onPress={prevMonth} style={styles.navBtn}>
          <Text style={[styles.navText, { color: theme.colors.primary }]}>←</Text>
        </Pressable>
        <Text style={[styles.monthLabel, { color: theme.colors.text }]}>{monthLabel}</Text>
        <Pressable onPress={nextMonth} style={styles.navBtn}>
          <Text style={[styles.navText, { color: theme.colors.primary }]}>→</Text>
        </Pressable>
      </View>

      {/* Weekday labels */}
      <View style={styles.weekRow}>
        {WEEKDAYS.map((d) => (
          <View key={d} style={styles.dayCell}>
            <Text style={[styles.weekdayLabel, { color: theme.colors.muted }]}>{d}</Text>
          </View>
        ))}
      </View>

      {/* Day cells */}
      <View style={styles.grid}>
        {cells.map((day, i) => {
          if (day === null) {
            return <View key={`empty-${i}`} style={styles.dayCell} />;
          }
          const dateKey = `${year}-${String(month + 1).padStart(2, "0")}-${String(day).padStart(2, "0")}`;
          const daySessions = sessionMap[dateKey] ?? [];
          const isToday = dateKey === todayKey;
          const hasCompleted = daySessions.some((s) => !!s.completedAt);
          const hasActive = daySessions.some((s) => !!s.isActive);
          const count = daySessions.length;

          return (
            <Pressable
              key={dateKey}
              style={styles.dayCell}
              onPress={() => onDayPress(dateKey, daySessions)}
            >
              <View
                style={[
                  styles.dayCircle,
                  isToday && !hasCompleted && { borderWidth: 2, borderColor: theme.colors.primary },
                  hasCompleted && { backgroundColor: theme.colors.primary },
                ]}
              >
                <Text
                  style={[
                    styles.dayText,
                    { color: hasCompleted ? theme.colors.primaryText : theme.colors.text },
                  ]}
                >
                  {day}
                </Text>
                {count > 1 && (
                  <View style={[styles.countDot, { backgroundColor: theme.colors.accent }]} />
                )}
                {hasActive && <PulsingDot color={theme.colors.accent} />}
              </View>
            </Pressable>
          );
        })}
      </View>
    </View>
  );
}

const styles = StyleSheet.create({
  container: { marginBottom: 16 },
  headerRow: {
    flexDirection: "row",
    justifyContent: "space-between",
    alignItems: "center",
    marginBottom: 12,
  },
  navBtn: { padding: 8 },
  navText: { fontSize: 18, fontWeight: "600" },
  monthLabel: { fontSize: 16, fontWeight: "700" },
  weekRow: { flexDirection: "row", marginBottom: 4 },
  grid: { flexDirection: "row", flexWrap: "wrap" },
  dayCell: {
    width: `${100 / 7}%`,
    alignItems: "center",
    paddingVertical: 4,
  },
  dayCircle: {
    width: 38,
    height: 38,
    borderRadius: 19,
    alignItems: "center",
    justifyContent: "center",
  },
  dayText: { fontSize: 13, fontWeight: "500" },
  weekdayLabel: { fontSize: 11, fontWeight: "600" },
  countDot: {
    position: "absolute",
    bottom: 1,
    right: 1,
    width: 6,
    height: 6,
    borderRadius: 3,
  },
});
