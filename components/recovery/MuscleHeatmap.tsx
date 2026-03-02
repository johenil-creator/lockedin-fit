/**
 * MuscleHeatmap — SVG front/back body with energy-state-driven color fills.
 *
 * Performance architecture:
 *  - Module-level SVG path constants (zero allocations per render)
 *  - Batch useMemo: one pass to classify muscles into 6 animation buckets
 *  - ONE Animated.View per animated state group (max 5 state groups)
 *  - Outer Animated.View for ambient breathing (whole-body scale, ~4s cycle)
 *  - useAnimatedStyle (UI-thread guaranteed) for ALL animations
 *  - Reduced motion: ambient/state animations disabled, static fills preserved
 *  - Random start offsets per state group to prevent synchronised motion
 *  - shouldRasterizeIOS + renderToHardwareTextureAndroid on base SVG only
 *  - React.memo with reference-equality comparator
 *
 * Energy states (from muscleEnergyStates.ts):
 *   Dormant    (0)      → muted fill, no animation
 *   Primed     (1-20)   → green ramp, soft slow opacity shimmer (0.45→0.55, 3s)
 *   Charged    (21-45)  → green→blue, blue glow stroke, shimmer (1.0→0.6, 1.2s)
 *   Strained   (46-65)  → yellow, warm glow stroke, scale throb (1→1.015, 1.5s)
 *   Overloaded (66-84)  → orange, moderate glow stroke, heartbeat (1.2s)
 *   Peak       (85-100) → red, intense glow stroke, opacity pulse + flicker
 */
import React, { useEffect, useMemo, useRef, useState } from 'react';
import { Image, StyleSheet } from 'react-native';
import * as Haptics from 'expo-haptics';
import Svg, { Path } from 'react-native-svg';
import Animated, {
  cancelAnimation,
  Easing,
  useAnimatedStyle,
  useReducedMotion,
  useSharedValue,
  withDelay,
  withRepeat,
  withSequence,
  withSpring,
  withTiming,
} from 'react-native-reanimated';
import { useAppTheme } from '../../contexts/ThemeContext';
import { getEnergyState, type MuscleVisualState } from '../../lib/muscleEnergyStates';
import type { MuscleGroup, MuscleFatigueMap } from '../../lib/types';

// ── ViewBox dimensions (matched to body image aspect ratio 1024:1536 = 1:1.5) ──
const VB_W = 160;
const VB_H = 240;

// ── Body image assets ─────────────────────────────────────────────────────────
// eslint-disable-next-line @typescript-eslint/no-var-requires
const BODY_FRONT = require('../../assets/body-map/body-front.png');
// eslint-disable-next-line @typescript-eslint/no-var-requires
const BODY_BACK  = require('../../assets/body-map/body-back.png');

// ── Accessibility labels per muscle (module-level, zero allocations) ──────────
const MUSCLE_LABELS: Record<MuscleGroup, string> = {
  chest: 'Chest',
  back: 'Back',
  shoulders: 'Shoulders',
  biceps: 'Biceps',
  triceps: 'Triceps',
  quads: 'Quadriceps',
  hamstrings: 'Hamstrings',
  glutes: 'Glutes',
  calves: 'Calves',
  core: 'Core',
  forearms: 'Forearms',
  traps: 'Trapezius',
  lats: 'Latissimus Dorsi',
  rear_delts: 'Rear Deltoids',
  front_delts: 'Front Deltoids',
  side_delts: 'Side Deltoids',
} as const;

function getMuscleLabel(muscle: MuscleGroup): string {
  return MUSCLE_LABELS[muscle];
}

// ── Muscle SVG overlay paths — traced to align with 3D body model image ───────
// ViewBox: 0 0 160 240 (matched to 1024x1536 image, aspect 1:1.5)
// Body center: x=80.0. Coordinates from pixel-level analysis of the 3D anatomy model.
//
// Body landmarks (in 160x240 viewBox):
//   Head top: y≈12, Head: y=19 x=70-90
//   Neck: y=31-38, Shoulders: y=44 x=53-107
//   Chest: y=50-60 x=49-111, Core: y=60-100 x=45-120
//   Hips: y=100-125, Leg split: y≈128
//   Quads: y=128-175, Calves: y=175-225

