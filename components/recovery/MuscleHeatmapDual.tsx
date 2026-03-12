/**
 * MuscleHeatmapDual — front + back body views with smooth crossfade toggle.
 *
 * Both views are always rendered (stacked). Tapping the rotate icon crossfades
 * between them — no blink because the outgoing view stays visible underneath
 * while the incoming view fades in on top.
 */
import React, { useCallback, useState } from 'react';
import { Pressable, StyleSheet, Text, View, useWindowDimensions } from 'react-native';
import { Ionicons } from '@expo/vector-icons';
import { impact, ImpactStyle } from '../../lib/haptics';
import Animated, {
  Easing,
  useAnimatedStyle,
  useSharedValue,
  withTiming,
} from 'react-native-reanimated';
import { useAppTheme } from '../../contexts/ThemeContext';
import { spacing } from '../../lib/theme';
import type { MuscleGroup, MuscleFatigueMap } from '../../lib/types';
import { MuscleHeatmap } from './MuscleHeatmap';

const VB_ASPECT_RATIO = 240 / 160; // height / width (matched to body image 1024:1536)
const CROSSFADE_MS = 250;

export type MuscleHeatmapDualProps = {
  fatigueMap: Partial<MuscleFatigueMap>;
  onMusclePress?: (muscle: MuscleGroup) => void;
  /** Muscles in today's plan — highlighted with a border. */
  planMuscles?: MuscleGroup[];
  /** Container horizontal padding (used to compute available width). Default 32. */
  containerPadding?: number;
  /** Muscles that just recovered — triggers sparkle pop on both views. */
  recoveryImproved?: MuscleGroup[];
  /** Muscles newly overtrained — triggers micro-shake warning on both views. */
  overtrainedWarning?: MuscleGroup[];
};

// ── Flip button (rotate icon) ───────────────────────────────────────────────

const FlipButton = React.memo(function FlipButton({
  onPress,
}: {
  onPress: () => void;
}) {
  const { theme } = useAppTheme();
  const iconRotation = useSharedValue(0);

  const handlePress = useCallback(() => {
    impact(ImpactStyle.Light);
    iconRotation.value = withTiming(iconRotation.value + 180, {
      duration: 350,
      easing: Easing.out(Easing.quad),
    });
    onPress();
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [onPress]);

  const iconStyle = useAnimatedStyle(() => ({
    transform: [{ rotate: `${iconRotation.value}deg` }],
  }));

  return (
    <Pressable
      onPress={handlePress}
      style={[
        styles.flipButton,
        {
          backgroundColor: theme.colors.mutedBg + 'CC',
          borderWidth: 1,
          borderColor: theme.colors.border,
          shadowColor: '#000',
          shadowOffset: { width: 0, height: 2 },
          shadowOpacity: 0.15,
          shadowRadius: 4,
          elevation: 4,
        },
      ]}
      accessibilityLabel="Rotate body view"
      accessibilityRole="button"
      hitSlop={8}
    >
      <Animated.View style={iconStyle}>
        <Ionicons name="sync-outline" size={20} color={theme.colors.text} />
      </Animated.View>
    </Pressable>
  );
});

// ── Dual heatmap component ──────────────────────────────────────────────────

export const MuscleHeatmapDual = React.memo(function MuscleHeatmapDual({
  fatigueMap,
  onMusclePress,
  planMuscles,
  containerPadding = spacing.md * 2,
  recoveryImproved,
  overtrainedWarning,
}: MuscleHeatmapDualProps) {
  const { theme } = useAppTheme();
  const { width: screenWidth } = useWindowDimensions();
  const [activeView, setActiveView] = useState<'front' | 'back'>('front');

  // Front opacity: 1 when front is active, 0 when back is active
  // Back is always rendered underneath; front layer crossfades over it
  const frontOpacity = useSharedValue(1);

  const frontStyle = useAnimatedStyle(() => ({
    opacity: frontOpacity.value,
  }));

  const handleFlip = useCallback(() => {
    setActiveView((prev) => {
      const next = prev === 'front' ? 'back' : 'front';
      frontOpacity.value = withTiming(next === 'front' ? 1 : 0, {
        duration: CROSSFADE_MS,
        easing: Easing.inOut(Easing.quad),
      });
      return next;
    });
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, []);

  // Sizing — always single view, full available width
  const heatmapWidth = screenWidth - containerPadding;
  const heatmapHeight = Math.floor(heatmapWidth * VB_ASPECT_RATIO);

  const sharedProps = {
    fatigueMap,
    onMusclePress,
    planMuscles,
    width: heatmapWidth,
    height: heatmapHeight,
    recoveryImproved,
    overtrainedWarning,
  };

  return (
    <View>
      <View style={[styles.heatmapContainer, { height: heatmapHeight }]}>
        {/* View label */}
        <Text
          style={[
            styles.viewLabel,
            {
              color: theme.colors.muted,
              backgroundColor: theme.colors.mutedBg + '99',
              paddingHorizontal: 6,
              paddingVertical: 2,
              borderRadius: 4,
              overflow: 'hidden',
            },
          ]}
        >
          {activeView === 'front' ? 'FRONT' : 'BACK'}
        </Text>

        {/* Flip button */}
        <FlipButton onPress={handleFlip} />

        {/* Back view — always rendered at bottom of stack */}
        <View style={styles.layer}>
          <MuscleHeatmap view="back" {...sharedProps} />
        </View>

        {/* Front view — crossfades over back */}
        <Animated.View style={[styles.layer, frontStyle]} pointerEvents={activeView === 'front' ? 'auto' : 'none'}>
          <MuscleHeatmap view="front" {...sharedProps} />
        </Animated.View>
      </View>
    </View>
  );
});

const styles = StyleSheet.create({
  heatmapContainer: {
    alignItems: 'center',
    position: 'relative',
  },
  layer: {
    position: 'absolute',
    top: 0,
    left: 0,
    right: 0,
  },
  flipButton: {
    position: 'absolute',
    top: 8,
    right: 8,
    width: 36,
    height: 36,
    borderRadius: 18,
    alignItems: 'center',
    justifyContent: 'center',
    zIndex: 10,
  },
  viewLabel: {
    position: 'absolute',
    top: 10,
    left: 12,
    fontSize: 10,
    fontWeight: '600',
    letterSpacing: 1,
    textTransform: 'uppercase',
    zIndex: 10,
  },
});
