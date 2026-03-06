/**
 * Recovery Dashboard — app/(tabs)/recovery.tsx
 *
 * Sections (top → bottom):
 *   1. Readiness Score Hero  — circular gauge, label, component breakdown
 *   2. Locke Coach Card      — mascot + headline + subtext + expandable tips
 *   3. Smart Deload Card     — conditional, when deloadTriggered
 *   4. Plateau Card          — conditional, when plateau detected
 *   5. Muscle Heatmap        — MuscleHeatmapDual; tap muscle → detail sheet
 *   6. 7-Day Trend Graph     — RecoveryTrendGraph
 *   7. Training Load         — ACWR gauge, acute/chronic comparison, adaptation
 *
 * Performance:
 *   - All data from useRecovery (single Promise.all at mount)
 *   - React.memo on every sub-component
 *   - No inline style objects (StyleSheet.create for all)
 *   - Skeleton loading state during data fetch
 */
import React, { useCallback, useEffect, useMemo, useRef, useState } from 'react';
import {
  LayoutChangeEvent,
  Pressable,
  RefreshControl,
  ScrollView,
  StyleSheet,
  Text,
  View,
} from 'react-native';
import { useFocusEffect, useRouter } from 'expo-router';
import Svg, { Circle, Defs, LinearGradient as SvgLinearGradient, Path, Rect, Stop } from 'react-native-svg';
import { Ionicons } from '@expo/vector-icons';
import Animated, {
  cancelAnimation,
  Easing,
  FadeIn,
  FadeInDown,
  useAnimatedProps,
  useAnimatedStyle,
  useSharedValue,
  withRepeat,
  withSequence,
  withSpring,
  withTiming,
  type SharedValue,
} from 'react-native-reanimated';

// Gentle section entrance — short fade + subtle 8px slide, no spring bounce
const sectionEnter = (delay: number) =>
  FadeInDown.delay(delay).duration(350).damping(20).stiffness(150);
import * as Haptics from 'expo-haptics';
import { useSafeAreaInsets } from 'react-native-safe-area-context';
import { useAppTheme } from '../../contexts/ThemeContext';
import { glowColors, radius, spacing, typography } from '../../lib/theme';
import { useRecovery } from '../../hooks/useRecovery';
import { MuscleHeatmapDual } from '../../components/recovery/MuscleHeatmapDual';
import { RecoveryTrendGraph } from '../../components/recovery/RecoveryTrendGraph';
import { LockeMascot } from '../../components/Locke/LockeMascot';
import { Card } from '../../components/Card';
import { Skeleton } from '../../components/Skeleton';
import { AppBottomSheet } from '../../components/AppBottomSheet';
import type { MuscleGroup, MuscleFatigueMap, ReadinessScore, PlateauInsight } from '../../lib/types';
import type { CoachOutput } from '../../lib/lockeCoachEngine';
import type { DeloadCard as DeloadCardData } from '../../lib/smartDeload';
import { getEnergyStatesForTheme, getEnergyState, getStateLabel, type MuscleEnergyState } from '../../lib/muscleEnergyStates';
import { computeMuscleReadiness, type MuscleReadinessResult } from '../../lib/muscleReadinessScore';
import { getRecoveryCommentary, type RecoveryCommentary, type RecoveryCommentaryTone } from '../../lib/lockeRecoveryCommentary';
import { useXP } from '../../hooks/useXP';
import { DevFatiguePanel } from '../../components/recovery/DevFatiguePanel';
import { ProfileButton } from '../../components/ProfileButton';

// ── Readiness gauge helpers ───────────────────────────────────────────────────
const GAUGE_START_DEG = 135;
const GAUGE_SWEEP_DEG = 270;
const GAUGE_R = 62;
const GAUGE_CX = 80;
const GAUGE_CY = 82;
const GAUGE_STROKE = 10;
const GAUGE_GLOW_STROKE = 22;

// Total arc length for strokeDashoffset animation
const ARC_LENGTH = 2 * Math.PI * GAUGE_R * (GAUGE_SWEEP_DEG / 360); // ≈ 273.3

// Created once at module level — zero per-render allocation
const AnimatedPath = Animated.createAnimatedComponent(Path);

function degToRad(deg: number): number {
  return (deg * Math.PI) / 180;
}

function arcPoint(deg: number): { x: number; y: number } {
  const rad = degToRad(deg);
  return {
    x: GAUGE_CX + GAUGE_R * Math.cos(rad),
    y: GAUGE_CY + GAUGE_R * Math.sin(rad),
  };
}

const GAUGE_BG_PATH = (() => {
  const start = arcPoint(GAUGE_START_DEG);
  const end = arcPoint(GAUGE_START_DEG + GAUGE_SWEEP_DEG - 0.5);
  return (
    `M ${start.x.toFixed(2)} ${start.y.toFixed(2)} ` +
    `A ${GAUGE_R} ${GAUGE_R} 0 1 1 ${end.x.toFixed(2)} ${end.y.toFixed(2)}`
  );
})();

function readinessColor(score: number): string {
  if (score >= 80) return glowColors.viridian;
  if (score >= 60) return '#58A6FF';
  if (score >= 40) return '#FF9800';
  return '#F44336';
}

// ── Commentary tone color map ─────────────────────────────────────────────────
const TONE_COLOR: Record<RecoveryCommentaryTone, string> = {
  nurturing:  glowColors.viridian,
  coaching:   '#58A6FF',
  intense:    '#FF9800',
  savage:     '#F44336',
  welcoming:  glowColors.viridian,
};

// ── Mini gauge constants (score explanation sheet) ────────────────────────────
const MINI_R  = 32;
const MINI_CX = 40;
const MINI_CY = 42;
const MINI_GAUGE_STROKE = 5;
const MINI_ARC_LENGTH = 2 * Math.PI * MINI_R * (GAUGE_SWEEP_DEG / 360);
const MINI_GAUGE_BG_PATH = (() => {
  const sRad = degToRad(GAUGE_START_DEG);
  const eRad = degToRad(GAUGE_START_DEG + GAUGE_SWEEP_DEG - 0.5);
  return (
    `M ${(MINI_CX + MINI_R * Math.cos(sRad)).toFixed(2)} ${(MINI_CY + MINI_R * Math.sin(sRad)).toFixed(2)} ` +
    `A ${MINI_R} ${MINI_R} 0 1 1 ${(MINI_CX + MINI_R * Math.cos(eRad)).toFixed(2)} ${(MINI_CY + MINI_R * Math.sin(eRad)).toFixed(2)}`
  );
})();

// ── Empty state gauge constants (0% hint ring) ────────────────────────────────
const EMPTY_R  = 38;
const EMPTY_CX = 50;
const EMPTY_CY = 52;
const EMPTY_ARC_LENGTH = 2 * Math.PI * EMPTY_R * (GAUGE_SWEEP_DEG / 360);
const EMPTY_GAUGE_PATH = (() => {
  const sRad = degToRad(GAUGE_START_DEG);
  const eRad = degToRad(GAUGE_START_DEG + GAUGE_SWEEP_DEG - 0.5);
  return (
    `M ${(EMPTY_CX + EMPTY_R * Math.cos(sRad)).toFixed(2)} ${(EMPTY_CY + EMPTY_R * Math.sin(sRad)).toFixed(2)} ` +
    `A ${EMPTY_R} ${EMPTY_R} 0 1 1 ${(EMPTY_CX + EMPTY_R * Math.cos(eRad)).toFixed(2)} ${(EMPTY_CY + EMPTY_R * Math.sin(eRad)).toFixed(2)}`
  );
})();

// ── Muscle label ──────────────────────────────────────────────────────────────
function muscleLabel(muscle: MuscleGroup): string {
  return muscle.split('_').map((w) => w[0].toUpperCase() + w.slice(1)).join(' ');
}

// ── Explanation data ──────────────────────────────────────────────────────────
type PillKey = 'Freshness' | 'Block Fit' | 'Workload';

const READINESS_EXPLANATION = {
  title: 'Readiness Score',
  description:
    'How ready your body is for a hard session, from 0 to 100. Based on muscle freshness, training phase, and recent workload.',
  tip: 'Above 60 — go hard. Below 40 — consider a lighter day.',
};

const PILL_EXPLANATIONS: Record<PillKey, { title: string; description: string; tip: string }> = {
  Freshness: {
    title: 'Muscle Freshness',
    description:
      'How recovered your muscles are across all tracked muscle groups.',
    tip: 'Space out sessions hitting the same muscles and prioritize sleep.',
  },
  'Block Fit': {
    title: 'Block Fit',
    description:
      'How well your fatigue matches your current training phase. Some fatigue is expected during heavy blocks.',
    tip: 'Stick to your periodization plan — ease off during deload weeks.',
  },
  Workload: {
    title: 'Workload Balance',
    description:
      'Your last 7 days of training compared to your 28-day average. The sweet spot is a 0.8–1.3 ratio.',
    tip: 'Ramp volume gradually — no more than 10% per week.',
  },
};

// ── Sub-components ────────────────────────────────────────────────────────────

