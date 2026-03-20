import React, { useState, useEffect } from "react";
import { View, Text, StyleSheet } from "react-native";
import { Ionicons } from "@expo/vector-icons";
import { useAppTheme } from "../../contexts/ThemeContext";
import { spacing, radius, typography } from "../../lib/theme";

type Props = {
  endDate: string;
};

function getRemaining(endDate: string): { days: number; hours: number } {
  const now = new Date();
  const end = new Date(endDate + "T23:59:59");
  const diff = Math.max(0, end.getTime() - now.getTime());
  return {
    days: Math.floor(diff / 86400000),
    hours: Math.floor((diff % 86400000) / 3600000),
  };
}

function EventCountdownInner({ endDate }: Props) {
  const { theme } = useAppTheme();
  const [remaining, setRemaining] = useState(getRemaining(endDate));

  useEffect(() => {
    const interval = setInterval(() => {
      setRemaining(getRemaining(endDate));
    }, 60000);
    return () => clearInterval(interval);
  }, [endDate]);

  return (
    <View style={[styles.container, { backgroundColor: theme.colors.mutedBg }]}>
      <Ionicons name="time-outline" size={14} color="#FFD700" />
      <Text style={[typography.caption, { color: "#FFD700", marginLeft: spacing.xs }]}>
        {remaining.days}d {remaining.hours}h left
      </Text>
    </View>
  );
}

export const EventCountdown = React.memo(EventCountdownInner);

const styles = StyleSheet.create({
  container: {
    flexDirection: "row",
    alignItems: "center",
    paddingHorizontal: spacing.sm,
    paddingVertical: spacing.xs,
    borderRadius: radius.full,
    alignSelf: "flex-start",
  },
});
