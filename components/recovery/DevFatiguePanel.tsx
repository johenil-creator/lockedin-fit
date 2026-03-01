/**
 * DevFatiguePanel — DEV-only panel for simulating muscle fatigue states.
 *
 * Allows testing all 6 energy states (Dormant/Primed/Charged/Strained/Overloaded/Peak)
 * without needing real workout data. Only rendered when __DEV__ is true.
 */
import React, { useCallback, useRef, useState } from 'react';
import {
  GestureResponderEvent,
  LayoutChangeEvent,
  PanResponder,
  Pressable,
  ScrollView,
  StyleSheet,
  Text,
  View,
} from 'react-native';
import { useAppTheme } from '../../contexts/ThemeContext';
import { radius, spacing } from '../../lib/theme';
import { Card } from '../Card';
import { emptyFatigueMap } from '../../lib/muscleMapping';
import { ENERGY_STATES, getStateColor, type MuscleEnergyState } from '../../lib/muscleEnergyStates';
import type { MuscleGroup, MuscleFatigueMap } from '../../lib/types';

// ── Muscle grouping ──────────────────────────────────────────────────────────

const UPPER_BODY: MuscleGroup[] = [
  'chest', 'back', 'shoulders', 'front_delts', 'side_delts', 'rear_delts',
  'biceps', 'triceps', 'forearms', 'traps', 'lats',
];

const LOWER_BODY: MuscleGroup[] = [
  'quads', 'hamstrings', 'glutes', 'calves', 'core',
];

const ALL_MUSCLES: MuscleGroup[] = [...UPPER_BODY, ...LOWER_BODY];

// ── Helpers ──────────────────────────────────────────────────────────────────

function muscleLabel(muscle: MuscleGroup): string {
  return muscle.split('_').map((w) => w[0].toUpperCase() + w.slice(1)).join(' ');
}

function classifyState(fatigue: number): MuscleEnergyState {
  if (fatigue <= 0) return 'dormant';
  if (fatigue <= 20) return 'primed';
  if (fatigue <= 45) return 'charged';
  if (fatigue <= 65) return 'strained';
  if (fatigue <= 84) return 'overloaded';
  return 'peak';
}

function makeUniformMap(value: number): MuscleFatigueMap {
  const map = emptyFatigueMap();
  for (const m of ALL_MUSCLES) map[m] = value;
  return map;
}

// ── Presets ──────────────────────────────────────────────────────────────────

type Preset = { label: string; state: MuscleEnergyState; value: number | null };

const PRESETS: Preset[] = [
  { label: 'Dormant', state: 'dormant', value: 0 },
  { label: 'Primed', state: 'primed', value: 10 },
  { label: 'Charged', state: 'charged', value: 33 },
  { label: 'Strained', state: 'strained', value: 55 },
  { label: 'Overloaded', state: 'overloaded', value: 75 },
  { label: 'Peak', state: 'peak', value: 92 },
  { label: 'Mixed', state: 'charged', value: null }, // special
];

const MIXED_MAP: MuscleFatigueMap = (() => {
  const map = emptyFatigueMap();
  // Spread 16 muscles across 6 states
  const values = [0, 0, 10, 10, 33, 33, 33, 55, 55, 55, 75, 75, 75, 92, 92, 92];
  ALL_MUSCLES.forEach((m, i) => { map[m] = values[i]; });
  return map;
})();

// ── Custom Slider ────────────────────────────────────────────────────────────

const THUMB_SIZE = 24;
const TRACK_HEIGHT = 6;

type SliderProps = {
  value: number;
  onValueChange: (v: number) => void;
};

const FatigueSlider = React.memo(function FatigueSlider({ value, onValueChange }: SliderProps) {
  const { theme } = useAppTheme();
  const trackWidth = useRef(0);

  const handleLayout = useCallback((e: LayoutChangeEvent) => {
    trackWidth.current = e.nativeEvent.layout.width;
  }, []);

  const valueFromEvent = useCallback((evt: GestureResponderEvent) => {
    const x = evt.nativeEvent.locationX;
    const w = trackWidth.current;
    if (w <= 0) return value;
    return Math.round(Math.max(0, Math.min(100, (x / w) * 100)));
  }, [value]);

  const panResponder = useRef(
    PanResponder.create({
      onStartShouldSetPanResponder: () => true,
      onMoveShouldSetPanResponder: () => true,
      onPanResponderGrant: (evt) => {
        onValueChange(valueFromEvent(evt));
      },
      onPanResponderMove: (evt) => {
        onValueChange(valueFromEvent(evt));
      },
    }),
  ).current;

  const state = classifyState(value);
  const fillColor = getStateColor(state);
  const pct = `${value}%` as any;

  return (
    <View
      style={styles.sliderContainer}
      onLayout={handleLayout}
      {...panResponder.panHandlers}
    >
      {/* Track background */}
      <View style={[styles.sliderTrack, { backgroundColor: theme.colors.mutedBg }]}>
        {/* Fill */}
        <View style={[styles.sliderFill, { width: pct, backgroundColor: fillColor }]} />
      </View>
      {/* Thumb */}
      <View
        style={[
          styles.sliderThumb,
          { left: pct, backgroundColor: fillColor, borderColor: theme.colors.surface },
        ]}
      />
    </View>
  );
});

