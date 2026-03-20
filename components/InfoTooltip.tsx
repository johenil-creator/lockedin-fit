import React from "react";
import { Alert, Pressable, StyleSheet } from "react-native";
import { Ionicons } from "@expo/vector-icons";
import { useAppTheme } from "../contexts/ThemeContext";

type Props = { term: string; definition: string };

export function InfoTooltip({ term, definition }: Props) {
  const { theme } = useAppTheme();
  return (
    <Pressable
      onPress={() => Alert.alert(term, definition)}
      hitSlop={8}
      style={styles.container}
    >
      <Ionicons
        name="information-circle-outline"
        size={15}
        color={theme.colors.muted}
      />
    </Pressable>
  );
}

const styles = StyleSheet.create({
  container: {
    marginLeft: 3,
    justifyContent: "center",
  },
});
