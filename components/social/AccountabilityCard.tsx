import React from "react";
import { View, Text, StyleSheet } from "react-native";
import { useAppTheme } from "../../contexts/ThemeContext";
import { spacing, radius, typography } from "../../lib/theme";
import { NudgeButton } from "./NudgeButton";
import type { AccountabilityPartner } from "../../lib/types";

type Props = {
  partner: AccountabilityPartner | null;
  canNudge: boolean;
  onNudge: () => Promise<boolean>;
};

function AccountabilityCardInner({ partner, canNudge: nudgeAllowed, onNudge }: Props) {
  const { theme } = useAppTheme();

  if (!partner) {
    return (
      <View
        style={[
          styles.container,
          {
            backgroundColor: theme.colors.surface,
            borderColor: theme.colors.border,
          },
        ]}
      >
        <Text style={[styles.emptyTitle, { color: theme.colors.muted }]}>
          No accountability partner yet
        </Text>
        <Text style={[styles.emptySubtext, { color: theme.colors.muted }]}>
          Find a Partner
        </Text>
      </View>
    );
  }

  const initial = partner.partnerName[0].toUpperCase();

  return (
    <View
      style={[
        styles.container,
        {
          backgroundColor: theme.colors.surface,
          borderColor: theme.colors.border,
        },
      ]}
    >
      <View style={styles.headerRow}>
        <View
          style={[
            styles.avatar,
            { backgroundColor: theme.colors.primary + "30" },
          ]}
        >
          <Text style={[styles.avatarText, { color: theme.colors.primary }]}>
            {initial}
          </Text>
        </View>
        <View style={styles.info}>
          <Text
            style={[styles.partnerName, { color: theme.colors.text }]}
            numberOfLines={1}
          >
            {partner.partnerName}
          </Text>
          <Text style={[styles.streakLabel, { color: theme.colors.muted }]}>
            {partner.mutualStreakDays} day mutual streak
          </Text>
        </View>
      </View>

      <NudgeButton canNudge={nudgeAllowed} onNudge={onNudge} />
    </View>
  );
}

export const AccountabilityCard = React.memo(AccountabilityCardInner);

const styles = StyleSheet.create({
  container: {
    borderRadius: radius.lg,
    borderWidth: 1,
    padding: spacing.md,
    gap: spacing.md,
  },
  headerRow: {
    flexDirection: "row",
    alignItems: "center",
    gap: spacing.md,
  },
  avatar: {
    width: 44,
    height: 44,
    borderRadius: 22,
    alignItems: "center",
    justifyContent: "center",
  },
  avatarText: {
    fontSize: 18,
    fontWeight: "700",
  },
  info: {
    flex: 1,
    gap: 2,
  },
  partnerName: {
    ...typography.subheading,
    fontWeight: "600",
  },
  streakLabel: {
    ...typography.caption,
  },
  emptyTitle: {
    ...typography.body,
    textAlign: "center",
  },
  emptySubtext: {
    ...typography.small,
    textAlign: "center",
    fontWeight: "600",
    marginTop: spacing.xs,
  },
});
