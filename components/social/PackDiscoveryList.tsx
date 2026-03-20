import React, { useState } from "react";
import { View, Text, TextInput, Pressable, FlatList, StyleSheet } from "react-native";
import { Ionicons } from "@expo/vector-icons";
import { useAppTheme } from "../../contexts/ThemeContext";
import { spacing, radius, typography } from "../../lib/theme";
import type { PublicPack } from "../../lib/types";

type Props = {
  packs: PublicPack[];
  loading: boolean;
  onSearch: (query: string, tags?: string[]) => void;
  onJoin: (packId: string) => void;
};

const TAGS = ["beginner", "strength", "powerlifting", "bodybuilding", "cardio", "chill"];

export function PackDiscoveryList({ packs, loading, onSearch, onJoin }: Props) {
  const { theme } = useAppTheme();
  const [query, setQuery] = useState("");
  const [selectedTags, setSelectedTags] = useState<string[]>([]);

  function toggleTag(tag: string) {
    const next = selectedTags.includes(tag)
      ? selectedTags.filter((t) => t !== tag)
      : [...selectedTags, tag];
    setSelectedTags(next);
    onSearch(query, next.length > 0 ? next : undefined);
  }

  function handleSearch(text: string) {
    setQuery(text);
    onSearch(text, selectedTags.length > 0 ? selectedTags : undefined);
  }

  return (
    <View style={styles.container}>
      {/* Search bar */}
      <View style={[styles.searchBar, { backgroundColor: theme.colors.mutedBg }]}>
        <Ionicons name="search" size={18} color={theme.colors.muted} />
        <TextInput
          style={[styles.searchInput, { color: theme.colors.text }]}
          value={query}
          onChangeText={handleSearch}
          placeholder="Search packs..."
          placeholderTextColor={theme.colors.muted}
        />
      </View>

      {/* Tag filter chips */}
      <View style={styles.tagRow}>
        {TAGS.map((tag) => (
          <Pressable
            key={tag}
            style={[
              styles.tagChip,
              {
                backgroundColor: selectedTags.includes(tag) ? theme.colors.accent + "20" : theme.colors.mutedBg,
                borderColor: selectedTags.includes(tag) ? theme.colors.accent : "transparent",
              },
            ]}
            onPress={() => toggleTag(tag)}
          >
            <Text
              style={[
                styles.tagText,
                { color: selectedTags.includes(tag) ? theme.colors.accent : theme.colors.muted },
              ]}
            >
              {tag}
            </Text>
          </Pressable>
        ))}
      </View>

      {/* Pack list */}
      <FlatList
        data={packs}
        keyExtractor={(item) => item.id}
        renderItem={({ item }) => (
          <View style={[styles.packCard, { backgroundColor: theme.colors.surface, borderColor: theme.colors.border }]}>
            <View style={styles.packInfo}>
              <Text style={[typography.body, { color: theme.colors.text, fontWeight: "700" }]}>
                {item.name}
              </Text>
              {item.motto ? (
                <Text style={[typography.caption, { color: theme.colors.muted, fontStyle: "italic" }]} numberOfLines={1}>
                  "{item.motto}"
                </Text>
              ) : null}
              <View style={styles.packMeta}>
                <Text style={[typography.caption, { color: theme.colors.muted }]}>
                  {item.memberCount} members
                </Text>
                <Text style={[typography.caption, { color: theme.colors.accent }]}>
                  {item.weeklyXp} XP/week
                </Text>
              </View>
              {item.tags.length > 0 && (
                <View style={styles.packTags}>
                  {item.tags.slice(0, 3).map((tag) => (
                    <View key={tag} style={[styles.miniTag, { backgroundColor: theme.colors.mutedBg }]}>
                      <Text style={[styles.miniTagText, { color: theme.colors.muted }]}>{tag}</Text>
                    </View>
                  ))}
                </View>
              )}
            </View>
            <Pressable
              style={[styles.joinBtn, { backgroundColor: theme.colors.primary }]}
              onPress={() => onJoin(item.id)}
            >
              <Text style={[styles.joinBtnText, { color: theme.colors.primaryText }]}>Join</Text>
            </Pressable>
          </View>
        )}
        ListEmptyComponent={
          <Text style={[typography.body, { color: theme.colors.muted, textAlign: "center", paddingVertical: 40 }]}>
            {loading ? "Loading..." : "No packs found"}
          </Text>
        }
      />
    </View>
  );
}

const styles = StyleSheet.create({
  container: { flex: 1 },
  searchBar: {
    flexDirection: "row",
    alignItems: "center",
    borderRadius: radius.md,
    paddingHorizontal: 12,
    marginBottom: spacing.sm,
    height: 40,
    gap: 8,
  },
  searchInput: {
    flex: 1,
    fontSize: 15,
  },
  tagRow: {
    flexDirection: "row",
    flexWrap: "wrap",
    gap: 6,
    marginBottom: spacing.md,
  },
  tagChip: {
    paddingHorizontal: 12,
    paddingVertical: 6,
    borderRadius: radius.full,
    borderWidth: 1,
  },
  tagText: {
    fontSize: 12,
    fontWeight: "700",
  },
  packCard: {
    flexDirection: "row",
    alignItems: "center",
    borderRadius: radius.lg,
    borderWidth: 1,
    padding: spacing.md,
    marginBottom: spacing.sm,
  },
  packInfo: { flex: 1 },
  packMeta: {
    flexDirection: "row",
    gap: spacing.md,
    marginTop: 4,
  },
  packTags: {
    flexDirection: "row",
    gap: 4,
    marginTop: 6,
  },
  miniTag: {
    paddingHorizontal: 8,
    paddingVertical: 2,
    borderRadius: radius.full,
  },
  miniTagText: {
    fontSize: 10,
    fontWeight: "600",
  },
  joinBtn: {
    paddingHorizontal: 16,
    paddingVertical: 8,
    borderRadius: radius.md,
    marginLeft: spacing.sm,
  },
  joinBtnText: {
    fontSize: 14,
    fontWeight: "700",
  },
});
