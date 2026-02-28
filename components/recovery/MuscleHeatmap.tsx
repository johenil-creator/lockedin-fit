/**
 * MuscleHeatmap — SVG front/back body with fatigue-driven color fills.
 *
 * Performance architecture:
 *  - Module-level SVG path constants (zero allocations per render)
 *  - Batch useMemo: one pass to classify all muscles as static vs pulsing
 *  - ONE Animated.View wraps ALL pulsing muscles → single animated node
 *  - useAnimatedStyle (UI-thread guaranteed) instead of useAnimatedProps
 *  - React.memo with reference-equality comparator
 *  - shouldRasterizeIOS + renderToHardwareTextureAndroid on base SVG
 *
 * Color scale (fatigue 0–100):
 *   0-25  → green   rgba(76,175,80,  0.30–0.50)
 *   26-50 → yellow  rgba(255,235,59, 0.40–0.60)
 *   51-79 → orange  rgba(255,152,0,  0.50–0.70)
 *   80-100→ red     rgba(244,67,54,  0.65–0.80) + opacity pulse
 */
import React, { useEffect, useMemo, useRef } from 'react';
import { StyleSheet, View } from 'react-native';
import Svg, { Circle, Path, G } from 'react-native-svg';
import Animated, {
  cancelAnimation,
  Easing,
  useAnimatedStyle,
  useSharedValue,
  withRepeat,
  withTiming,
} from 'react-native-reanimated';
import { useAppTheme } from '../../contexts/ThemeContext';
import type { MuscleGroup, MuscleFatigueMap } from '../../lib/types';

// ── ViewBox dimensions ────────────────────────────────────────────────────────
const VB_W = 160;
const VB_H = 340;

// ── Color scale helpers (pure functions, no object allocation on hot path) ────
function getFillColor(fatigue: number): string {
  if (fatigue <= 25) return '#4CAF50';
  if (fatigue <= 50) return '#FFEB3B';
  if (fatigue <= 79) return '#FF9800';
  return '#F44336';
}

function getFillOpacity(fatigue: number): number {
  if (fatigue <= 0) return 0;
  if (fatigue <= 25) return 0.30 + (fatigue / 25) * 0.20;
  if (fatigue <= 50) return 0.40 + ((fatigue - 25) / 25) * 0.20;
  if (fatigue <= 79) return 0.50 + ((fatigue - 50) / 29) * 0.20;
  const t = Math.min((fatigue - 80) / 20, 1);
  return 0.65 + t * 0.15; // range 0.65–0.80 for the pulse overlay
}

// ── Body outline segments (module-level, never reallocated) ───────────────────
const OUTLINE = {
  head:          { cx: 80, cy: 28, r: 20 } as const,
  neck:          'M 74 47 L 86 47 L 86 63 L 74 63 Z',
  torso:         'M 33 63 L 127 63 L 115 190 L 45 190 Z',
  leftUpperArm:  'M 16 65 L 36 65 L 34 148 L 14 150 Z',
  rightUpperArm: 'M 124 65 L 144 65 L 146 150 L 126 148 Z',
  leftForearm:   'M 12 152 L 34 150 L 31 196 L  9 194 Z',
  rightForearm:  'M 126 150 L 148 152 L 151 194 L 129 196 Z',
  leftThigh:     'M 47 192 L 79 192 L 77 278 L 45 276 Z',
  rightThigh:    'M 81 192 L 113 192 L 115 276 L 83 278 Z',
  leftShin:      'M 43 280 L 77 280 L 74 334 L 40 332 Z',
  rightShin:     'M 83 280 L 115 280 L 118 332 L 86 334 Z',
};

// ── Muscle SVG path data (module-level constants) ─────────────────────────────
// Bilateral muscles have 2 path strings (left, right).

