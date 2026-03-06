import React from "react";
import { Pressable, Text, StyleSheet } from "react-native";
import { useRouter } from "expo-router";
import { useProfileContext } from "../contexts/ProfileContext";
import { useAppTheme } from "../contexts/ThemeContext";

function ProfileButtonInner() {
  const router = useRouter();
  const { theme } = useAppTheme();
  const { profileRef } = useProfileContext();

  const initial = (profileRef.current.name || "?").charAt(0).toUpperCase();

  return (
    <Pressable
      onPress={() => router.push("/profile")}
      style={[styles.avatar, { backgroundColor: theme.colors.primary }]}
      accessibilityRole="button"
      accessibilityLabel="Profile"
      hitSlop={8}
    >
      <Text style={styles.initial}>{initial}</Text>
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
  initial: {
    color: "#fff",
    fontSize: 14,
    fontWeight: "700",
  },
});
