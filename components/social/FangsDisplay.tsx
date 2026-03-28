import React from "react";
import { View, Text, Image, StyleSheet } from "react-native";
import { InfoTooltip } from "../InfoTooltip";
import { radius } from "../../lib/theme";

const FANGS_ICON = require("../../assets/fangs_icon.png");

type Props = {
  balance: number;
  size?: "sm" | "md";
  showInfo?: boolean;
  variant?: "default" | "solid";
};

function FangsDisplayInner({ balance, size = "md", showInfo = false, variant = "default" }: Props) {
  const isSmall = size === "sm";
  const isSolid = variant === "solid";

  return (
    <View style={styles.row}>
      <View style={[
        styles.pill,
        {
          backgroundColor: isSolid ? "#1A1A2E" : "#FFD70020",
          borderColor: isSolid ? "#FFD70060" : "#FFD70040",
          paddingVertical: isSmall ? 1 : 5,
          paddingHorizontal: isSmall ? 5 : 12,
        },
      ]}>
        <Image
          source={FANGS_ICON}
          style={{
            width: isSmall ? 13 : 26,
            height: isSmall ? 13 : 26,
            tintColor: "#FFD700",
          }}
          resizeMode="contain"
        />
        <Text style={[
          styles.value,
          {
            color: "#FFD700",
            fontSize: isSmall ? 10 : 14,
          },
        ]}>
          {balance.toLocaleString()}
        </Text>
        {showInfo && (
          <InfoTooltip
            term="Fangs"
            definition="Fangs are your in-app currency. Earn them by completing workouts, hitting streaks, and finishing quests. Spend them in Locke Studio to unlock cosmetics for your wolf."
          />
        )}
      </View>
    </View>
  );
}

export const FangsDisplay = React.memo(FangsDisplayInner);

const styles = StyleSheet.create({
  row: {
    flexDirection: "row",
    alignItems: "center",
  },
  pill: {
    flexDirection: "row",
    alignItems: "center",
    borderRadius: radius.full,
    borderWidth: 1,
    gap: 4,
  },
  value: {
    fontWeight: "700",
    fontVariant: ["tabular-nums"],
  },
});