// ── Props ────────────────────────────────────────────────────────────────────

type DevFatiguePanelProps = {
  fatigueMap: MuscleFatigueMap;
  onUpdate: (map: MuscleFatigueMap) => void;
  onReset: () => void;
};

// ── Component ────────────────────────────────────────────────────────────────

export const DevFatiguePanel = React.memo(function DevFatiguePanel({
  fatigueMap,
  onUpdate,
  onReset,
}: DevFatiguePanelProps) {
  const { theme } = useAppTheme();
  const [showIndividual, setShowIndividual] = useState(false);

  // Global value derived from average (or first muscle) for display
  const avgValue = Math.round(
    ALL_MUSCLES.reduce((sum, m) => sum + (fatigueMap[m] ?? 0), 0) / ALL_MUSCLES.length,
  );

  const globalState = classifyState(avgValue);
  const globalColor = getStateColor(globalState);

  const handleGlobalChange = useCallback(
    (v: number) => onUpdate(makeUniformMap(v)),
    [onUpdate],
  );

  const handleMuscleChange = useCallback(
    (muscle: MuscleGroup, v: number) => {
      onUpdate({ ...fatigueMap, [muscle]: v });
    },
    [fatigueMap, onUpdate],
  );

  const handlePreset = useCallback(
    (preset: Preset) => {
      if (preset.value === null) {
        onUpdate(MIXED_MAP);
      } else {
        onUpdate(makeUniformMap(preset.value));
      }
    },
    [onUpdate],
  );

  const renderMuscleGroup = (title: string, muscles: MuscleGroup[]) => (
    <View style={styles.muscleGroupSection} key={title}>
      <Text style={[styles.groupTitle, { color: theme.colors.muted }]}>{title}</Text>
      {muscles.map((muscle) => {
        const val = fatigueMap[muscle] ?? 0;
        const st = classifyState(val);
        const col = getStateColor(st);
        return (
          <View key={muscle} style={styles.muscleRow}>
            <Text style={[styles.muscleLabel, { color: theme.colors.text }]} numberOfLines={1}>
              {muscleLabel(muscle)}
            </Text>
            <View style={styles.muscleSliderWrap}>
              <FatigueSlider
                value={val}
                onValueChange={(v) => handleMuscleChange(muscle, v)}
              />
            </View>
            <View style={styles.muscleValueWrap}>
              <View style={[styles.colorDot, { backgroundColor: col }]} />
              <Text style={[styles.muscleValue, { color: theme.colors.text }]}>{val}</Text>
            </View>
          </View>
        );
      })}
    </View>
  );

  return (
    <Card>
      {/* Title */}
      <View style={styles.titleRow}>
        <Text style={[styles.title, { color: theme.colors.text }]}>Fatigue Simulator</Text>
        <View style={[styles.devBadge, { backgroundColor: '#F44336' + '20' }]}>
          <Text style={[styles.devBadgeText, { color: '#F44336' }]}>DEV</Text>
        </View>
      </View>

      {/* Preset buttons */}
      <ScrollView horizontal showsHorizontalScrollIndicator={false} style={styles.presetScroll}>
        <View style={styles.presetRow}>
          {PRESETS.map((preset) => (
            <Pressable
              key={preset.label}
              onPress={() => handlePreset(preset)}
              style={[styles.presetPill, { backgroundColor: theme.colors.mutedBg }]}
            >
              <View style={[styles.presetDot, { backgroundColor: getStateColor(preset.state) }]} />
              <Text style={[styles.presetLabel, { color: theme.colors.text }]}>{preset.label}</Text>
            </Pressable>
          ))}
          <Pressable
            onPress={onReset}
            style={[styles.presetPill, { backgroundColor: theme.colors.mutedBg }]}
          >
            <Text style={[styles.presetLabel, { color: theme.colors.muted }]}>Reset</Text>
          </Pressable>
        </View>
      </ScrollView>

      {/* Global slider */}
      <View style={styles.globalSection}>
        <View style={styles.globalLabelRow}>
          <Text style={[styles.globalLabel, { color: theme.colors.text }]}>All Muscles</Text>
          <Text style={[styles.globalValue, { color: globalColor }]}>
            {avgValue} — {ENERGY_STATES.find((s) => s.state === globalState)?.label ?? ''}
          </Text>
        </View>
        <FatigueSlider value={avgValue} onValueChange={handleGlobalChange} />
      </View>

      {/* Per-muscle toggle */}
      <Pressable
        onPress={() => setShowIndividual((v) => !v)}
        style={[styles.toggleBtn, { borderColor: theme.colors.border }]}
      >
        <Text style={[styles.toggleText, { color: theme.colors.primary }]}>
          {showIndividual ? 'Hide Individual' : 'Show Individual'}
        </Text>
      </Pressable>

      {/* Per-muscle sliders */}
      {showIndividual && (
        <View style={styles.individualSection}>
          {renderMuscleGroup('Upper Body', UPPER_BODY)}
          {renderMuscleGroup('Lower Body', LOWER_BODY)}
        </View>
      )}
    </Card>
  );
});

