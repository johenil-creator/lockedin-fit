import { useEffect, useCallback, useState } from "react";
import {
  View,
  Text,
  StyleSheet,
  Pressable,
  Image,
  Modal,
  useWindowDimensions,
  BackHandler,
} from "react-native";
import Animated, {
  useSharedValue,
  useAnimatedStyle,
  withTiming,
  withDelay,
  withSequence,
  withSpring,
  withRepeat,
  FadeIn,
  Easing,
  interpolate,
} from "react-native-reanimated";
import { hapticWorkoutComplete, hapticRankUp, hapticTap } from "../lib/hapticFeedback";
import { useLocalSearchParams, useRouter } from "expo-router";
import { useAppTheme } from "../contexts/ThemeContext";
import { glowColors, spacing, radius } from "../lib/theme";
import { LockeMascot } from "../components/Locke/LockeMascot";
import { RANK_IMAGES } from "../components/RankEvolutionPath";
import { formatPRName } from "../lib/prService";
import type { WorkoutCompleteParams } from "../lib/xpService";
import type { CardioPRKey } from "../lib/types";

// ── Rank flavor text ─────────────────────────────────────────────────────────

const RANK_FLAVOR: Record<string, string> = {
  Runt:     "Every legend starts somewhere.",
  Scout:    "The hunt begins.",
  Stalker:  "They can sense you coming.",
  Hunter:   "Nothing escapes you now.",
  Sentinel: "The pack follows you.",
  Alpha:    "You lead. They follow.",
  Apex:     "Unchallenged. Unstoppable.",
};

// ── Helpers ──────────────────────────────────────────────────────────────────

function formatDuration(seconds: number): string {
  const h = Math.floor(seconds / 3600);
  const m = Math.floor((seconds % 3600) / 60);
  const s = seconds % 60;
  if (h > 0) return `${h}:${String(m).padStart(2, "0")}:${String(s).padStart(2, "0")}`;
  return `${String(m).padStart(2, "0")}:${String(s).padStart(2, "0")}`;
}

// ── Particle (single dot for burst effect) ───────────────────────────────────

function Particle({
  angle,
  active,
  isViridian,
}: {
  angle: number;
  active: boolean;
  isViridian: boolean;
}) {
  const progress = useSharedValue(0);
  const distance = 60 + (angle * 17) % 40; // deterministic pseudo-random per particle
  const endX = Math.cos(angle) * distance;
  const endY = Math.sin(angle) * distance;

  useEffect(() => {
    if (active) {
      progress.value = 0;
      progress.value = withDelay(300, withTiming(1, { duration: 600, easing: Easing.out(Easing.quad) }));
    }
  }, [active]);

  const animStyle = useAnimatedStyle(() => ({
    opacity: interpolate(progress.value, [0, 0.3, 1], [0, 1, 0]),
    transform: [
      { translateX: interpolate(progress.value, [0, 1], [0, endX]) },
      { translateY: interpolate(progress.value, [0, 1], [0, endY]) },
      { scale: interpolate(progress.value, [0, 0.3, 1], [0.5, 1, 0.3]) },
    ],
  }));

  return (
    <Animated.View
      style={[
        particleStyles.dot,
        { backgroundColor: isViridian ? glowColors.viridian : "#E6EDF3" },
        animStyle,
      ]}
    />
  );
}

const PARTICLE_COUNT = 8;
const PARTICLE_ANGLES = Array.from(
  { length: PARTICLE_COUNT },
  (_, i) => (i / PARTICLE_COUNT) * Math.PI * 2
);

function ParticleBurst({ active }: { active: boolean }) {
  return (
    <View style={particleStyles.container} pointerEvents="none">
      {PARTICLE_ANGLES.map((angle, i) => (
        <Particle key={i} angle={angle} active={active} isViridian={i % 2 === 0} />
      ))}
    </View>
  );
}

const particleStyles = StyleSheet.create({
  container: {
    ...StyleSheet.absoluteFillObject,
    alignItems: "center",
    justifyContent: "center",
  },
  dot: {
    position: "absolute",
    width: 6,
    height: 6,
    borderRadius: 3,
  },
});

