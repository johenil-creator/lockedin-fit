import { useState, useEffect, useCallback } from "react";
import {
  View,
  Text,
  StyleSheet,
  ScrollView,
  Pressable,
  Alert,
  ActivityIndicator,
} from "react-native";
import { Ionicons } from "@expo/vector-icons";
import RNAnimated, { FadeIn, FadeInDown } from "react-native-reanimated";
import { useSafeAreaInsets } from "react-native-safe-area-context";
import { useRouter } from "expo-router";
import { useAppTheme } from "../contexts/ThemeContext";
import { BackButton } from "../components/BackButton";
import { LockeMascot } from "../components/Locke/LockeMascot";
import {
  loadSavedDrafts,
  deleteSavedDraft,
  type SavedPlanDraft,
} from "../lib/storage";
import { spacing, radius } from "../lib/theme";

export default function SavedPlansScreen() {
  const router = useRouter();
  const { theme } = useAppTheme();
  const insets = useSafeAreaInsets();
  const [drafts, setDrafts] = useState<SavedPlanDraft[]>([]);
  const [loading, setLoading] = useState(true);

  const refresh = useCallback(async () => {
    const d = await loadSavedDrafts();
    setDrafts(d);
    setLoading(false);
  }, []);

  useEffect(() => {
    refresh();
  }, [refresh]);

  function handleDelete(draft: SavedPlanDraft) {
    Alert.alert(
      "Delete Draft?",
      `Delete "${draft.name || "Untitled"}"? This can't be undone.`,
      [
        { text: "Cancel", style: "cancel" },
        {
          text: "Delete",
          style: "destructive",
          onPress: async () => {
            await deleteSavedDraft(draft.id);
            setDrafts((prev) => prev.filter((d) => d.id !== draft.id));
          },
        },
      ]
    );
  }

  function formatDate(iso: string): string {
    try {
      const d = new Date(iso);
      const now = new Date();
      const diffMs = now.getTime() - d.getTime();
      const diffMin = Math.floor(diffMs / 60000);
      if (diffMin < 1) return "Just now";
      if (diffMin < 60) return `${diffMin}m ago`;
      const diffHours = Math.floor(diffMin / 60);
      if (diffHours < 24) return `${diffHours}h ago`;
      const diffDays = Math.floor(diffHours / 24);
      if (diffDays < 7) return `${diffDays}d ago`;
      return d.toLocaleDateString("en-US", { month: "short", day: "numeric" });
    } catch {
      return "";
    }
  }

  return (
    <View style={[styles.container, { backgroundColor: theme.colors.bg, paddingTop: insets.top + spacing.sm }]}>
      {/* Header */}
      <View style={styles.header}>
        <BackButton />
        <Text style={[styles.title, { color: theme.colors.text }]}>My Plans</Text>
        <View style={{ width: 32 }} />
      </View>

      {loading ? (
        <View style={styles.centered}>
          <ActivityIndicator size="large" color={theme.colors.primary} />
        </View>
      ) : (
        <ScrollView showsVerticalScrollIndicator={false} contentContainerStyle={styles.scrollContent}>
          {/* Create New — always at top */}
          <RNAnimated.View entering={FadeInDown.duration(300)}>
            <Pressable
              style={[styles.createCard, { backgroundColor: theme.colors.primary + "12", borderColor: theme.colors.primary + "44" }]}
              onPress={() => router.push("/plan-builder?new=1")}
            >
              <View style={[styles.createIcon, { backgroundColor: theme.colors.primary + "22" }]}>
                <Ionicons name="add" size={24} color={theme.colors.primary} />
              </View>
              <View style={{ flex: 1 }}>
                <Text style={[styles.createTitle, { color: theme.colors.primary }]}>Create New Plan</Text>
                <Text style={[styles.createHint, { color: theme.colors.muted }]}>Start from scratch</Text>
              </View>
              <Ionicons name="chevron-forward" size={18} color={theme.colors.primary} />
            </Pressable>
          </RNAnimated.View>

          {/* Saved drafts */}
          {drafts.length > 0 && (
            <View style={{ marginTop: 20 }}>
              <Text style={[styles.sectionLabel, { color: theme.colors.muted }]}>SAVED DRAFTS</Text>
              {drafts.map((draft, i) => (
                <RNAnimated.View
                  key={draft.id}
                  entering={FadeInDown.delay(80 + i * 40).duration(300)}
                >
                  <Pressable
                    style={[styles.draftCard, { backgroundColor: theme.colors.surface, borderColor: theme.colors.border }]}
                    onPress={() => router.push(`/plan-builder?draftId=${draft.id}`)}
                  >
                    <View style={[styles.draftIcon, { backgroundColor: theme.colors.mutedBg }]}>
                      <Ionicons name="document-text-outline" size={20} color={theme.colors.text} />
                    </View>
                    <View style={styles.draftInfo}>
                      <Text style={[styles.draftName, { color: theme.colors.text }]} numberOfLines={1}>
                        {draft.name || "Untitled Plan"}
                      </Text>
                      <View style={styles.draftMeta}>
                        <Text style={[styles.draftMetaText, { color: theme.colors.muted }]}>
                          {draft.goal}
                        </Text>
                        <Text style={[styles.draftMetaDot, { color: theme.colors.muted }]}>·</Text>
                        <Text style={[styles.draftMetaText, { color: theme.colors.muted }]}>
                          {draft.daysPerWeek}d/wk × {draft.numWeeks}wk
                        </Text>
                        <Text style={[styles.draftMetaDot, { color: theme.colors.muted }]}>·</Text>
                        <Text style={[styles.draftMetaText, { color: theme.colors.muted }]}>
                          {draft.totalExercises} exercises
                        </Text>
                      </View>
                      <Text style={[styles.draftDate, { color: theme.colors.muted }]}>
                        {formatDate(draft.updatedAt)}
                      </Text>
                    </View>
                    <Pressable
                      onPress={() => handleDelete(draft)}
                      hitSlop={12}
                      style={styles.deleteBtn}
                    >
                      <Ionicons name="trash-outline" size={16} color={theme.colors.danger} />
                    </Pressable>
                  </Pressable>
                </RNAnimated.View>
              ))}
            </View>
          )}

          {/* Empty state */}
          {drafts.length === 0 && (
            <RNAnimated.View entering={FadeIn.delay(200).duration(400)} style={styles.emptyState}>
              <LockeMascot size={160} mood="encouraging" />
              <Text style={[styles.emptyTitle, { color: theme.colors.text }]}>No saved plans yet</Text>
              <Text style={[styles.emptyHint, { color: theme.colors.muted }]}>
                Create a plan and save your progress to pick it up later.
              </Text>
            </RNAnimated.View>
          )}
        </ScrollView>
      )}
    </View>
  );
}