const FRONT_PATHS: Partial<Record<MuscleGroup, string[]>> = {
  chest: [
    // Left pec — wider at top, tapers at bottom, x=58-79, y=43-61
    'M 68 43 C 73 42, 77 43, 79 46 C 80 49, 80 53, 79 57 C 78 60, 75 61, 70 61 C 66 61, 63 59, 62 55 C 61 51, 61 47, 60 44 C 59 43, 63 42, 68 43 Z',
    // Right pec — mirror around x=80, x=81-102, y=43-61
    'M 92 43 C 87 42, 83 43, 81 46 C 80 49, 80 53, 81 57 C 82 60, 85 61, 90 61 C 94 61, 97 59, 98 55 C 99 51, 99 47, 100 44 C 101 43, 97 42, 92 43 Z',
  ],
  front_delts: [
    // Left front delt — same as front shoulder, x=49-63, y=39-55
    'M 61 39 C 63 40, 63 43, 63 47 C 62 51, 58 53, 54 55 C 51 56, 49 54, 50 50 C 51 46, 54 42, 57 40 C 59 39, 61 39, 61 39 Z',
    // Right front delt — mirror, x=97-111, y=39-55
    'M 99 39 C 97 40, 97 43, 97 47 C 98 51, 102 53, 106 55 C 109 56, 111 54, 110 50 C 109 46, 106 42, 103 40 C 101 39, 99 39, 99 39 Z',
  ],
  side_delts: [
    // Left side delt — same as front shoulder, x=49-63, y=39-55
    'M 61 39 C 63 40, 63 43, 63 47 C 62 51, 58 53, 54 55 C 51 56, 49 54, 50 50 C 51 46, 54 42, 57 40 C 59 39, 61 39, 61 39 Z',
    // Right side delt — mirror, x=97-111, y=39-55
    'M 99 39 C 97 40, 97 43, 97 47 C 98 51, 102 53, 106 55 C 109 56, 111 54, 110 50 C 109 46, 106 42, 103 40 C 101 39, 99 39, 99 39 Z',
  ],
  shoulders: [
    // Left shoulder — narrow almond, more slanted outward, x=49-63, y=39-55
    'M 61 39 C 63 40, 63 43, 63 47 C 62 51, 58 53, 54 55 C 51 56, 49 54, 50 50 C 51 46, 54 42, 57 40 C 59 39, 61 39, 61 39 Z',
    // Right shoulder — mirror, x=97-111, y=39-55
    'M 99 39 C 97 40, 97 43, 97 47 C 98 51, 102 53, 106 55 C 109 56, 111 54, 110 50 C 109 46, 106 42, 103 40 C 101 39, 99 39, 99 39 Z',
  ],
  biceps: [
    // Left bicep — slanted, thicker, lowered, x=44-59, y=60-80
    'M 57 60 C 59 60, 59 62, 59 65 C 57 70, 54 75, 51 78 C 50 80, 48 80, 44 79 C 44 77, 45 72, 47 67 C 49 63, 51 61, 53 60 C 53 60, 57 60, 57 60 Z',
    // Right bicep — mirror, x=101-116, y=60-80
    'M 103 60 C 101 60, 101 62, 101 65 C 103 70, 106 75, 109 78 C 110 80, 112 80, 116 79 C 116 77, 115 72, 113 67 C 111 63, 109 61, 107 60 C 107 60, 103 60, 103 60 Z',
  ],
  forearms: [
    // Left forearm — top inward, x=44-52 top → x=39-47 bottom, y=82-109
    'M 48 83 C 50 82, 52 83, 52 87 C 50 93, 47 99, 45 104 C 44 107, 43 109, 42 108 C 40 106, 39 101, 39 95 C 40 89, 43 84, 46 83 C 46 82, 48 83, 48 83 Z',
    // Right forearm — mirror, x=108-116 top → x=113-121 bottom, y=82-109
    'M 112 83 C 110 82, 108 83, 108 87 C 110 93, 113 99, 115 104 C 116 107, 117 109, 118 108 C 120 106, 121 101, 121 95 C 120 89, 117 84, 114 83 C 114 82, 112 83, 112 83 Z',
  ],
  core: [
    // Abs/core — narrower, x=67-93, y=62-100
    'M 74 62 C 77 61, 79 61, 80 61 C 81 61, 83 61, 86 62 C 90 63, 92 65, 93 69 C 93 76, 93 84, 92 91 C 91 95, 89 98, 86 99 C 83 100, 81 100, 80 100 C 79 100, 77 100, 74 99 C 71 98, 69 95, 68 91 C 67 84, 67 76, 67 69 C 68 65, 70 63, 74 62 Z',
  ],
  quads: [
    // Left quad — x=57-78, y=99-146
    'M 67 100 C 71 99, 75 100, 77 104 C 78 110, 78 119, 77 128 C 76 134, 74 140, 72 144 C 70 146, 67 146, 65 144 C 62 140, 60 134, 59 128 C 58 119, 57 110, 58 104 C 59 100, 63 99, 67 100 Z',
    // Right quad — mirror, x=82-103, y=99-146
    'M 93 100 C 89 99, 85 100, 83 104 C 82 110, 82 119, 83 128 C 84 134, 86 140, 88 144 C 90 146, 93 146, 95 144 C 98 140, 100 134, 101 128 C 102 119, 103 110, 102 104 C 101 100, 97 99, 93 100 Z',
  ],
};

