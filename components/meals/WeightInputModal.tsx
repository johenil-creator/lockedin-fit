import React, { useState, useEffect, useRef } from "react";
import {
  View,
  Text,
  TextInput,
  Pressable,
  Modal,
  StyleSheet,
  KeyboardAvoidingView,
  Platform,
} from "react-native";
import { Ionicons } from "@expo/vector-icons";
import { useAppTheme } from "../../contexts/ThemeContext";
import { spacing, radius, typography } from "../../lib/theme";

type Props = {
  visible: boolean;
  onClose: () => void;
  onSave: (weightKg: number) => void;
  currentWeightDisplay?: number;
  weightUnit: "kg" | "lbs";
  tierColor: string;
  /** Previous weight in kg — used to show change comparison */
  lastWeightKg?: number;
};

export function WeightInputModal({
  visible,
  onClose,
  onSave,
  currentWeightDisplay,
  weightUnit,
  tierColor,
  lastWeightKg,
}: Props) {
  const { theme } = useAppTheme();
  const [value, setValue] = useState("");
  const inputRef = useRef<TextInput>(null);

  // Pre-fill with current weight when modal opens; clear on close
  useEffect(() => {
    if (visible && currentWeightDisplay) {
      setValue(String(currentWeightDisplay));
    }
    if (!visible) {
      setValue("");
    }
  }, [visible, currentWeightDisplay]);

  // Auto-focus the input when modal opens
  useEffect(() => {
    if (visible) {
      // Small delay to let the modal animate in before focusing
      const timer = setTimeout(() => inputRef.current?.focus(), 200);
      return () => clearTimeout(timer);
    }
  }, [visible]);

  const handleClose = () => {
    setValue("");
    onClose();
  };

  const parsedValue = parseFloat(value);
  const isValid = !isNaN(parsedValue) && parsedValue > 0 && value.trim() !== "";

  const handleSave = () => {
    if (!isValid) return;
    const num = parsedValue;
    // Convert to kg for storage
    const kg = weightUnit === "lbs" ? num / 2.20462 : num;
    onSave(kg);
    handleClose();
  };

  /** Adjust current value by a delta (in display units) */
  const adjustValue = (delta: number) => {
    const current = parseFloat(value) || 0;
    const next = Math.max(0, +(current + delta).toFixed(1));
    setValue(String(next));
  };

  // Compute change from last weigh-in (in display units)
  const changeInfo = (() => {
    if (lastWeightKg == null) return null;
    const currentNum = parseFloat(value);
    if (isNaN(currentNum) || currentNum <= 0) return null;

    const lastDisplay =
      weightUnit === "lbs"
        ? +(lastWeightKg * 2.20462).toFixed(1)
        : +lastWeightKg.toFixed(1);
    const diff = +(currentNum - lastDisplay).toFixed(1);
    if (diff === 0) return null;

    const arrow = diff > 0 ? "\u2191" : "\u2193";
    const absDiff = Math.abs(diff);
    return { arrow, absDiff, diff };
  })();

  const QUICK_ADJUSTMENTS = [-1, -0.5, +0.5];

  return (
    <Modal visible={visible} transparent animationType="slide">
      <Pressable style={styles.modalOverlay} onPress={handleClose}>
        <KeyboardAvoidingView
          behavior={Platform.OS === "ios" ? "padding" : undefined}
          style={styles.keyboardView}
        >
          <Pressable
            style={[
              styles.modalSheet,
              { backgroundColor: theme.colors.surface },
            ]}
          >
            {/* Header */}
            <View style={styles.modalHeader}>
              <Ionicons name="scale-outline" size={20} color={tierColor} />
              <Text style={[styles.modalTitle, { color: theme.colors.text }]}>
                Log Weight
              </Text>
              <Pressable onPress={handleClose} hitSlop={12}>
                <Ionicons name="close" size={22} color={theme.colors.muted} />
              </Pressable>
            </View>

            {/* Hero weight input with stepper buttons */}
            <View style={styles.inputRow}>
              {/* Minus stepper */}
              <Pressable
                onPress={() => adjustValue(-0.1)}
                style={[
                  styles.stepperBtn,
                  { backgroundColor: theme.colors.mutedBg },
                ]}
                hitSlop={8}
              >
                <Ionicons
                  name="remove"
                  size={20}
                  color={theme.colors.text}
                />
              </Pressable>

              {/* Weight input + unit */}
              <View style={styles.heroContainer}>
                <TextInput
                  ref={inputRef}
                  style={[styles.heroInput, { color: theme.colors.text }]}
                  value={value}
                  onChangeText={setValue}
                  keyboardType="decimal-pad"
                  placeholder="0"
                  placeholderTextColor={theme.colors.muted}
                  returnKeyType="done"
                  onSubmitEditing={handleSave}
                  selectTextOnFocus
                />
                <Text style={[styles.heroUnit, { color: theme.colors.muted }]}>
                  {weightUnit}
                </Text>
              </View>

              {/* Plus stepper */}
              <Pressable
                onPress={() => adjustValue(0.1)}
                style={[
                  styles.stepperBtn,
                  { backgroundColor: theme.colors.mutedBg },
                ]}
                hitSlop={8}
              >
                <Ionicons name="add" size={20} color={theme.colors.text} />
              </Pressable>
            </View>

            {/* Change from last weigh-in */}
            {changeInfo && (
              <Text
                style={[
                  styles.changeText,
                  { color: changeInfo.diff < 0 ? "#4CAF50" : "#FF9800" },
                ]}
              >
                {changeInfo.arrow} {changeInfo.absDiff} {weightUnit} from last
                weigh-in
              </Text>
            )}

            {/* Quick-set adjustment pills */}
            <View style={styles.quickRow}>
              {QUICK_ADJUSTMENTS.map((delta) => (
                <Pressable
                  key={delta}
                  onPress={() => adjustValue(delta)}
                  style={[
                    styles.quickPill,
                    { backgroundColor: theme.colors.mutedBg },
                  ]}
                >
                  <Text
                    style={[styles.quickPillText, { color: theme.colors.muted }]}
                  >
                    {delta > 0 ? `+${delta}` : String(delta)}
                  </Text>
                </Pressable>
              ))}
            </View>

            {/* Divider */}
            <View
              style={[styles.divider, { backgroundColor: theme.colors.border }]}
            />

            {/* Save button */}
            <Pressable
              onPress={isValid ? handleSave : undefined}
              style={[
                styles.saveBtn,
                { backgroundColor: tierColor, opacity: isValid ? 1 : 0.5 },
              ]}
              disabled={!isValid}
            >
              <Text style={styles.saveBtnText}>Save</Text>
            </Pressable>
          </Pressable>
        </KeyboardAvoidingView>
      </Pressable>
    </Modal>
  );
}

