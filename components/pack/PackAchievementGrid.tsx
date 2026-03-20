import React from "react";
import { View, Text, StyleSheet } from "react-native";
import { Ionicons } from "@expo/vector-icons";
import { useAppTheme } from "../../contexts/ThemeContext";
import { spacing, radius, typography } from "../../lib/theme";
import type { PackAchievement } from "../../lib/types";

type Props = {
  achievements: PackAchievement[];
};

function PackAchievementGridInner({ achievements }: Props) {
  const { theme } = useAppTheme();

  return (
    <View style={styles.grid}>
      {achievements.map((a) => {
        const unlocked = a.unlockedAt !== null;
        return (
          <View
            key={a.id}
            style={[
              styles.item,
              {
                backgroundColor: unlocked
                  ? theme.colors.surface
                  : theme.colors.mutedBg,
                opacity: unlocked ? 1 : 0.5,
              },
            ]}
          >
            {unlocked ? (
              <Text style={styles.icon}>{a.icon}</Text>
            ) : (
              <Ionicons
                name="lock-closed"
                size={20}
                color={theme.colors.muted}
              />
            )}
            <Text
              style={[
                typography.caption,
                {
                  color: unlocked ? theme.colors.text : theme.colors.muted,
                  fontWeight: unlocked ? "600" : "400",
                  textAlign: "center",
                  marginTop: 4,
                },
              ]}
              numberOfLines={2}
            >
              {a.name}
            </Text>
          </View>
        );
      })}
    </View>
  );
}

export const PackAchievementGrid = React.memo(PackAchievementGridInner);

const styles = StyleSheet.create({
  grid: {
    flexDirection: "row",
    flexWrap: "wrap",
    gap: spacing.sm,
  },
  item: {
    width: "30%",
    aspectRatio: 1,
    borderRadius: radius.md,
    alignItems: "center",
    justifyContent: "center",
    padding: spacing.xs,
    shadowColor: "#000",
    shadowOffset: { width: 0, height: 1 },
    shadowOpacity: 0.05,
    shadowRadius: 3,
    elevation: 2,
  },
  icon: {
    fontSize: 24,
  },
});
