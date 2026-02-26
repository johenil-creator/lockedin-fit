import { useState, useMemo } from "react";
import { View, Text, FlatList, StyleSheet, TextInput, Pressable } from "react-native";
import { useSafeAreaInsets } from "react-native-safe-area-context";
import { useAppTheme } from "../contexts/ThemeContext";
import { exerciseCatalog, type ExerciseCatalogEntry } from "../src/data/exerciseCatalog";
import { EXERCISE_CUES } from "../src/data/exerciseCues";
import { BackButton } from "../components/BackButton";
import { spacing, typography } from "../lib/theme";
import type { MuscleGroup, MovementPattern } from "../src/data/catalogTypes";

const MUSCLE_FILTERS: { label: string; value: MuscleGroup }[] = [
  { label: "Quads", value: "quads" },
  { label: "Glutes", value: "glutes" },
  { label: "Hamstrings", value: "hamstrings" },
  { label: "Chest", value: "chest" },
  { label: "Back", value: "back" },
  { label: "Shoulders", value: "shoulders" },
  { label: "Biceps", value: "biceps" },
  { label: "Triceps", value: "triceps" },
  { label: "Core", value: "core" },
];

function ExerciseCard({ entry }: { entry: ExerciseCatalogEntry }) {
  const { theme } = useAppTheme();
  const [expanded, setExpanded] = useState(false);
  const cues = EXERCISE_CUES[entry.id];

  return (
    <Pressable
      onPress={() => setExpanded((v) => !v)}
      style={[styles.card, { backgroundColor: theme.colors.surface, borderColor: theme.colors.border }]}
    >
      <View style={styles.cardHeader}>
        <Text style={[styles.cardName, { color: theme.colors.text }]}>{entry.canonicalName}</Text>
        <Text style={[styles.cardMeta, { color: theme.colors.muted }]}>
          {entry.equipment} · {entry.primaryMuscles.join(", ")}
        </Text>
      </View>
      {expanded && cues && cues.length > 0 && (
        <View style={[styles.cuesSection, { borderTopColor: theme.colors.border }]}>
          <Text style={[styles.cuesTitle, { color: theme.colors.accent }]}>FORM CUES</Text>
          {cues.map((cue, i) => (
            <View key={i} style={styles.cueRow}>
              <Text style={{ color: theme.colors.accent, fontSize: 12, fontWeight: "700", width: 18 }}>{i + 1}.</Text>
              <Text style={{ color: theme.colors.text, fontSize: 13, flex: 1, lineHeight: 18 }}>{cue}</Text>
            </View>
          ))}
        </View>
      )}
      {expanded && (!cues || cues.length === 0) && (
        <View style={[styles.cuesSection, { borderTopColor: theme.colors.border }]}>
          <Text style={{ color: theme.colors.muted, fontSize: 13, fontStyle: "italic" }}>No form cues available.</Text>
        </View>
      )}
    </Pressable>
  );
}

export default function ExerciseLibraryScreen() {
  const insets = useSafeAreaInsets();
  const { theme } = useAppTheme();
  const [search, setSearch] = useState("");
  const [muscleFilter, setMuscleFilter] = useState<MuscleGroup | null>(null);

  const filtered = useMemo(() => {
    let list = exerciseCatalog;
    if (muscleFilter) {
      list = list.filter(
        (e) => e.primaryMuscles.includes(muscleFilter) || e.secondaryMuscles.includes(muscleFilter)
      );
    }
    if (search.trim()) {
      const q = search.toLowerCase().trim();
      list = list.filter(
        (e) =>
          e.canonicalName.toLowerCase().includes(q) ||
          e.aliases.some((a) => a.toLowerCase().includes(q))
      );
    }
    return list;
  }, [search, muscleFilter]);

  return (
    <View style={[styles.container, { backgroundColor: theme.colors.bg, paddingTop: insets.top }]}>
      <View style={styles.headerSection}>
        <BackButton />
        <Text style={[typography.title, { color: theme.colors.text }]}>Exercise Library</Text>
        <Text style={[typography.caption, { color: theme.colors.muted, marginBottom: 12 }]}>
          {exerciseCatalog.length} exercises · tap to see form cues
        </Text>

        <TextInput
          style={[styles.searchInput, { backgroundColor: theme.colors.mutedBg, color: theme.colors.text, borderColor: theme.colors.border }]}
          placeholder="Search exercises..."
          placeholderTextColor={theme.colors.muted}
          value={search}
          onChangeText={setSearch}
        />

        <FlatList
          horizontal
          data={MUSCLE_FILTERS}
          keyExtractor={(item) => item.value}
          showsHorizontalScrollIndicator={false}
          style={styles.filterRow}
          renderItem={({ item }) => {
            const active = muscleFilter === item.value;
            return (
              <Pressable
                style={[styles.filterChip, { backgroundColor: active ? theme.colors.primary : theme.colors.mutedBg, borderColor: active ? theme.colors.primary : theme.colors.border }]}
                onPress={() => setMuscleFilter(active ? null : item.value)}
              >
                <Text style={[styles.filterChipText, { color: active ? theme.colors.primaryText : theme.colors.text }]}>
                  {item.label}
                </Text>
              </Pressable>
            );
          }}
        />
      </View>

      <FlatList
        data={filtered}
        keyExtractor={(item) => item.id}
        renderItem={({ item }) => <ExerciseCard entry={item} />}
        contentContainerStyle={{ paddingHorizontal: spacing.md, paddingBottom: 40 }}
        ListEmptyComponent={
          <Text style={[typography.body, { color: theme.colors.muted, textAlign: "center", marginTop: 24 }]}>
            No exercises found.
          </Text>
        }
      />
    </View>
  );
}

const styles = StyleSheet.create({
  container: { flex: 1 },
  headerSection: { paddingHorizontal: spacing.md, paddingBottom: 8 },
  searchInput: {
    borderWidth: 1,
    borderRadius: 12,
    padding: 12,
    fontSize: 15,
    marginBottom: 8,
  },
  filterRow: { marginBottom: 8, maxHeight: 40 },
  filterChip: {
    borderWidth: 1,
    borderRadius: 20,
    paddingHorizontal: 14,
    paddingVertical: 6,
    marginRight: 6,
  },
  filterChipText: { fontSize: 12, fontWeight: "600" },
  card: {
    borderWidth: 1,
    borderRadius: 14,
    padding: 14,
    marginBottom: 8,
  },
  cardHeader: {},
  cardName: { fontSize: 15, fontWeight: "700", marginBottom: 4 },
  cardMeta: { fontSize: 12 },
  cuesSection: { borderTopWidth: 1, marginTop: 10, paddingTop: 10 },
  cuesTitle: { fontSize: 10, fontWeight: "700", letterSpacing: 1, marginBottom: 6 },
  cueRow: { flexDirection: "row", paddingVertical: 2 },
});