const BACK_PATHS: Partial<Record<MuscleGroup, string[]>> = {
  traps: [
    // Diamond: narrow at neck, widens at shoulders, tapers at mid-back
    // center x=80, x=60-100, y=40-56
    'M 80 38 C 75 40, 68 42, 63 46 C 60 49, 59 52, 61 54 C 64 56, 70 64, 80 71 C 90 64, 96 56, 99 54 C 101 52, 100 49, 97 46 C 92 42, 85 40, 80 38 Z',
  ],
  rear_delts: [
    // Left rear delt: same as back shoulder, x=46-64, y=47-63
    'M 64 47 C 65 48, 63 51, 59 55 C 56 59, 53 61, 50 63 C 48 64, 46 62, 46 58 C 46 54, 50 50, 57 48 C 60 47, 64 47, 64 47 Z',
    // Right rear delt: mirror, x=96-114, y=47-63
    'M 96 47 C 95 48, 97 51, 101 55 C 104 59, 107 61, 110 63 C 112 64, 114 62, 114 58 C 114 54, 110 50, 103 48 C 100 47, 96 47, 96 47 Z',
  ],
  shoulders: [
    // Left shoulder: almond shape, top inward bottom outward, x=46-60, y=47-63
    'M 64 47 C 65 48, 63 51, 59 55 C 56 59, 53 61, 50 63 C 48 64, 46 62, 46 58 C 46 54, 50 50, 57 48 C 60 47, 64 47, 64 47 Z',
    // Right shoulder: almond mirror, x=100-114, y=47-63
    'M 96 47 C 95 48, 97 51, 101 55 C 104 59, 107 61, 110 63 C 112 64, 114 62, 114 58 C 114 54, 110 50, 103 48 C 100 47, 96 47, 96 47 Z',
  ],
  back: [
    // Central back — V shape with deeper dip at top center (spine notch)
    // Wide at top x=55-105, dips to y=63 at center, narrows at waist x=70-90, y=54-100
    'M 56 60 L 80 73 L 104 60 C 104 63, 100 68, 96 75 C 92 82, 89 89, 87 96 C 86 100, 84 103, 80 104 C 76 103, 74 100, 73 96 C 71 89, 68 82, 64 75 C 60 68, 56 63, 56 60 Z',
  ],
  lats: [
    // Left lat: same region as back, x=56-80, y=60-104
    'M 56 60 C 56 63, 60 68, 64 75 C 68 82, 71 89, 73 96 C 74 100, 76 103, 80 104 C 80 104, 80 73, 56 60 Z',
    // Right lat: mirror, x=80-104, y=60-104
    'M 104 60 C 104 63, 100 68, 96 75 C 92 82, 89 89, 87 96 C 86 100, 84 103, 80 104 C 80 104, 80 73, 104 60 Z',
  ],
  triceps: [
    // Left tricep: back of upper arm, slanted top, rounded, x=47-56, y=60-88
    'M 56 60 C 54 62, 51 65, 49 67 C 48 71, 47 75, 47 78 C 47 82, 48 85, 49 87 C 50 88, 51 86, 52 83 C 53 78, 54 73, 55 68 C 56 65, 56 62, 56 60 Z',
    // Right tricep: mirror, rounded, x=104-113, y=60-88
    'M 104 60 C 106 62, 109 65, 111 67 C 112 71, 113 75, 113 78 C 113 82, 112 85, 111 87 C 110 88, 109 86, 108 83 C 107 78, 106 73, 105 68 C 104 65, 104 62, 104 60 Z',
  ],
  glutes: [
    // Left glute: smaller, sides more inward, x=60-78, y=103-124
    'M 66 103 C 64 104, 62 107, 60 111 C 60 115, 61 119, 63 122 C 66 124, 71 124, 74 122 C 77 119, 78 115, 78 111 C 78 107, 77 105, 72 103 C 70 103, 68 103, 66 103 Z',
    // Right glute: mirror, x=82-100, y=103-124
    'M 94 103 C 96 104, 98 107, 100 111 C 100 115, 99 119, 97 122 C 94 124, 89 124, 86 122 C 83 119, 82 115, 82 111 C 82 107, 83 105, 88 103 C 90 103, 92 103, 94 103 Z',
  ],
  hamstrings: [
    // Left hamstring: back of upper leg, thinner, x=60-75, y=120-160
    'M 67 121 C 65 122, 62 126, 60 133 C 60 140, 60 148, 61 153 C 62 157, 63 160, 65 161 C 67 161, 69 160, 71 156 C 73 152, 74 145, 75 138 C 75 131, 74 125, 72 122 C 70 120, 68 120, 67 121 Z',
    // Right hamstring: mirror, thinner, x=85-100, y=120-160
    'M 93 121 C 95 122, 98 126, 100 133 C 100 140, 100 148, 99 153 C 98 157, 97 160, 95 161 C 93 161, 91 160, 89 156 C 87 152, 86 145, 85 138 C 85 131, 86 125, 88 122 C 90 120, 92 120, 93 121 Z',
  ],
  calves: [
    // Left calf: diamond shape, thinner, x=58-70, y=155-200
    'M 64 156 C 62 159, 59 165, 58 173 C 58 181, 59 189, 60 194 C 61 197, 62 200, 64 200 C 66 200, 67 197, 68 194 C 69 189, 70 181, 70 173 C 70 165, 68 159, 66 156 C 65 155, 64 155, 64 156 Z',
    // Right calf: mirror, thinner, x=90-102, y=155-200
    'M 96 156 C 98 159, 101 165, 102 173 C 102 181, 101 189, 100 194 C 99 197, 98 200, 96 200 C 94 200, 93 197, 92 194 C 91 189, 90 181, 90 173 C 90 165, 92 159, 94 156 C 95 155, 96 155, 96 156 Z',
  ],
};

