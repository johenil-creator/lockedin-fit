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
import React, { useCallback, useEffect, useMemo, useState } from 'react';
import {
  LayoutChangeEvent,
  Pressable,
  RefreshControl,
  ScrollView,
  StyleSheet,
  Text,
  View,
} from 'react-native';
import Svg, { Circle, Path } from 'react-native-svg';
import { Ionicons } from '@expo/vector-icons';
import Animated, {
  cancelAnimation,
  Easing,
  FadeInDown,
  useAnimatedProps,
  useAnimatedStyle,
  useSharedValue,
  withRepeat,
  withSequence,
  withSpring,
  withTiming,
} from 'react-native-reanimated';
import * as Haptics from 'expo-haptics';
import { useSafeAreaInsets } from 'react-native-safe-area-context';
import { useAppTheme } from '../../contexts/ThemeContext';
import { radius, spacing, typography } from '../../lib/theme';
import { useRecovery } from '../../hooks/useRecovery';
import { MuscleHeatmapDual } from '../../components/recovery/MuscleHeatmapDual';
import { RecoveryTrendGraph } from '../../components/recovery/RecoveryTrendGraph';
import { LockeMascot } from '../../components/Locke/LockeMascot';
import { Card } from '../../components/Card';
import { Skeleton } from '../../components/Skeleton';
import { AppBottomSheet } from '../../components/AppBottomSheet';
import type { MuscleGroup, MuscleFatigueMap, ReadinessScore, PlateauInsight } from '../../lib/types';
import type { BlockContext } from '../../lib/blockPeriodization';
import type { CoachOutput } from '../../lib/lockeCoachEngine';
import type { DeloadCard as DeloadCardData } from '../../lib/smartDeload';

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

function gaugeArcPath(sweepDeg: number): string {
  if (sweepDeg <= 0) return '';
  const clampedSweep = Math.min(sweepDeg, GAUGE_SWEEP_DEG - 0.5);
  const start = arcPoint(GAUGE_START_DEG);
  const end = arcPoint(GAUGE_START_DEG + clampedSweep);
  const largeArc = clampedSweep > 180 ? 1 : 0;
  return (
    `M ${start.x.toFixed(2)} ${start.y.toFixed(2)} ` +
    `A ${GAUGE_R} ${GAUGE_R} 0 ${largeArc} 1 ${end.x.toFixed(2)} ${end.y.toFixed(2)}`
  );
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
  if (score >= 80) return '#00E85C';
  if (score >= 60) return '#58A6FF';
  if (score >= 40) return '#FF9800';
  return '#F44336';
}

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

