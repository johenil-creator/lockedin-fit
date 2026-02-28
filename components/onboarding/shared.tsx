import { useEffect } from "react";
import { StyleSheet } from "react-native";
import Animated, {
  useSharedValue,
  useAnimatedStyle,
  withTiming,
} from "react-native-reanimated";

export function StepSlide({ children }: { children: React.ReactNode }) {
  const opacity = useSharedValue(0);
  useEffect(() => {
    opacity.value = withTiming(1, { duration: 250 });
  }, []);
  const anim = useAnimatedStyle(() => ({ opacity: opacity.value }));
  return <Animated.View style={[{ flex: 1 }, anim]}>{children}</Animated.View>;
}

export const onboardingStyles = StyleSheet.create({
  container: { flex: 1, paddingTop: 56 },
  scrollBody: { paddingHorizontal: 24, paddingTop: 32 },
  body: { flex: 1, paddingHorizontal: 24, paddingTop: 32 },
  bottom: { paddingHorizontal: 24, paddingBottom: 48 },

  skipBtn: { position: "absolute", top: 56, right: 24, zIndex: 10, padding: 8 },
  skipTextBtn: { alignItems: "center", paddingVertical: 4 },
  skipText: { fontSize: 14, fontWeight: "500" },

  center: { flex: 1, justifyContent: "center", alignItems: "center", paddingHorizontal: 24, marginTop: -60 },
  lockeIntro: { fontSize: 28, fontWeight: "800", marginBottom: 8 },
  welcomeTitle: { fontSize: 22, fontWeight: "700", textAlign: "center", marginBottom: 12, lineHeight: 30 },
  nameInput: { width: "100%", fontSize: 18, fontWeight: "600", borderWidth: 1, borderRadius: 14, padding: 14, textAlign: "center", marginTop: 16 },
  welcomeSub: { fontSize: 15, textAlign: "center", lineHeight: 22 },

  stepEyebrow: { fontSize: 11, fontWeight: "700", letterSpacing: 1.5, marginBottom: 6, textTransform: "uppercase" },
  stepTitle: { fontSize: 22, fontWeight: "700", marginBottom: 6 },
  stepSub: { fontSize: 14, marginBottom: 24, lineHeight: 20 },
  explainText: { fontSize: 15, lineHeight: 24, marginBottom: 16 },

  checkbox: { borderWidth: 1, borderRadius: 14, padding: 16, marginBottom: 10 },
  checkboxText: { fontSize: 16, fontWeight: "600" },

  liftCard: { borderWidth: 1, borderRadius: 16, padding: 16, marginBottom: 14 },
  liftName: { fontSize: 16, fontWeight: "700", marginBottom: 12 },
  inputRow: { flexDirection: "row", gap: 12 },
  inputGroup: { flex: 1 },
  inputLabel: { fontSize: 12, marginBottom: 4, textTransform: "uppercase", letterSpacing: 0.5 },
  numInput: { fontSize: 18, fontWeight: "600", borderWidth: 1, borderRadius: 12, padding: 12, textAlign: "center" },
  manualRow: { flexDirection: "row", gap: 12 },

  resultCard: { borderWidth: 1, borderRadius: 16, padding: 16, marginBottom: 14 },
  resultTopRow: { flexDirection: "row", justifyContent: "space-between", alignItems: "center" },
  resultLift: { fontSize: 16, fontWeight: "600" },
  resultValue: { fontSize: 28, fontWeight: "800" },
  resultLabel: { fontSize: 11, textTransform: "uppercase", letterSpacing: 0.5, marginTop: 2 },

  ladderSection: { borderTopWidth: 1, marginTop: 12, paddingTop: 12 },
  ladderTitle: { fontSize: 10, fontWeight: "700", letterSpacing: 1.2, textTransform: "uppercase", marginBottom: 8 },
  ladderRow: { flexDirection: "row", alignItems: "center", paddingVertical: 4 },
  ladderWeight: { fontSize: 15, fontWeight: "700", width: 70 },
  ladderReps: { fontSize: 14, flex: 1 },
  ladderPct: { fontSize: 12 },
});
