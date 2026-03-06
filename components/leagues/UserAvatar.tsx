import React from "react";
import { View, Text, StyleSheet } from "react-native";
import { useAppTheme } from "../../contexts/ThemeContext";
import { spacing, radius } from "../../lib/theme";

// ── Deterministic avatar background palette ─────────────────────────────────
const AVATAR_COLORS = [
  "#FF6B6B", "#4ECDC4", "#45B7D1", "#96CEB4", "#FFEAA7",
  "#DDA0DD", "#98D8C8", "#F7DC6F", "#BB8FCE", "#85C1E9",
  "#F1948A", "#82E0AA", "#F8C471", "#AED6F1", "#D7BDE2",
];

function getAvatarColor(userId: string): string {
  let hash = 0;
  for (let i = 0; i < userId.length; i++) {
    hash = userId.charCodeAt(i) + ((hash << 5) - hash);
  }
  return AVATAR_COLORS[Math.abs(hash) % AVATAR_COLORS.length];
}

// ── Medal config for top 3 positions ────────────────────────────────────────
const MEDALS: Record<number, { bg: string; textColor: string }> = {
  1: { bg: "#FFD60A", textColor: "#000000" },
  2: { bg: "#C0C0C0", textColor: "#000000" },
  3: { bg: "#CD7F32", textColor: "#FFFFFF" },
};

// ── Props ───────────────────────────────────────────────────────────────────
type Props = {
  displayName: string;
  userId: string;
  position: number;
  isCurrentUser?: boolean;
};

function UserAvatarInner({ displayName, userId, position, isCurrentUser }: Props) {
  const { theme } = useAppTheme();

  const initial = (displayName.charAt(0) || "?").toUpperCase();
  const bgColor = getAvatarColor(userId);
  const medal = MEDALS[position];

  return (
    <View style={styles.wrapper}>
      <View
        style={[
          styles.avatar,
          { backgroundColor: bgColor },
          isCurrentUser && {
            borderWidth: 2,
            borderColor: theme.colors.primary,
          },
        ]}
      >
        <Text style={styles.initial}>{initial}</Text>
      </View>

      {medal != null && (
        <View style={[styles.medal, { backgroundColor: medal.bg }]}>
          <Text style={[styles.medalText, { color: medal.textColor }]}>
            {position}
          </Text>
        </View>
      )}
    </View>
  );
}

export const UserAvatar = React.memo(UserAvatarInner);

// ── Styles ──────────────────────────────────────────────────────────────────
const AVATAR_SIZE = 44;
const MEDAL_SIZE = 22;
const MEDAL_OFFSET = -4;

const styles = StyleSheet.create({
  wrapper: {
    width: AVATAR_SIZE + spacing.xs,
    height: AVATAR_SIZE + spacing.xs,
  },
  avatar: {
    width: AVATAR_SIZE,
    height: AVATAR_SIZE,
    borderRadius: AVATAR_SIZE / 2,
    justifyContent: "center",
    alignItems: "center",
  },
  initial: {
    color: "#FFFFFF",
    fontSize: 18,
    fontWeight: "700",
  },
  medal: {
    position: "absolute",
    bottom: MEDAL_OFFSET,
    left: MEDAL_OFFSET,
    width: MEDAL_SIZE,
    height: MEDAL_SIZE,
    borderRadius: MEDAL_SIZE / 2,
    justifyContent: "center",
    alignItems: "center",
  },
  medalText: {
    fontSize: 11,
    fontWeight: "700",
  },
});