/** Circular readiness gauge with animated fill + score + component breakdown. */
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

  // Animate gauge fill: 0 → score on mount / score change (UI-thread via useAnimatedProps)
  const progress = useSharedValue(0);
  useEffect(() => {
    progress.value = withSpring(readiness.score, { damping: 18, stiffness: 80, mass: 1 });
    // progress is a stable shared value ref — intentionally omitted from deps
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [readiness.score]);

  const animatedGaugeProps = useAnimatedProps(() => ({
    strokeDashoffset: ARC_LENGTH * (1 - Math.max(0, Math.min(100, progress.value)) / 100),
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
      </Svg>

      {/* Centered overlay text — tappable for explanation */}
      <Pressable
        onPress={onScorePress}
        style={({ pressed }) => [styles.gaugeTextOverlay, { opacity: pressed ? 0.7 : 1 }]}
      >
        <Text style={[styles.gaugeScore, { color: arcColor }]}>{readiness.score}</Text>
        <View style={[styles.gaugeLabelPill, { backgroundColor: arcColor + '15' }]}>
          <Text style={[styles.gaugeLabel, { color: arcColor }]}>{readiness.label}</Text>
        </View>
      </Pressable>

      {/* Component breakdown */}
      <View style={styles.breakdownRow}>
        <BreakdownPill
          label="Freshness"
          value={Math.round(readiness.components.muscleFreshness)}
          color="#00E85C"
          onPress={() => onPillPress('Freshness')}
        />
        <BreakdownPill
          label="Block Fit"
          value={Math.round(readiness.components.blockContext)}
          color="#58A6FF"
          onPress={() => onPillPress('Block Fit')}
        />
        <BreakdownPill
          label="Workload"
          value={Math.round(readiness.components.acwrScore)}
          color="#FF9800"
          onPress={() => onPillPress('Workload')}
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
}: {
  label: string;
  value: number;
  color: string;
  onPress: () => void;
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
    <Animated.View style={[styles.pill, animStyle]}>
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
  );
});

// Mascot glow color map
const MOOD_GLOW: Record<string, string> = {
  celebrating: '#00E85C',
  savage: '#00E85C',
  encouraging: '#00E85C',
  focused: '#58A6FF',
  concerned: '#FF9800',
  rest_day: '#9DA5B0',
  neutral: '#9DA5B0',
};

/** Locke mascot + coach headline/subtext + optional tips. */
const CoachCard = React.memo(function CoachCard({ coach }: { coach: CoachOutput }) {
  const { theme } = useAppTheme();
  const [expanded, setExpanded] = useState(false);
  const hasTips = (coach.tips?.length ?? 0) > 0;
  const mascotGlow = MOOD_GLOW[coach.mascotMood] ?? '#9DA5B0';

  return (
    <Card onPress={hasTips ? () => setExpanded((v) => !v) : undefined}>
      <View style={styles.coachColumn}>
        <View style={styles.coachMascotWrap}>
          <View style={[styles.coachMascotGlow, { backgroundColor: mascotGlow }]} />
          <LockeMascot size={96} mood={coach.mascotMood} />
        </View>
        <Text style={[styles.coachHeadline, { color: theme.colors.text }]} numberOfLines={2}>
          {coach.headline}
        </Text>
        <Text style={[styles.coachSubtext, { color: theme.colors.muted }]} numberOfLines={3}>
          {coach.subtext}
        </Text>
        {hasTips && !expanded && (
          <Pressable
            onPress={() => setExpanded(true)}
            style={[
              styles.tipsPillBtn,
              { backgroundColor: theme.colors.primary + '15', borderColor: theme.colors.primary + '30' },
            ]}
          >
            <Text style={[styles.tipsPillText, { color: theme.colors.primary }]}>View Tips</Text>
          </Pressable>
        )}
      </View>
      {expanded && coach.tips && (
        <View style={[styles.tipsContainer, { borderTopColor: theme.colors.border }]}>
          {coach.tips.map((tip, i) => (
            <Animated.View key={i} entering={FadeInDown.delay(i * 60).springify().damping(18)} style={styles.tipRow}>
              <Text style={[styles.tipBullet, { color: theme.colors.primary }]}>•</Text>
              <Text style={[styles.tipText, { color: theme.colors.text }]}>{tip}</Text>
            </Animated.View>
          ))}
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
    plateau.classification === 'under_recovered' ? '#F44336' :
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
  { label: 'Sweet Spot', color: '#00E85C', pctStart: 40, pctEnd: 65 },
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
  const { theme } = useAppTheme();
  const status =
    fatigue >= 80 ? 'Overtrained' :
    fatigue >= 51 ? 'Fatigued' :
    fatigue >= 26 ? 'Warming Up' :
    'Fresh';
  const statusColor =
    fatigue >= 80 ? '#F44336' :
    fatigue >= 51 ? '#FF9800' :
    fatigue >= 26 ? '#FFEB3B' :
    '#00E85C';

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

  return (
    <View style={styles.sheetContent}>
      <Text style={[styles.sheetMuscle, { color: theme.colors.text }]}>
        {muscleLabel(muscle)}
      </Text>
      <View style={[styles.sheetStatusBadge, { backgroundColor: statusColor + '22', borderColor: statusColor + '55' }]}>
        <Text style={[styles.sheetStatusText, { color: statusColor }]}>{status}</Text>
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
        {fatigue >= 80
          ? 'Avoid direct work. Substitute lighter variations or rest.'
          : fatigue >= 51
          ? 'Reduce volume or intensity. Monitor during training.'
          : fatigue >= 26
          ? 'Light to moderate work is fine. Building back up.'
          : 'Fully fresh. Ready for full training stimulus.'}
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

/** Heatmap color legend. */
const LEGEND_ITEMS = [
  { label: 'Fresh', color: '#4CAF50' },
  { label: 'Moderate', color: '#FFEB3B' },
  { label: 'Fatigued', color: '#FF9800' },
  { label: 'Overtrained', color: '#F44336' },
] as const;

const HeatmapLegend = React.memo(function HeatmapLegend() {
  const { theme } = useAppTheme();
  return (
    <View style={styles.heatmapLegend}>
      {LEGEND_ITEMS.map(({ label, color }) => (
        <View key={label} style={styles.heatmapLegendItem}>
          <View style={[styles.heatmapLegendDot, { backgroundColor: color }]} />
          <Text style={[styles.heatmapLegendText, { color: theme.colors.muted }]}>{label}</Text>
        </View>
      ))}
    </View>
  );
});

// ── Screen ────────────────────────────────────────────────────────────────────
export default function RecoveryScreen() {
  const { theme } = useAppTheme();
  const insets = useSafeAreaInsets();
  const { loading, data, refresh } = useRecovery();

  const [selectedMuscle, setSelectedMuscle] = useState<MuscleGroup | null>(null);
  const [sheetOpen, setSheetOpen] = useState(false);
  const [selectedPill, setSelectedPill] = useState<PillKey | null>(null);
  const [pillSheetOpen, setPillSheetOpen] = useState(false);
  const [scoreSheetOpen, setScoreSheetOpen] = useState(false);

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

  const selectedFatigue = useMemo(
    () => (selectedMuscle && data ? (data.fatigueMap[selectedMuscle] ?? 0) : 0),
    [selectedMuscle, data],
  );

  const selectedPillInfo = useMemo(() => {
    if (!selectedPill || !data) return { value: 0, color: '#fff' };
    const colorMap: Record<PillKey, string> = { Freshness: '#00E85C', 'Block Fit': '#58A6FF', Workload: '#FF9800' };
    const valueMap: Record<PillKey, number> = {
      Freshness: Math.round(data.readiness.components.muscleFreshness),
      'Block Fit': Math.round(data.readiness.components.blockContext),
      Workload: Math.round(data.readiness.components.acwrScore),
    };
    return { value: valueMap[selectedPill], color: colorMap[selectedPill] };
  }, [selectedPill, data]);

  return (
    <View style={[styles.screen, { backgroundColor: theme.colors.bg }]}>
      <ScrollView
        contentContainerStyle={[
          styles.scrollContent,
          { paddingTop: insets.top + spacing.md, paddingBottom: insets.bottom + 80 },
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
          <Text style={[styles.screenTitle, { color: theme.colors.text }]}>Recovery</Text>
          {data?.blockContext && (
            <View style={[styles.blockBadge, { backgroundColor: theme.colors.mutedBg }]}>
              <Text style={[styles.blockBadgeText, { color: theme.colors.muted }]}>
                {data.blockContext.blockType.charAt(0).toUpperCase() +
                  data.blockContext.blockType.slice(1)}{' '}
                · {data.blockContext.weekPosition}
              </Text>
            </View>
          )}
        </View>

        {loading && !data ? (
          <RecoveryLoadingSkeleton />
        ) : data ? (
          <>
            {/* 1. Readiness Hero */}
            <Animated.View entering={FadeInDown.delay(0).springify().damping(18)} style={{ marginBottom: 24 }}>
              <Card>
                <ReadinessHero readiness={data.readiness} onPillPress={handlePillPress} onScorePress={handleScorePress} />
              </Card>
            </Animated.View>

            {/* 2. Coach Card */}
            <Animated.View entering={FadeInDown.delay(100).springify().damping(18)} style={{ marginBottom: 16 }}>
              <CoachCard coach={data.coach} />
            </Animated.View>

            {/* 3. Smart Deload (conditional) */}
            {data.deloadTriggered && data.deloadCard && (
              <Animated.View entering={FadeInDown.delay(200).springify().damping(18)} style={{ marginBottom: 16 }}>
                <DeloadCard card={data.deloadCard} />
              </Animated.View>
            )}

            {/* 4. Plateau (conditional) */}
            {data.plateau && (
              <Animated.View entering={FadeInDown.delay(200).springify().damping(18)} style={{ marginBottom: 16 }}>
                <PlateauCard plateau={data.plateau} />
              </Animated.View>
            )}

            {/* 5. Muscle Heatmap */}
            <Animated.View entering={FadeInDown.delay(300).springify().damping(18)} style={{ marginBottom: 28 }}>
              <Card>
                <SectionHeader eyebrow="BODY MAP" title="Muscle Fatigue" subtitle="Tap a muscle for details" />
                <View style={styles.heatmapWrapper}>
                  <MuscleHeatmapDual
                    fatigueMap={data.fatigueMap}
                    onMusclePress={handleMusclePress}
                  />
                </View>
                <HeatmapLegend />
              </Card>
            </Animated.View>

            {/* 6. 7-Day Trend Graph */}
            {data.snapshots.length > 0 && (
              <Animated.View entering={FadeInDown.delay(420).springify().damping(18)} style={{ marginBottom: 24 }}>
                <Card>
                  <SectionHeader eyebrow="TREND" title="7-Day Fatigue" />
                  <RecoveryTrendGraph data={data.snapshots} days={7} />
                </Card>
              </Animated.View>
            )}

            {/* 7. Training Load */}
            {data.trainingLoad && data.trainingLoad.chronicLoad > 0 && (
              <Animated.View entering={FadeInDown.delay(540).springify().damping(18)}>
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
                          stroke={data.trainingLoad.adaptationScore >= 70 ? '#00E85C' : data.trainingLoad.adaptationScore >= 45 ? '#58A6FF' : '#FF9800'}
                          strokeWidth={3} strokeLinecap="round"
                          strokeDasharray={[2 * Math.PI * 14, 2 * Math.PI * 14]}
                          strokeDashoffset={2 * Math.PI * 14 * (1 - data.trainingLoad.adaptationScore / 100)}
                          transform="rotate(-90, 18, 18)"
                        />
                      </Svg>
                      <Text style={[styles.adaptGaugeText, { color: data.trainingLoad.adaptationScore >= 70 ? '#00E85C' : data.trainingLoad.adaptationScore >= 45 ? '#58A6FF' : '#FF9800' }]}>
                        {data.trainingLoad.adaptationScore}
                      </Text>
                    </View>
                  </View>
                </Card>
              </Animated.View>
            )}
          </>
        ) : (
          /* Empty state — first time, no sessions logged yet */
          <View style={styles.emptyState}>
            <View style={styles.emptyMascotWrap}>
              <View style={[styles.emptyMascotGlow, { backgroundColor: theme.colors.primary }]} />
              <LockeMascot size={120} mood="encouraging" />
            </View>
            <Text style={[styles.emptyTitle, { color: theme.colors.text }]}>
              No recovery data yet
            </Text>
            <Text style={[styles.emptySub, { color: theme.colors.muted }]}>
              Complete your first session to start tracking muscle fatigue and recovery.
            </Text>
          </View>
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
        {data && (() => {
          const scoreColor = readinessColor(data.readiness.score);
          return (
            <View style={styles.explainSheet}>
              <View style={[styles.explainAccent, { backgroundColor: scoreColor }]} />
              <View style={styles.explainHeroRow}>
                <Text style={[styles.explainScore, { color: scoreColor }]}>{data.readiness.score}</Text>
                <View style={styles.explainHeroText}>
                  <Text style={[styles.explainTitle, { color: theme.colors.text }]}>
                    {READINESS_EXPLANATION.title}
                  </Text>
                  <Text style={[styles.explainWeight, { color: scoreColor }]}>
                    {data.readiness.label}
                  </Text>
                </View>
              </View>
              <Text style={[styles.explainDesc, { color: theme.colors.text }]}>
                {READINESS_EXPLANATION.description}
              </Text>
              <View style={[styles.explainTipCard, { backgroundColor: theme.colors.mutedBg, borderColor: theme.colors.border }]}>
                <Text style={[styles.explainTipLabel, { color: theme.colors.muted }]}>QUICK GUIDE</Text>
                <Text style={[styles.explainTipText, { color: theme.colors.text }]}>
                  {READINESS_EXPLANATION.tip}
                </Text>
              </View>
            </View>
          );
        })()}
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
  screenTitle: {
    ...typography.heading,
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
    paddingVertical: spacing.sm,
    borderRadius: radius.md,
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
    fontWeight: '700',
    letterSpacing: 1.5,
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
  sectionTitle: {
    ...typography.subheading,
    marginBottom: 2,
  },
  sectionSub: {
    ...typography.caption,
    marginBottom: spacing.sm,
  },
  heatmapWrapper: {
    marginTop: spacing.xs,
  },
  heatmapLegend: {
    flexDirection: 'row',
    justifyContent: 'center',
    gap: spacing.md,
    marginTop: spacing.sm + 4,
  },
  heatmapLegendItem: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 4,
  },
  heatmapLegendDot: {
    width: 8,
    height: 8,
    borderRadius: 4,
  },
  heatmapLegendText: {
    fontSize: 10,
    fontWeight: '500',
  },
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
});
