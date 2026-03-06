import React from "react";
import { Pressable, StyleSheet } from "react-native";
import { Ionicons } from "@expo/vector-icons";
import { useRouter } from "expo-router";
import { useAppTheme } from "../contexts/ThemeContext";

function ProfileButtonInner() {
  const router = useRouter();
  const { theme } = useAppTheme();

  return (
    <Pressable
      onPress={() => router.push("/profile")}
      style={[styles.avatar, { backgroundColor: theme.colors.mutedBg }]}
      accessibilityRole="button"
      accessibilityLabel="Profile"
      hitSlop={8}
    >
      <Ionicons name="person" size={16} color={theme.colors.primary} />
    </Pressable>
  );
}

export const ProfileButton = React.memo(ProfileButtonInner);

const styles = StyleSheet.create({
  avatar: {
    width: 32,
    height: 32,
    borderRadius: 16,
    alignItems: "center",
    justifyContent: "center",
  },
});
