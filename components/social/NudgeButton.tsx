import React, { useCallback, useState } from "react";
import { Pressable, Text, StyleSheet } from "react-native";
import { useAppTheme } from "../../contexts/ThemeContext";
import { spacing, radius, typography } from "../../lib/theme";

type Props = {
  canNudge: boolean;
  onNudge: () => Promise<boolean>;
};

function NudgeButtonInner({ canNudge: nudgeAllowed, onNudge }: Props) {
  const { theme } = useAppTheme();
  const [sending, setSending] = useState(false);
  const [sent, setSent] = useState(false);

  const handlePress = useCallback(async () => {
    if (!nudgeAllowed || sending || sent) return;
    setSending(true);
    try {
      const success = await onNudge();
      if (success) setSent(true);
    } finally {
      setSending(false);
    }
  }, [nudgeAllowed, sending, sent, onNudge]);

  const isDisabled = !nudgeAllowed || sending || sent;
  const label = sent ? "Nudged Today" : sending ? "Sending..." : "Send Nudge";

  return (
    <Pressable
      onPress={handlePress}
      disabled={isDisabled}
      style={[
        styles.button,
        {
          backgroundColor: isDisabled
            ? theme.colors.border
            : theme.colors.primary,
        },
      ]}
    >
      <Text
        style={[
          styles.label,
          {
            color: isDisabled
              ? theme.colors.muted
              : theme.colors.primaryText,
          },
        ]}
      >
        {label}
      </Text>
    </Pressable>
  );
}

export const NudgeButton = React.memo(NudgeButtonInner);

const styles = StyleSheet.create({
  button: {
    paddingVertical: spacing.sm,
    paddingHorizontal: spacing.lg,
    borderRadius: radius.md,
    alignItems: "center",
    justifyContent: "center",
  },
  label: {
    ...typography.small,
    fontWeight: "700",
  },
});