// ── Feedback overlay stroke colors (no blur — stroke + opacity for glow) ──────
const RECOVERY_STROKE  = '#00E85C';
const OVERTRAIN_STROKE = '#FF9800';

// ── Internal types ────────────────────────────────────────────────────────────
type MuscleEntry = {
  muscle: MuscleGroup;
  d: string;
  fill: string;
  fillOpacity: number;
  glowColor: string | null;
  glowOpacity: number;
  glowRadius: number;
};

// ── Props ──────────────────────────────────────────────────────────────────────
export type MuscleHeatmapProps = {
  fatigueMap: Partial<MuscleFatigueMap>;
  view: 'front' | 'back';
  onMusclePress?: (muscle: MuscleGroup) => void;
  planMuscles?: MuscleGroup[];
  width?: number;
  height?: number;
  /** Muscles that just recovered — triggers sparkle pop effect on reference change. */
  recoveryImproved?: MuscleGroup[];
  /** Muscles newly overtrained — triggers micro-shake warning on reference change. */
  overtrainedWarning?: MuscleGroup[];
};

// ── Shared SVG overlay renderer (avoids JSX repetition per state group) ───────
function MuscleOverlaySvg({
  entries,
  width,
  height,
  viewBox,
  prefix,
  onPress,
}: {
  entries: MuscleEntry[];
  width: number;
  height: number;
  viewBox: string;
  prefix: string;
  onPress?: (muscle: MuscleGroup) => void;
}) {
  return (
    <Svg width={width} height={height} viewBox={viewBox}>
      {entries.map(({ muscle, d, glowColor, glowOpacity, glowRadius }, i) =>
        glowColor !== null ? (
          <Path
            key={`${prefix}g-${muscle}-${i}`}
            d={d}
            fill="none"
            stroke={glowColor}
            strokeWidth={glowRadius * 2}
            strokeOpacity={glowOpacity}
          />
        ) : null,
      )}
      {entries.map(({ muscle, d, fill, fillOpacity }, i) => (
        <Path
          key={`${prefix}-${muscle}-${i}`}
          d={d}
          fill={fill}
          fillOpacity={fillOpacity}
          onPress={onPress ? () => onPress(muscle) : undefined}
          accessibilityLabel={onPress ? getMuscleLabel(muscle) : undefined}
        />
      ))}
    </Svg>
  );
}

