import { Pressable, Text, StyleSheet } from "react-native";
import { useAppTheme } from "../contexts/ThemeContext";

export function ThemeToggle() {
  const { isDark, toggleTheme } = useAppTheme();
  return (
    <Pressable onPress={toggleTheme} style={styles.btn}>
      <Text style={styles.icon}>{isDark ? "\u2600\uFE0F" : "\uD83C\uDF19"}</Text>
    </Pressable>
  );
}

const styles = StyleSheet.create({
  btn: { padding: 8 },
  icon: { fontSize: 20 },
});
