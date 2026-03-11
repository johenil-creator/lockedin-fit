import { useEffect, useCallback } from "react";
import { View, Text, StyleSheet, Pressable, BackHandler } from "react-native";
import Animated, {
  useSharedValue,
  useAnimatedStyle,
  withTiming,
  withDelay,
  withSequence,
  withRepeat,
  withSpring,
  Easing,
  interpolate,
} from "react-native-reanimated";
import * as Haptics from "expo-haptics";
import { useRouter, useLocalSearchParams } from "expo-router";
import { useAppTheme } from "../contexts/ThemeContext";
import { glowColors, spacing, radius } from "../lib/theme";
import { LockeMascot } from "../components/Locke/LockeMascot";

export default function PlanCompleteScreen() {
  const { planName, totalDays, totalSessions } = useLocalSearchParams<{
    planName: string;
    totalDays: string;
    totalSessions: string;
  }>();
  const router = useRouter();
  const { theme } = useAppTheme();

  // Block hardware back
  useEffect(() => {
    const sub = BackHandler.addEventListener("hardwareBackPress", () => true);
    return () => sub.remove();
  }, []);

  // Entry haptic
  useEffect(() => {
    const t = setTimeout(() => Haptics.notificationAsync(Haptics.NotificationFeedbackType.Success), 100);
    return () => clearTimeout(t);
  }, []);

  // Animations
  const lockeY = useSharedValue(30);
  const lockeOp = useSharedValue(0);
  const headY = useSharedValue(20);
  const headOp = useSharedValue(0);
  const statsY = useSharedValue(20);
  const statsOp = useSharedValue(0);
  const btnY = useSharedValue(20);
  const btnOp = useSharedValue(0);
  const glowPulse = useSharedValue(0);

  useEffect(() => {
    lockeY.value = withTiming(0, { duration: 400, easing: Easing.out(Easing.back(1.4)) });
    lockeOp.value = withTiming(1, { duration: 400 });

    glowPulse.value = withRepeat(
      withSequence(
        withTiming(1, { duration: 1500, easing: Easing.inOut(Easing.ease) }),
        withTiming(0, { duration: 1500, easing: Easing.inOut(Easing.ease) })
      ),
      -1,
      false
    );

    headY.value = withDelay(200, withTiming(0, { duration: 350, easing: Easing.out(Easing.quad) }));
    headOp.value = withDelay(200, withTiming(1, { duration: 350 }));

    statsY.value = withDelay(450, withTiming(0, { duration: 300, easing: Easing.out(Easing.back(1.2)) }));
    statsOp.value = withDelay(450, withTiming(1, { duration: 300 }));

    btnY.value = withDelay(700, withTiming(0, { duration: 350, easing: Easing.out(Easing.back(1.1)) }));
    btnOp.value = withDelay(700, withTiming(1, { duration: 350 }));
  }, []);

  const lockeStyle = useAnimatedStyle(() => ({
    transform: [{ translateY: lockeY.value }],
    opacity: lockeOp.value,
  }));
  const glowStyle = useAnimatedStyle(() => ({
    opacity: interpolate(glowPulse.value, [0, 1], [0.15, 0.45]),
  }));
  const headStyle = useAnimatedStyle(() => ({
    transform: [{ translateY: headY.value }],
    opacity: headOp.value,
  }));
  const statsStyle = useAnimatedStyle(() => ({
    transform: [{ translateY: statsY.value }],
    opacity: statsOp.value,
  }));
  const btnStyle = useAnimatedStyle(() => ({
    transform: [{ translateY: btnY.value }],
    opacity: btnOp.value,
  }));

  const goHome = useCallback(() => {
    Haptics.impactAsync(Haptics.ImpactFeedbackStyle.Light);
    router.replace("/");
  }, [router]);

  return (
    <View style={[styles.container, { backgroundColor: theme.colors.bg }]}>
      <Animated.View style={[styles.lockeSection, lockeStyle]}>
        <View style={styles.lockeGlowWrap}>
          <Animated.View style={[styles.lockeGlow, glowStyle]} />
          <LockeMascot size={200} mood="celebrating" />
        </View>
      </Animated.View>

      <Animated.View style={[styles.headSection, headStyle]}>
        <Text style={[styles.eyebrow, { color: glowColors.viridian }]}>PLAN COMPLETE</Text>
        <Text style={[styles.headline, { color: theme.colors.text }]}>
          {planName || "Your Plan"}{"\n"}Conquered.
        </Text>
        <Text style={[styles.subtitle, { color: theme.colors.muted }]}>
          Every session. Every set. Done.
        </Text>
      </Animated.View>

      <Animated.View style={[styles.statsRow, statsStyle]}>
        <View style={[styles.statCard, { backgroundColor: theme.colors.surface, borderColor: theme.colors.border }]}>
          <Text style={[styles.statValue, { color: glowColors.viridian }]}>{totalDays || "—"}</Text>
          <Text style={[styles.statLabel, { color: theme.colors.muted }]}>DAYS</Text>
        </View>
        <View style={[styles.statCard, { backgroundColor: theme.colors.surface, borderColor: theme.colors.border }]}>
          <Text style={[styles.statValue, { color: glowColors.viridian }]}>{totalSessions || "—"}</Text>
          <Text style={[styles.statLabel, { color: theme.colors.muted }]}>SESSIONS</Text>
        </View>
      </Animated.View>

      <Animated.View style={btnStyle}>
        <Pressable
          style={[styles.btn, { backgroundColor: theme.colors.primary }]}
          onPress={goHome}
        >
          <Text style={[styles.btnText, { color: theme.colors.primaryText }]}>BACK TO HOME</Text>
        </Pressable>
      </Animated.View>
    </View>
  );
}

const GLOW_SIZE = 168;

const styles = StyleSheet.create({
  container: {
    flex: 1,
    alignItems: "center",
    justifyContent: "center",
    paddingHorizontal: 24,
  },
  lockeSection: { marginBottom: spacing.md },
  lockeGlowWrap: {
    width: GLOW_SIZE,
    height: GLOW_SIZE,
    alignItems: "center",
    justifyContent: "center",
  },
  lockeGlow: {
    position: "absolute",
    width: GLOW_SIZE,
    height: GLOW_SIZE,
    borderRadius: GLOW_SIZE / 2,
    backgroundColor: glowColors.viridian,
  },
  headSection: { alignItems: "center", marginBottom: spacing.lg },
  eyebrow: {
    fontSize: 11,
    fontWeight: "700",
    letterSpacing: 2,
    textTransform: "uppercase",
    marginBottom: 6,
  },
  headline: {
    fontSize: 28,
    fontWeight: "800",
    textAlign: "center",
    marginBottom: 6,
  },
  subtitle: {
    fontSize: 15,
    fontWeight: "500",
    textAlign: "center",
  },
  statsRow: {
    flexDirection: "row",
    gap: 12,
    marginBottom: spacing.xl,
  },
  statCard: {
    flex: 1,
    height: 80,
    borderRadius: radius.md,
    borderWidth: 1,
    alignItems: "center",
    justifyContent: "center",
  },
  statValue: {
    fontSize: 28,
    fontWeight: "800",
    marginBottom: 2,
  },
  statLabel: {
    fontSize: 11,
    fontWeight: "700",
    letterSpacing: 1,
    textTransform: "uppercase",
  },
  btn: {
    width: "100%",
    height: 56,
    borderRadius: 14,
    alignItems: "center",
    justifyContent: "center",
  },
  btnText: {
    fontSize: 16,
    fontWeight: "700",
    letterSpacing: 1,
  },
});
