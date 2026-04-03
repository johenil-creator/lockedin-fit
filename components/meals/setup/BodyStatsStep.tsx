import React, { useMemo, useState } from "react";
import {
  FlatList,
  Modal,
  Pressable,
  ScrollView,
  StyleSheet,
  Text,
  TextInput,
  View,
} from "react-native";
import Animated, { FadeInDown } from "react-native-reanimated";
import { Ionicons } from "@expo/vector-icons";
import { useAppTheme } from "../../../contexts/ThemeContext";
import { useProfileContext } from "../../../contexts/ProfileContext";
import { useSafeAreaInsets } from "react-native-safe-area-context";
import { spacing, radius, typography } from "../../../lib/theme";
import type { ActivityLevel, BiologicalSex } from "../../../src/data/mealTypes";

// ── Types ────────────────────────────────────────────────────────────────────

type Props = {
  draft: {
    heightCm?: number;
    age?: number;
    sex?: BiologicalSex;
    activityLevel?: ActivityLevel;
  };
  onUpdate: (patch: {
    heightCm?: number;
    age?: number;
    sex?: BiologicalSex;
    activityLevel?: ActivityLevel;
  }) => void;
  onContinue: () => void;
  onBack: () => void;
};

// ── Config ───────────────────────────────────────────────────────────────────

const SEX_OPTIONS: { key: BiologicalSex; label: string }[] = [
  { key: "male", label: "Male" },
  { key: "female", label: "Female" },
];

const ACTIVITY_OPTIONS: { key: ActivityLevel; label: string; desc: string }[] = [
  { key: "sedentary", label: "Sedentary", desc: "Desk job, little exercise" },
  { key: "light", label: "Lightly Active", desc: "Light exercise 1-3x/week" },
  { key: "moderate", label: "Moderate", desc: "Exercise 3-5x/week" },
  { key: "active", label: "Active", desc: "Hard exercise 6-7x/week" },
  { key: "very_active", label: "Very Active", desc: "Athlete / physical job" },
];

// ── Height options ───────────────────────────────────────────────────────────

type HeightOption = { label: string; cm: number };

function buildHeightOptions(): HeightOption[] {
  const opts: HeightOption[] = [];
  // 120 cm (3'11") to 220 cm (7'3")
  for (let cm = 120; cm <= 220; cm++) {
    const totalInches = Math.round(cm / 2.54);
    const ft = Math.floor(totalInches / 12);
    const inch = totalInches % 12;
    opts.push({ label: `${cm} cm  /  ${ft}'${inch}"`, cm });
  }
  return opts;
}

const HEIGHT_OPTIONS = buildHeightOptions();

// ── Component ────────────────────────────────────────────────────────────────

