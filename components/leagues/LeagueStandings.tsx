import React, { useMemo, useState, useCallback } from "react";
import { View, Text, Pressable, StyleSheet } from "react-native";
import { useAppTheme } from "../../contexts/ThemeContext";
import { spacing } from "../../lib/theme";
import { UserAvatar } from "./UserAvatar";
import { ZoneDivider } from "./ZoneDivider";
import { ReactionBar } from "../../components/social/ReactionBar";
import { impact, ImpactStyle } from "../../lib/haptics";
import type { LeagueStanding } from "../../lib/leagueService";
import type { ReactionType } from "../../lib/types";

const PROMOTION_ZONE = 5; // Top 5 promote
const RELEGATION_ZONE = 5; // Bottom 5 relegate

// ── Position number colors for top 3 ────────────────────────────────────────
const POSITION_COLORS: Record<number, string> = {
  1: "#FFD60A", // gold
  2: "#C0C0C0", // silver
  3: "#CD7F32", // bronze
};

// ── Row component ───────────────────────────────────────────────────────────

type RowProps = {
  item: LeagueStanding;
  isFriend: boolean;
  onReact?: (userId: string, type: ReactionType) => void;
};

const StandingRow = React.memo(function StandingRow({ item, isFriend, onReact }: RowProps) {
  const { theme } = useAppTheme();
  const [showReactions, setShowReactions] = useState(false);

  const isCurrentUser = item.isCurrentUser === true;
  const positionColor =
    POSITION_COLORS[item.position] ?? theme.colors.muted;

  const handlePawPress = useCallback(() => {
    impact(ImpactStyle.Light);
    setShowReactions((v) => !v);
  }, []);

  const handleReact = useCallback((type: ReactionType) => {
    setShowReactions(false);
    onReact?.(item.userId, type);
  }, [item.userId, onReact]);

  return (
    <View>
      <View
        style={[
          styles.row,
          {
            backgroundColor: isCurrentUser
              ? theme.colors.primary + "12"
              : "transparent",
          },
        ]}
      >
        {/* Position number */}
        <View style={styles.positionCol}>
          <Text
            style={[
              styles.position,
              { color: positionColor },
              item.position <= 3 && styles.positionBold,
            ]}
          >
            {item.position}
          </Text>
        </View>

        {/* Avatar */}
        <UserAvatar
          displayName={item.displayName}
          userId={item.userId}
          position={item.position}
          isCurrentUser={isCurrentUser}
          lockeCustomization={item.lockeCustomization}
        />

        {/* Name + rank */}
        <View style={styles.nameCol}>
          <Text
            style={[
              styles.name,
              {
                color: isCurrentUser ? theme.colors.primary : theme.colors.text,
                fontWeight: isCurrentUser ? "700" : "500",
              },
            ]}
            numberOfLines={1}
          >
            {item.displayName}
            {isCurrentUser ? " (You)" : ""}
          </Text>
          <Text style={[styles.rankLabel, { color: theme.colors.muted }]}>
            {item.rank}
          </Text>
        </View>

        {/* XP */}
        <Text style={[styles.xp, { color: theme.colors.text }]}>
          {item.xpEarned.toLocaleString()} XP
        </Text>

        {/* Reaction paw button (friends only, not self) */}
        {isFriend && !isCurrentUser && onReact && (
          <Pressable onPress={handlePawPress} hitSlop={8} style={styles.pawBtn}>
            <Text style={{ fontSize: 14 }}>{"\uD83D\uDC3E"}</Text>
          </Pressable>
        )}
      </View>

      {/* Reaction picker (slides under row) */}
      {showReactions && (
        <View style={styles.reactionBarWrap}>
          <ReactionBar onSelect={handleReact} />
        </View>
      )}
    </View>
  );
});

// ── Props ───────────────────────────────────────────────────────────────────

type Props = {
  standings: LeagueStanding[];
  friendIds?: string[];
  showFriendsOnly?: boolean;
  onReact?: (userId: string, type: ReactionType) => void;
};

// ── Main component ──────────────────────────────────────────────────────────

export function LeagueStandings({
  standings,
  friendIds,
  showFriendsOnly,
  onReact,
}: Props) {
  const { theme } = useAppTheme();

  // Friend filtering — always include current user
  const filtered = useMemo(() => {
    if (!showFriendsOnly || !friendIds?.length) return standings;
    return standings.filter(
      (s) => s.isCurrentUser || friendIds.includes(s.userId),
    );
  }, [standings, friendIds, showFriendsOnly]);

  const totalMembers = standings.length;
  const showZones = totalMembers > 10;
  const relegationStart = totalMembers - (RELEGATION_ZONE - 1); // position where relegation begins

  const friendSet = useMemo(() => new Set(friendIds ?? []), [friendIds]);

  // Build flat list of rows + dividers
  const elements: React.ReactNode[] = [];

  for (let i = 0; i < filtered.length; i++) {
    const item = filtered[i];

    // Row
    elements.push(
      <StandingRow
        key={item.userId}
        item={item}
        isFriend={friendSet.has(item.userId)}
        onReact={onReact}
      />
    );

    // Determine what separator goes after this row
    const isLast = i === filtered.length - 1;

    if (!isLast) {
      const nextItem = filtered[i + 1];

      if (showZones && item.position === PROMOTION_ZONE) {
        // Promotion divider after position 5
        elements.push(
          <ZoneDivider key={`zone-promotion-${item.position}`} type="promotion" />,
        );
      } else if (
        showZones &&
        nextItem &&
        nextItem.position === relegationStart
      ) {
        // Relegation divider before the last 5 positions
        elements.push(
          <ZoneDivider key={`zone-relegation-${nextItem.position}`} type="relegation" />,
        );
      } else {
        // Hairline separator
        elements.push(
          <View
            key={`sep-${item.userId}`}
            style={[
              styles.separator,
              { backgroundColor: theme.colors.border },
            ]}
          />,
        );
      }
    }
  }

  return <View>{elements}</View>;
}

// ── Styles ──────────────────────────────────────────────────────────────────

const styles = StyleSheet.create({
  row: {
    flexDirection: "row",
    alignItems: "center",
    paddingVertical: 14,
    paddingHorizontal: spacing.md,
  },
  positionCol: {
    width: 28,
    alignItems: "center",
    marginRight: spacing.sm,
  },
  position: {
    fontSize: 15,
    fontWeight: "500",
    textAlign: "center",
  },
  positionBold: {
    fontWeight: "700",
  },
  nameCol: {
    flex: 1,
    marginLeft: spacing.sm,
  },
  name: {
    fontSize: 14,
  },
  rankLabel: {
    fontSize: 11,
    marginTop: 1,
  },
  xp: {
    fontSize: 14,
    fontWeight: "600",
    marginLeft: spacing.sm,
  },
  separator: {
    height: StyleSheet.hairlineWidth,
    marginLeft: 28 + spacing.sm + 44 + spacing.xs + spacing.sm, // positionCol + gap + avatar width + avatar extra + nameCol margin
    marginRight: spacing.md,
  },
  pawBtn: {
    padding: 6,
    marginLeft: spacing.xs,
  },
  reactionBarWrap: {
    paddingHorizontal: spacing.md,
    paddingBottom: spacing.sm,
  },
});