const FRONT_PATHS: Partial<Record<MuscleGroup, string[]>> = {
  chest: [
    'M 53 67 Q 80 62 107 67 L 105 108 Q 80 114 55 108 Z',
  ],
  front_delts: [
    'M 30 66 Q 42 62 53 69 L 51 98 Q 37 102 24 94 Z',
    'M 130 66 Q 118 62 107 69 L 109 98 Q 123 102 136 94 Z',
  ],
  side_delts: [
    'M 18 63 Q 30 58 38 67 L 36 94 Q 24 98 16 90 Z',
    'M 142 63 Q 130 58 122 67 L 124 94 Q 136 98 144 90 Z',
  ],
  shoulders: [
    'M 18 63 Q 40 57 55 70 L 52 100 Q 34 104 14 93 Z',
    'M 142 63 Q 120 57 105 70 L 108 100 Q 126 104 146 93 Z',
  ],
  biceps: [
    'M 17 99 L 37 97 L 35 146 L 15 148 Z',
    'M 143 99 L 123 97 L 125 146 L 145 148 Z',
  ],
  forearms: [
    'M 13 150 L 35 148 L 32 194 L 10 192 Z',
    'M 125 148 L 147 150 L 150 192 L 128 194 Z',
  ],
  core: [
    'M 57 110 L 103 110 Q 105 142 104 175 L 56 175 Q 55 142 57 110 Z',
  ],
  quads: [
    'M 49 194 L 77 194 Q 78 236 75 276 L 47 274 Q 45 236 49 194 Z',
    'M 83 194 L 111 194 Q 114 236 115 276 L 85 274 Q 81 236 83 194 Z',
  ],
};

const BACK_PATHS: Partial<Record<MuscleGroup, string[]>> = {
  traps: [
    'M 54 65 Q 80 59 106 65 L 110 103 Q 80 107 50 103 Z',
  ],
  rear_delts: [
    'M 24 67 Q 38 63 54 70 L 52 103 Q 36 107 20 97 Z',
    'M 136 67 Q 122 63 106 70 L 108 103 Q 124 107 140 97 Z',
  ],
  shoulders: [
    'M 20 65 Q 40 59 55 71 L 52 104 Q 34 108 16 96 Z',
    'M 140 65 Q 120 59 105 71 L 108 104 Q 126 108 144 96 Z',
  ],
  back: [
    'M 52 105 L 108 105 Q 110 132 110 162 L 50 162 Q 50 132 52 105 Z',
  ],
  lats: [
    'M 22 100 L 52 107 L 50 165 L 20 157 Z',
    'M 138 100 L 108 107 L 110 165 L 140 157 Z',
  ],
  triceps: [
    'M 15 100 L 37 98 L 35 148 L 13 150 Z',
    'M 145 100 L 123 98 L 125 148 L 147 150 Z',
  ],
  glutes: [
    'M 47 194 Q 64 190 80 194 L 80 232 Q 63 236 45 232 Z',
    'M 80 194 Q 96 190 113 194 L 115 232 Q 97 236 82 232 Z',
  ],
  hamstrings: [
    'M 45 235 L 77 235 Q 78 256 75 278 L 43 276 Q 43 256 45 235 Z',
    'M 83 235 L 115 235 Q 116 256 117 278 L 85 276 Q 81 256 83 235 Z',
  ],
  calves: [
    'M 42 281 L 75 281 Q 76 304 72 333 L 39 331 Q 40 304 42 281 Z',
    'M 85 281 L 118 281 Q 119 304 120 333 L 87 331 Q 84 304 85 281 Z',
  ],
};

// ── Internal types ────────────────────────────────────────────────────────────
type MuscleEntry = {
  muscle: MuscleGroup;
  d: string;
  fill: string;
  fillOpacity: number;
};

// ── Props ──────────────────────────────────────────────────────────────────────
export type MuscleHeatmapProps = {
  fatigueMap: Partial<MuscleFatigueMap>;
  view: 'front' | 'back';
  onMusclePress?: (muscle: MuscleGroup) => void;
  width?: number;
  height?: number;
};

