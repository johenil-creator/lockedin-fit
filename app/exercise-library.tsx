import React, { useState, useMemo, useCallback } from "react";
import {
  View,
  Text,
  TextInput,
  FlatList,
  Pressable,
  StyleSheet,
  LayoutAnimation,
  Platform,
  UIManager,
} from "react-native";
import { Ionicons } from "@expo/vector-icons";
import { useSafeAreaInsets } from "react-native-safe-area-context";
import { useAppTheme } from "../contexts/ThemeContext";
import { BackButton } from "../components/BackButton";
import { spacing, radius } from "../lib/theme";
import {
  exerciseCatalog,
  type ExerciseCatalogEntry,
  type MovementPattern,
} from "../src/data/exerciseCatalog";
import { EXERCISE_CUES } from "../src/data/exerciseCues";

// Enable LayoutAnimation on Android
if (
  Platform.OS === "android" &&
  UIManager.setLayoutAnimationEnabledExperimental
) {
  UIManager.setLayoutAnimationEnabledExperimental(true);
}

// ── Movement pattern labels ─────────────────────────────────────────────────

const PATTERN_LABELS: Record<MovementPattern, string> = {
  squat: "Squat",
  hinge: "Hinge",
  horizontal_push: "Chest Press",
  horizontal_pull: "Row",
  vertical_push: "Shoulder Press",
  vertical_pull: "Pull-Up / Lat",
  isolation_upper: "Arms",
  isolation_lower: "Legs",
  core: "Core",
  conditioning: "Cardio",
  carry: "Carry",
};

// Derive unique patterns present in the catalog, preserving label order
const UNIQUE_PATTERNS: MovementPattern[] = (() => {
  const inCatalog = new Set(exerciseCatalog.map((e) => e.movementPattern));
  return (Object.keys(PATTERN_LABELS) as MovementPattern[]).filter((p) =>
    inCatalog.has(p)
  );
})();

// ── Formatting helpers ──────────────────────────────────────────────────────

function formatEquipment(eq: string): string {
  switch (eq) {
    case "barbell":    return "Barbell";
    case "dumbbell":   return "Dumbbell";
    case "kettlebell": return "Kettlebell";
    case "cable":      return "Cable";
    case "machine":    return "Machine";
    case "band":       return "Band";
    case "bodyweight": return "Bodyweight";
    case "smith":      return "Smith";
    case "trap_bar":   return "Trap Bar";
    default:           return eq.charAt(0).toUpperCase() + eq.slice(1);
  }
}

function formatMuscles(muscles: string[]): string {
  return muscles
    .map((m) => m.charAt(0).toUpperCase() + m.slice(1))
    .join(", ");
}

// ── Filter chip ─────────────────────────────────────────────────────────────

const FilterChip = React.memo(function FilterChip({
  label,
  selected,
  onPress,
}: {
  label: string;
  selected: boolean;
  onPress: () => void;
}) {
  const { theme } = useAppTheme();
  return (
    <Pressable
      onPress={onPress}
      style={[
        styles.chip,
        {
          backgroundColor: selected ? theme.colors.primary : theme.colors.mutedBg,
          borderColor: selected ? theme.colors.primary : theme.colors.border,
        },
      ]}
    >
      <Text
        style={[
          styles.chipText,
          {
            color: selected ? theme.colors.primaryText : theme.colors.muted,
            fontWeight: selected ? "700" : "500",
          },
        ]}
      >
        {label}
      </Text>
    </Pressable>
  );
});

// ── Exercise row ────────────────────────────────────────────────────────────

const ExerciseRow = React.memo(function ExerciseRow({
  entry,
  expanded,
  onToggle,
}: {
  entry: ExerciseCatalogEntry;
  expanded: boolean;
  onToggle: () => void;
}) {
  const { theme } = useAppTheme();
  const cues = EXERCISE_CUES[entry.id];
  const hasCues = !!cues && cues.length > 0;
  const patternLabel = PATTERN_LABELS[entry.movementPattern] ?? entry.movementPattern;
  const muscleText = formatMuscles(entry.primaryMuscles);

  return (
    <Pressable
      onPress={onToggle}
      style={[
        styles.exerciseRow,
        {
          backgroundColor: theme.colors.surface,
          borderColor: expanded ? theme.colors.primary + "50" : theme.colors.border,
        },
      ]}
    >
      <View style={styles.exerciseHeader}>
        <View style={styles.exerciseInfo}>
          <Text style={[styles.exerciseName, { color: theme.colors.text }]}>
            {entry.canonicalName}
          </Text>
          <Text style={[styles.exerciseMeta, { color: theme.colors.muted }]}>
            {patternLabel}
            {muscleText ? ` \u00B7 ${muscleText}` : ""}
          </Text>
        </View>
        <View style={styles.exerciseRight}>
          <View
            style={[styles.equipmentBadge, { backgroundColor: theme.colors.mutedBg }]}
          >
            <Text style={[styles.equipmentBadgeText, { color: theme.colors.muted }]}>
              {formatEquipment(entry.equipment)}
            </Text>
          </View>
          {hasCues && (
            <Ionicons
              name={expanded ? "chevron-up" : "chevron-down"}
              size={16}
              color={theme.colors.muted}
              style={styles.chevronIcon}
            />
          )}
        </View>
      </View>

      {expanded && hasCues && (
        <View style={[styles.cuesContainer, { borderTopColor: theme.colors.border }]}>
          {cues.map((cue, i) => (
            <View key={i} style={styles.cueRow}>
              <Text style={[styles.cueNumber, { color: theme.colors.primary }]}>
                {i + 1}.
              </Text>
              <Text style={[styles.cueText, { color: theme.colors.text }]}>
                {cue}
              </Text>
            </View>
          ))}
        </View>
      )}
    </Pressable>
  );
});

