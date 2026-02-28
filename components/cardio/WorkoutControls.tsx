import { View, Text, Pressable, StyleSheet } from "react-native";
import { Ionicons } from "@expo/vector-icons";
import { workoutMetricColors as C } from "../../lib/theme";

type ControlState = "running" | "paused" | "done";

type Props = {
  state: ControlState;
  onPause: () => void;
  onResume: () => void;
  onEnd: () => void;
  onFinish: () => void;
};

export function WorkoutControls({ state, onPause, onResume, onEnd, onFinish }: Props) {
  if (state === "done") {
    return (
      <View style={styles.row}>
        <Pressable style={[styles.circle, { backgroundColor: C.ctrlResume }]} onPress={onFinish} accessibilityRole="button" accessibilityLabel="Finish workout">
          <Ionicons name="checkmark" size={28} color="#fff" />
        </Pressable>
        <Text style={styles.circleLabel}>Finish</Text>
      </View>
    );
  }

  const isRunning = state === "running";

  return (
    <View style={styles.row}>
      {/* End button — always visible */}
      <View style={styles.btnCol}>
        <Pressable style={[styles.circle, { backgroundColor: C.ctrlEnd }]} onPress={onEnd} accessibilityRole="button" accessibilityLabel="End workout">
          <Ionicons name="close" size={28} color="#fff" />
        </Pressable>
        <Text style={styles.circleLabel}>End</Text>
      </View>

      {/* Pause / Resume */}
      <View style={styles.btnCol}>
        {isRunning ? (
          <>
            <Pressable style={[styles.circle, { backgroundColor: C.ctrlPause }]} onPress={onPause} accessibilityRole="button" accessibilityLabel="Pause workout">
              <Ionicons name="pause" size={28} color="#000" />
            </Pressable>
            <Text style={styles.circleLabel}>Pause</Text>
          </>
        ) : (
          <>
            <Pressable style={[styles.circle, { backgroundColor: C.ctrlResume }]} onPress={onResume} accessibilityRole="button" accessibilityLabel="Resume workout">
              <Ionicons name="play" size={28} color="#fff" />
            </Pressable>
            <Text style={styles.circleLabel}>Resume</Text>
          </>
        )}
      </View>
    </View>
  );
}

const styles = StyleSheet.create({
  row: {
    flexDirection: "row",
    alignItems: "center",
    justifyContent: "center",
    gap: 40,
  },
  btnCol: {
    alignItems: "center",
    gap: 6,
  },
  circle: {
    width: 72,
    height: 72,
    borderRadius: 36,
    alignItems: "center",
    justifyContent: "center",
  },
  circleLabel: {
    fontSize: 13,
    fontWeight: "500",
    color: "#98989D",
  },
});