export function BodyStatsStep({ draft, onUpdate, onContinue, onBack }: Props) {
  const { theme } = useAppTheme();
  const { profile, updateProfile } = useProfileContext();
  const insets = useSafeAreaInsets();
  const c = theme.colors;

  const isLbs = profile.weightUnit === "lbs";
  const profileWeightRaw = parseFloat(profile.weight as string) || 0;

  const [ageText, setAgeText] = useState(
    draft.age ? String(draft.age) : "",
  );
  const [weightText, setWeightText] = useState(
    profileWeightRaw > 0 ? String(Math.round(profileWeightRaw)) : "",
  );
  const [heightPickerOpen, setHeightPickerOpen] = useState(false);

  const sex = draft.sex;
  const activity = draft.activityLevel ?? "moderate";

  const canContinue = !!(
    draft.heightCm && draft.heightCm > 0 &&
    draft.age && draft.age > 0 &&
    draft.sex &&
    weightText.trim() && parseFloat(weightText) > 0
  );

  const selectedHeightLabel = useMemo(() => {
    if (!draft.heightCm) return "Select height";
    const opt = HEIGHT_OPTIONS.find((o) => o.cm === draft.heightCm);
    return opt?.label ?? `${draft.heightCm} cm`;
  }, [draft.heightCm]);

  function handleAgeBlur() {
    const val = parseInt(ageText, 10);
    onUpdate({ age: val > 0 && val < 120 ? val : undefined });
  }

  function handleWeightBlur() {
    const val = parseFloat(weightText);
    if (val > 0) {
      updateProfile({ weight: String(val) });
    }
  }

  return (
    <Animated.View entering={FadeInDown.duration(400)} style={styles.root}>
      <ScrollView
        contentContainerStyle={styles.scroll}
        showsVerticalScrollIndicator={false}
        keyboardShouldPersistTaps="handled"
      >
        {/* Header */}
        <Text style={[styles.eyebrow, { color: c.primary }]}>ABOUT YOU</Text>
        <Text style={[styles.title, { color: c.text }]}>
          Let's dial in your numbers
        </Text>
        <Text style={[styles.subtitle, { color: c.muted }]}>
          We'll use this to calculate your exact calorie needs.
        </Text>

        {/* Sex */}
        <Text style={[styles.fieldLabel, { color: c.text }]}>
          Biological Sex
        </Text>
        <View style={styles.segmentRow}>
          {SEX_OPTIONS.map((opt) => {
            const isOn = sex === opt.key;
            return (
              <Pressable
                key={opt.key}
                onPress={() => onUpdate({ sex: opt.key })}
                style={[
                  styles.segment,
                  {
                    backgroundColor: isOn ? c.primary + "20" : c.surface,
                    borderColor: isOn ? c.primary : c.border,
                  },
                ]}
              >
                <Text
                  style={[
                    styles.segmentText,
                    { color: isOn ? c.primary : c.text },
                  ]}
                >
                  {opt.label}
                </Text>
              </Pressable>
            );
          })}
        </View>

        {/* Age */}
        <Text style={[styles.fieldLabel, { color: c.text }]}>Age</Text>
        <TextInput
          style={[
            styles.input,
            {
              backgroundColor: c.surface,
              borderColor: c.border,
              color: c.text,
            },
          ]}
          value={ageText}
          onChangeText={setAgeText}
          onBlur={handleAgeBlur}
          placeholder="e.g. 25"
          placeholderTextColor={c.muted}
          keyboardType="number-pad"
          maxLength={3}
          returnKeyType="done"
        />

        {/* Weight */}
        <Text style={[styles.fieldLabel, { color: c.text }]}>
          Weight ({isLbs ? "lbs" : "kg"})
        </Text>
        <TextInput
          style={[
            styles.input,
            {
              backgroundColor: c.surface,
              borderColor: c.border,
              color: c.text,
            },
          ]}
          value={weightText}
          onChangeText={setWeightText}
          onBlur={handleWeightBlur}
          placeholder={isLbs ? "e.g. 165" : "e.g. 75"}
          placeholderTextColor={c.muted}
          keyboardType="decimal-pad"
          maxLength={5}
          returnKeyType="done"
        />

        {/* Height */}
        <Text style={[styles.fieldLabel, { color: c.text }]}>Height</Text>
        <Pressable
          onPress={() => setHeightPickerOpen(true)}
          style={[
            styles.pickerBtn,
            {
              backgroundColor: c.surface,
              borderColor: c.border,
            },
          ]}
        >
          <Text
            style={[
              styles.pickerBtnText,
              { color: draft.heightCm ? c.text : c.muted },
            ]}
          >
            {selectedHeightLabel}
          </Text>
          <Ionicons name="chevron-down" size={18} color={c.muted} />
        </Pressable>

        {/* Height Picker Modal */}
        <Modal
          visible={heightPickerOpen}
          transparent
          animationType="slide"
          onRequestClose={() => setHeightPickerOpen(false)}
        >
          <View style={styles.modalOverlay}>
            <View
              style={[
                styles.modalSheet,
                {
                  backgroundColor: c.bg,
                  paddingBottom: insets.bottom + spacing.md,
                },
              ]}
            >
              <View style={styles.modalHeader}>
                <Text style={[styles.modalTitle, { color: c.text }]}>
                  Select Height
                </Text>
                <Pressable
                  onPress={() => setHeightPickerOpen(false)}
                  hitSlop={12}
                >
                  <Ionicons name="close" size={24} color={c.muted} />
                </Pressable>
              </View>
              <FlatList
                data={HEIGHT_OPTIONS}
                keyExtractor={(item) => String(item.cm)}
                initialScrollIndex={
                  draft.heightCm
                    ? Math.max(0, HEIGHT_OPTIONS.findIndex((o) => o.cm === draft.heightCm) - 3)
                    : 50 // ~170cm area
                }
                getItemLayout={(_, index) => ({
                  length: 48,
                  offset: 48 * index,
                  index,
                })}
                renderItem={({ item }) => {
                  const isSelected = item.cm === draft.heightCm;
                  return (
                    <Pressable
                      onPress={() => {
                        onUpdate({ heightCm: item.cm });
                        setHeightPickerOpen(false);
                      }}
                      style={[
                        styles.pickerRow,
                        {
                          backgroundColor: isSelected
                            ? c.primary + "18"
                            : "transparent",
                        },
                      ]}
                    >
                      <Text
                        style={[
                          styles.pickerRowText,
                          {
                            color: isSelected ? c.primary : c.text,
                            fontWeight: isSelected ? "700" : "400",
                          },
                        ]}
                      >
                        {item.label}
                      </Text>
                      {isSelected && (
                        <Ionicons
                          name="checkmark"
                          size={20}
                          color={c.primary}
                        />
                      )}
                    </Pressable>
                  );
                }}
              />
            </View>
          </View>
        </Modal>

        {/* Activity Level */}
        <Text style={[styles.fieldLabel, { color: c.text, marginTop: spacing.lg }]}>
          Activity Level
        </Text>
        <View style={styles.activityList}>
          {ACTIVITY_OPTIONS.map((opt) => {
            const isOn = activity === opt.key;
            return (
              <Pressable
                key={opt.key}
                onPress={() => onUpdate({ activityLevel: opt.key })}
                style={[
                  styles.activityCard,
                  {
                    backgroundColor: isOn ? c.primary + "14" : c.surface,
                    borderColor: isOn ? c.primary : c.border,
                  },
                ]}
              >
                <View style={styles.activityTextWrap}>
                  <Text
                    style={[
                      styles.activityLabel,
                      { color: isOn ? c.primary : c.text },
                    ]}
                  >
                    {opt.label}
                  </Text>
                  <Text style={[styles.activityDesc, { color: c.muted }]}>
                    {opt.desc}
                  </Text>
                </View>
                {isOn && (
                  <View
                    style={[styles.radioDot, { backgroundColor: c.primary }]}
                  />
                )}
              </Pressable>
            );
          })}
        </View>
      </ScrollView>

      {/* Footer */}
      <View style={styles.footer}>
        <Pressable
          onPress={canContinue ? onContinue : undefined}
          style={[
            styles.continueBtn,
            {
              backgroundColor: canContinue ? c.primary : c.border,
            },
          ]}
        >
          <Text
            style={[
              styles.continueTxt,
              { color: canContinue ? c.primaryText : c.muted },
            ]}
          >
            Continue
          </Text>
        </Pressable>
      </View>
    </Animated.View>
  );
}

