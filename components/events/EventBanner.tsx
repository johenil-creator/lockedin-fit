import React, { useState, useEffect } from "react";
import { View, Text, Pressable, StyleSheet } from "react-native";
import { Ionicons } from "@expo/vector-icons";
import { useAppTheme } from "../../contexts/ThemeContext";
import { spacing, radius, typography } from "../../lib/theme";
import type { SeasonalEvent, EventParticipation } from "../../lib/types";

type Props = {
  event: SeasonalEvent;
  participation: EventParticipation | null;
  onJoin: () => void;
};

function getCountdown(endDate: string): { days: number; hours: number } {
  const now = new Date();
  const end = new Date(endDate + "T23:59:59");
  const diff = Math.max(0, end.getTime() - now.getTime());
  const days = Math.floor(diff / 86400000);
  const hours = Math.floor((diff % 86400000) / 3600000);
  return { days, hours };
}

function EventBannerInner({ event, participation, onJoin }: Props) {
  const { theme } = useAppTheme();
  const [countdown, setCountdown] = useState(getCountdown(event.endDate));

  useEffect(() => {
    const interval = setInterval(() => {
      setCountdown(getCountdown(event.endDate));
    }, 60000);
    return () => clearInterval(interval);
  }, [event.endDate]);

  const joined = participation !== null;

  return (
    <View
      style={[
        styles.card,
        {
          backgroundColor: theme.colors.surface,
          borderColor: theme.colors.primary,
        },
      ]}
    >
      <View style={styles.header}>
        <Ionicons name="calendar-outline" size={20} color="#FFD700" />
        <Text
          style={[
            typography.subheading,
            { color: theme.colors.text, flex: 1, marginLeft: spacing.sm },
          ]}
        >
          {event.name}
        </Text>
        <View style={styles.multiplierBadge}>
          <Text style={styles.multiplierText}>
            {event.fangsMultiplier ?? 1}x Fangs
          </Text>
        </View>
      </View>

      <Text
        style={[
          typography.body,
          { color: theme.colors.muted, marginBottom: spacing.sm },
        ]}
      >
        {event.description}
      </Text>

      <View style={styles.footer}>
        <View style={styles.countdownRow}>
          <Ionicons name="time-outline" size={16} color="#FFD700" />
          <Text
            style={[
              typography.small,
              { color: "#FFD700", marginLeft: spacing.xs },
            ]}
          >
            {countdown.days}d {countdown.hours}h remaining
          </Text>
        </View>

        {joined ? (
          <View
            style={[
              styles.joinedBadge,
              { backgroundColor: theme.colors.primary + "20" },
            ]}
          >
            <Ionicons
              name="checkmark-circle"
              size={16}
              color={theme.colors.primary}
            />
            <Text
              style={[
                typography.small,
                {
                  color: theme.colors.primary,
                  fontWeight: "600",
                  marginLeft: 4,
                },
              ]}
            >
              Joined
            </Text>
          </View>
        ) : (
          <Pressable
            style={[styles.joinBtn, { backgroundColor: theme.colors.primary }]}
            onPress={onJoin}
          >
            <Text
              style={[
                typography.small,
                { color: theme.colors.primaryText, fontWeight: "700" },
              ]}
            >
              Join Event
            </Text>
          </Pressable>
        )}
      </View>
    </View>
  );
}

export const EventBanner = React.memo(EventBannerInner);

const styles = StyleSheet.create({
  card: {
    borderRadius: radius.lg,
    padding: spacing.lg,
    marginBottom: spacing.md,
    borderWidth: 1,
    shadowColor: "#000",
    shadowOffset: { width: 0, height: 2 },
    shadowOpacity: 0.08,
    shadowRadius: 6,
    elevation: 3,
  },
  header: {
    flexDirection: "row",
    alignItems: "center",
    marginBottom: spacing.sm,
  },
  multiplierBadge: {
    backgroundColor: "#FFD70020",
    paddingHorizontal: 8,
    paddingVertical: 3,
    borderRadius: radius.full,
  },
  multiplierText: {
    color: "#FFD700",
    fontSize: 11,
    fontWeight: "700",
  },
  footer: {
    flexDirection: "row",
    alignItems: "center",
    justifyContent: "space-between",
  },
  countdownRow: {
    flexDirection: "row",
    alignItems: "center",
  },
  joinBtn: {
    paddingHorizontal: 16,
    paddingVertical: 8,
    borderRadius: radius.full,
  },
  joinedBadge: {
    flexDirection: "row",
    alignItems: "center",
    paddingHorizontal: 12,
    paddingVertical: 6,
    borderRadius: radius.full,
  },
});