// ── Confetti Piece (single falling rectangle) ───────────────────────────────

const CONFETTI_COLORS = ["#00875A", "#E6EDF3", "#006B47", "#FFD60A"];
const CONFETTI_COUNT = 28;

// Pre-compute deterministic per-piece configs so each render is stable
const CONFETTI_CONFIGS = Array.from({ length: CONFETTI_COUNT }, (_, i) => ({
  color: CONFETTI_COLORS[i % CONFETTI_COLORS.length],
  // Spread x across 0-1, then jitter slightly with a hash
  startXPct: (i / CONFETTI_COUNT) + ((((i * 7 + 3) % 13) / 13 - 0.5) * (1 / CONFETTI_COUNT)),
  // Horizontal drift amplitude in px (some drift left, some right)
  driftAmp: ((i * 11 + 5) % 21) - 10, // -10 to +10
  // Rotation end angle in degrees
  rotEnd: ((i * 37 + 17) % 360),
  // Delay stagger in ms (0–300ms spread)
  delay: ((i * 23) % 300),
  // Duration jitter: 1500–2000ms
  duration: 1500 + ((i * 13) % 500),
}));

function ConfettiPiece({
  config,
  active,
  screenWidth,
  screenHeight,
}: {
  config: (typeof CONFETTI_CONFIGS)[number];
  active: boolean;
  screenWidth: number;
  screenHeight: number;
}) {
  const progress = useSharedValue(0);

  useEffect(() => {
    if (active) {
      progress.value = 0;
      progress.value = withDelay(
        config.delay,
        withTiming(1, { duration: config.duration, easing: Easing.in(Easing.quad) })
      );
    }
  }, [active]);

  const startX = config.startXPct * screenWidth;
  const fallDistance = screenHeight + 20; // fall past bottom edge

  const animStyle = useAnimatedStyle(() => {
    const t = progress.value;
    return {
      opacity: interpolate(t, [0, 0.1, 0.7, 1], [0, 1, 1, 0]),
      transform: [
        { translateX: startX + Math.sin(t * Math.PI * 2) * config.driftAmp },
        { translateY: interpolate(t, [0, 1], [-10, fallDistance]) },
        { rotate: `${interpolate(t, [0, 1], [0, config.rotEnd])}deg` },
      ],
    };
  });

  return (
    <Animated.View
      style={[
        confettiStyles.piece,
        { backgroundColor: config.color },
        animStyle,
      ]}
    />
  );
}

function ConfettiBurst({ active }: { active: boolean }) {
  const { width, height } = useWindowDimensions();

  if (!active) return null;

  return (
    <View style={confettiStyles.container} pointerEvents="none">
      {CONFETTI_CONFIGS.map((cfg, i) => (
        <ConfettiPiece
          key={i}
          config={cfg}
          active={active}
          screenWidth={width}
          screenHeight={height}
        />
      ))}
    </View>
  );
}

const confettiStyles = StyleSheet.create({
  container: {
    ...StyleSheet.absoluteFillObject,
    zIndex: 999,
  },
  piece: {
    position: "absolute",
    top: 0,
    left: 0,
    width: 4,
    height: 8,
    borderRadius: 1,
  },
});

// ── Level-Up Overlay ─────────────────────────────────────────────────────────

