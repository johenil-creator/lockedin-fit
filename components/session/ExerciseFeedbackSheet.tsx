import { useState, useCallback } from "react";
import { View, Text, Pressable, StyleSheet } from "react-native";
import { impact, ImpactStyle } from "../../lib/haptics";
import { AppBottomSheet } from "../AppBottomSheet";
import { Button } from "../Button";
import { useAppTheme } from "../../contexts/ThemeContext";
import { InfoTooltip } from "../InfoTooltip";
import type { ExerciseFeedback, FeelingTag } from "../../lib/types";

type Props = {
  visible: boolean;
  exerciseName: string;
  onSubmit: (feedback: ExerciseFeedback) => void;
  onSkip: () => void;
};

const RPE_VALUES = [1, 2, 3, 4, 5, 6, 7, 8, 9, 10] as const;

const FEELING_TAGS: FeelingTag[] = ["great", "good", "okay", "tough", "brutal"];

const FEELING_LABELS: Record<FeelingTag, string> = {
  great: "Great",
  good: "Good",
  okay: "Okay",
  tough: "Tough",
  brutal: "Brutal",
};

export function ExerciseFeedbackSheet({
  visible,
  exerciseName,
  onSubmit,
  onSkip,
}: Props) {
  const { theme } = useAppTheme();
  const [selectedRpe, setSelectedRpe] = useState<number | null>(null);
  const [selectedFeeling, setSelectedFeeling] = useState<FeelingTag | null>(
    null
  );

  const handleRpeTap = useCallback((value: number) => {
    setSelectedRpe(value);
    impact(ImpactStyle.Light);
  }, []);

  const handleFeelingTap = useCallback((tag: FeelingTag) => {
    setSelectedFeeling(tag);
    impact(ImpactStyle.Light);
  }, []);

  const handleSubmit = useCallback(() => {
    if (selectedRpe == null) return;
    onSubmit({
      rpe: selectedRpe,
      feeling: selectedFeeling ?? "okay",
    });
    setSelectedRpe(null);
    setSelectedFeeling(null);
  }, [selectedRpe, selectedFeeling, onSubmit]);

  const handleSkip = useCallback(() => {
    onSkip();
    setSelectedRpe(null);
    setSelectedFeeling(null);
  }, [onSkip]);

  return (
    <AppBottomSheet visible={visible} onClose={handleSkip}>
      <Text style={[styles.title, { color: theme.colors.text }]}>
        How'd that feel?
      </Text>
      <Text style={[styles.subtitle, { color: theme.colors.muted }]}>
        {exerciseName}
      </Text>

      {/* RPE — two rows of 5 so they fit comfortably */}
      <View style={{ flexDirection: "row", alignItems: "center" }}>
        <Text style={[styles.sectionLabel, { color: theme.colors.muted }]}>
          EFFORT (RPE)
        </Text>
        <InfoTooltip term="RPE" definition="Rate of Perceived Exertion — how hard a set felt on a scale of 1-10. Use 6-7 for moderate sets, 8-9 for hard sets, 10 for max effort." />
      </View>
      <View style={styles.rpeGrid}>
        <View style={styles.rpeRow}>
          {RPE_VALUES.slice(0, 5).map((value) => {
            const isSelected = selectedRpe === value;
            return (
              <Pressable
                key={value}
                onPress={() => handleRpeTap(value)}
                style={[
                  styles.rpeCircle,
                  {
                    borderColor: isSelected
                      ? theme.colors.primary
                      : theme.colors.border,
                    backgroundColor: isSelected
                      ? theme.colors.primary
                      : "transparent",
                  },
                ]}
              >
                <Text
                  style={[
                    styles.rpeText,
                    {
                      color: isSelected
                        ? theme.colors.primaryText
                        : theme.colors.text,
                    },
                  ]}
                >
                  {value}
                </Text>
              </Pressable>
            );
          })}
        </View>
        <View style={styles.rpeRow}>
          {RPE_VALUES.slice(5).map((value) => {
            const isSelected = selectedRpe === value;
            return (
              <Pressable
                key={value}
                onPress={() => handleRpeTap(value)}
                style={[
                  styles.rpeCircle,
                  {
                    borderColor: isSelected
                      ? theme.colors.primary
                      : theme.colors.border,
                    backgroundColor: isSelected
                      ? theme.colors.primary
                      : "transparent",
                  },
                ]}
              >
                <Text
                  style={[
                    styles.rpeText,
                    {
                      color: isSelected
                        ? theme.colors.primaryText
                        : theme.colors.text,
                    },
                  ]}
                >
                  {value}
                </Text>
              </Pressable>
            );
          })}
        </View>
      </View>

      {/* RPE Labels */}
      <View style={styles.rpeLabelRow}>
        <Text style={[styles.rpeLabel, { color: theme.colors.muted }]}>
          Easy
        </Text>
        <Text style={[styles.rpeLabel, { color: theme.colors.muted }]}>
          Max Effort
        </Text>
      </View>

      {/* Feeling Chips — single row, all 5 fit with flex */}
      <Text style={[styles.sectionLabel, { color: theme.colors.muted }]}>
        HOW DID YOU FEEL?
      </Text>
      <View style={styles.feelingRow}>
        {FEELING_TAGS.map((tag) => {
          const isSelected = selectedFeeling === tag;
          return (
            <Pressable
              key={tag}
              onPress={() => handleFeelingTap(tag)}
              style={[
                styles.feelingChip,
                {
                  borderColor: isSelected
                    ? theme.colors.primary
                    : theme.colors.border,
                  backgroundColor: isSelected
                    ? theme.colors.primary
                    : "transparent",
                },
              ]}
            >
              <Text
                style={[
                  styles.feelingText,
                  {
                    color: isSelected
                      ? theme.colors.primaryText
                      : theme.colors.text,
                  },
                ]}
              >
                {FEELING_LABELS[tag]}
              </Text>
            </Pressable>
          );
        })}
      </View>

      {/* Actions — full width */}
      <View style={styles.actions}>
        <Button
          label="Save"
          onPress={handleSubmit}
          disabled={selectedRpe == null}
        />
        <Pressable onPress={handleSkip} style={styles.skipButton}>
          <Text style={[styles.skipText, { color: theme.colors.muted }]}>
            Skip
          </Text>
        </Pressable>
      </View>
    </AppBottomSheet>
  );
}

