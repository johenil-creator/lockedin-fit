import React from "react";
import { View, Text, StyleSheet } from "react-native";
import { useAppTheme } from "../../contexts/ThemeContext";
import { LockePreview } from "./LockePreview";
import { spacing, typography, radius } from "../../lib/theme";
import { rankDisplayName } from "../../lib/rankService";
import type { PackMember } from "../../lib/types";

type Props = {
  member: PackMember;
  isLeader: boolean;
};

function PackMemberRowInner({ member, isLeader }: Props) {
  const { theme } = useAppTheme();

  return (
    <View style={[styles.container, { borderBottomColor: theme.colors.border }]}>
      <LockePreview size={36} customization={member.lockeCustomization} />

      <View style={styles.info}>
        <View style={styles.nameRow}>
          <Text
            style={[typography.body, { color: theme.colors.text, fontWeight: "600" }]}
            numberOfLines={1}
          >
            {member.displayName}
          </Text>
          {isLeader && (
            <View style={[styles.leaderBadge, { backgroundColor: "#FFD70020" }]}>
              <Text style={{ fontSize: 10, color: "#FFD700", fontWeight: "700" }}>LEADER</Text>
            </View>
          )}
        </View>
        <Text style={[typography.caption, { color: theme.colors.muted }]}>
          {rankDisplayName(member.rank)}
        </Text>
      </View>

      {member.weeklyXp > 0 && (
        <Text style={[typography.caption, { color: theme.colors.accent, fontWeight: "700" }]}>
          {member.weeklyXp} XP
        </Text>
      )}
    </View>
  );
}

export const PackMemberRow = React.memo(PackMemberRowInner);

const styles = StyleSheet.create({
  container: {
    flexDirection: "row",
    alignItems: "center",
    paddingVertical: 8,
    borderBottomWidth: StyleSheet.hairlineWidth,
    gap: spacing.sm,
  },
  info: {
    flex: 1,
  },
  nameRow: {
    flexDirection: "row",
    alignItems: "center",
    gap: spacing.xs,
  },
  leaderBadge: {
    paddingHorizontal: 6,
    paddingVertical: 1,
    borderRadius: radius.full,
  },
});