function LevelUpOverlay({
  visible,
  newRank,
  onContinue,
}: {
  visible: boolean;
  newRank: string;
  onContinue: () => void;
}) {
  const { theme } = useAppTheme();
  const rankImage = RANK_IMAGES[newRank] ?? RANK_IMAGES["Runt"];
  const flavorText = RANK_FLAVOR[newRank] ?? "";

  // Animation values
  const scrimOpacity = useSharedValue(0);
  const imageScale = useSharedValue(0.3);
  const imageOpacity = useSharedValue(0);
  const levelUpY = useSharedValue(15);
  const levelUpOpacity = useSharedValue(0);
  const rankNameScale = useSharedValue(0.8);
  const rankNameOpacity = useSharedValue(0);
  const flavorOpacity = useSharedValue(0);
  const btnY = useSharedValue(16);
  const btnOpacity = useSharedValue(0);
  const glowPulse = useSharedValue(0);

  useEffect(() => {
    if (visible) {
      hapticRankUp();

      scrimOpacity.value = withTiming(1, { duration: 300, easing: Easing.out(Easing.quad) });

      imageScale.value = withDelay(150, withSpring(1, { damping: 10, stiffness: 120, mass: 0.8 }));
      imageOpacity.value = withDelay(150, withTiming(1, { duration: 200 }));

      glowPulse.value = withDelay(150, withRepeat(
        withSequence(
          withTiming(1, { duration: 1500, easing: Easing.inOut(Easing.ease) }),
          withTiming(0, { duration: 1500, easing: Easing.inOut(Easing.ease) })
        ),
        -1,
        false
      ));

      levelUpY.value = withDelay(400, withTiming(0, { duration: 300, easing: Easing.out(Easing.quad) }));
      levelUpOpacity.value = withDelay(400, withTiming(1, { duration: 300 }));

      rankNameScale.value = withDelay(550, withSpring(1, { damping: 14, stiffness: 160, mass: 0.7 }));
      rankNameOpacity.value = withDelay(550, withTiming(1, { duration: 200 }));

      // Extra punch on rank name reveal — handled by hapticRankUp crescendo

      flavorOpacity.value = withDelay(700, withTiming(1, { duration: 400, easing: Easing.out(Easing.quad) }));

      btnY.value = withDelay(900, withTiming(0, { duration: 350, easing: Easing.out(Easing.back(1.1)) }));
      btnOpacity.value = withDelay(900, withTiming(1, { duration: 350 }));
    }
  }, [visible]);

  const scrimStyle = useAnimatedStyle(() => ({ opacity: scrimOpacity.value }));
  const imageStyle = useAnimatedStyle(() => ({
    transform: [{ scale: imageScale.value }],
    opacity: imageOpacity.value,
  }));
  const glowStyle = useAnimatedStyle(() => ({
    opacity: interpolate(glowPulse.value, [0, 1], [0.25, 0.6]),
  }));
  const levelUpStyle = useAnimatedStyle(() => ({
    transform: [{ translateY: levelUpY.value }],
    opacity: levelUpOpacity.value,
  }));
  const rankNameStyle = useAnimatedStyle(() => ({
    transform: [{ scale: rankNameScale.value }],
    opacity: rankNameOpacity.value,
  }));
  const flavorStyle = useAnimatedStyle(() => ({ opacity: flavorOpacity.value }));
  const btnStyle = useAnimatedStyle(() => ({
    transform: [{ translateY: btnY.value }],
    opacity: btnOpacity.value,
  }));

  const handleContinue = useCallback(() => {
    hapticTap();
    onContinue();
  }, [onContinue]);

  if (!visible) return null;

  return (
    <Modal visible={visible} transparent animationType="none" statusBarTranslucent>
      <Animated.View style={[levelUpStyles.scrim, scrimStyle]}>
        <ParticleBurst active={visible} />

        <View style={levelUpStyles.imageSection}>
          <Animated.View style={[levelUpStyles.glowCircle, glowStyle]} />
          <Animated.View style={imageStyle}>
            <View style={levelUpStyles.imageBorder}>
              <Image source={rankImage} style={levelUpStyles.rankImage} resizeMode="contain" />
            </View>
          </Animated.View>
        </View>

        <Animated.Text style={[levelUpStyles.eyebrow, { color: glowColors.viridian }, levelUpStyle]}>
          LEVEL UP!
        </Animated.Text>

        <Animated.Text style={[levelUpStyles.rankName, { color: theme.colors.text }, rankNameStyle]}>
          {newRank.toUpperCase()}
        </Animated.Text>

        <Animated.Text style={[levelUpStyles.flavor, { color: theme.colors.muted }, flavorStyle]}>
          {flavorText}
        </Animated.Text>

        <Animated.View style={[levelUpStyles.btnWrap, btnStyle]}>
          <Pressable
            style={[levelUpStyles.btn, { backgroundColor: theme.colors.primary }]}
            onPress={handleContinue}
          >
            <Text style={[levelUpStyles.btnText, { color: theme.colors.primaryText }]}>
              CONTINUE
            </Text>
          </Pressable>
        </Animated.View>
      </Animated.View>
    </Modal>
  );
}