// ── Inner component (memoized at export) ──────────────────────────────────────
function MuscleHeatmapInner({
  fatigueMap,
  view,
  onMusclePress,
  width = 160,
  height = 340,
}: MuscleHeatmapProps) {
  const { theme, isDark } = useAppTheme();

  // Stable ref so pulse overlay onPress closures don't go stale
  const onPressRef = useRef(onMusclePress);
  onPressRef.current = onMusclePress;

  // Module-level path map reference is stable: only changes when view changes
  const pathMap = view === 'front' ? FRONT_PATHS : BACK_PATHS;

  // ── Batch classify all muscles in one pass ────────────────────────────────
  const { staticEntries, pulseEntries, hasPulse } = useMemo(() => {
    const staticEntries: MuscleEntry[] = [];
    const pulseEntries: MuscleEntry[] = [];

    for (const muscle of Object.keys(pathMap) as MuscleGroup[]) {
      const paths = pathMap[muscle];
      if (!paths) continue;
      const fatigue = fatigueMap[muscle] ?? 0;

      const fill = fatigue <= 0 ? (isDark ? '#2A3340' : '#D8DDE5') : getFillColor(fatigue);
      const fillOpacity = fatigue <= 0 ? 0.35 : getFillOpacity(fatigue);
      const isPulsing = fatigue >= 80;

      for (const d of paths) {
        (isPulsing ? pulseEntries : staticEntries).push({ muscle, d, fill, fillOpacity });
      }
    }

    return { staticEntries, pulseEntries, hasPulse: pulseEntries.length > 0 };
  }, [fatigueMap, pathMap, isDark]);

  // ── Single animated node for ALL pulsing muscles ──────────────────────────
  const pulseOpacity = useSharedValue(1.0);

  useEffect(() => {
    cancelAnimation(pulseOpacity);
    if (hasPulse) {
      pulseOpacity.value = withRepeat(
        withTiming(0.75, { duration: 700, easing: Easing.inOut(Easing.sin) }),
        -1,
        true,
      );
    } else {
      pulseOpacity.value = 1.0;
    }
    // pulseOpacity is a stable shared value ref — not needed in deps
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [hasPulse]);

  // useAnimatedStyle: guaranteed UI thread, no JS-thread involvement
  const pulseStyle = useAnimatedStyle(() => ({ opacity: pulseOpacity.value }), []);

  const skinFill = isDark ? '#252D38' : '#EDE8E2';

  // Shared Svg props to avoid inline object recreation
  const svgViewBox = `0 0 ${VB_W} ${VB_H}`;

  return (
    <View style={[styles.container, { width, height }]}>
      {/* ── Base SVG: outline + static muscles ─────────────────────────── */}
      <Svg
        width={width}
        height={height}
        viewBox={svgViewBox}
        // GPU rasterization caches the static SVG layer
        shouldRasterizeIOS
        renderToHardwareTextureAndroid
      >
        {/* Body silhouette */}
        <G fill={skinFill} stroke={'#3D4450'} strokeWidth={1.5}>
          <Circle
            cx={OUTLINE.head.cx}
            cy={OUTLINE.head.cy}
            r={OUTLINE.head.r}
          />
          <Path d={OUTLINE.neck} />
          <Path d={OUTLINE.torso} />
          <Path d={OUTLINE.leftUpperArm} />
          <Path d={OUTLINE.rightUpperArm} />
          <Path d={OUTLINE.leftForearm} />
          <Path d={OUTLINE.rightForearm} />
          <Path d={OUTLINE.leftThigh} />
          <Path d={OUTLINE.rightThigh} />
          <Path d={OUTLINE.leftShin} />
          <Path d={OUTLINE.rightShin} />
        </G>

        {/* Static muscle fills */}
        {staticEntries.map(({ muscle, d, fill, fillOpacity }, i) => (
          <Path
            key={`s-${muscle}-${i}`}
            d={d}
            fill={fill}
            fillOpacity={fillOpacity}
            onPress={onMusclePress ? () => onPressRef.current?.(muscle) : undefined}
          />
        ))}
      </Svg>

      {/* ── Pulse overlay: one Animated.View drives ALL overtrained muscles ── */}
      {hasPulse && (
        <Animated.View style={[StyleSheet.absoluteFill, pulseStyle]}>
          <Svg width={width} height={height} viewBox={svgViewBox}>
            {pulseEntries.map(({ muscle, d, fill, fillOpacity }, i) => (
              <Path
                key={`p-${muscle}-${i}`}
                d={d}
                fill={fill}
                fillOpacity={fillOpacity}
                onPress={onMusclePress ? () => onPressRef.current?.(muscle) : undefined}
              />
            ))}
          </Svg>
        </Animated.View>
      )}
    </View>
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
    prev.onMusclePress === next.onMusclePress,
);

const styles = StyleSheet.create({
  container: {
    position: 'relative',
  },
});