/** Pressable card wrapper with animated scale/opacity feedback. */
const PressableCardWrap = React.memo(function PressableCardWrap({
  children,
  onPress,
}: {
  children: React.ReactNode;
  onPress?: () => void;
}) {
  const scale = useSharedValue(1);
  const opacity = useSharedValue(1);

  const pressStyle = useAnimatedStyle(() => ({
    transform: [{ scale: scale.value }],
    opacity: opacity.value,
  }));

  const handlePressIn = useCallback(() => {
    scale.value = withSpring(0.98, { damping: 15, stiffness: 400 });
    opacity.value = withTiming(0.95, { duration: 100 });
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, []);

  const handlePressOut = useCallback(() => {
    scale.value = withSpring(1, { damping: 15, stiffness: 300 });
    opacity.value = withTiming(1, { duration: 150 });
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, []);

  return (
    <Pressable onPress={onPress} onPressIn={handlePressIn} onPressOut={handlePressOut}>
      <Animated.View style={pressStyle}>{children}</Animated.View>
    </Pressable>
  );
});

/** Circular readiness gauge with animated fill + score + level-up celebration. */
const ReadinessHero = React.memo(function ReadinessHero({
  readiness,
  onPillPress,
  onScorePress,
}: {
  readiness: ReadinessScore;
  onPillPress: (key: PillKey) => void;
  onScorePress: () => void;
}) {
  const { theme } = useAppTheme();
  const arcColor = readinessColor(readiness.score);

  // Animated score counter — counts up from 0 to target over ~800ms
  const [displayScore, setDisplayScore] = useState(0);
  const scoreTarget = useRef(readiness.score);

  useEffect(() => {
    scoreTarget.current = readiness.score;
    const startTime = Date.now();
    const startVal = 0;
    const endVal = readiness.score;
    const duration = 800;
    let raf: number;

    const tick = () => {
      const elapsed = Date.now() - startTime;
      const t = Math.min(elapsed / duration, 1);
      // Ease-out cubic
      const eased = 1 - Math.pow(1 - t, 3);
      const val = Math.round(startVal + (endVal - startVal) * eased);
      setDisplayScore(val);
      if (t < 1) {
        raf = requestAnimationFrame(tick);
      }
    };
    raf = requestAnimationFrame(tick);
    return () => cancelAnimationFrame(raf);
  }, [readiness.score]);

  // Threshold crossing detection
  const prevScoreRef = useRef(readiness.score);
  const [milestoneText, setMilestoneText] = useState('');

  // Animations: gauge fill, score scale, arc flash, milestone badge
  const progress = useSharedValue(0);
  const scoreScale = useSharedValue(1);
  const flashOpacity = useSharedValue(0);
  const milestoneBadgeOpacity = useSharedValue(0);
  const milestoneBadgeY = useSharedValue(10);

  useEffect(() => {
    const prev = prevScoreRef.current;
    const curr = readiness.score;
    prevScoreRef.current = curr;

    // Animate gauge fill
    progress.value = withSpring(curr, { damping: 18, stiffness: 80, mass: 1 });

    // Detect threshold crossings (40→60 or 60→80)
    const crossed60 = prev < 60 && curr >= 60;
    const crossed80 = prev < 80 && curr >= 80;
    if (crossed60 || crossed80) {
      const text = crossed80 ? 'Recovery Milestone!' : 'Level Up!';
      setMilestoneText(text);
      setTimeout(() => setMilestoneText(''), 2600);

      // Scale score text: 1 → 1.15 → 1
      scoreScale.value = withSequence(
        withSpring(1.15, { damping: 12, stiffness: 400 }),
        withSpring(1, { damping: 15, stiffness: 300 }),
      );
      // Flash arc overlay
      flashOpacity.value = withSequence(
        withTiming(0.55, { duration: 180 }),
        withTiming(0, { duration: 700 }),
      );
      // Badge: slide up + fade in, hold 1.4s, fade out
      milestoneBadgeY.value = 10;
      milestoneBadgeOpacity.value = 0;
      milestoneBadgeY.value = withSpring(0, { damping: 14, stiffness: 200 });
      milestoneBadgeOpacity.value = withSequence(
        withTiming(1, { duration: 280 }),
        withTiming(1, { duration: 1400 }),
        withTiming(0, { duration: 320 }),
      );
    }
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [readiness.score]);

  const animatedGaugeProps = useAnimatedProps(() => ({
    strokeDashoffset: ARC_LENGTH * (1 - Math.max(0, Math.min(100, progress.value)) / 100),
  }));

  const flashArcProps = useAnimatedProps(() => ({
    strokeDashoffset: ARC_LENGTH * (1 - Math.max(0, Math.min(100, progress.value)) / 100),
    strokeOpacity: flashOpacity.value,
  }));

  const scoreScaleStyle = useAnimatedStyle(() => ({
    transform: [{ scale: scoreScale.value }],
  }));

  const milestoneBadgeStyle = useAnimatedStyle(() => ({
    opacity: milestoneBadgeOpacity.value,
    transform: [{ translateY: milestoneBadgeY.value }],
  }));

  return (
    <View style={styles.heroContainer}>
      <Svg width={164} height={164} viewBox="0 0 160 164">
        {/* Background track */}
        <Path
          d={GAUGE_BG_PATH}
          stroke={theme.colors.mutedBg}
          strokeWidth={GAUGE_STROKE}
          fill="none"
          strokeLinecap="round"
        />
        {/* Neon glow — wider, semi-transparent stroke behind the colored arc */}
        <AnimatedPath
          d={GAUGE_BG_PATH}
          stroke={arcColor}
          strokeWidth={GAUGE_GLOW_STROKE}
          fill="none"
          strokeLinecap="round"
          strokeOpacity={0.15}
          strokeDasharray={[ARC_LENGTH, ARC_LENGTH]}
          animatedProps={animatedGaugeProps}
        />
        {/* Animated score arc */}
        <AnimatedPath
          d={GAUGE_BG_PATH}
          stroke={arcColor}
          strokeWidth={GAUGE_STROKE}
          fill="none"
          strokeLinecap="round"
          strokeDasharray={[ARC_LENGTH, ARC_LENGTH]}
          animatedProps={animatedGaugeProps}
        />
        {/* Level-up flash arc — brighter, wider, briefly visible on threshold cross */}
        <AnimatedPath
          d={GAUGE_BG_PATH}
          stroke={arcColor}
          strokeWidth={GAUGE_STROKE + 5}
          fill="none"
          strokeLinecap="round"
          strokeDasharray={[ARC_LENGTH, ARC_LENGTH]}
          animatedProps={flashArcProps}
        />
      </Svg>

      {/* Level-up milestone badge — floats above gauge */}
      {milestoneText ? (
        <Animated.View
          style={[
            styles.milestoneBadge,
            { borderColor: arcColor + '80', backgroundColor: arcColor + '18' },
            milestoneBadgeStyle,
          ]}
          pointerEvents="none"
        >
          <Text style={[styles.milestoneBadgeText, { color: arcColor }]}>{milestoneText}</Text>
        </Animated.View>
      ) : null}

      {/* Centered overlay text — tappable for explanation */}
      <Pressable
        onPress={onScorePress}
        style={({ pressed }) => [styles.gaugeTextOverlay, { opacity: pressed ? 0.7 : 1 }]}
      >
        <Animated.View style={scoreScaleStyle}>
          <Text style={[styles.gaugeScore, { color: arcColor }]}>{displayScore}</Text>
        </Animated.View>
        <View style={[styles.gaugeLabelPill, { backgroundColor: arcColor + '15' }]}>
          <Text style={[styles.gaugeLabel, { color: arcColor }]}>{readiness.label}</Text>
        </View>
      </Pressable>

      {/* Component breakdown */}
      <View style={styles.breakdownRow}>
        <BreakdownPill
          label="Freshness"
          value={Math.round(readiness.components.muscleFreshness)}
          color={theme.colors.primary}
          onPress={() => onPillPress('Freshness')}
          enterDelay={0}
        />
        <BreakdownPill
          label="Block Fit"
          value={Math.round(readiness.components.blockContext)}
          color="#58A6FF"
          onPress={() => onPillPress('Block Fit')}
          enterDelay={80}
        />
        <BreakdownPill
          label="Workload"
          value={Math.round(readiness.components.acwrScore)}
          color="#FF9800"
          onPress={() => onPillPress('Workload')}
          enterDelay={160}
        />
      </View>
      <Text style={[styles.pillHint, { color: theme.colors.muted + 'AA' }]}>
        Tap a score to learn more
      </Text>
    </View>
  );
});

const BreakdownPill = React.memo(function BreakdownPill({
  label,
  value,
  color,
  onPress,
  enterDelay,
}: {
  label: string;
  value: number;
  color: string;
  onPress: () => void;
  enterDelay?: number;
}) {
  const { theme } = useAppTheme();
  const scale = useSharedValue(1);
  const animStyle = useAnimatedStyle(() => ({ transform: [{ scale: scale.value }] }));

  const handlePressIn = useCallback(() => {
    scale.value = withSpring(0.93, { damping: 15, stiffness: 400 });
  }, [scale]);

  const handlePressOut = useCallback(() => {
    scale.value = withSpring(1, { damping: 15, stiffness: 400 });
  }, [scale]);

  return (
    <Animated.View entering={sectionEnter(enterDelay ?? 0)} style={styles.pill}>
      <Animated.View style={animStyle}>
        <Pressable
          onPress={onPress}
          onPressIn={handlePressIn}
          onPressOut={handlePressOut}
          style={[
            styles.pillInner,
            { borderColor: color + '55', backgroundColor: color + '18' },
          ]}
        >
          <Text style={[styles.pillValue, { color }]}>{value}</Text>
          <Text style={[styles.pillLabel, { color: theme.colors.muted }]}>{label}</Text>
        </Pressable>
      </Animated.View>
    </Animated.View>
  );
});

// Mascot glow color map
const MOOD_GLOW: Record<string, string> = {
  celebrating: glowColors.viridian,
  savage: glowColors.viridian,
  encouraging: glowColors.viridian,
  focused: '#58A6FF',
  concerned: '#FF9800',
  rest_day: '#9DA5B0',
  neutral: '#9DA5B0',
};

/** Locke mascot + coach headline/subtext + optional tips + commentary phrase. */
const CoachCard = React.memo(function CoachCard({
  coach,
  commentary,
}: {
  coach: CoachOutput;
  commentary?: RecoveryCommentary;
}) {
  const { theme } = useAppTheme();
  const [expanded, setExpanded] = useState(false);
  const tipCount = coach.tips?.length ?? 0;
  const hasTips = tipCount > 0;
  const mascotGlow = MOOD_GLOW[coach.mascotMood] ?? theme.colors.muted;

  // Commentary tone color + savage border tint
  const commentaryColor = commentary ? (TONE_COLOR[commentary.tone] ?? theme.colors.muted) : theme.colors.muted;
  const isSavage = commentary?.tone === 'savage';
  const cardBorderStyle = isSavage
    ? { borderColor: theme.colors.danger + '50', borderWidth: 1.5 }
    : undefined;

  // Chevron rotation animation for tip toggle
  const chevronRot = useSharedValue(0);
  const chevronStyle = useAnimatedStyle(() => ({
    transform: [{ rotate: `${chevronRot.value}deg` }],
  }));

  const toggleTips = useCallback(() => {
    setExpanded((v) => {
      chevronRot.value = withSpring(!v ? 180 : 0, { damping: 15, stiffness: 200 });
      return !v;
    });
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, []);

  // Mascot floating animation — intensity driven by coach output
  const mascotFloat = useSharedValue(0);
  const intensity = coach.animationIntensity ?? 'medium';
  useEffect(() => {
    const amplitudeMap = { low: -3, medium: -6, high: -10 };
    const durationMap = { low: 3000, medium: 2200, high: 1400 };
    mascotFloat.value = withRepeat(
      withTiming(amplitudeMap[intensity], {
        duration: durationMap[intensity],
        easing: Easing.inOut(Easing.sin),
      }),
      -1,
      true,
    );
    return () => cancelAnimation(mascotFloat);
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [intensity]);
  const mascotFloatStyle = useAnimatedStyle(() => ({
    transform: [{ translateY: mascotFloat.value }],
  }));

  return (
    <Card style={cardBorderStyle} onPress={hasTips ? toggleTips : undefined}>
      <View style={styles.coachColumn}>
        <Animated.View style={[styles.coachMascotWrap, mascotFloatStyle]}>
          <View style={[styles.coachMascotGlow, { backgroundColor: mascotGlow }]} />
          <LockeMascot size={96} mood={coach.mascotMood} />
        </Animated.View>
        <Text style={[styles.coachHeadline, { color: theme.colors.text }]} numberOfLines={2}>
          {coach.headline}
        </Text>
        <Text style={[styles.coachSubtext, { color: theme.colors.muted }]} numberOfLines={3}>
          {coach.subtext}
        </Text>
        {/* Commentary phrase — always visible, even collapsed */}
        {commentary && (
          <Text style={[styles.commentaryPhrase, { color: commentaryColor }]} numberOfLines={2}>
            {commentary.subtext}
          </Text>
        )}
        {hasTips && (
          <Pressable
            onPress={toggleTips}
            style={[
              styles.tipsPillBtn,
              { backgroundColor: theme.colors.primary + '15', borderColor: theme.colors.primary + '30' },
            ]}
          >
            <View style={styles.tipsPillRow}>
              <Text style={[styles.tipsPillText, { color: theme.colors.primary }]}>
                {expanded ? 'Hide Tips' : `View ${tipCount} Tip${tipCount > 1 ? 's' : ''}`}
              </Text>
              <Animated.View style={chevronStyle}>
                <Ionicons name="chevron-down" size={14} color={theme.colors.primary} />
              </Animated.View>
            </View>
          </Pressable>
        )}
      </View>
      {expanded && coach.tips && (
        <View style={[styles.tipsContainer, { borderTopColor: theme.colors.border }]}>
          {coach.tips.map((tip, i) => (
            <Animated.View key={i} entering={sectionEnter(i * 40)} style={styles.tipRow}>
              <Text style={[styles.tipBullet, { color: theme.colors.primary }]}>•</Text>
              <Text style={[styles.tipText, { color: theme.colors.text }]}>{tip}</Text>
            </Animated.View>
          ))}
          {/* Commentary detail — featured insight shown in expanded section */}
          {commentary && (
            <Animated.View
              entering={sectionEnter((coach.tips?.length ?? 0) * 40 + 20)}
              style={[styles.commentaryDetailWrap, { borderTopColor: commentaryColor + '30', backgroundColor: commentaryColor + '0C' }]}
            >
              <Text style={[styles.tipBullet, { color: commentaryColor }]}>★</Text>
              <Text style={[styles.commentaryDetailText, { color: commentaryColor }]}>
                {commentary.headline}
              </Text>
            </Animated.View>
          )}
        </View>
      )}
    </Card>
  );
});

/** Prominent deload recommendation card with pulsing orange glow. */
const DeloadCard = React.memo(function DeloadCard({ card }: { card: DeloadCardData }) {
  const { theme } = useAppTheme();
  const [expanded, setExpanded] = React.useState(false);
  const glowOpacity = useSharedValue(0.2);
  const chevronRot = useSharedValue(0);

  useEffect(() => {
    glowOpacity.value = withRepeat(
      withSequence(
        withTiming(0.55, { duration: 1600, easing: Easing.inOut(Easing.sin) }),
        withTiming(0.15, { duration: 1600, easing: Easing.inOut(Easing.sin) }),
      ),
      -1,
      false,
    );
    return () => cancelAnimation(glowOpacity);
    // glowOpacity is a stable shared value ref
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, []);

  const glowStyle = useAnimatedStyle(() => ({ opacity: glowOpacity.value }));
  const chevronStyle = useAnimatedStyle(() => ({
    transform: [{ rotate: `${chevronRot.value}deg` }],
  }));

  const toggleExpand = useCallback(() => {
    setExpanded((v) => {
      chevronRot.value = withSpring(!v ? 180 : 0, { damping: 15, stiffness: 200 });
      return !v;
    });
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, []);

  return (
    <View style={styles.deloadWrapper}>
      {/* Pulsing glow layer — rendered first so it appears behind the card */}
      <Animated.View style={[styles.deloadGlow, glowStyle]} />
      <Card style={{ ...styles.deloadCard, borderColor: '#FF9800', marginBottom: 0 }}>
      <View style={styles.deloadHeader}>
        <Ionicons name="refresh-circle" size={24} color="#FF9800" />
        <Text style={[styles.deloadTitle, { color: '#FF9800' }]}>{card.headline}</Text>
      </View>
      <Text style={[styles.deloadBody, { color: theme.colors.text }]}>
        {card.explanation}
      </Text>
      {card.actions.length > 0 && (
        <>
          <Pressable onPress={toggleExpand} style={styles.deloadToggleRow}>
            <Text style={[styles.deloadActionsToggle, { color: theme.colors.primary }]}>
              {expanded ? 'Hide actions' : 'Show actions'}
            </Text>
            <Animated.View style={chevronStyle}>
              <Ionicons name="chevron-down" size={16} color={theme.colors.primary} />
            </Animated.View>
          </Pressable>
          {expanded && (
            <View style={[styles.deloadActions, { borderTopColor: theme.colors.border }]}>
              {card.actions.map((action, i) => (
                <View key={i} style={styles.deloadActionRow}>
                  <Text style={[styles.deloadActionBullet, { color: '#FF9800' }]}>
                    {i + 1}.
                  </Text>
                  <Text style={[styles.deloadActionText, { color: theme.colors.text }]}>
                    {action}
                  </Text>
                </View>
              ))}
            </View>
          )}
        </>
      )}
    </Card>
    </View>
  );
});

/** Plateau detection card — shown when detectPlateau returns a result. */
const PlateauCard = React.memo(function PlateauCard({
  plateau,
}: {
  plateau: PlateauInsight;
}) {
  const { theme } = useAppTheme();
  const classColor =
    plateau.classification === 'under_recovered' ? theme.colors.danger :
    plateau.classification === 'under_stimulated' ? '#58A6FF' :
    '#FF9800';
  const classLabel =
    plateau.classification === 'under_recovered' ? 'Under-Recovered' :
    plateau.classification === 'under_stimulated' ? 'Under-Stimulated' :
    'Inconsistent';

  return (
    <Card style={{ ...styles.deloadCard, borderColor: classColor }}>
      <View style={styles.deloadHeader}>
        <Ionicons name="trending-down" size={24} color={classColor} />
        <Text style={[styles.deloadTitle, { color: classColor }]}>Plateau Detected</Text>
      </View>
      <View style={[styles.plateauBadge, { backgroundColor: classColor + '22', borderColor: classColor + '55' }]}>
        <Text style={[styles.plateauBadgeText, { color: classColor }]}>{classLabel}</Text>
      </View>
      <Text style={[styles.deloadBody, { color: theme.colors.text }]}>
        {plateau.daysSinceImprovement} days without a new personal record.
        Adherence at {plateau.adherencePercent}%.
      </Text>
      <Text style={[styles.deloadSub, { color: theme.colors.muted }]}>
        {plateau.recommendation}
      </Text>
    </Card>
  );
});

// Zone definitions for ACWR bar
const ACWR_ZONES = [
  { label: 'Under-trained', color: '#58A6FF', pctStart: 0, pctEnd: 40 },
  { label: 'Sweet Spot', color: glowColors.viridian, pctStart: 40, pctEnd: 65 },
  { label: 'Caution', color: '#FF9800', pctStart: 65, pctEnd: 75 },
  { label: 'Danger Zone', color: '#F44336', pctStart: 75, pctEnd: 100 },
] as const;

function getAcwrZone(acwr: number) {
  if (acwr >= 1.5) return ACWR_ZONES[3];
  if (acwr >= 1.3) return ACWR_ZONES[2];
  if (acwr >= 0.8) return ACWR_ZONES[1];
  return ACWR_ZONES[0];
}

/** Horizontal ACWR bar with zone markers. */
const AcwrBar = React.memo(function AcwrBar({ acwr }: { acwr: number }) {
  const { theme } = useAppTheme();
  // Map ACWR 0–2 to 0–100% position
  const pct = Math.max(0, Math.min(100, (acwr / 2) * 100));
  const zone = getAcwrZone(acwr);

  return (
    <View>
      <View style={[styles.acwrTrack, { backgroundColor: theme.colors.mutedBg }]}>
        {/* Segmented zone backgrounds */}
        {ACWR_ZONES.map((z) => (
          <View
            key={z.label}
            style={[
              styles.acwrZoneSegment,
              {
                left: `${z.pctStart}%` as any,
                width: `${z.pctEnd - z.pctStart}%` as any,
                backgroundColor: z.color + '18',
              },
            ]}
          />
        ))}
        {/* Indicator */}
        <View
          style={[
            styles.acwrIndicator,
            { left: `${pct}%` as any, backgroundColor: zone.color },
          ]}
        />
      </View>
      <View style={styles.acwrLabels}>
        <Text style={[styles.acwrLabel, { color: theme.colors.muted }]}>0</Text>
        <Text style={[styles.acwrLabelCenter, { color: theme.colors.muted }]}>
          0.8 ── Sweet spot ── 1.3
        </Text>
        <Text style={[styles.acwrLabel, { color: theme.colors.muted }]}>2.0</Text>
      </View>
      <View style={styles.acwrBadgeRow}>
        <View style={[styles.acwrZoneBadge, { backgroundColor: zone.color + '18', borderColor: zone.color + '40' }]}>
          <Text style={[styles.acwrZoneBadgeText, { color: zone.color }]}>{zone.label}</Text>
        </View>
        <Text style={[styles.acwrRatioText, { color: theme.colors.muted }]}>
          ACWR {acwr.toFixed(2)}
        </Text>
      </View>
    </View>
  );
});


/** Animated load bar — fill springs from 0 to pct on initial layout. */
const LoadBar = React.memo(function LoadBar({
  label,
  value,
  pct,
  color,
}: {
  label: string;
  value: number;
  pct: number;
  color: string;
}) {
  const { theme } = useAppTheme();
  const barFillWidth = useSharedValue(0);

  const handleTrackLayout = useCallback(
    (e: LayoutChangeEvent) => {
      barFillWidth.value = withSpring(e.nativeEvent.layout.width * (pct / 100), {
        damping: 18,
        stiffness: 80,
      });
    },
    // barFillWidth is a stable shared value ref
    // eslint-disable-next-line react-hooks/exhaustive-deps
    [pct],
  );

  const animBarStyle = useAnimatedStyle(() => ({ width: barFillWidth.value }));

  return (
    <View style={styles.loadBarRow}>
      <Text style={[styles.loadBarLabel, { color: theme.colors.muted }]}>{label}</Text>
      <View
        style={[styles.loadBarTrack, { backgroundColor: theme.colors.mutedBg }]}
        onLayout={handleTrackLayout}
      >
        <Animated.View style={[styles.loadBarFill, { backgroundColor: color }, animBarStyle]} />
      </View>
      <Text style={[styles.loadBarValue, { color: theme.colors.text }]}>
        {Math.round(value)}
      </Text>
    </View>
  );
});

/** Loading skeleton for the full dashboard. */
const RecoveryLoadingSkeleton = React.memo(function RecoveryLoadingSkeleton() {
  return (
    <Skeleton.Group gap={spacing.md}>
      <Skeleton.Card style={{ height: 260 }} />
      <Skeleton.Card style={{ height: 160 }} />
      <Skeleton.Card style={{ height: 420 }} />
      <Skeleton.Card style={{ height: 240 }} />
      <Skeleton.Card style={{ height: 180 }} />
    </Skeleton.Group>
  );
});

/** Muscle detail bottom sheet — animated fatigue bar springs in on layout. */
const MuscleDetailContent = React.memo(function MuscleDetailContent({
  muscle,
  fatigue,
}: {
  muscle: MuscleGroup;
  fatigue: number;
}) {
  const { theme, isDark } = useAppTheme();
  const energyState = getEnergyState(fatigue, isDark);
  const statusColor = energyState.fill;

  const barFillWidth = useSharedValue(0);

  const handleBarTrackLayout = useCallback(
    (e: LayoutChangeEvent) => {
      barFillWidth.value = withSpring(e.nativeEvent.layout.width * (fatigue / 100), {
        damping: 18,
        stiffness: 80,
      });
    },
    // eslint-disable-next-line react-hooks/exhaustive-deps
    [fatigue],
  );

  const animBarStyle = useAnimatedStyle(() => ({ width: barFillWidth.value }));

  const tipText = (() => {
    switch (energyState.state) {
      case 'dormant': return 'No recent activity. Ready for a full session.';
      case 'primed': return 'Fully fresh. Ready for full training stimulus.';
      case 'charged': return 'Supercompensation window — ideal time to train hard.';
      case 'strained': return 'Moderate fatigue. Consider reducing volume today.';
      case 'overloaded': return 'High fatigue. Reduce intensity or target other muscles.';
      case 'peak': return 'Avoid direct work. Substitute lighter variations or rest.';
    }
  })();

  return (
    <View style={styles.sheetContent}>
      <Text style={[styles.sheetMuscle, { color: theme.colors.text }]}>
        {muscleLabel(muscle)}
      </Text>
      <View style={[styles.sheetStatusBadge, { backgroundColor: statusColor + '22', borderColor: statusColor + '55' }]}>
        <Text style={[styles.sheetStatusText, { color: statusColor }]}>{energyState.label}</Text>
      </View>
      <View style={[styles.sheetFatigueRow, { marginTop: spacing.md }]}>
        <Text style={[styles.sheetFatigueLabel, { color: theme.colors.muted }]}>Fatigue Level</Text>
        <Text style={[styles.sheetFatigueValue, { color: statusColor }]}>{Math.round(fatigue)}</Text>
      </View>
      <View
        style={[styles.sheetBarTrack, { backgroundColor: theme.colors.mutedBg }]}
        onLayout={handleBarTrackLayout}
      >
        <Animated.View style={[styles.sheetBarFill, { backgroundColor: statusColor }, animBarStyle]} />
      </View>
      <Text style={[styles.sheetTip, { color: theme.colors.muted }]}>
        {tipText}
      </Text>
    </View>
  );
});

/** Pill explanation bottom sheet content — polished layout. */
const PillDetailContent = React.memo(function PillDetailContent({
  pillKey,
  value,
  color,
}: {
  pillKey: PillKey;
  value: number;
  color: string;
}) {
  const { theme } = useAppTheme();
  const info = PILL_EXPLANATIONS[pillKey];

  return (
    <View style={styles.explainSheet}>
      {/* Accent bar */}
      <View style={[styles.explainAccent, { backgroundColor: color }]} />

      {/* Score hero row */}
      <View style={styles.explainHeroRow}>
        <Text style={[styles.explainScore, { color }]}>{value}</Text>
        <View style={styles.explainHeroText}>
          <Text style={[styles.explainTitle, { color: theme.colors.text }]}>{info.title}</Text>
          <Text style={[styles.explainWeight, { color: theme.colors.muted }]}>
            {pillKey === 'Freshness' ? '40% of score' : pillKey === 'Block Fit' ? '20% of score' : '10% of score'}
          </Text>
        </View>
      </View>

      {/* Description */}
      <Text style={[styles.explainDesc, { color: theme.colors.text }]}>
        {info.description}
      </Text>

      {/* Tip card */}
      <View style={[styles.explainTipCard, { backgroundColor: theme.colors.mutedBg, borderColor: theme.colors.border }]}>
        <Text style={[styles.explainTipLabel, { color: theme.colors.muted }]}>HOW TO IMPROVE</Text>
        <Text style={[styles.explainTipText, { color: theme.colors.text }]}>{info.tip}</Text>
      </View>
    </View>
  );
});

/** Reusable section header with eyebrow + title. */
const SectionHeader = React.memo(function SectionHeader({
  eyebrow,
  title,
  subtitle,
}: {
  eyebrow: string;
  title: string;
  subtitle?: string;
}) {
  const { theme } = useAppTheme();
  return (
    <View style={styles.sectionHeaderWrap}>
      <Text style={[styles.sectionEyebrow, { color: theme.colors.primary }]}>{eyebrow}</Text>
      <Text style={[styles.sectionHeaderTitle, { color: theme.colors.text }]}>{title}</Text>
      {subtitle && (
        <Text style={[styles.sectionHeaderSub, { color: theme.colors.muted }]}>{subtitle}</Text>
      )}
    </View>
  );
});

/** Heatmap gradient legend — horizontal bar spanning the full fatigue spectrum. */
const HeatmapLegend = React.memo(function HeatmapLegend() {
  const { theme, isDark } = useAppTheme();
  const energyStates = useMemo(() => getEnergyStatesForTheme(isDark), [isDark]);
  const [barWidth, setBarWidth] = useState(0);

  const handleLayout = useCallback((e: LayoutChangeEvent) => {
    setBarWidth(e.nativeEvent.layout.width);
  }, []);

  return (
    <View style={styles.gradientLegend} onLayout={handleLayout}>
      {barWidth > 0 && (
        <Svg width={barWidth} height={12}>
          <Defs>
            <SvgLinearGradient id="fatigueGrad" x1="0" y1="0" x2="1" y2="0">
              {/* Stops mapped to fatigue thresholds: dormant→primed→charged→strained→overloaded→peak */}
              <Stop offset="0"    stopColor={energyStates[0].color} stopOpacity="1" />
              <Stop offset="0.15" stopColor={energyStates[1].color} stopOpacity="1" />
              <Stop offset="0.38" stopColor={energyStates[2].color} stopOpacity="1" />
              <Stop offset="0.58" stopColor={energyStates[3].color} stopOpacity="1" />
              <Stop offset="0.78" stopColor={energyStates[4].color} stopOpacity="1" />
              <Stop offset="1"    stopColor={energyStates[5].color} stopOpacity="1" />
            </SvgLinearGradient>
          </Defs>
          <Rect x={0} y={0} width={barWidth} height={12} rx={6} fill="url(#fatigueGrad)" />
        </Svg>
      )}
      <View style={styles.gradientLegendLabels}>
        <Text style={[styles.gradientLegendLabel, { color: theme.colors.muted }]}>Fresh</Text>
        <Text style={[styles.gradientLegendLabel, { color: theme.colors.muted }]}>Peaked</Text>
      </View>
    </View>
  );
});

/** Single readiness row — label | animated bar fill | score + status chip. */
const ReadinessRow = React.memo(function ReadinessRow({
  label,
  score,
  bold,
}: {
  label: string;
  score: { score: number; color: string; label?: string };
  bold?: boolean;
}) {
  const { theme } = useAppTheme();
  const barFillWidth = useSharedValue(0);

  const handleTrackLayout = useCallback(
    (e: LayoutChangeEvent) => {
      barFillWidth.value = withSpring(e.nativeEvent.layout.width * (score.score / 100), {
        damping: 18,
        stiffness: 80,
      });
    },
    // eslint-disable-next-line react-hooks/exhaustive-deps
    [score.score],
  );

  const animBarStyle = useAnimatedStyle(() => ({ width: barFillWidth.value }));

  return (
    <View style={styles.readinessRow}>
      <Text style={[styles.readinessRowLabel, { color: theme.colors.muted }]}>{label}</Text>
      <View
        style={[styles.readinessRowTrack, { backgroundColor: theme.colors.mutedBg }]}
        onLayout={handleTrackLayout}
      >
        <Animated.View style={[styles.readinessRowFill, { backgroundColor: score.color }, animBarStyle]} />
      </View>
      <View style={styles.readinessRowScoreBlock}>
        <Text
          style={[
            bold ? styles.readinessRowScoreBold : styles.readinessRowScore,
            { color: score.color },
          ]}
        >
          {Math.round(score.score)}
        </Text>
        {score.label && (
          <Text style={[styles.readinessRowStatusText, { color: score.color }]} numberOfLines={1}>
            {score.label}
          </Text>
        )}
      </View>
    </View>
  );
});

/** Muscle readiness bars — upper / lower / total. */
const MuscleReadinessBar = React.memo(function MuscleReadinessBar({
  readiness,
}: {
  readiness: MuscleReadinessResult;
}) {
  return (
    <View style={styles.readinessBarSection}>
      <ReadinessRow label="Upper Body" score={readiness.upper} />
      <ReadinessRow label="Lower Body" score={readiness.lower} />
      <ReadinessRow label="Total" score={readiness.total} bold />
    </View>
  );
});

// ── Orbiting dot for empty state ──────────────────────────────────────────────
const OrbitingDot = React.memo(function OrbitingDot({
  rotation,
  phase,
  color,
}: {
  rotation: SharedValue<number>;
  phase: number;
  color: string;
}) {
  const dotStyle = useAnimatedStyle(() => {
    const angleRad = ((rotation.value + phase) * Math.PI) / 180;
    return {
      transform: [
        { translateX: 65 * Math.cos(angleRad) },
        { translateY: 65 * Math.sin(angleRad) },
      ],
    };
  });
  return <Animated.View style={[styles.orbitDot, { backgroundColor: color }, dotStyle]} />;
});

/** Mini 0% gauge ring — hints at what the readiness gauge will look like. */
const EmptyGaugeRing = React.memo(function EmptyGaugeRing() {
  const { theme } = useAppTheme();
  return (
    <View style={styles.emptyGaugeWrap}>
      <Svg width={100} height={104} viewBox="0 0 100 104">
        <Path
          d={EMPTY_GAUGE_PATH}
          stroke={theme.colors.mutedBg}
          strokeWidth={6}
          fill="none"
          strokeLinecap="round"
        />
        {/* 3% fill — shows the gauge will have color */}
        <Path
          d={EMPTY_GAUGE_PATH}
          stroke={theme.colors.primary}
          strokeWidth={6}
          fill="none"
          strokeLinecap="round"
          strokeDasharray={[EMPTY_ARC_LENGTH, EMPTY_ARC_LENGTH]}
          strokeDashoffset={EMPTY_ARC_LENGTH * 0.97}
          strokeOpacity={0.35}
        />
      </Svg>
      <View style={styles.emptyGaugeOverlay}>
        <Text style={[styles.emptyGaugeZero, { color: theme.colors.mutedBg }]}>0</Text>
        <Text style={[styles.emptyGaugeScoreLabel, { color: theme.colors.muted }]}>score</Text>
      </View>
    </View>
  );
});

/** Enhanced empty state — animated orbiting dots, 0% gauge hint, CTA button. */
const EmptyState = React.memo(function EmptyState() {
  const { theme } = useAppTheme();
  const router = useRouter();
  const orbitRotation = useSharedValue(0);

  useEffect(() => {
    orbitRotation.value = withRepeat(
      withTiming(360, { duration: 9000, easing: Easing.linear }),
      -1,
      false,
    );
    return () => cancelAnimation(orbitRotation);
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, []);

  return (
    <View style={styles.emptyState}>
      <View style={styles.emptyMascotWrap}>
        <View style={[styles.emptyMascotGlow, { backgroundColor: theme.colors.primary }]} />
        <LockeMascot size={120} mood="encouraging" />
        {/* Orbiting dots at 0°, 120°, 240° phase offsets */}
        <OrbitingDot rotation={orbitRotation} phase={0}   color={theme.colors.primary + 'AA'} />
        <OrbitingDot rotation={orbitRotation} phase={120} color={theme.colors.primary + '70'} />
        <OrbitingDot rotation={orbitRotation} phase={240} color={theme.colors.primary + '40'} />
      </View>

      <EmptyGaugeRing />

      <Text style={[styles.emptyTitle, { color: theme.colors.text }]}>
        No recovery data yet
      </Text>
      <Text style={[styles.emptySub, { color: theme.colors.muted }]}>
        Complete your first session to start tracking muscle fatigue and recovery.
      </Text>

      {/* CTA button */}
      <Pressable
        style={({ pressed }) => [
          styles.emptyCtaBtn,
          { backgroundColor: theme.colors.primary, opacity: pressed ? 0.85 : 1 },
        ]}
        onPress={() => { Haptics.impactAsync(Haptics.ImpactFeedbackStyle.Medium); router.push("/(tabs)"); }}
      >
        <Text style={[styles.emptyCtaBtnText, { color: theme.colors.primaryText }]}>
          Start your first workout
        </Text>
      </Pressable>
    </View>
  );
});

/** Mini animated readiness gauge for the score explanation sheet. */
const MiniReadinessGauge = React.memo(function MiniReadinessGauge({ score }: { score: number }) {
  const { theme } = useAppTheme();
  const arcColor = readinessColor(score);
  const miniProgress = useSharedValue(0);

  useEffect(() => {
    miniProgress.value = withSpring(score, { damping: 18, stiffness: 80 });
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [score]);

  const miniGaugeProps = useAnimatedProps(() => ({
    strokeDashoffset: MINI_ARC_LENGTH * (1 - Math.max(0, Math.min(100, miniProgress.value)) / 100),
  }));

  return (
    <View style={styles.miniGaugeWrapper}>
      <Svg width={82} height={86} viewBox="0 0 80 84">
        <Path
          d={MINI_GAUGE_BG_PATH}
          stroke={theme.colors.mutedBg}
          strokeWidth={MINI_GAUGE_STROKE}
          fill="none"
          strokeLinecap="round"
        />
        <AnimatedPath
          d={MINI_GAUGE_BG_PATH}
          stroke={arcColor}
          strokeWidth={MINI_GAUGE_STROKE}
          fill="none"
          strokeLinecap="round"
          strokeDasharray={[MINI_ARC_LENGTH, MINI_ARC_LENGTH]}
          animatedProps={miniGaugeProps}
        />
      </Svg>
      <View style={styles.miniGaugeOverlay}>
        <Text style={[styles.miniGaugeScore, { color: arcColor }]}>{score}</Text>
      </View>
    </View>
  );
});

/** Score explanation bottom sheet — mini gauge + contextual advice + compare hint. */
const ScoreDetailSheet = React.memo(function ScoreDetailSheet({
  readiness,
  snapshotCount,
}: {
  readiness: ReadinessScore;
  snapshotCount: number;
}) {
  const { theme } = useAppTheme();
  const scoreColor = readinessColor(readiness.score);

  const advice = useMemo(() => {
    if (readiness.score >= 80) return "You're peaking! Ideal day for high-intensity compound work and setting PRs.";
    if (readiness.score >= 60) return "Good readiness. Push hard on compound movements — your body is prepared.";
    if (readiness.score >= 40) return "Moderate readiness. Focus on quality over volume. Keep technique sharp.";
    return "Recovery priority. A light session or full rest day will set you up better tomorrow.";
  }, [readiness.score]);

  return (
    <View style={styles.explainSheet}>
      <View style={[styles.explainAccent, { backgroundColor: scoreColor }]} />

      {/* Mini gauge + title row */}
      <View style={styles.scoreSheetHeroRow}>
        <MiniReadinessGauge score={readiness.score} />
        <View style={styles.explainHeroText}>
          <Text style={[styles.explainTitle, { color: theme.colors.text }]}>
            {READINESS_EXPLANATION.title}
          </Text>
          <Text style={[styles.explainWeight, { color: scoreColor }]}>
            {readiness.label}
          </Text>
        </View>
      </View>

      <Text style={[styles.explainDesc, { color: theme.colors.text }]}>
        {READINESS_EXPLANATION.description}
      </Text>

      {/* What this means today — contextual advice */}
      <View style={[styles.scoreAdviceCard, { backgroundColor: scoreColor + '12', borderColor: scoreColor + '35' }]}>
        <Text style={[styles.explainTipLabel, { color: theme.colors.muted }]}>WHAT THIS MEANS TODAY</Text>
        <Text style={[styles.explainTipText, { color: theme.colors.text }]}>{advice}</Text>
      </View>

      {/* Quick guide */}
      <View style={[styles.explainTipCard, { backgroundColor: theme.colors.mutedBg, borderColor: theme.colors.border }]}>
        <Text style={[styles.explainTipLabel, { color: theme.colors.muted }]}>QUICK GUIDE</Text>
        <Text style={[styles.explainTipText, { color: theme.colors.text }]}>
          {READINESS_EXPLANATION.tip}
        </Text>
      </View>

      {/* Compare to last week — shown when enough history */}
      {snapshotCount >= 14 && (
        <View style={[styles.explainTipCard, { backgroundColor: theme.colors.mutedBg, borderColor: theme.colors.border }]}>
          <Text style={[styles.explainTipLabel, { color: theme.colors.muted }]}>COMPARE TO LAST WEEK</Text>
          <Text style={[styles.explainTipText, { color: theme.colors.muted }]}>
            Historical trend data is available in the 7-Day Fatigue chart below.
          </Text>
        </View>
      )}
    </View>
  );
});

// ── Screen ────────────────────────────────────────────────────────────────────
export default function RecoveryScreen() {
  const { theme } = useAppTheme();
  const insets = useSafeAreaInsets();
  const { loading, data, refresh } = useRecovery();

  // DEV-only fatigue override
  const [devOpen, setDevOpen] = useState(false);
  const [devOverride, setDevOverride] = useState<MuscleFatigueMap | null>(null);

  const [selectedMuscle, setSelectedMuscle] = useState<MuscleGroup | null>(null);
  const [sheetOpen, setSheetOpen] = useState(false);
  const [selectedPill, setSelectedPill] = useState<PillKey | null>(null);
  const [pillSheetOpen, setPillSheetOpen] = useState(false);
  const [scoreSheetOpen, setScoreSheetOpen] = useState(false);

  // Re-key animated content on each tab focus so entering animations replay
  const [focusKey, setFocusKey] = useState(0);
  const isFirstFocus = useRef(true);
  useFocusEffect(
    useCallback(() => {
      if (isFirstFocus.current) {
        isFirstFocus.current = false;
        return;
      }
      setFocusKey((k) => k + 1);
    }, [])
  );

  // Haptic feedback on readiness threshold — fires once when score first loads
  const hapticFiredRef = useRef(false);
  useEffect(() => {
    if (!data || hapticFiredRef.current) return;
    hapticFiredRef.current = true;
    const score = data.readiness.score;
    if (score >= 80) {
      Haptics.notificationAsync(Haptics.NotificationFeedbackType.Success);
    } else if (score >= 40) {
      Haptics.notificationAsync(Haptics.NotificationFeedbackType.Warning);
    } else {
      Haptics.notificationAsync(Haptics.NotificationFeedbackType.Error);
    }
  }, [data]);

  // Track previous loading state to detect refresh completion
  const wasLoadingRef = useRef(false);
  useEffect(() => {
    if (wasLoadingRef.current && !loading && data) {
      Haptics.notificationAsync(Haptics.NotificationFeedbackType.Success);
    }
    wasLoadingRef.current = loading;
  }, [loading, data]);

  const handleMusclePress = useCallback((muscle: MuscleGroup) => {
    Haptics.selectionAsync();
    setSelectedMuscle(muscle);
    setSheetOpen(true);
  }, []);

  const handleRefresh = useCallback(() => {
    Haptics.impactAsync(Haptics.ImpactFeedbackStyle.Light);
    refresh();
  }, [refresh]);

  const handleSheetClose = useCallback(() => {
    setSheetOpen(false);
  }, []);

  const handleScorePress = useCallback(() => {
    Haptics.selectionAsync();
    setScoreSheetOpen(true);
  }, []);

  const handleScoreSheetClose = useCallback(() => {
    setScoreSheetOpen(false);
  }, []);

  const handlePillPress = useCallback((key: PillKey) => {
    Haptics.selectionAsync();
    setSelectedPill(key);
    setPillSheetOpen(true);
  }, []);

  const handlePillSheetClose = useCallback(() => {
    setPillSheetOpen(false);
  }, []);

  // Override fatigue map with dev values when active
  const effectiveFatigueMap = devOverride ?? data?.fatigueMap;

  const selectedFatigue = useMemo(
    () => (selectedMuscle && effectiveFatigueMap ? (effectiveFatigueMap[selectedMuscle] ?? 0) : 0),
    [selectedMuscle, effectiveFatigueMap],
  );

  const selectedPillInfo = useMemo(() => {
    if (!selectedPill || !data) return { value: 0, color: theme.colors.text };
    const colorMap: Record<PillKey, string> = { Freshness: theme.colors.primary, 'Block Fit': '#58A6FF', Workload: '#FF9800' };
    const valueMap: Record<PillKey, number> = {
      Freshness: Math.round(data.readiness.components.muscleFreshness),
      'Block Fit': Math.round(data.readiness.components.blockContext),
      Workload: Math.round(data.readiness.components.acwrScore),
    };
    return { value: valueMap[selectedPill], color: colorMap[selectedPill] };
  }, [selectedPill, data, theme.colors]);

  const muscleReadiness = useMemo(
    () => effectiveFatigueMap ? computeMuscleReadiness(effectiveFatigueMap) : null,
    [effectiveFatigueMap],
  );

  // Gracefully read commentary if the recovery systems agent has wired it
  const commentary = data ? (data as any).commentary as RecoveryCommentary | undefined : undefined;

  // Derive plan muscles: muscles targeted by the next planned session
  // (any muscle whose projected fatigue exceeds current fatigue)
  const planMuscles = useMemo<MuscleGroup[] | undefined>(() => {
    if (!data?.forecastResult || !effectiveFatigueMap) return undefined;
    const projected = data.forecastResult.projectedFatigueMap;
    const current = effectiveFatigueMap;
    const targeted: MuscleGroup[] = [];
    for (const muscle of Object.keys(current) as MuscleGroup[]) {
      if (projected[muscle] > current[muscle] + 1) {
        targeted.push(muscle);
      }
    }
    return targeted.length > 0 ? targeted : undefined;
  }, [data, effectiveFatigueMap]);

  return (
    <View style={[styles.screen, { backgroundColor: theme.colors.bg }]}>
      <ScrollView
        contentContainerStyle={[
          styles.scrollContent,
          { paddingTop: insets.top + 12, paddingBottom: insets.bottom + 80 },
        ]}
        showsVerticalScrollIndicator={false}
        refreshControl={
          <RefreshControl
            refreshing={loading}
            onRefresh={handleRefresh}
            tintColor={theme.colors.primary}
          />
        }
      >
        {/* Header */}
        <View style={styles.header}>
          <View style={styles.headerLeft}>
            <Text style={[styles.screenTitle, { color: theme.colors.text }]}>Recovery</Text>
            {__DEV__ && (
              <Pressable onPress={() => setDevOpen((v) => !v)}>
                <Text style={styles.devToggle}>DEV</Text>
              </Pressable>
            )}
            {devOverride !== null && (
              <View style={styles.simulatedBadge}>
                <Text style={styles.simulatedText}>SIMULATED</Text>
              </View>
            )}
          </View>
          <View style={{ flexDirection: 'row', alignItems: 'center', gap: spacing.sm }}>
            {data?.blockContext && (
              <View style={[styles.blockBadge, { backgroundColor: theme.colors.mutedBg }]}>
                <Text style={[styles.blockBadgeText, { color: theme.colors.muted }]}>
                  {data.blockContext.blockType.charAt(0).toUpperCase() +
                    data.blockContext.blockType.slice(1)}{' '}
                  · {data.blockContext.weekPosition}
                </Text>
              </View>
            )}
            <ProfileButton />
          </View>
        </View>

        {/* DEV fatigue panel */}
        {__DEV__ && devOpen && data && (
          <View style={{ marginBottom: spacing.sm }}>
            <DevFatiguePanel
              fatigueMap={devOverride ?? data.fatigueMap}
              onUpdate={setDevOverride}
              onReset={() => setDevOverride(null)}
            />
          </View>
        )}

        {/* Error banner */}
        {(data as any)?.error && (
          <Animated.View entering={FadeIn.duration(300)} style={[styles.dataBanner, styles.errorBanner]}>
            <Ionicons name="alert-circle" size={16} color={theme.colors.danger} />
            <Text style={styles.errorBannerText}>
              Couldn't load recovery data. Pull to refresh.
            </Text>
          </Animated.View>
        )}

        {/* Stale data warning */}
        {(data as any)?.staleData && (
          <Animated.View entering={FadeIn.duration(300)} style={[styles.dataBanner, styles.staleBanner]}>
            <Ionicons name="time-outline" size={16} color="#FF9800" />
            <Text style={styles.staleBannerText}>
              No recent training data. Log a session for live metrics.
            </Text>
          </Animated.View>
        )}

        {loading && !data ? (
          <RecoveryLoadingSkeleton />
        ) : data ? (
          <React.Fragment key={focusKey}>
            {/* 1. Readiness Hero */}
            <Animated.View entering={sectionEnter(0)} style={styles.heroSection}>
              <PressableCardWrap onPress={handleScorePress}>
                <Card>
                  <ReadinessHero readiness={data.readiness} onPillPress={handlePillPress} onScorePress={handleScorePress} />
                </Card>
              </PressableCardWrap>
            </Animated.View>

            {/* 2. Coach Card */}
            <Animated.View entering={sectionEnter(50)} style={styles.coachSection}>
              <CoachCard coach={data.coach} commentary={commentary} />
            </Animated.View>

            {/* 3. Smart Deload (conditional) */}
            {data.deloadTriggered && data.deloadCard && (
              <Animated.View entering={sectionEnter(100)} style={{ marginBottom: spacing.lg }}>
                <DeloadCard card={data.deloadCard} />
              </Animated.View>
            )}

            {/* 4. Plateau (conditional) */}
            {data.plateau && (
              <Animated.View entering={sectionEnter(100)} style={{ marginBottom: spacing.lg }}>
                <PlateauCard plateau={data.plateau} />
              </Animated.View>
            )}

            {/* 5. Muscle Heatmap */}
            <Animated.View
              entering={sectionEnter(150)}
              style={[styles.heatmapCardWrapper, { marginBottom: spacing.lg }]}
            >
              <PressableCardWrap>
                <Card>
                  <SectionHeader eyebrow="BODY MAP" title="Muscle Fatigue" subtitle="Tap a muscle for details" />
                  <View style={styles.heatmapWrapper}>
                    <MuscleHeatmapDual
                      fatigueMap={effectiveFatigueMap ?? data.fatigueMap}
                      onMusclePress={handleMusclePress}
                      planMuscles={planMuscles}
                      containerPadding={spacing.md * 2 + (spacing.md + 2) * 2}
                    />
                  </View>
                  <HeatmapLegend />
                </Card>
              </PressableCardWrap>
            </Animated.View>

            {/* 5.5 Muscle Readiness Scores */}
            {muscleReadiness && (
              <Animated.View entering={sectionEnter(200)} style={{ marginBottom: spacing.lg }}>
                <Card>
                  <SectionHeader eyebrow="READINESS" title="Muscle Energy" />
                  <MuscleReadinessBar readiness={muscleReadiness} />
                </Card>
              </Animated.View>
            )}

            {/* 6. 7-Day Trend Graph */}
            {data.snapshots.length > 0 && (
              <Animated.View entering={sectionEnter(250)} style={{ marginBottom: 24 }}>
                <Card>
                  <SectionHeader eyebrow="TREND" title="7-Day Fatigue" />
                  <RecoveryTrendGraph data={data.snapshots} days={7} />
                </Card>
              </Animated.View>
            )}

            {/* 7. Training Load */}
            {data.trainingLoad && data.trainingLoad.chronicLoad > 0 && (
              <Animated.View entering={sectionEnter(300)}>
                <Card>
                  <SectionHeader eyebrow="WORKLOAD" title="Training Load" />
                  <AcwrBar acwr={data.trainingLoad.acwr} />
                  <View style={[styles.loadCompare, { marginTop: spacing.md }]}>
                    <LoadBar label="Acute (7d)" value={data.trainingLoad.acuteLoad} pct={(data.trainingLoad.acuteLoad / Math.max(data.trainingLoad.acuteLoad, data.trainingLoad.chronicLoad, 1)) * 100} color="#58A6FF" />
                    <LoadBar label="Chronic (28d)" value={data.trainingLoad.chronicLoad} pct={(data.trainingLoad.chronicLoad / Math.max(data.trainingLoad.acuteLoad, data.trainingLoad.chronicLoad, 1)) * 100} color={theme.colors.muted} />
                  </View>
                  <View style={[styles.adaptRow, { marginTop: spacing.md, borderTopColor: theme.colors.border }]}>
                    <Text style={[styles.adaptLabel, { color: theme.colors.muted }]}>Adaptation Score</Text>
                    <View style={styles.adaptGaugeWrap}>
                      <Svg width={36} height={36} viewBox="0 0 36 36">
                        <Circle cx={18} cy={18} r={14} fill="none" stroke={theme.colors.mutedBg} strokeWidth={3} />
                        <Circle
                          cx={18} cy={18} r={14} fill="none"
                          stroke={data.trainingLoad.adaptationScore >= 70 ? theme.colors.primary : data.trainingLoad.adaptationScore >= 45 ? '#58A6FF' : '#FF9800'}
                          strokeWidth={3} strokeLinecap="round"
                          strokeDasharray={[2 * Math.PI * 14, 2 * Math.PI * 14]}
                          strokeDashoffset={2 * Math.PI * 14 * (1 - data.trainingLoad.adaptationScore / 100)}
                          transform="rotate(-90, 18, 18)"
                        />
                      </Svg>
                      <Text style={[styles.adaptGaugeText, { color: data.trainingLoad.adaptationScore >= 70 ? theme.colors.primary : data.trainingLoad.adaptationScore >= 45 ? '#58A6FF' : '#FF9800' }]}>
                        {data.trainingLoad.adaptationScore}
                      </Text>
                    </View>
                  </View>
                </Card>
              </Animated.View>
            )}
          </React.Fragment>
        ) : (
          /* Empty state — first time, no sessions logged yet */
          <EmptyState />
        )}
      </ScrollView>

      {/* Muscle detail bottom sheet */}
      <AppBottomSheet visible={sheetOpen} onClose={handleSheetClose}>
        {selectedMuscle && (
          <MuscleDetailContent muscle={selectedMuscle} fatigue={selectedFatigue} />
        )}
      </AppBottomSheet>

      {/* Pill explanation bottom sheet */}
      <AppBottomSheet visible={pillSheetOpen} onClose={handlePillSheetClose}>
        {selectedPill && (
          <PillDetailContent
            pillKey={selectedPill}
            value={selectedPillInfo.value}
            color={selectedPillInfo.color}
          />
        )}
      </AppBottomSheet>

      {/* Readiness score explanation bottom sheet */}
      <AppBottomSheet visible={scoreSheetOpen} onClose={handleScoreSheetClose}>
        {data && (
          <ScoreDetailSheet
            readiness={data.readiness}
            snapshotCount={data.snapshots?.length ?? 0}
          />
        )}
      </AppBottomSheet>
    </View>
  );
}

// ── Styles ────────────────────────────────────────────────────────────────────
const styles = StyleSheet.create({
  screen: {
    flex: 1,
  },
  scrollContent: {
    paddingHorizontal: spacing.md,
  },
  header: {
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'space-between',
    marginBottom: spacing.sm,
  },
  headerLeft: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: spacing.xs + 2,
  },
  screenTitle: {
    fontSize: 28,
    fontWeight: '700' as const,
  },
  devToggle: {
    fontSize: 10,
    fontWeight: '700',
    color: '#7D8590',
    opacity: 0.6,
  },
  simulatedBadge: {
    backgroundColor: '#FF9800' + '20',
    paddingHorizontal: 6,
    paddingVertical: 2,
    borderRadius: radius.sm,
  },
  simulatedText: {
    fontSize: 9,
    fontWeight: '700',
    color: '#FF9800',
    letterSpacing: 0.5,
  },
  blockBadge: {
    paddingHorizontal: spacing.sm,
    paddingVertical: 4,
    borderRadius: radius.full,
  },
  blockBadgeText: {
    ...typography.caption,
    fontWeight: '600',
    textTransform: 'capitalize',
  },
  // ── Readiness gauge ──────────────────────────────────────────────────────
  heroContainer: {
    alignItems: 'center',
    paddingVertical: spacing.sm,
  },
  gaugeTextOverlay: {
    position: 'absolute',
    top: 52,
    left: 0,
    right: 0,
    alignItems: 'center',
  },
  gaugeScore: {
    fontSize: 44,
    fontWeight: '800',
    lineHeight: 48,
  },
  gaugeLabelPill: {
    paddingHorizontal: spacing.sm,
    borderRadius: radius.full,
    marginTop: 2,
  },
  gaugeLabel: {
    fontSize: 14,
    fontWeight: '700',
    letterSpacing: 0.5,
  },
  breakdownRow: {
    flexDirection: 'row',
    gap: spacing.sm,
    marginTop: spacing.sm,
  },
  pill: {
    flex: 1,
  },
  pillInner: {
    alignItems: 'center',
    paddingVertical: 10,
    borderRadius: radius.lg,
    borderWidth: 1,
    gap: 2,
  },
  pillValue: {
    fontSize: 16,
    fontWeight: '800',
  },
  pillLabel: {
    fontSize: 11,
    fontWeight: '600',
    letterSpacing: 0.3,
  },
  pillHint: {
    fontSize: 10,
    fontWeight: '500',
    letterSpacing: 0.5,
    marginTop: spacing.xs + 2,
    textAlign: 'center',
  },
  // ── Coach card ────────────────────────────────────────────────────────────
  coachColumn: {
    alignItems: 'center',
    gap: spacing.sm,
  },
  coachMascotWrap: {
    position: 'relative',
    alignItems: 'center',
    justifyContent: 'center',
    width: 104,
    height: 104,
  },
  coachMascotGlow: {
    position: 'absolute',
    width: 104,
    height: 104,
    borderRadius: 52,
    opacity: 0.12,
  },
  coachHeadline: {
    fontSize: 18,
    fontWeight: '800',
    lineHeight: 24,
    textAlign: 'center',
  },
  coachSubtext: {
    fontSize: 14,
    lineHeight: 20,
    textAlign: 'center',
  },
  tipsPillBtn: {
    paddingHorizontal: spacing.md,
    paddingVertical: spacing.xs + 2,
    borderRadius: radius.full,
    borderWidth: 1,
    marginTop: spacing.xs,
  },
  tipsPillRow: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 4,
  },
  tipsPillText: {
    fontSize: 13,
    fontWeight: '700',
  },
  tipsContainer: {
    borderTopWidth: StyleSheet.hairlineWidth,
    marginTop: spacing.sm,
    paddingTop: spacing.sm,
    gap: spacing.xs + 2,
  },
  tipRow: {
    flexDirection: 'row',
    gap: spacing.xs,
    alignItems: 'flex-start',
  },
  tipBullet: {
    fontSize: 14,
    lineHeight: 20,
  },
  tipText: {
    flex: 1,
    fontSize: 13,
    lineHeight: 20,
  },
  // ── Deload card ───────────────────────────────────────────────────────────
  deloadWrapper: {
    position: 'relative',
  },
  deloadGlow: {
    position: 'absolute',
    top: 0,
    left: 0,
    right: 0,
    bottom: 0,
    borderRadius: radius.lg,
    backgroundColor: '#FF9800',
  },
  deloadCard: {
    borderWidth: 1.5,
  },
  deloadHeader: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: spacing.sm,
    marginBottom: spacing.sm,
  },
  deloadTitle: {
    fontSize: 16,
    fontWeight: '700',
  },
  deloadBody: {
    fontSize: 14,
    lineHeight: 20,
    marginBottom: spacing.xs,
  },
  deloadSub: {
    fontSize: 12,
    fontStyle: 'italic',
  },
  deloadToggleRow: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 4,
    marginTop: spacing.xs + 2,
  },
  deloadActionsToggle: {
    fontSize: 12,
    fontWeight: '600',
  },
  deloadActions: {
    borderTopWidth: StyleSheet.hairlineWidth,
    marginTop: spacing.sm,
    paddingTop: spacing.sm,
    gap: spacing.xs + 2,
  },
  deloadActionRow: {
    flexDirection: 'row',
    gap: spacing.xs,
    alignItems: 'flex-start',
  },
  deloadActionBullet: {
    fontSize: 13,
    fontWeight: '700',
    lineHeight: 20,
    minWidth: 16,
  },
  deloadActionText: {
    flex: 1,
    fontSize: 13,
    lineHeight: 20,
  },
  // ── Plateau card ──────────────────────────────────────────────────────────
  plateauBadge: {
    alignSelf: 'flex-start',
    paddingHorizontal: spacing.sm,
    paddingVertical: 3,
    borderRadius: radius.full,
    borderWidth: 1,
    marginBottom: spacing.sm,
  },
  plateauBadgeText: {
    fontSize: 12,
    fontWeight: '700',
    letterSpacing: 0.3,
  },
  // ── Section header ───────────────────────────────────────────────────────
  sectionHeaderWrap: {
    marginBottom: spacing.sm,
  },
  sectionEyebrow: {
    fontSize: 10,
    fontWeight: '800',
    letterSpacing: 2.0,
    textTransform: 'uppercase',
    marginBottom: 2,
  },
  sectionHeaderTitle: {
    ...typography.subheading,
    fontWeight: '700',
  },
  sectionHeaderSub: {
    ...typography.caption,
    marginTop: 2,
  },
  // ── Heatmap ───────────────────────────────────────────────────────────────
  heroSection: {
    marginBottom: spacing.lg,
    shadowColor: '#000',
    shadowOpacity: 0.14,
    shadowRadius: 16,
    shadowOffset: { width: 0, height: 6 },
    elevation: 8,
  },
  coachSection: {
    marginBottom: spacing.lg,
    shadowColor: '#000',
    shadowOpacity: 0.1,
    shadowRadius: 12,
    shadowOffset: { width: 0, height: 4 },
    elevation: 6,
  },
  heatmapCardWrapper: {
    shadowColor: '#000',
    shadowOpacity: 0.06,
    shadowRadius: 8,
    shadowOffset: { width: 0, height: 2 },
    elevation: 3,
  },
  heatmapWrapper: {
    marginTop: spacing.sm,
    marginBottom: spacing.xs,
    paddingVertical: spacing.xs,
  },
  // ── Gradient legend ───────────────────────────────────────────────────────
  gradientLegend: {
    marginTop: spacing.md,
    gap: 6,
  },
  gradientLegendLabels: {
    flexDirection: 'row',
    justifyContent: 'space-between',
  },
  gradientLegendLabel: {
    fontSize: typography.caption.fontSize,
    fontWeight: '500',
  },
  // ── Readiness bars ──────────────────────────────────────────────────────
  readinessBarSection: { gap: spacing.sm },
  readinessRow: { flexDirection: 'row', alignItems: 'center', gap: spacing.sm },
  readinessRowLabel: { width: 80, fontSize: 12, fontWeight: '600' },
  readinessRowTrack: { flex: 1, height: 8, borderRadius: radius.full, overflow: 'hidden' },
  readinessRowFill: { height: '100%', borderRadius: radius.full },
  readinessRowScore: { width: 32, fontSize: 14, fontWeight: '700', textAlign: 'right' },
  readinessRowScoreBold: { width: 32, fontSize: 14, fontWeight: '700', textAlign: 'right' },
  // ── Training load ─────────────────────────────────────────────────────────
  acwrTrack: {
    height: 8,
    borderRadius: radius.full,
    marginTop: spacing.sm,
    position: 'relative',
    overflow: 'visible',
  },
  acwrZoneSegment: {
    position: 'absolute',
    top: 0,
    bottom: 0,
  },
  acwrIndicator: {
    position: 'absolute',
    top: -4,
    width: 16,
    height: 16,
    borderRadius: 8,
    marginLeft: -8,
    shadowColor: '#000',
    shadowOpacity: 0.3,
    shadowRadius: 4,
    elevation: 3,
  },
  acwrLabels: {
    flexDirection: 'row',
    justifyContent: 'space-between',
    marginTop: spacing.xs,
  },
  acwrLabel: {
    fontSize: 10,
  },
  acwrLabelCenter: {
    fontSize: 10,
    textAlign: 'center',
  },
  acwrBadgeRow: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: spacing.sm,
    marginTop: spacing.xs + 2,
  },
  acwrZoneBadge: {
    paddingHorizontal: spacing.sm,
    paddingVertical: 3,
    borderRadius: radius.full,
    borderWidth: 1,
  },
  acwrZoneBadgeText: {
    fontSize: 11,
    fontWeight: '700',
    letterSpacing: 0.3,
  },
  acwrRatioText: {
    fontSize: 12,
    fontWeight: '500',
  },
  loadCompare: {
    gap: spacing.xs + 2,
  },
  loadBarRow: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: spacing.sm,
  },
  loadBarLabel: {
    width: 80,
    fontSize: 12,
  },
  loadBarTrack: {
    flex: 1,
    height: 8,
    borderRadius: radius.full,
    overflow: 'hidden',
  },
  loadBarFill: {
    height: '100%',
    borderRadius: radius.full,
  },
  loadBarValue: {
    width: 36,
    fontSize: 12,
    fontWeight: '600',
    textAlign: 'right',
  },
  adaptRow: {
    flexDirection: 'row',
    justifyContent: 'space-between',
    alignItems: 'center',
    paddingTop: spacing.sm,
    borderTopWidth: StyleSheet.hairlineWidth,
  },
  adaptLabel: {
    fontSize: 13,
  },
  adaptGaugeWrap: {
    position: 'relative',
    width: 36,
    height: 36,
    alignItems: 'center',
    justifyContent: 'center',
  },
  adaptGaugeText: {
    position: 'absolute',
    fontSize: 11,
    fontWeight: '800',
  },
  // ── Empty state ───────────────────────────────────────────────────────────
  emptyState: {
    alignItems: 'center',
    paddingVertical: 60,
    gap: spacing.sm,
  },
  emptyMascotWrap: {
    position: 'relative',
    width: 140,
    height: 140,
    alignItems: 'center',
    justifyContent: 'center',
  },
  emptyMascotGlow: {
    position: 'absolute',
    width: 140,
    height: 140,
    borderRadius: 70,
    opacity: 0.10,
  },
  emptyTitle: {
    ...typography.subheading,
    textAlign: 'center',
  },
  emptySub: {
    ...typography.body,
    textAlign: 'center',
    maxWidth: 280,
  },
  // ── Bottom sheet ──────────────────────────────────────────────────────────
  sheetContent: {
    padding: spacing.lg,
    gap: spacing.sm,
  },
  sheetMuscle: {
    fontSize: 22,
    fontWeight: '700',
  },
  sheetStatusBadge: {
    alignSelf: 'flex-start',
    paddingHorizontal: spacing.sm,
    paddingVertical: 4,
    borderRadius: radius.full,
    borderWidth: 1,
  },
  sheetStatusText: {
    fontSize: 13,
    fontWeight: '700',
  },
  sheetFatigueRow: {
    flexDirection: 'row',
    justifyContent: 'space-between',
    alignItems: 'flex-end',
  },
  sheetFatigueLabel: {
    fontSize: 13,
  },
  sheetFatigueValue: {
    fontSize: 36,
    fontWeight: '800',
    lineHeight: 40,
  },
  sheetBarTrack: {
    height: 8,
    borderRadius: radius.full,
    overflow: 'hidden',
  },
  sheetBarFill: {
    height: '100%',
    borderRadius: radius.full,
  },
  sheetTip: {
    fontSize: 13,
    lineHeight: 20,
    fontStyle: 'italic',
  },
  // ── Explanation sheets (pill + score) ──────────────────────────────────────
  explainSheet: {
    padding: spacing.lg,
    gap: spacing.md,
  },
  explainAccent: {
    height: 4,
    borderRadius: 2,
    width: 48,
    alignSelf: 'center',
    marginBottom: spacing.xs,
  },
  explainHeroRow: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: spacing.md,
  },
  explainScore: {
    fontSize: 44,
    fontWeight: '800',
    lineHeight: 50,
  },
  explainHeroText: {
    flex: 1,
    gap: 2,
  },
  explainTitle: {
    fontSize: 20,
    fontWeight: '700',
    letterSpacing: 0.2,
  },
  explainWeight: {
    fontSize: 12,
    fontWeight: '600',
    letterSpacing: 0.5,
  },
  explainDesc: {
    fontSize: 15,
    lineHeight: 22,
  },
  explainTipCard: {
    borderRadius: radius.md,
    borderWidth: 1,
    padding: spacing.md,
    gap: spacing.xs,
  },
  explainTipLabel: {
    fontSize: 10,
    fontWeight: '700',
    letterSpacing: 1.2,
    textTransform: 'uppercase',
  },
  explainTipText: {
    fontSize: 14,
    lineHeight: 20,
  },
  // ── Commentary phrase + expanded detail ───────────────────────────────────
  commentaryPhrase: {
    fontSize: 13,
    fontWeight: '600',
    fontStyle: 'italic',
    textAlign: 'center',
    lineHeight: 18,
    marginTop: -spacing.xs,
    paddingHorizontal: spacing.sm,
  },
  commentaryDetailWrap: {
    flexDirection: 'row',
    gap: spacing.xs,
    alignItems: 'flex-start',
    marginTop: spacing.xs,
    paddingTop: spacing.xs + 2,
    borderTopWidth: StyleSheet.hairlineWidth,
    borderRadius: radius.sm,
    padding: spacing.xs + 2,
  },
  commentaryDetailText: {
    flex: 1,
    fontSize: 13,
    fontWeight: '700',
    lineHeight: 18,
  },
  // ── Readiness row score block ──────────────────────────────────────────────
  readinessRowScoreBlock: {
    width: 72,
    alignItems: 'flex-end',
    gap: 1,
  },
  readinessRowStatusText: {
    fontSize: 9,
    fontWeight: '700',
    letterSpacing: 0.3,
    textTransform: 'uppercase',
  },
  // ── Level-up milestone badge ───────────────────────────────────────────────
  milestoneBadge: {
    position: 'absolute',
    top: 8,
    alignSelf: 'center',
    paddingHorizontal: spacing.md,
    paddingVertical: spacing.xs,
    borderRadius: radius.full,
    borderWidth: 1.5,
    zIndex: 10,
  },
  milestoneBadgeText: {
    fontSize: 12,
    fontWeight: '800',
    letterSpacing: 0.5,
  },
  // ── Orbiting dots (empty state) ───────────────────────────────────────────
  orbitDot: {
    position: 'absolute',
    width: 9,
    height: 9,
    borderRadius: 5,
    left: 65,
    top: 65,
  },
  // ── Empty state gauge hint ────────────────────────────────────────────────
  emptyGaugeWrap: {
    width: 100,
    height: 104,
    alignItems: 'center',
    justifyContent: 'center',
    marginVertical: spacing.xs,
  },
  emptyGaugeOverlay: {
    position: 'absolute',
    top: 0,
    left: 0,
    right: 0,
    bottom: 0,
    alignItems: 'center',
    justifyContent: 'center',
    paddingTop: 8,
  },
  emptyGaugeZero: {
    fontSize: 22,
    fontWeight: '800',
  },
  emptyGaugeScoreLabel: {
    fontSize: 9,
    fontWeight: '600',
    letterSpacing: 0.8,
    textTransform: 'uppercase',
  },
  // ── Empty state CTA button ────────────────────────────────────────────────
  emptyCtaBtn: {
    paddingHorizontal: spacing.xl,
    paddingVertical: spacing.sm + 4,
    borderRadius: radius.full,
    marginTop: spacing.sm,
    shadowColor: '#00875A',
    shadowOpacity: 0.25,
    shadowRadius: 8,
    elevation: 4,
  },
  emptyCtaBtnText: {
    fontSize: 15,
    fontWeight: '800',
    letterSpacing: 0.3,
  },
  // ── Mini readiness gauge (score sheet) ────────────────────────────────────
  miniGaugeWrapper: {
    width: 82,
    height: 86,
    alignItems: 'center',
    justifyContent: 'center',
  },
  miniGaugeOverlay: {
    position: 'absolute',
    top: 0,
    left: 0,
    right: 0,
    bottom: 0,
    alignItems: 'center',
    justifyContent: 'center',
    paddingTop: 6,
  },
  miniGaugeScore: {
    fontSize: 20,
    fontWeight: '800',
    lineHeight: 24,
  },
  // ── Score explanation sheet hero row ─────────────────────────────────────
  scoreSheetHeroRow: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: spacing.md,
  },
  // ── Score advice card ─────────────────────────────────────────────────────
  scoreAdviceCard: {
    borderRadius: radius.md,
    borderWidth: 1,
    padding: spacing.md,
    gap: spacing.xs,
  },
  // ── Data state banners ──────────────────────────────────────────────────
  dataBanner: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: spacing.sm,
    paddingHorizontal: spacing.md,
    paddingVertical: spacing.sm + 2,
    borderRadius: radius.md,
    marginBottom: spacing.sm,
  },
  errorBanner: {
    backgroundColor: '#F44336' + '12',
    borderWidth: 1,
    borderColor: '#F44336' + '30',
  },
  errorBannerText: {
    flex: 1,
    fontSize: 12,
    fontWeight: '600',
    color: '#F44336',
    lineHeight: 16,
  },
  staleBanner: {
    backgroundColor: '#FF9800' + '12',
    borderWidth: 1,
    borderColor: '#FF9800' + '30',
  },
  staleBannerText: {
    flex: 1,
    fontSize: 12,
    fontWeight: '600',
    color: '#FF9800',
    lineHeight: 16,
  },
});