const styles = StyleSheet.create({
  modalOverlay: {
    flex: 1,
    backgroundColor: "rgba(0,0,0,0.5)",
    justifyContent: "flex-end",
  },
  keyboardView: {
    width: "100%",
    justifyContent: "flex-end",
  },
  modalSheet: {
    width: "100%",
    borderTopLeftRadius: radius.xl,
    borderTopRightRadius: radius.xl,
    padding: spacing.lg,
    paddingBottom: spacing.lg + 16,
  },
  modalHeader: {
    flexDirection: "row",
    alignItems: "center",
    gap: spacing.sm,
    marginBottom: spacing.lg,
  },
  modalTitle: {
    fontSize: typography.subheading.fontSize,
    fontWeight: "700",
    flex: 1,
  },
  inputRow: {
    flexDirection: "row",
    alignItems: "center",
    justifyContent: "center",
    gap: spacing.md,
    marginBottom: spacing.sm,
  },
  stepperBtn: {
    width: 36,
    height: 36,
    borderRadius: 18,
    alignItems: "center",
    justifyContent: "center",
  },
  heroContainer: {
    flexDirection: "row",
    alignItems: "baseline",
    justifyContent: "center",
  },
  heroInput: {
    fontSize: 40,
    fontWeight: "800",
    textAlign: "right",
    minWidth: 100,
    paddingVertical: spacing.sm,
  },
  heroUnit: {
    fontSize: 18,
    fontWeight: "600",
    marginLeft: 4,
    paddingBottom: 4,
  },
  changeText: {
    fontSize: 13,
    fontWeight: "600",
    textAlign: "center",
    marginBottom: spacing.md,
  },
  quickRow: {
    flexDirection: "row",
    justifyContent: "center",
    gap: spacing.sm,
    marginBottom: spacing.lg,
  },
  quickPill: {
    paddingHorizontal: 14,
    paddingVertical: 6,
    borderRadius: 16,
  },
  quickPillText: {
    fontSize: 13,
    fontWeight: "600",
  },
  divider: {
    height: StyleSheet.hairlineWidth,
    width: "100%",
    marginBottom: spacing.lg,
  },
  saveBtn: {
    width: "100%",
    paddingVertical: 14,
    borderRadius: radius.md,
    alignItems: "center",
  },
  saveBtnText: {
    color: "#FFFFFF",
    fontSize: typography.subheading.fontSize,
    fontWeight: "700",
  },
});
