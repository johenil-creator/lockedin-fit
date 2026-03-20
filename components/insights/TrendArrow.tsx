import React from "react";
import { View, Text, StyleSheet } from "react-native";
import { Ionicons } from "@expo/vector-icons";
import { typography } from "../../lib/theme";

type Props = {
  delta: number;
};

function TrendArrowInner({ delta }: Props) {
  if (delta > 0) {
    return (
      <View style={styles.container}>
        <Ionicons name="arrow-up" size={12} color="#3FB950" />
        <Text style={[styles.text, { color: "#3FB950" }]}>+{delta}</Text>
      </View>
    );
  }

  if (delta < 0) {
    return (
      <View style={styles.container}>
        <Ionicons name="arrow-down" size={12} color="#F85149" />
        <Text style={[styles.text, { color: "#F85149" }]}>{delta}</Text>
      </View>
    );
  }

  return (
    <View style={styles.container}>
      <Ionicons name="remove" size={12} color="#7D8590" />
      <Text style={[styles.text, { color: "#7D8590" }]}>0</Text>
    </View>
  );
}

export const TrendArrow = React.memo(TrendArrowInner);

const styles = StyleSheet.create({
  container: {
    flexDirection: "row",
    alignItems: "center",
    gap: 1,
  },
  text: {
    fontSize: 11,
    fontWeight: "600",
  },
});