// ── Styles ───────────────────────────────────────────────────────────────────

const styles = StyleSheet.create({
  root: {
    flex: 1,
  },
  scroll: {
    paddingHorizontal: spacing.lg,
    paddingTop: 120,
    paddingBottom: spacing.xl + 80,
  },
  eyebrow: {
    fontSize: 11,
    fontWeight: "700",
    letterSpacing: 1.2,
    textTransform: "uppercase",
    marginBottom: spacing.xs,
  },
  title: {
    ...typography.heading,
    marginBottom: spacing.xs,
  },
  subtitle: {
    ...typography.body,
    marginBottom: spacing.lg,
  },

  // Fields
  fieldLabel: {
    ...typography.subheading,
    fontSize: 14,
    marginBottom: spacing.xs,
    marginTop: spacing.md,
  },
  input: {
    borderWidth: 1,
    borderRadius: radius.md,
    paddingHorizontal: spacing.md,
    paddingVertical: 14,
    fontSize: 16,
    fontWeight: "600",
  },

  // Sex segment
  segmentRow: {
    flexDirection: "row",
    gap: spacing.sm,
  },
  segment: {
    flex: 1,
    alignItems: "center",
    paddingVertical: 14,
    borderRadius: radius.md,
    borderWidth: 1.5,
  },
  segmentText: {
    fontSize: 15,
    fontWeight: "600",
  },

  // Height picker
  pickerBtn: {
    flexDirection: "row",
    alignItems: "center",
    justifyContent: "space-between",
    borderWidth: 1,
    borderRadius: radius.md,
    paddingHorizontal: spacing.md,
    paddingVertical: 14,
  },
  pickerBtnText: {
    fontSize: 16,
    fontWeight: "600",
  },
  modalOverlay: {
    flex: 1,
    justifyContent: "flex-end",
    backgroundColor: "rgba(0,0,0,0.5)",
  },
  modalSheet: {
    maxHeight: "60%",
    borderTopLeftRadius: radius.lg,
    borderTopRightRadius: radius.lg,
  },
  modalHeader: {
    flexDirection: "row",
    alignItems: "center",
    justifyContent: "space-between",
    paddingHorizontal: spacing.lg,
    paddingVertical: spacing.md,
    borderBottomWidth: StyleSheet.hairlineWidth,
    borderBottomColor: "rgba(255,255,255,0.1)",
  },
  modalTitle: {
    ...typography.subheading,
  },
  pickerRow: {
    flexDirection: "row",
    alignItems: "center",
    justifyContent: "space-between",
    paddingHorizontal: spacing.lg,
    height: 48,
  },
  pickerRowText: {
    fontSize: 16,
  },

  // Activity
  activityList: {
    gap: spacing.sm,
  },
  activityCard: {
    flexDirection: "row",
    alignItems: "center",
    borderWidth: 1,
    borderRadius: radius.md,
    paddingVertical: 12,
    paddingHorizontal: spacing.md,
  },
  activityTextWrap: {
    flex: 1,
  },
  activityLabel: {
    fontSize: 14,
    fontWeight: "600",
  },
  activityDesc: {
    fontSize: 12,
    marginTop: 1,
  },
  radioDot: {
    width: 10,
    height: 10,
    borderRadius: 5,
  },

  // Footer
  footer: {
    position: "absolute",
    bottom: 0,
    left: 0,
    right: 0,
    paddingHorizontal: spacing.lg,
    paddingBottom: spacing.xl,
    paddingTop: spacing.md,
  },
  continueBtn: {
    height: 52,
    borderRadius: radius.md,
    alignItems: "center",
    justifyContent: "center",
  },
  continueTxt: {
    ...typography.subheading,
  },
});