// ── Main screen ─────────────────────────────────────────────────────────────

export default function ExerciseLibraryScreen() {
  const { theme } = useAppTheme();
  const insets = useSafeAreaInsets();

  const [search, setSearch] = useState("");
  const [selectedPattern, setSelectedPattern] = useState<MovementPattern | "all">("all");
  const [expandedId, setExpandedId] = useState<string | null>(null);

  // Filter exercises by search query and movement pattern
  const filteredExercises = useMemo(() => {
    const query = search.toLowerCase().trim();
    return exerciseCatalog.filter((entry) => {
      // Pattern filter
      if (selectedPattern !== "all" && entry.movementPattern !== selectedPattern) {
        return false;
      }
      // Search filter
      if (query) {
        const nameMatch = entry.canonicalName.toLowerCase().includes(query);
        const aliasMatch = entry.aliases.some((a) => a.toLowerCase().includes(query));
        const muscleMatch = entry.primaryMuscles.some((m) => m.toLowerCase().includes(query));
        const equipMatch = entry.equipment.toLowerCase().includes(query);
        return nameMatch || aliasMatch || muscleMatch || equipMatch;
      }
      return true;
    });
  }, [search, selectedPattern]);

  const handleToggleExpand = useCallback((id: string) => {
    LayoutAnimation.configureNext(LayoutAnimation.Presets.easeInEaseOut);
    setExpandedId((prev) => (prev === id ? null : id));
  }, []);

  const handleSelectPattern = useCallback((pattern: MovementPattern | "all") => {
    setSelectedPattern(pattern);
    setExpandedId(null);
  }, []);

  const renderExercise = useCallback(
    ({ item }: { item: ExerciseCatalogEntry }) => (
      <ExerciseRow
        entry={item}
        expanded={expandedId === item.id}
        onToggle={() => handleToggleExpand(item.id)}
      />
    ),
    [expandedId, handleToggleExpand]
  );

  const keyExtractor = useCallback((item: ExerciseCatalogEntry) => item.id, []);

  const ListEmptyComponent = useMemo(
    () => (
      <View style={styles.emptyState}>
        <Ionicons name="search-outline" size={48} color={theme.colors.muted} />
        <Text style={[styles.emptyText, { color: theme.colors.muted }]}>
          No exercises found
        </Text>
        <Text style={[styles.emptyHint, { color: theme.colors.muted }]}>
          Try a different search or filter. The hunt continues.
        </Text>
      </View>
    ),
    [theme.colors.muted]
  );

  return (
    <View style={[styles.root, { backgroundColor: theme.colors.bg }]}>
      {/* Header */}
      <View style={[styles.header, { paddingTop: insets.top + spacing.sm }]}>
        <View style={styles.headerTopRow}>
          <BackButton />
          <Text style={[styles.title, { color: theme.colors.text }]}>
            Exercise Library
          </Text>
          <View style={styles.headerSpacer} />
        </View>

        {/* Search bar */}
        <View
          style={[
            styles.searchBar,
            {
              backgroundColor: theme.colors.mutedBg,
              borderColor: theme.colors.border,
            },
          ]}
        >
          <Ionicons name="search-outline" size={18} color={theme.colors.muted} />
          <TextInput
            style={[styles.searchInput, { color: theme.colors.text }]}
            placeholder="Search exercises..."
            placeholderTextColor={theme.colors.muted}
            value={search}
            onChangeText={setSearch}
            autoCapitalize="none"
            autoCorrect={false}
            returnKeyType="search"
          />
          {search.length > 0 && (
            <Pressable onPress={() => setSearch("")} hitSlop={8}>
              <Ionicons name="close-circle" size={18} color={theme.colors.muted} />
            </Pressable>
          )}
        </View>

        {/* Filter chips */}
        <FlatList
          horizontal
          showsHorizontalScrollIndicator={false}
          data={["all" as const, ...UNIQUE_PATTERNS]}
          keyExtractor={(item) => item}
          contentContainerStyle={styles.chipRow}
          renderItem={({ item }) => (
            <FilterChip
              label={item === "all" ? "All" : PATTERN_LABELS[item]}
              selected={selectedPattern === item}
              onPress={() => handleSelectPattern(item)}
            />
          )}
        />
      </View>

      {/* Exercise list */}
      <FlatList
        data={filteredExercises}
        renderItem={renderExercise}
        keyExtractor={keyExtractor}
        contentContainerStyle={[
          styles.listContent,
          { paddingBottom: insets.bottom + spacing.xl + 24 },
        ]}
        ListEmptyComponent={ListEmptyComponent}
        keyboardDismissMode="on-drag"
        initialNumToRender={20}
        maxToRenderPerBatch={15}
        windowSize={7}
      />

      {/* Result count bar */}
      <View
        style={[
          styles.resultCountBar,
          {
            backgroundColor: theme.colors.surface,
            borderTopColor: theme.colors.border,
            paddingBottom: insets.bottom > 0 ? insets.bottom : spacing.sm,
          },
        ]}
      >
        <Text style={[styles.resultCountText, { color: theme.colors.muted }]}>
          {filteredExercises.length}{" "}
          {filteredExercises.length === 1 ? "exercise" : "exercises"}
        </Text>
      </View>
    </View>
  );
}

