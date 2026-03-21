import React, { useState, useCallback } from "react";
import {
  View,
  Text,
  TouchableOpacity,
  TextInput,
  ActivityIndicator,
  StyleSheet,
} from "react-native";
import { Ionicons } from "@expo/vector-icons";
import { AppBottomSheet } from "../AppBottomSheet";
import { useAppTheme } from "../../contexts/ThemeContext";
import { spacing, radius, typography } from "../../lib/theme";
import { impact, ImpactStyle, notification, NotificationType } from "../../lib/haptics";
import type { ContentType, ReportReason } from "../../lib/moderationService";

type Props = {
  visible: boolean;
  onClose: () => void;
  contentType: ContentType;
  contentId: string;
  onSubmit: (
    contentType: ContentType,
    contentId: string,
    reason: ReportReason,
    reasonText?: string
  ) => Promise<boolean>;
};

const REASON_OPTIONS: { value: ReportReason; label: string; icon: string }[] = [
  { value: "spam", label: "Spam", icon: "alert-circle-outline" },
  { value: "harassment", label: "Harassment", icon: "warning-outline" },
  { value: "inappropriate", label: "Inappropriate Content", icon: "eye-off-outline" },
  { value: "other", label: "Other", icon: "ellipsis-horizontal-circle-outline" },
];

export function ReportSheet({
  visible,
  onClose,
  contentType,
  contentId,
  onSubmit,
}: Props) {
  const { theme } = useAppTheme();
  const colors = theme.colors;

  const [selectedReason, setSelectedReason] = useState<ReportReason | null>(null);
  const [reasonText, setReasonText] = useState("");
  const [submitting, setSubmitting] = useState(false);
  const [submitted, setSubmitted] = useState(false);

  const handleSelectReason = useCallback((reason: ReportReason) => {
    impact(ImpactStyle.Light);
    setSelectedReason(reason);
  }, []);

  const handleSubmit = useCallback(async () => {
    if (!selectedReason) return;
    setSubmitting(true);
    try {
      const success = await onSubmit(
        contentType,
        contentId,
        selectedReason,
        selectedReason === "other" ? reasonText : undefined
      );
      if (success) {
        impact(ImpactStyle.Medium);
        notification(NotificationType.Success);
        setSubmitted(true);
      }
    } finally {
      setSubmitting(false);
    }
  }, [selectedReason, reasonText, contentType, contentId, onSubmit]);

  const handleClose = useCallback(() => {
    // Reset state when closing
    setSelectedReason(null);
    setReasonText("");
    setSubmitting(false);
    setSubmitted(false);
    onClose();
  }, [onClose]);

  return (
    <AppBottomSheet visible={visible} onClose={handleClose}>
      {submitted ? (
        <View style={styles.successContainer}>
          <Ionicons name="checkmark-circle" size={48} color={colors.success} />
          <Text style={[styles.successTitle, { color: colors.text }]}>
            Report Submitted
          </Text>
          <Text style={[styles.successBody, { color: colors.muted }]}>
            Thanks for helping keep the community safe. We'll review this report.
          </Text>
          <TouchableOpacity
            style={[styles.doneButton, { backgroundColor: colors.primary }]}
            onPress={handleClose}
          >
            <Text style={[styles.doneButtonText, { color: colors.primaryText }]}>
              Done
            </Text>
          </TouchableOpacity>
        </View>
      ) : (
        <View>
          <Text style={[styles.title, { color: colors.text }]}>
            Report Content
          </Text>
          <Text style={[styles.subtitle, { color: colors.muted }]}>
            Why are you reporting this {contentType}?
          </Text>

          {REASON_OPTIONS.map((option) => {
            const isSelected = selectedReason === option.value;
            return (
              <TouchableOpacity
                key={option.value}
                style={[
                  styles.reasonOption,
                  {
                    backgroundColor: isSelected ? colors.primary + "18" : colors.mutedBg,
                    borderColor: isSelected ? colors.primary : colors.border,
                  },
                ]}
                onPress={() => handleSelectReason(option.value)}
                activeOpacity={0.7}
              >
                <Ionicons
                  name={option.icon as any}
                  size={20}
                  color={isSelected ? colors.primary : colors.muted}
                />
                <Text
                  style={[
                    styles.reasonLabel,
                    { color: isSelected ? colors.primary : colors.text },
                  ]}
                >
                  {option.label}
                </Text>
                {isSelected && (
                  <Ionicons
                    name="checkmark-circle"
                    size={20}
                    color={colors.primary}
                    style={styles.checkIcon}
                  />
                )}
              </TouchableOpacity>
            );
          })}

          {selectedReason === "other" && (
            <TextInput
              style={[
                styles.textInput,
                {
                  color: colors.text,
                  backgroundColor: colors.mutedBg,
                  borderColor: colors.border,
                },
              ]}
              placeholder="Tell us more..."
              placeholderTextColor={colors.muted}
              value={reasonText}
              onChangeText={setReasonText}
              multiline
              maxLength={500}
              textAlignVertical="top"
            />
          )}

          <TouchableOpacity
            style={[
              styles.submitButton,
              {
                backgroundColor: selectedReason ? colors.danger : colors.mutedBg,
                opacity: selectedReason ? 1 : 0.5,
              },
            ]}
            onPress={handleSubmit}
            disabled={!selectedReason || submitting}
            activeOpacity={0.7}
          >
            {submitting ? (
              <ActivityIndicator color={colors.dangerText} size="small" />
            ) : (
              <Text
                style={[
                  styles.submitButtonText,
                  { color: selectedReason ? colors.dangerText : colors.muted },
                ]}
              >
                Submit Report
              </Text>
            )}
          </TouchableOpacity>
        </View>
      )}
    </AppBottomSheet>
  );
}

const styles = StyleSheet.create({
  title: {
    ...typography.heading,
    marginBottom: spacing.xs,
  },
  subtitle: {
    ...typography.body,
    marginBottom: spacing.lg,
  },
  reasonOption: {
    flexDirection: "row",
    alignItems: "center",
    padding: spacing.md,
    borderRadius: radius.md,
    borderWidth: 1,
    marginBottom: spacing.sm,
    gap: spacing.sm,
  },
  reasonLabel: {
    ...typography.body,
    fontWeight: "500",
    flex: 1,
  },
  checkIcon: {
    marginLeft: "auto",
  },
  textInput: {
    borderWidth: 1,
    borderRadius: radius.md,
    padding: spacing.md,
    ...typography.body,
    height: 80,
    marginTop: spacing.sm,
    marginBottom: spacing.sm,
  },
  submitButton: {
    padding: spacing.md,
    borderRadius: radius.md,
    alignItems: "center",
    justifyContent: "center",
    marginTop: spacing.md,
    minHeight: 48,
  },
  submitButtonText: {
    ...typography.body,
    fontWeight: "600",
  },
  successContainer: {
    alignItems: "center",
    paddingVertical: spacing.lg,
    gap: spacing.sm,
  },
  successTitle: {
    ...typography.heading,
    marginTop: spacing.sm,
  },
  successBody: {
    ...typography.body,
    textAlign: "center",
    paddingHorizontal: spacing.lg,
  },
  doneButton: {
    paddingVertical: spacing.sm,
    paddingHorizontal: spacing.xl,
    borderRadius: radius.md,
    marginTop: spacing.md,
  },
  doneButtonText: {
    ...typography.body,
    fontWeight: "600",
  },
});