// ── Styles ───────────────────────────────────────────────────────────────────

const styles = StyleSheet.create({
  titleRow: {
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'space-between',
    marginBottom: spacing.sm,
  },
  title: {
    fontSize: 15,
    fontWeight: '700',
  },
  devBadge: {
    paddingHorizontal: 6,
    paddingVertical: 2,
    borderRadius: radius.sm,
  },
  devBadgeText: {
    fontSize: 10,
    fontWeight: '800',
    letterSpacing: 0.5,
  },
  // Presets
  presetScroll: {
    marginBottom: spacing.sm,
  },
  presetRow: {
    flexDirection: 'row',
    gap: 6,
  },
  presetPill: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 4,
    paddingHorizontal: 10,
    paddingVertical: 6,
    borderRadius: radius.full,
  },
  presetDot: {
    width: 8,
    height: 8,
    borderRadius: 4,
  },
  presetLabel: {
    fontSize: 12,
    fontWeight: '600',
  },
  // Global slider
  globalSection: {
    marginBottom: spacing.sm,
  },
  globalLabelRow: {
    flexDirection: 'row',
    justifyContent: 'space-between',
    alignItems: 'center',
    marginBottom: 6,
  },
  globalLabel: {
    fontSize: 13,
    fontWeight: '600',
  },
  globalValue: {
    fontSize: 12,
    fontWeight: '700',
  },
  // Slider
  sliderContainer: {
    height: THUMB_SIZE + 4,
    justifyContent: 'center',
    position: 'relative',
  },
  sliderTrack: {
    height: TRACK_HEIGHT,
    borderRadius: TRACK_HEIGHT / 2,
    overflow: 'hidden',
  },
  sliderFill: {
    height: '100%',
    borderRadius: TRACK_HEIGHT / 2,
  },
  sliderThumb: {
    position: 'absolute',
    width: THUMB_SIZE,
    height: THUMB_SIZE,
    borderRadius: THUMB_SIZE / 2,
    borderWidth: 2,
    marginLeft: -THUMB_SIZE / 2,
    top: (THUMB_SIZE + 4 - THUMB_SIZE) / 2,
    shadowColor: '#000',
    shadowOpacity: 0.2,
    shadowRadius: 3,
    elevation: 3,
  },
  // Toggle
  toggleBtn: {
    alignSelf: 'center',
    paddingHorizontal: spacing.md,
    paddingVertical: spacing.xs + 2,
    borderRadius: radius.full,
    borderWidth: StyleSheet.hairlineWidth,
  },
  toggleText: {
    fontSize: 12,
    fontWeight: '600',
  },
  // Individual
  individualSection: {
    marginTop: spacing.sm,
  },
  muscleGroupSection: {
    marginBottom: spacing.sm,
  },
  groupTitle: {
    fontSize: 10,
    fontWeight: '700',
    letterSpacing: 1.2,
    textTransform: 'uppercase',
    marginBottom: 6,
  },
  muscleRow: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: spacing.xs,
    marginBottom: 4,
  },
  muscleLabel: {
    width: 80,
    fontSize: 11,
    fontWeight: '500',
  },
  muscleSliderWrap: {
    flex: 1,
  },
  muscleValueWrap: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 3,
    width: 42,
  },
  colorDot: {
    width: 6,
    height: 6,
    borderRadius: 3,
  },
  muscleValue: {
    fontSize: 11,
    fontWeight: '600',
    textAlign: 'right',
  },
});
