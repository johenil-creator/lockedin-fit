import { View, Text, Pressable, StyleSheet } from "react-native";
import { useSafeAreaInsets } from "react-native-safe-area-context";
import { useRouter } from "expo-router";
import { useAppTheme } from "../contexts/ThemeContext";
import { BackButton } from "../components/BackButton";
import { usePackDiscovery } from "../hooks/usePackDiscovery";
import { PackDiscoveryList } from "../components/social/PackDiscoveryList";
import { spacing, typography } from "../lib/theme";

export default function PackDiscoveryScreen() {
  const insets = useSafeAreaInsets();
  const router = useRouter();
  const { theme } = useAppTheme();
  const { packs, loading, search } = usePackDiscovery();

  function handleJoin(packId: string) {
    // Navigate to join-pack with the pack code (or handle directly)
    router.push({ pathname: "/join-pack", params: { packId } });
  }

  return (
    <View style={[styles.container, { backgroundColor: theme.colors.bg, paddingTop: insets.top }]}>
      <View style={styles.header}>
        <BackButton />
        <Text style={[typography.heading, { color: theme.colors.text, flex: 1, marginLeft: spacing.sm }]}>
          Scout Packs
        </Text>
      </View>

      <View style={styles.content}>
        <PackDiscoveryList
          packs={packs}
          loading={loading}
          onSearch={(q, tags) => search(q, tags)}
          onJoin={handleJoin}
        />
      </View>
    </View>
  );
}

const styles = StyleSheet.create({
  container: { flex: 1 },
  header: {
    flexDirection: "row",
    alignItems: "center",
    paddingHorizontal: spacing.md,
    paddingVertical: spacing.sm,
  },
  content: {
    flex: 1,
    paddingHorizontal: spacing.md,
  },
});
