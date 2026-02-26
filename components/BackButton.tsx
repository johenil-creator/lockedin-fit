import { Pressable, StyleSheet } from "react-native";
import { Ionicons } from "@expo/vector-icons";
import { useRouter } from "expo-router";
import { useAppTheme } from "../contexts/ThemeContext";

type Props = {
  variant?: "back" | "close";
  onPress?: () => void;
};

export function BackButton({ variant = "back", onPress }: Props) {
  const router = useRouter();
  const { theme } = useAppTheme();

  return (
    <Pressable
      style={styles.hitArea}
      onPress={onPress ?? (() => router.back())}
    >
      <Ionicons
        name={variant === "close" ? "close" : "chevron-back"}
        size={24}
        color={theme.colors.muted}
      />
    </Pressable>
  );
}

const styles = StyleSheet.create({
  hitArea: {
    width: 44,
    height: 44,
    alignItems: "center",
    justifyContent: "center",
  },
});