// ── Inner component (memoized at export) ──────────────────────────────────────
function MuscleHeatmapInner({
  fatigueMap,
  view,
  onMusclePress,
  planMuscles,
  width = 160,
  height = 340,
  recoveryImproved,
  overtrainedWarning,
}: MuscleHeatmapProps) {
  const { theme, isDark } = useAppTheme();
  const reducedMotion = useReducedMotion();

  // Stable ref so overlay onPress closures don't go stale
  const onPressRef = useRef(onMusclePress);
  onPressRef.current = onMusclePress;

  // Module-level path map reference is stable: only changes when view changes
  const pathMap = view === 'front' ? FRONT_PATHS : BACK_PATHS;

  // Pre-index planMuscles for O(1) lookups
  const planSet = useMemo(
    () => (planMuscles ? new Set(planMuscles) : null),
    [planMuscles],
  );

  // ── Random start delays per state group (computed once at mount) ────────────
  const animDelays = useRef({
    primed:     Math.floor(Math.random() * 2000),
    strained:   Math.floor(Math.random() * 2000),
    overloaded: Math.floor(Math.random() * 2000),
    pulse:      Math.floor(Math.random() * 2000),
  }).current;

  // ── Selected muscle state (interaction layer) ─────────────────────────────
  const [selectedMuscle, setSelectedMuscle] = useState<MuscleGroup | null>(null);

  // ── Batch classify all muscles in one pass ────────────────────────────────
  const {
    staticEntries,
    primedEntries,
    shimmerEntries,
    strainedEntries,
    overloadedEntries,
    pulseEntries,
    hasPrimed,
    hasShimmer,
    hasStrained,
    hasOverloaded,
    hasPulse,
  } = useMemo(() => {
    const staticArr:     MuscleEntry[] = [];
    const primedArr:     MuscleEntry[] = [];
    const shimmerArr:    MuscleEntry[] = [];
    const strainedArr:   MuscleEntry[] = [];
    const overloadedArr: MuscleEntry[] = [];
    const pulseArr:      MuscleEntry[] = [];

    for (const muscle of Object.keys(pathMap) as MuscleGroup[]) {
      const paths = pathMap[muscle];
      if (!paths) continue;
      const fatigue = fatigueMap[muscle] ?? 0;
      const vs: MuscleVisualState = getEnergyState(fatigue, isDark);

      for (const d of paths) {
        const entry: MuscleEntry = {
          muscle,
          d,
          fill: vs.fill,
          fillOpacity: vs.fillOpacity,
          glowColor: vs.glowColor,
          glowOpacity: vs.glowOpacity,
          glowRadius: vs.glowRadius,
        };

        switch (vs.state) {
          case 'peak':       pulseArr.push(entry);      break;
          case 'charged':    shimmerArr.push(entry);    break;
          case 'strained':   strainedArr.push(entry);   break;
          case 'overloaded': overloadedArr.push(entry); break;
          case 'primed':     primedArr.push(entry);     break;
          default:           staticArr.push(entry);     break;
        }
      }
    }

    return {
      staticEntries:     staticArr,
      primedEntries:     primedArr,
      shimmerEntries:    shimmerArr,
      strainedEntries:   strainedArr,
      overloadedEntries: overloadedArr,
      pulseEntries:      pulseArr,
      hasPrimed:     primedArr.length > 0,
      hasShimmer:    shimmerArr.length > 0,
      hasStrained:   strainedArr.length > 0,
      hasOverloaded: overloadedArr.length > 0,
      hasPulse:      pulseArr.length > 0,
    };
  }, [fatigueMap, pathMap, isDark]);

  // ── Collect plan-border paths ──────────────────────────────────────────────
  const planBorderPaths = useMemo(() => {
    if (!planSet) return [];
    const borders: { muscle: MuscleGroup; d: string }[] = [];
    for (const muscle of Object.keys(pathMap) as MuscleGroup[]) {
      if (!planSet.has(muscle)) continue;
      const paths = pathMap[muscle];
      if (!paths) continue;
      for (const d of paths) borders.push({ muscle, d });
    }
    return borders;
  }, [pathMap, planSet]);

  const hasPlanBorders = planBorderPaths.length > 0;

  // ── Paths for currently selected muscle (interaction highlight) ───────────
  const selectedPaths = useMemo(() => {
    if (!selectedMuscle) return null;
    const paths = pathMap[selectedMuscle];
    if (!paths) return null;
    const vs = getEnergyState(fatigueMap[selectedMuscle] ?? 0, isDark);
    return paths.map((d) => ({ d, fill: vs.fill, fillOpacity: vs.fillOpacity }));
  }, [selectedMuscle, pathMap, fatigueMap, isDark]);

  // ── Shared animation values ────────────────────────────────────────────────
  const ambientScale      = useSharedValue(1.0);
  const primedOpacity     = useSharedValue(0.5);
  const shimmerOpacity    = useSharedValue(1.0);
  const strainedScale     = useSharedValue(1.0);
  const overloadedScale   = useSharedValue(1.0);
  const pulseOpacity      = useSharedValue(1.0);
  const planBorderOpacity = useSharedValue(0.4);
  const dimValue          = useSharedValue(1.0);
  const selectionScale    = useSharedValue(1.0);
  const feedbackScale     = useSharedValue(1.0);
  const feedbackOpacity   = useSharedValue(0.0);
  const warningTranslateX = useSharedValue(0.0);

  // ── Ambient breathing — single scale on outer Animated.View container ─────
  useEffect(() => {
    cancelAnimation(ambientScale);
    if (!reducedMotion) {
      ambientScale.value = withRepeat(
        withSequence(
          withTiming(1.012, { duration: 2500, easing: Easing.bezier(0.4, 0, 0.2, 1) }),
          withTiming(1.0,   { duration: 2500, easing: Easing.bezier(0.4, 0, 0.2, 1) }),
        ),
        -1,
        false,
      );
    } else {
      ambientScale.value = 1.0;
    }
    // ambientScale is a stable shared value ref — not needed in deps
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [reducedMotion]);

  const ambientStyle = useAnimatedStyle(() => ({
    transform: [{ scale: ambientScale.value }],
  }));

  // ── Primed: soft slow opacity shimmer (0.45 → 0.55, 3s cycle) ────────────
  useEffect(() => {
    cancelAnimation(primedOpacity);
    if (hasPrimed && !reducedMotion) {
      primedOpacity.value = 0.45;
      primedOpacity.value = withDelay(
        animDelays.primed,
        withRepeat(
          withTiming(0.55, { duration: 1500, easing: Easing.inOut(Easing.sin) }),
          -1,
          true,
        ),
      );
    } else {
      primedOpacity.value = 1.0;
    }
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [hasPrimed, reducedMotion]);

  const primedStyle = useAnimatedStyle(() => ({
    opacity: primedOpacity.value * dimValue.value,
  }));

  // ── Shimmer: charged muscles slow opacity pulse (0.90 → 0.70, 1.8s cycle) ──
  useEffect(() => {
    cancelAnimation(shimmerOpacity);
    if (hasShimmer && !reducedMotion) {
      shimmerOpacity.value = 0.90;
      shimmerOpacity.value = withRepeat(
        withTiming(0.70, { duration: 1800, easing: Easing.inOut(Easing.sin) }),
        -1,
        true,
      );
    } else {
      shimmerOpacity.value = 1.0;
    }
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [hasShimmer, reducedMotion]);

  const shimmerStyle = useAnimatedStyle(() => ({
    opacity: shimmerOpacity.value * dimValue.value,
  }));

  // ── Strained: heavier scale throb (1 → 1.015, 2s cycle) ────────────────
  useEffect(() => {
    cancelAnimation(strainedScale);
    if (hasStrained && !reducedMotion) {
      strainedScale.value = withDelay(
        animDelays.strained,
        withRepeat(
          withTiming(1.015, { duration: 1000, easing: Easing.inOut(Easing.sin) }),
          -1,
          true,
        ),
      );
    } else {
      strainedScale.value = 1.0;
    }
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [hasStrained, reducedMotion]);

  const strainedStyle = useAnimatedStyle(() => ({
    transform: [{ scale: strainedScale.value }],
    opacity: dimValue.value,
  }));

  // ── Overloaded: heartbeat rhythm (1→1.02→1→1.01→1 in 1.2s) ──────────────
  useEffect(() => {
    cancelAnimation(overloadedScale);
    if (hasOverloaded && !reducedMotion) {
      overloadedScale.value = withDelay(
        animDelays.overloaded,
        withRepeat(
          withSequence(
            withTiming(1.02, { duration: 100 }),
            withTiming(1.0,  { duration: 150 }),
            withTiming(1.01, { duration: 100 }),
            withTiming(1.0,  { duration: 850 }),
          ),
          -1,
          false,
        ),
      );
    } else {
      overloadedScale.value = 1.0;
    }
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [hasOverloaded, reducedMotion]);

  const overloadedStyle = useAnimatedStyle(() => ({
    transform: [{ scale: overloadedScale.value }],
    opacity: dimValue.value,
  }));

  // ── Peak: smooth 600ms heartbeat pulse (1.0 → 0.75 → 1.0) ──────────────
  useEffect(() => {
    cancelAnimation(pulseOpacity);
    if (hasPulse && !reducedMotion) {
      pulseOpacity.value = withDelay(
        animDelays.pulse,
        withRepeat(
          withSequence(
            withTiming(0.75, { duration: 300, easing: Easing.inOut(Easing.sin) }),
            withTiming(1.0,  { duration: 300, easing: Easing.inOut(Easing.sin) }),
          ),
          -1,
          false,
        ),
      );
    } else {
      pulseOpacity.value = 1.0;
    }
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [hasPulse, reducedMotion]);

  const pulseStyle = useAnimatedStyle(() => ({
    opacity: pulseOpacity.value * dimValue.value,
  }));

  // ── Plan border: pulsing dashed border for plan-targeted muscles ───────────
  useEffect(() => {
    cancelAnimation(planBorderOpacity);
    if (hasPlanBorders && !reducedMotion) {
      planBorderOpacity.value = withRepeat(
        withTiming(0.8, { duration: 2000, easing: Easing.inOut(Easing.sin) }),
        -1,
        true,
      );
    } else {
      planBorderOpacity.value = hasPlanBorders ? 0.8 : 0.4;
    }
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [hasPlanBorders, reducedMotion]);

  const planBorderStyle = useAnimatedStyle(() => ({
    opacity: planBorderOpacity.value,
  }));

  // ── Interaction: tap to select + spring scale + dim all other layers ──────
  const selectionStyle = useAnimatedStyle(() => ({
    transform: [{ scale: selectionScale.value }],
  }));

  // Stable handler ref — keeps SVG onPress closures fresh without re-renders
  const handlePressRef = useRef<(m: MuscleGroup) => void>(null!);
  handlePressRef.current = (muscle: MuscleGroup) => {
    Haptics.impactAsync(Haptics.ImpactFeedbackStyle.Light);
    if (selectedMuscle === muscle) {
      // Deselect — restore all layer opacities
      setSelectedMuscle(null);
      dimValue.value       = withTiming(1.0, { duration: 240 });
      selectionScale.value = withTiming(1.0, { duration: 240 });
    } else {
      // Select — dim all layers, spring-pop the highlight overlay
      setSelectedMuscle(muscle);
      dimValue.value       = withTiming(0.4, { duration: 240 });
      selectionScale.value = 1.0;
      selectionScale.value = withSpring(1.02, { damping: 12, stiffness: 300 });
    }
    onPressRef.current?.(muscle);
  };

  // ── Recovery improved: sparkle pop (scale 0→1.2→1 + opacity flash) ────────
  const prevRecoveryImproved = useRef<MuscleGroup[] | undefined>(undefined);
  useEffect(() => {
    if (!recoveryImproved?.length) return;
    if (recoveryImproved === prevRecoveryImproved.current) return;
    prevRecoveryImproved.current = recoveryImproved;

    feedbackScale.value   = 0;
    feedbackOpacity.value = 0;
    feedbackScale.value = withSequence(
      withTiming(1.2, { duration: 200 }),
      withTiming(1.0, { duration: 150 }),
    );
    feedbackOpacity.value = withSequence(
      withTiming(1.0, { duration: 100 }),
      withTiming(0.0, { duration: 400 }),
    );
    // feedbackScale / feedbackOpacity are stable shared value refs
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [recoveryImproved]);

  const feedbackStyle = useAnimatedStyle(() => ({
    transform: [{ scale: feedbackScale.value }],
    opacity: feedbackOpacity.value,
  }));

  // ── Overtrained warning: micro-shake (±2px translateX, 3 cycles) ─────────
  const prevOvertrainedWarning = useRef<MuscleGroup[] | undefined>(undefined);
  useEffect(() => {
    if (!overtrainedWarning?.length) return;
    if (overtrainedWarning === prevOvertrainedWarning.current) return;
    prevOvertrainedWarning.current = overtrainedWarning;

    warningTranslateX.value = withSequence(
      withTiming( 2, { duration: 60 }),
      withTiming(-2, { duration: 60 }),
      withTiming( 2, { duration: 60 }),
      withTiming(-2, { duration: 60 }),
      withTiming( 2, { duration: 60 }),
      withTiming(-2, { duration: 60 }),
      withTiming( 0, { duration: 60 }),
    );
    // warningTranslateX is a stable shared value ref
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [overtrainedWarning]);

  const warningStyle = useAnimatedStyle(() => ({
    transform: [{ translateX: warningTranslateX.value }],
  }));

  // ── DEV: warn if animated wrapper node count exceeds expected ceiling ──────
  useEffect(() => {
    if (!__DEV__) return;
    const nodeCount =
      1 + // ambient container always active
      (hasPrimed     ? 1 : 0) +
      (hasShimmer    ? 1 : 0) +
      (hasStrained   ? 1 : 0) +
      (hasOverloaded ? 1 : 0) +
      (hasPulse      ? 1 : 0);
    if (nodeCount > 5) {
      console.warn(
        `[MuscleHeatmap] ${nodeCount} animated wrapper nodes active. ` +
        'Expected ≤5 state-group nodes. Verify muscles are grouped by state, not per-muscle.',
      );
    }
  }, [hasPrimed, hasShimmer, hasStrained, hasOverloaded, hasPulse]);

  // ── Derived render values ─────────────────────────────────────────────────
  const bodyImage  = view === 'front' ? BODY_FRONT : BODY_BACK;
  const svgViewBox = `0 0 ${VB_W} ${VB_H}`;

  // Only wire press handlers when the parent subscribed
  const pressHandler = onMusclePress
    ? (muscle: MuscleGroup) => handlePressRef.current(muscle)
    : undefined;

  return (
    <Animated.View style={[styles.container, { width, height, backgroundColor: theme.colors.surface }, ambientStyle]}>

      {/* ── Base layer: 3D rendered body image ──────────────────────────── */}
      <Image
        source={bodyImage}
        style={{ width, height, position: 'absolute' }}
        resizeMode="contain"
      />

      {/* ── SVG overlay: glow underlays + muscle fills ─────────────────── */}
      <Svg
        width={width}
        height={height}
        viewBox={svgViewBox}
        style={StyleSheet.absoluteFill}
      >
        {/* Glow stroke underlays for static muscles (rendered behind fills) */}
        {staticEntries.map(
          ({ muscle, d, glowColor, glowOpacity, glowRadius }, i) =>
            glowColor !== null && (
              <Path
                key={`g-${muscle}-${i}`}
                d={d}
                fill="none"
                stroke={glowColor}
                strokeWidth={glowRadius * 2}
                strokeOpacity={glowOpacity}
              />
            ),
        )}

        {/* Static muscle fills */}
        {staticEntries.map(({ muscle, d, fill, fillOpacity }, i) => (
          <Path
            key={`s-${muscle}-${i}`}
            d={d}
            fill={fill}
            fillOpacity={fillOpacity}
          />
        ))}
      </Svg>

      {/* ── Primed overlay: soft slow shimmer ─────────────────────────────── */}
      {hasPrimed && (
        <Animated.View style={[StyleSheet.absoluteFill, primedStyle]} pointerEvents="none">
          <MuscleOverlaySvg
            entries={primedEntries}
            width={width}
            height={height}
            viewBox={svgViewBox}
            prefix="pr"
          />
        </Animated.View>
      )}

      {/* ── Shimmer overlay: charged muscles (opacity pulse) ──────────────── */}
      {hasShimmer && (
        <Animated.View style={[StyleSheet.absoluteFill, shimmerStyle]} pointerEvents="none">
          <MuscleOverlaySvg
            entries={shimmerEntries}
            width={width}
            height={height}
            viewBox={svgViewBox}
            prefix="sh"
          />
        </Animated.View>
      )}

      {/* ── Strained overlay: scale throb ─────────────────────────────────── */}
      {hasStrained && (
        <Animated.View style={[StyleSheet.absoluteFill, strainedStyle]} pointerEvents="none">
          <MuscleOverlaySvg
            entries={strainedEntries}
            width={width}
            height={height}
            viewBox={svgViewBox}
            prefix="st"
          />
        </Animated.View>
      )}

      {/* ── Overloaded overlay: heartbeat rhythm ──────────────────────────── */}
      {hasOverloaded && (
        <Animated.View style={[StyleSheet.absoluteFill, overloadedStyle]} pointerEvents="none">
          <MuscleOverlaySvg
            entries={overloadedEntries}
            width={width}
            height={height}
            viewBox={svgViewBox}
            prefix="ov"
          />
        </Animated.View>
      )}

      {/* ── Pulse overlay: peak muscles (flicker + pulse opacity) ─────────── */}
      {hasPulse && (
        <Animated.View style={[StyleSheet.absoluteFill, pulseStyle]} pointerEvents="none">
          <MuscleOverlaySvg
            entries={pulseEntries}
            width={width}
            height={height}
            viewBox={svgViewBox}
            prefix="p"
          />
        </Animated.View>
      )}

      {/* ── Plan border overlay: pulsing dashed border ────────────────────── */}
      {hasPlanBorders && (
        <Animated.View style={[StyleSheet.absoluteFill, planBorderStyle]} pointerEvents="none">
          <Svg width={width} height={height} viewBox={svgViewBox}>
            {planBorderPaths.map(({ muscle, d }, i) => (
              <Path
                key={`b-${muscle}-${i}`}
                d={d}
                fill="none"
                stroke={theme.colors.primary}
                strokeWidth={2}
                strokeDasharray={[4, 3]}
              />
            ))}
          </Svg>
        </Animated.View>
      )}

      {/* ── Touch layer: single top-level SVG for all muscle taps ─────────── */}
      {pressHandler && (
        <Svg
          width={width}
          height={height}
          viewBox={svgViewBox}
          style={StyleSheet.absoluteFill}
        >
          {(Object.keys(pathMap) as MuscleGroup[]).flatMap((muscle) =>
            (pathMap[muscle] ?? []).map((d, i) => (
              <Path
                key={`touch-${muscle}-${i}`}
                d={d}
                fill="transparent"
                onPress={() => pressHandler(muscle)}
                accessibilityLabel={getMuscleLabel(muscle)}
              />
            )),
          )}
        </Svg>
      )}

      {/* ── Selection highlight overlay (spring-scale, above state layers) ── */}
      {selectedPaths && (
        <Animated.View
          style={[StyleSheet.absoluteFill, selectionStyle]}
          pointerEvents="none"
        >
          <Svg width={width} height={height} viewBox={svgViewBox}>
            {selectedPaths.map(({ d, fill, fillOpacity }, i) => (
              <Path
                key={`sel-${i}`}
                d={d}
                fill={fill}
                fillOpacity={fillOpacity}
                stroke={theme.colors.primary}
                strokeWidth={1.5}
              />
            ))}
          </Svg>
        </Animated.View>
      )}

      {/* ── Recovery improved: sparkle pop (scale 0→1.2→1 + opacity flash) ── */}
      {recoveryImproved && recoveryImproved.length > 0 && (
        <Animated.View
          style={[StyleSheet.absoluteFill, feedbackStyle]}
          pointerEvents="none"
        >
          <Svg width={width} height={height} viewBox={svgViewBox}>
            {recoveryImproved.flatMap((muscle, mi) =>
              (pathMap[muscle] ?? []).map((d, pi) => (
                <Path
                  key={`imp-${mi}-${pi}`}
                  d={d}
                  fill={RECOVERY_STROKE}
                  fillOpacity={0.6}
                  stroke={RECOVERY_STROKE}
                  strokeWidth={2}
                />
              )),
            )}
          </Svg>
        </Animated.View>
      )}

      {/* ── Overtrained warning: micro-shake (±2px translateX, 3 cycles) ─── */}
      {overtrainedWarning && overtrainedWarning.length > 0 && (
        <Animated.View
          style={[StyleSheet.absoluteFill, warningStyle]}
          pointerEvents="none"
        >
          <Svg width={width} height={height} viewBox={svgViewBox}>
            {overtrainedWarning.flatMap((muscle, mi) =>
              (pathMap[muscle] ?? []).map((d, pi) => (
                <Path
                  key={`warn-${mi}-${pi}`}
                  d={d}
                  fill={OVERTRAIN_STROKE}
                  fillOpacity={0.5}
                  stroke={OVERTRAIN_STROKE}
                  strokeWidth={2}
                />
              )),
            )}
          </Svg>
        </Animated.View>
      )}

    </Animated.View>
  );
}

// ── Export with custom reference-equality comparator ─────────────────────────
export const MuscleHeatmap = React.memo(
  MuscleHeatmapInner,
  (prev, next) =>
    prev.fatigueMap === next.fatigueMap &&
    prev.view === next.view &&
    prev.width === next.width &&
    prev.height === next.height &&
    prev.onMusclePress === next.onMusclePress &&
    prev.planMuscles === next.planMuscles &&
    prev.recoveryImproved === next.recoveryImproved &&
    prev.overtrainedWarning === next.overtrainedWarning,
);

const styles = StyleSheet.create({
  container: {
    position: 'relative',
    borderRadius: 12,
    overflow: 'hidden',
  },
});