const styles = StyleSheet.create({
  container: {
    flex: 1,
    paddingHorizontal: spacing.md,
  },
  header: {
    flexDirection: "row",
    alignItems: "center",
    justifyContent: "space-between",
    marginBottom: spacing.md,
  },
  title: {
    fontSize: 20,
    fontWeight: "700",
  },
  scrollContent: {
    paddingBottom: 60,
  },
  centered: {
    flex: 1,
    alignItems: "center",
    justifyContent: "center",
  },

  // Create new card
  createCard: {
    flexDirection: "row",
    alignItems: "center",
    borderRadius: 14,
    borderWidth: 1.5,
    padding: 16,
    gap: 14,
  },
  createIcon: {
    width: 44,
    height: 44,
    borderRadius: 12,
    alignItems: "center",
    justifyContent: "center",
  },
  createTitle: {
    fontSize: 16,
    fontWeight: "700",
  },
  createHint: {
    fontSize: 12,
    marginTop: 2,
  },

  // Section label
  sectionLabel: {
    fontSize: 11,
    fontWeight: "700",
    letterSpacing: 1.2,
    textTransform: "uppercase",
    marginBottom: 10,
  },

  // Draft card
  draftCard: {
    flexDirection: "row",
    alignItems: "center",
    borderRadius: 12,
    borderWidth: 1,
    padding: 14,
    gap: 12,
    marginBottom: 8,
  },
  draftIcon: {
    width: 40,
    height: 40,
    borderRadius: 10,
    alignItems: "center",
    justifyContent: "center",
  },
  draftInfo: {
    flex: 1,
  },
  draftName: {
    fontSize: 15,
    fontWeight: "700",
  },
  draftMeta: {
    flexDirection: "row",
    alignItems: "center",
    gap: 5,
    marginTop: 3,
  },
  draftMetaText: {
    fontSize: 12,
  },
  draftMetaDot: {
    fontSize: 12,
  },
  draftDate: {
    fontSize: 11,
    marginTop: 2,
  },
  deleteBtn: {
    padding: 8,
  },

  // Empty state
  emptyState: {
    alignItems: "center",
    marginTop: 60,
  },
  emptyTitle: {
    fontSize: 18,
    fontWeight: "700",
    marginTop: 12,
  },
  emptyHint: {
    fontSize: 13,
    textAlign: "center",
    marginTop: 6,
    maxWidth: 260,
    lineHeight: 18,
  },
});