const RANK_IMG_SIZE = 120;

const levelUpStyles = StyleSheet.create({
  scrim: {
    flex: 1,
    backgroundColor: "rgba(13, 17, 23, 0.88)",
    justifyContent: "center",
    alignItems: "center",
    paddingHorizontal: 32,
  },
  imageSection: {
    width: RANK_IMG_SIZE + 32,
    height: RANK_IMG_SIZE + 32,
    alignItems: "center",
    justifyContent: "center",
    marginBottom: spacing.md,
  },
  glowCircle: {
    position: "absolute",
    width: RANK_IMG_SIZE + 32,
    height: RANK_IMG_SIZE + 32,
    borderRadius: (RANK_IMG_SIZE + 32) / 2,
    backgroundColor: glowColors.viridian,
  },
  imageBorder: {
    width: RANK_IMG_SIZE + 4,
    height: RANK_IMG_SIZE + 4,
    borderRadius: (RANK_IMG_SIZE + 4) / 2,
    borderWidth: 2.5,
    borderColor: glowColors.viridian,
    alignItems: "center",
    justifyContent: "center",
    overflow: "hidden",
  },
  rankImage: {
    width: RANK_IMG_SIZE,
    height: RANK_IMG_SIZE,
  },
  eyebrow: {
    fontSize: 11,
    fontWeight: "700",
    letterSpacing: 2,
    textTransform: "uppercase",
    marginBottom: 6,
  },
  rankName: {
    fontSize: 28,
    fontWeight: "800",
    letterSpacing: 1.5,
    marginBottom: 8,
  },
  flavor: {
    fontSize: 14,
    fontWeight: "500",
    marginBottom: 32,
  },
  btnWrap: {
    width: "100%",
    paddingHorizontal: 24,
  },
  btn: {
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

// ── Animated XP Counter ──────────────────────────────────────────────────────

function AnimatedXPCounter({ targetXP }: { targetXP: number }) {
  const [displayVal, setDisplayVal] = useState(0);

  useEffect(() => {
    const startTime = Date.now();
    const duration = 800;

    const tick = () => {
      const elapsed = Date.now() - startTime;
      const t = Math.min(elapsed / duration, 1);
      // Easing.out(Easing.cubic) approximation
      const eased = 1 - Math.pow(1 - t, 3);
      setDisplayVal(Math.round(eased * targetXP));
      if (t < 1) requestAnimationFrame(tick);
    };

    // Match the 100ms delay on the reanimated shared value
    const timeout = setTimeout(() => requestAnimationFrame(tick), 100);
    return () => clearTimeout(timeout);
  }, [targetXP]);

  return (
    <Text style={[styles.statValue, { color: glowColors.viridian }]}>+{displayVal}</Text>
  );
}

// ── Main Screen ──────────────────────────────────────────────────────────────

export default function WorkoutCompleteScreen() {
  const { data } = useLocalSearchParams<{ data: string }>();
  const router = useRouter();
  const { theme } = useAppTheme();
  const { width: screenWidth } = useWindowDimensions();
  const statCardWidth = (screenWidth - 48 - STAT_CARD_GAP * 2) / 3;

  let params: WorkoutCompleteParams | null = null;
  try { params = data ? JSON.parse(data) : null; } catch (e) {
    if (__DEV__) console.warn("Failed to parse workout-complete params:", e);
  }

  const [claimed, setClaimed] = useState(false);
  const [showLevelUp, setShowLevelUp] = useState(false);
  const [confettiActive, setConfettiActive] = useState(false);

  // ── Block hardware back button ─────────────────────────────────────────────
  useEffect(() => {
    const sub = BackHandler.addEventListener("hardwareBackPress", () => true);
    return () => sub.remove();
  }, []);

  // ── Entry haptic ───────────────────────────────────────────────────────────
  useEffect(() => {
    const t = setTimeout(() => hapticTap(), 100);
    return () => clearTimeout(t);
  }, []);

  // ── Entry animations ──────────────────────────────────────────────────────

  // Phase 1: Locke mascot
  const lockeY = useSharedValue(30);
  const lockeOpacity = useSharedValue(0);

  // Phase 2: Headline + subtitle
  const headlineY = useSharedValue(20);
  const headlineOpacity = useSharedValue(0);

  // Phase 3: Stat cards (3 cards, staggered)
  const card1Y = useSharedValue(24);
  const card1Opacity = useSharedValue(0);
  const card1Scale = useSharedValue(0.92);
  const card2Y = useSharedValue(24);
  const card2Opacity = useSharedValue(0);
  const card2Scale = useSharedValue(0.92);
  const card3Y = useSharedValue(24);
  const card3Opacity = useSharedValue(0);
  const card3Scale = useSharedValue(0.92);

  // Phase 4: CLAIM XP button
  const btnY = useSharedValue(20);
  const btnOpacity = useSharedValue(0);
  const btnScale = useSharedValue(0.95);


  // Glow behind Locke
  const glowPulse = useSharedValue(0);

  // XP counter tick-up
  const xpCounter = useSharedValue(0);

  // Stat card pulse on claim
  const xpCardScale = useSharedValue(1);

  useEffect(() => {
    // Phase 1: Locke
    lockeY.value = withTiming(0, { duration: 400, easing: Easing.out(Easing.back(1.4)) });
    lockeOpacity.value = withTiming(1, { duration: 400 });

    // Glow pulse (infinite)
    glowPulse.value = withRepeat(
      withSequence(
        withTiming(1, { duration: 1500, easing: Easing.inOut(Easing.ease) }),
        withTiming(0, { duration: 1500, easing: Easing.inOut(Easing.ease) })
      ),
      -1,
      false
    );

    // Phase 2: Headline (delay 200ms)
    headlineY.value = withDelay(200, withTiming(0, { duration: 350, easing: Easing.out(Easing.quad) }));
    headlineOpacity.value = withDelay(200, withTiming(1, { duration: 350 }));

    // Phase 3: Stat cards (delay 400, 480, 560ms)
    card1Y.value = withDelay(400, withTiming(0, { duration: 300, easing: Easing.out(Easing.back(1.2)) }));
    card1Opacity.value = withDelay(400, withTiming(1, { duration: 300 }));
    card1Scale.value = withDelay(400, withTiming(1, { duration: 300, easing: Easing.out(Easing.back(1.2)) }));

    card2Y.value = withDelay(480, withTiming(0, { duration: 300, easing: Easing.out(Easing.back(1.2)) }));
    card2Opacity.value = withDelay(480, withTiming(1, { duration: 300 }));
    card2Scale.value = withDelay(480, withTiming(1, { duration: 300, easing: Easing.out(Easing.back(1.2)) }));

    card3Y.value = withDelay(560, withTiming(0, { duration: 300, easing: Easing.out(Easing.back(1.2)) }));
    card3Opacity.value = withDelay(560, withTiming(1, { duration: 300 }));
    card3Scale.value = withDelay(560, withTiming(1, { duration: 300, easing: Easing.out(Easing.back(1.2)) }));

    // Phase 4: CLAIM XP button (delay 700ms)
    btnY.value = withDelay(700, withTiming(0, { duration: 350, easing: Easing.out(Easing.back(1.1)) }));
    btnOpacity.value = withDelay(700, withTiming(1, { duration: 350 }));
    btnScale.value = withDelay(700, withTiming(1, { duration: 350, easing: Easing.out(Easing.back(1.1)) }));

  }, []);

  // ── Animated styles ────────────────────────────────────────────────────────

  const lockeStyle = useAnimatedStyle(() => ({
    transform: [{ translateY: lockeY.value }],
    opacity: lockeOpacity.value,
  }));

  const glowAnimStyle = useAnimatedStyle(() => ({
    opacity: interpolate(glowPulse.value, [0, 1], [0.15, 0.45]),
  }));

  const headlineStyle = useAnimatedStyle(() => ({
    transform: [{ translateY: headlineY.value }],
    opacity: headlineOpacity.value,
  }));

  const card1Style = useAnimatedStyle(() => ({
    transform: [{ translateY: card1Y.value }, { scale: card1Scale.value }],
    opacity: card1Opacity.value,
  }));
  const card2Style = useAnimatedStyle(() => ({
    transform: [{ translateY: card2Y.value }, { scale: card2Scale.value }],
    opacity: card2Opacity.value,
  }));
  const card3Style = useAnimatedStyle(() => ({
    transform: [{ translateY: card3Y.value }, { scale: card3Scale.value }],
    opacity: card3Opacity.value,
  }));

  const claimBtnStyle = useAnimatedStyle(() => ({
    transform: [{ translateY: btnY.value }, { scale: btnScale.value }],
    opacity: btnOpacity.value,
  }));


  const xpCardPulseStyle = useAnimatedStyle(() => ({
    transform: [{ scale: xpCardScale.value }],
  }));

  // ── CLAIM XP handler ──────────────────────────────────────────────────────

  const handleClaimXP = useCallback(() => {
    if (claimed || !params) return;
    setClaimed(true);
    setConfettiActive(true);

    hapticWorkoutComplete();

    // Button press spring
    btnScale.value = withSequence(
      withSpring(0.95, { damping: 12, stiffness: 200, mass: 0.6 }),
      withSpring(1, { damping: 12, stiffness: 200, mass: 0.6 })
    );

    // XP counter tick-up (delay 100ms)
    xpCounter.value = withDelay(
      100,
      withTiming(params.xpAwarded, { duration: 800, easing: Easing.out(Easing.cubic) })
    );

    // XP card pulse
    xpCardScale.value = withDelay(
      100,
      withSequence(
        withTiming(1.05, { duration: 200, easing: Easing.out(Easing.quad) }),
        withTiming(1, { duration: 200 })
      )
    );

    if (params.rankedUp) {
      // Show level-up overlay after claim animation (1200ms)
      setTimeout(() => {
        setShowLevelUp(true);
      }, 1200);
    } else {
      // No rank-up — navigate home after claim animation finishes
      setTimeout(() => navigateHome(), 1200);
    }
  }, [claimed, params]);

  // ── Navigation handlers ────────────────────────────────────────────────────

  const navigateHome = useCallback(() => {
    router.replace("/");
  }, [router]);

  const handleLevelUpContinue = useCallback(() => {
    setShowLevelUp(false);
    setTimeout(() => navigateHome(), 300);
  }, [navigateHome]);


  // ── Fallback if no params ──────────────────────────────────────────────────

  if (!params) {
    return (
      <View style={[styles.container, { backgroundColor: theme.colors.bg }]}>
        <Text style={[styles.headline, { color: theme.colors.text }]}>Workout Complete!</Text>
        <Pressable onPress={navigateHome} style={{ marginTop: 24 }}>
          <Text style={{ color: theme.colors.primary, fontSize: 16, fontWeight: "600" }}>Go Home</Text>
        </Pressable>
      </View>
    );
  }

  const completionPct = Math.round(params.completionPct * 100);
  const durationStr = formatDuration(params.durationSeconds);

  return (
    <View style={[styles.container, { backgroundColor: theme.colors.bg }]}>
      {/* Locke mascot + glow */}
      <Animated.View style={[styles.lockeSection, lockeStyle]}>
        <View style={styles.lockeGlowWrap}>
          <Animated.View style={[styles.lockeGlow, glowAnimStyle]} />
          <LockeMascot size={140} mood="celebrating" />
        </View>
      </Animated.View>

      {/* Headline + subtitle */}
      <Animated.View style={[styles.headlineSection, headlineStyle]}>
        <Text style={[styles.headline, { color: theme.colors.text }]}>
          WORKOUT COMPLETE!
        </Text>
        <Text style={[styles.subtitle, { color: theme.colors.muted }]}>
          Another one in the books.
        </Text>
      </Animated.View>

      {/* Stat cards */}
      <View style={styles.statsRow}>
        <Animated.View style={[styles.statCard, { width: statCardWidth, backgroundColor: theme.colors.surface, borderColor: theme.colors.border }, card1Style, xpCardPulseStyle]}>
          <Text style={[styles.statLabel, { color: theme.colors.muted }]}>TOTAL XP</Text>
          {claimed ? (
            <AnimatedXPCounter targetXP={params.xpAwarded} />
          ) : (
            <Text style={[styles.statValue, { color: glowColors.viridian }]}>+{params.xpAwarded}</Text>
          )}
        </Animated.View>

        <Animated.View style={[styles.statCard, { width: statCardWidth, backgroundColor: theme.colors.surface, borderColor: theme.colors.border }, card2Style]}>
          <Text style={[styles.statLabel, { color: theme.colors.muted }]}>
            {params.isCardio ? "CALORIES" : "PERFECT"}
          </Text>
          <Text style={[styles.statValue, { color: theme.colors.text }]}>
            {params.isCardio ? `${params.cardioCalories ?? 0} cal` : `${completionPct}%`}
          </Text>
        </Animated.View>

        <Animated.View style={[styles.statCard, { width: statCardWidth, backgroundColor: theme.colors.surface, borderColor: theme.colors.border }, card3Style]}>
          <Text style={[styles.statLabel, { color: theme.colors.muted }]}>TIME</Text>
          <Text style={[styles.statValue, { color: theme.colors.text }]}>{durationStr}</Text>
        </Animated.View>
      </View>

      {/* PR pills (cardio) */}
      {params.isCardio && params.newPRs && params.newPRs.length > 0 && (
        <Animated.View entering={FadeIn.delay(600).duration(300)} style={styles.prSection}>
          <Text style={[styles.prSectionLabel, { color: theme.colors.muted }]}>NEW RECORDS</Text>
          <View style={styles.prPills}>
            {params.newPRs.map((key) => (
              <View key={key} style={[styles.prPill, { backgroundColor: theme.colors.primary + "20", borderColor: theme.colors.primary + "40" }]}>
                <Text style={[styles.prPillText, { color: theme.colors.primary }]}>
                  {formatPRName(key as CardioPRKey)}
                </Text>
              </View>
            ))}
          </View>
        </Animated.View>
      )}

      {/* Badges unlocked */}
      {params.newBadges && params.newBadges.length > 0 && (
        <Animated.View entering={FadeIn.delay(700).duration(300)} style={styles.badgeSection}>
          <Text style={[styles.badgeSectionLabel, { color: theme.colors.muted }]}>BADGES UNLOCKED</Text>
          {params.newBadges.map((badge) => (
            <View key={badge.id} style={[styles.badgeRow, { backgroundColor: theme.colors.surface, borderColor: theme.colors.border }]}>
              <Text style={[styles.badgeName, { color: theme.colors.text }]}>{badge.name}</Text>
              <Text style={[styles.badgeDesc, { color: theme.colors.muted }]}>{badge.description}</Text>
            </View>
          ))}
          <Pressable onPress={() => router.push("/badges")} style={styles.viewAllBadges}>
            <Text style={[styles.viewAllBadgesText, { color: theme.colors.primary }]}>
              View All Badges →
            </Text>
          </Pressable>
        </Animated.View>
      )}

      {/* CLAIM XP / CLAIMED button */}
      <Animated.View style={claimBtnStyle}>
        <Pressable
          style={[
            styles.claimBtn,
            { width: screenWidth - 48, backgroundColor: claimed ? theme.colors.mutedBg : theme.colors.primary },
          ]}
          onPress={handleClaimXP}
          disabled={claimed}
        >
          <Text
            style={[
              styles.claimBtnText,
              { color: claimed ? glowColors.viridian : theme.colors.primaryText },
            ]}
          >
            {claimed ? "CLAIMED!" : "CLAIM XP"}
          </Text>
        </Pressable>
      </Animated.View>

      {/* Confetti overlay */}
      <ConfettiBurst active={confettiActive} />

      {/* Level-Up Overlay */}
      <LevelUpOverlay
        visible={showLevelUp}
        newRank={params.newRank}
        onContinue={handleLevelUpContinue}
      />
    </View>
  );
}

// ── Styles ───────────────────────────────────────────────────────────────────

const MASCOT_GLOW_SIZE = 168;
const STAT_CARD_GAP = 8;

const styles = StyleSheet.create({
  container: {
    flex: 1,
    alignItems: "center",
    justifyContent: "center",
    paddingHorizontal: 24,
  },
  lockeSection: {
    marginBottom: spacing.md,
  },
  lockeGlowWrap: {
    width: MASCOT_GLOW_SIZE,
    height: MASCOT_GLOW_SIZE,
    alignItems: "center",
    justifyContent: "center",
  },
  lockeGlow: {
    position: "absolute",
    width: MASCOT_GLOW_SIZE,
    height: MASCOT_GLOW_SIZE,
    borderRadius: MASCOT_GLOW_SIZE / 2,
    backgroundColor: glowColors.viridian,
  },
  headlineSection: {
    alignItems: "center",
    marginBottom: spacing.lg,
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
    gap: STAT_CARD_GAP,
    marginBottom: spacing.xl,
  },
  statCard: {
    height: 80,
    borderRadius: radius.md,
    borderWidth: 1,
    alignItems: "center",
    justifyContent: "center",
    paddingVertical: spacing.sm,
  },
  statLabel: {
    fontSize: 11,
    fontWeight: "700",
    letterSpacing: 1.2,
    textTransform: "uppercase",
    marginBottom: 4,
  },
  statValue: {
    fontSize: 22,
    fontWeight: "700",
  },
  claimBtn: {
    height: 56,
    borderRadius: 14,
    alignItems: "center",
    justifyContent: "center",
  },
  claimBtnText: {
    fontSize: 16,
    fontWeight: "700",
    letterSpacing: 1,
  },
  // PR pills
  prSection: {
    alignItems: "center",
    marginBottom: spacing.md,
  },
  prSectionLabel: {
    fontSize: 10,
    fontWeight: "700",
    letterSpacing: 1.2,
    textTransform: "uppercase",
    marginBottom: 8,
  },
  prPills: {
    flexDirection: "row",
    flexWrap: "wrap",
    gap: 6,
    justifyContent: "center",
  },
  prPill: {
    paddingHorizontal: 12,
    paddingVertical: 6,
    borderRadius: radius.full,
    borderWidth: 1,
  },
  prPillText: {
    fontSize: 12,
    fontWeight: "700",
  },
  // Badges
  badgeSection: {
    alignItems: "center",
    width: "100%",
    marginBottom: spacing.md,
  },
  badgeSectionLabel: {
    fontSize: 10,
    fontWeight: "700",
    letterSpacing: 1.2,
    textTransform: "uppercase",
    marginBottom: 8,
  },
  badgeRow: {
    width: "100%",
    borderWidth: 1,
    borderRadius: radius.md,
    paddingHorizontal: 14,
    paddingVertical: 10,
    marginBottom: 6,
  },
  badgeName: {
    fontSize: 14,
    fontWeight: "700",
    marginBottom: 2,
  },
  badgeDesc: {
    fontSize: 12,
  },
  viewAllBadges: {
    marginTop: 8,
    paddingVertical: 6,
  },
  viewAllBadgesText: {
    fontSize: 14,
    fontWeight: "700",
  },
});
