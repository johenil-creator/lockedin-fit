import { useState, useEffect, type RefObject } from "react";
import { View, Text, StyleSheet, Alert } from "react-native";
import { useRouter } from "expo-router";
import { Ionicons } from "@expo/vector-icons";
import { BackButton } from "../BackButton";
import { useAppTheme } from "../../contexts/ThemeContext";

function formatElapsed(seconds: number): string {
  const h = Math.floor(seconds / 3600);
  const m = Math.floor((seconds % 3600) / 60);
  const s = seconds % 60;
  if (h > 0) return `${h}:${String(m).padStart(2, "0")}:${String(s).padStart(2, "0")}`;
  return `${String(m).padStart(2, "0")}:${String(s).padStart(2, "0")}`;
}

type Props = {
  sessionName: string;
  isActive: boolean;
  activeExerciseId: string | null;
  onClearActiveExercise: () => void;
  /** e.g. "Week 2 · Day 3" — shown below session name when provided */
  planContext?: string;
  /** 0–1 fraction of sets completed across all exercises */
  setsProgress?: number;
  /** ISO timestamp of when the session started — header manages its own timer */
  startedAt?: string;
  /** Ref to accumulated background milliseconds (subtracted from elapsed) */
  backgroundMs?: RefObject<number>;
};

export function SessionHeader({
  sessionName,
  isActive,
  activeExerciseId,
  onClearActiveExercise,
  planContext,
  setsProgress,
  startedAt,
  backgroundMs,
}: Props) {
  const router = useRouter();
  const { theme } = useAppTheme();

  // ── Self-contained elapsed timer ──────────────────────────────────────────
  const [elapsed, setElapsed] = useState(0);
  useEffect(() => {
    if (!isActive || !startedAt) return;
    const start = new Date(startedAt).getTime();
    const tick = () => setElapsed(Math.floor((Date.now() - start - (backgroundMs?.current ?? 0)) / 1000));
    tick();
    const id = setInterval(tick, 1000);
    return () => clearInterval(id);
  }, [isActive, startedAt]);

  const elapsedStr = elapsed > 0 ? formatElapsed(elapsed) : undefined;
  const pct = Math.min(Math.max(setsProgress ?? 0, 0), 1);

  return (
    <View style={styles.wrapper}>
      <View style={styles.header}>
        <BackButton
          onPress={() => {
            if (activeExerciseId) {
              onClearActiveExercise();
            } else if (isActive) {
              Alert.alert("Leave session?", "Your progress is saved.", [
                { text: "Stay", style: "cancel" },
                { text: "Leave", style: "destructive", onPress: () => router.back() },
              ]);
            } else {
              router.back();
            }
          }}
        />
        <View style={styles.headerCenter}>
          {planContext ? (
            <Text style={[styles.planContext, { color: theme.colors.muted }]} numberOfLines={1}>
              {planContext}
            </Text>
          ) : null}
          <Text style={[styles.sessionName, { color: theme.colors.text }]} numberOfLines={1}>
            {sessionName}
          </Text>
        </View>
        {isActive && elapsedStr ? (
          <View style={styles.elapsedWrap}>
            <Ionicons name="time-outline" size={13} color={theme.colors.muted} />
            <Text style={[styles.elapsedText, { color: theme.colors.muted }]}>{elapsedStr}</Text>
          </View>
        ) : null}
      </View>

      {/* Progress bar — only shown during active session */}
      {isActive && setsProgress != null && (
        <View style={[styles.progressTrack, { backgroundColor: theme.colors.mutedBg }]}>
          <View
            style={[
              styles.progressFill,
              {
                backgroundColor: theme.colors.primary,
                width: pct === 0 ? 4 : `${Math.round(pct * 100)}%`,
              },
            ]}
          />
        </View>
      )}
    </View>
  );
}

const styles = StyleSheet.create({
  wrapper: {
    marginBottom: 12,
  },
  header: {
    flexDirection: "row",
    justifyContent: "space-between",
    alignItems: "center",
    paddingHorizontal: 0,
    marginBottom: 8,
  },
  headerCenter: { flex: 1, marginHorizontal: 10 },
  planContext: { fontSize: 11, fontWeight: "600", textTransform: "uppercase", letterSpacing: 0.8, marginBottom: 1 },
  sessionName: { fontSize: 17, fontWeight: "700" },
  elapsedWrap: { flexDirection: "row", alignItems: "center", gap: 3 },
  elapsedText: { fontSize: 12, fontWeight: "600" },
  progressTrack: {
    height: 3,
    borderRadius: 999,
    overflow: "hidden",
  },
  progressFill: {
    height: "100%",
    borderRadius: 999,
    minWidth: 4,
  },
});