// ── Styles ──────────────────────────────────────────────────────────────────

const styles = StyleSheet.create({
  root: { flex: 1 },

  // Header
  header: {
    paddingHorizontal: spacing.md,
    paddingBottom: spacing.sm,
  },
  headerTopRow: {
    flexDirection: "row",
    alignItems: "center",
    marginBottom: spacing.sm,
  },
  title: {
    flex: 1,
    fontSize: 28,
    fontWeight: "700",
    textAlign: "center",
    marginRight: 44, // offset for BackButton width to keep title centered
  },
  headerSpacer: { width: 0 },

  // Search bar
  searchBar: {
    flexDirection: "row",
    alignItems: "center",
    borderRadius: radius.md,
    borderWidth: 1,
    paddingHorizontal: spacing.md,
    paddingVertical: Platform.OS === "ios" ? 10 : 6,
    marginBottom: spacing.sm,
    gap: spacing.sm,
  },
  searchInput: {
    flex: 1,
    fontSize: 15,
    paddingVertical: 0,
  },

  // Filter chips
  chipRow: {
    gap: spacing.sm,
    paddingVertical: spacing.xs,
  },
  chip: {
    paddingHorizontal: spacing.md,
    paddingVertical: 6,
    borderRadius: radius.full,
    borderWidth: 1,
  },
  chipText: {
    fontSize: 13,
  },

  // Exercise list
  listContent: {
    paddingHorizontal: spacing.md,
    paddingTop: spacing.sm,
  },
  exerciseRow: {
    borderRadius: radius.lg,
    borderWidth: 1,
    padding: spacing.md,
    marginBottom: spacing.sm,
  },
  exerciseHeader: {
    flexDirection: "row",
    alignItems: "center",
    justifyContent: "space-between",
  },
  exerciseInfo: {
    flex: 1,
    paddingRight: spacing.sm,
  },
  exerciseName: {
    fontSize: 15,
    fontWeight: "700",
    marginBottom: 2,
  },
  exerciseMeta: {
    fontSize: 12,
  },
  exerciseRight: {
    flexDirection: "row",
    alignItems: "center",
    gap: spacing.sm,
  },
  equipmentBadge: {
    paddingHorizontal: spacing.sm,
    paddingVertical: 3,
    borderRadius: radius.sm,
  },
  equipmentBadgeText: {
    fontSize: 11,
    fontWeight: "600",
  },
  chevronIcon: {
    marginLeft: 2,
  },

  // Cues
  cuesContainer: {
    marginTop: spacing.md,
    paddingTop: spacing.md,
    borderTopWidth: 1,
  },
  cueRow: {
    flexDirection: "row",
    alignItems: "flex-start",
    marginBottom: spacing.xs + 2,
    paddingRight: spacing.sm,
  },
  cueNumber: {
    fontSize: 13,
    fontWeight: "700",
    width: 22,
  },
  cueText: {
    fontSize: 13,
    lineHeight: 19,
    flex: 1,
  },

  // Empty state
  emptyState: {
    alignItems: "center",
    justifyContent: "center",
    paddingTop: 80,
    gap: spacing.sm,
  },
  emptyText: {
    fontSize: 17,
    fontWeight: "600",
  },
  emptyHint: {
    fontSize: 13,
  },

  // Result count bar
  resultCountBar: {
    position: "absolute",
    bottom: 0,
    left: 0,
    right: 0,
    borderTopWidth: 1,
    paddingTop: spacing.xs + 2,
    paddingHorizontal: spacing.md,
    alignItems: "center",
  },
  resultCountText: {
    fontSize: 12,
    fontWeight: "600",
  },
});
