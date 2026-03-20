import { View, Text, StyleSheet, Alert } from "react-native";
import { useRouter } from "expo-router";
import { BackButton } from "../BackButton";
import { useAppTheme } from "../../contexts/ThemeContext";

type Props = {
  sessionName: string;
  isActive: boolean;
  activeExerciseId: string | null;
  onClearActiveExercise: () => void;
  /** e.g. "Week 2 · Day 3" — shown below session name when provided */
  planContext?: string;
  /** 0–1 fraction of sets completed across all exercises */
  setsProgress?: number;
};

export function SessionHeader({
  sessionName,
  isActive,
  activeExerciseId,
  onClearActiveExercise,
  planContext,
  setsProgress,
}: Props) {
  const router = useRouter();
  const { theme } = useAppTheme();

  const pct = Math.min(Math.max(setsProgress ?? 0, 0), 1);

  return (
    <View style={styles.wrapper}>
      <View style={styles.header}>
        {/* Show back arrow only when viewing a focused exercise or reviewing a completed session */}
        {(activeExerciseId || !isActive) ? (
          <BackButton
            onPress={() => {
              if (activeExerciseId) {
                onClearActiveExercise();
              } else {
                router.back();
              }
            }}
          />
        ) : null}
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