const styles = StyleSheet.create({
  title: {
    fontSize: 20,
    fontWeight: "700",
    textAlign: "center",
  },
  subtitle: {
    fontSize: 14,
    textAlign: "center",
    marginTop: 4,
    marginBottom: 24,
  },
  sectionLabel: {
    fontSize: 11,
    fontWeight: "700",
    letterSpacing: 1.2,
    textTransform: "uppercase",
    marginBottom: 10,
  },
  rpeGrid: {
    gap: 10,
    marginBottom: 6,
  },
  rpeRow: {
    flexDirection: "row",
    justifyContent: "center",
    gap: 10,
  },
  rpeCircle: {
    width: 42,
    height: 42,
    borderRadius: 21,
    borderWidth: 1.5,
    alignItems: "center",
    justifyContent: "center",
  },
  rpeText: {
    fontSize: 15,
    fontWeight: "700",
  },
  rpeLabelRow: {
    flexDirection: "row",
    justifyContent: "space-between",
    paddingHorizontal: 16,
    marginBottom: 24,
  },
  rpeLabel: {
    fontSize: 11,
    fontWeight: "500",
  },
  feelingRow: {
    flexDirection: "row",
    justifyContent: "center",
    gap: 8,
    marginBottom: 28,
  },
  feelingChip: {
    paddingVertical: 8,
    paddingHorizontal: 12,
    borderRadius: 20,
    borderWidth: 1.5,
  },
  feelingText: {
    fontSize: 12,
    fontWeight: "600",
  },
  actions: {
    gap: 12,
    alignItems: "center",
  },
  skipButton: {
    paddingVertical: 8,
  },
  skipText: {
    fontSize: 14,
    fontWeight: "500",
  },
});
