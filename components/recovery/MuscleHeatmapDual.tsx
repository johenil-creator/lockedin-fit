/**
 * MuscleHeatmapDual — front + back body views side-by-side or as toggled tabs.
 *
 * Layout rules:
 *   - availableWidth >= 340px → side-by-side (each half the container)
 *   - < 340px                 → tabbed toggle (Front / Back buttons)
 *
 * On most phones (~375px), side-by-side fits with 32px total padding.
 */
import React, { useState } from 'react';
import {
  Pressable,
  StyleSheet,
  Text,
  View,
  useWindowDimensions,
} from 'react-native';
import { useAppTheme } from '../../contexts/ThemeContext';
import { radius, spacing, typography } from '../../lib/theme';
import type { MuscleGroup, MuscleFatigueMap } from '../../lib/types';
import { MuscleHeatmap } from './MuscleHeatmap';

const VB_ASPECT_RATIO = 340 / 160; // height ÷ width

export type MuscleHeatmapDualProps = {
  fatigueMap: Partial<MuscleFatigueMap>;
  onMusclePress?: (muscle: MuscleGroup) => void;
  /** Container horizontal padding (used to compute available width). Default 32. */
  containerPadding?: number;
};

export const MuscleHeatmapDual = React.memo(function MuscleHeatmapDual({
  fatigueMap,
  onMusclePress,
  containerPadding = spacing.md * 2,
}: MuscleHeatmapDualProps) {
  const { theme } = useAppTheme();
  const { width: screenWidth } = useWindowDimensions();
  const [activeTab, setActiveTab] = useState<'front' | 'back'>('front');

  const availableWidth = screenWidth - containerPadding;
  const sideBySide = availableWidth >= 340;

  if (sideBySide) {
    const heatmapWidth = Math.floor((availableWidth - spacing.sm) / 2);
    const heatmapHeight = Math.floor(heatmapWidth * VB_ASPECT_RATIO);

    return (
      <View style={styles.sideBySide}>
        <View style={styles.column}>
          <View style={[styles.sideLabelPill, { backgroundColor: theme.colors.mutedBg }]}>
            <Text style={[styles.sideLabel, { color: theme.colors.muted }]}>
              FRONT
            </Text>
          </View>
          <MuscleHeatmap
            fatigueMap={fatigueMap}
            view="front"
            onMusclePress={onMusclePress}
            width={heatmapWidth}
            height={heatmapHeight}
          />
        </View>
        <View style={styles.column}>
          <View style={[styles.sideLabelPill, { backgroundColor: theme.colors.mutedBg }]}>
            <Text style={[styles.sideLabel, { color: theme.colors.muted }]}>
              BACK
            </Text>
          </View>
          <MuscleHeatmap
            fatigueMap={fatigueMap}
            view="back"
            onMusclePress={onMusclePress}
            width={heatmapWidth}
            height={heatmapHeight}
          />
        </View>
      </View>
    );
  }

  // Tabbed layout for narrow screens
  const heatmapWidth = availableWidth;
  const heatmapHeight = Math.floor(heatmapWidth * VB_ASPECT_RATIO);

  return (
    <View>
      {/* Tab toggle */}
      <View
        style={[
          styles.tabBar,
          {
            backgroundColor: theme.colors.mutedBg,
            borderColor: theme.colors.border,
          },
        ]}
      >
        {(['front', 'back'] as const).map((view) => {
          const active = activeTab === view;
          return (
            <Pressable
              key={view}
              style={[
                styles.tab,
                active && {
                  backgroundColor: theme.colors.primary,
                  borderRadius: radius.sm,
                },
              ]}
              onPress={() => setActiveTab(view)}
              accessibilityRole="tab"
              accessibilityState={{ selected: active }}
            >
              <Text
                style={[
                  styles.tabText,
                  {
                    color: active
                      ? theme.colors.primaryText
                      : theme.colors.muted,
                  },
                ]}
              >
                {view === 'front' ? 'Front' : 'Back'}
              </Text>
            </Pressable>
          );
        })}
      </View>

      {/* Active view */}
      <View style={styles.heatmapCenter}>
        <MuscleHeatmap
          fatigueMap={fatigueMap}
          view={activeTab}
          onMusclePress={onMusclePress}
          width={heatmapWidth}
          height={heatmapHeight}
        />
      </View>
    </View>
  );
});

const styles = StyleSheet.create({
  sideBySide: {
    flexDirection: 'row',
    justifyContent: 'space-between',
    alignItems: 'flex-start',
  },
  column: {
    alignItems: 'center',
  },
  sideLabelPill: {
    paddingHorizontal: spacing.sm,
    paddingVertical: 3,
    borderRadius: radius.full,
    marginBottom: spacing.xs,
    alignSelf: 'center',
  },
  sideLabel: {
    fontSize: typography.caption.fontSize,
    fontWeight: '600',
    letterSpacing: 0.8,
    textTransform: 'uppercase',
  },
  tabBar: {
    flexDirection: 'row',
    borderRadius: radius.md,
    borderWidth: 1,
    padding: 3,
    marginBottom: spacing.md,
  },
  tab: {
    flex: 1,
    paddingVertical: 9,
    alignItems: 'center',
    justifyContent: 'center',
  },
  tabText: {
    fontSize: typography.subheading.fontSize,
    fontWeight: '600',
  },
  heatmapCenter: {
    alignItems: 'center',
  },
});
