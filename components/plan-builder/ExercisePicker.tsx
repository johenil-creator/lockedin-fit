import React, { useRef, useEffect, useCallback, useMemo, useState } from "react";
import { View, Text, TextInput, StyleSheet, TouchableOpacity, ScrollView } from "react-native";
import { useSafeAreaInsets } from "react-native-safe-area-context";
import BottomSheet, {
  BottomSheetBackdrop,
  BottomSheetFlatList,
  BottomSheetScrollView,
} from "@gorhom/bottom-sheet";
import { Ionicons, MaterialCommunityIcons } from "@expo/vector-icons";
import { impact, ImpactStyle } from "../../lib/haptics";
import { exerciseCatalog } from "../../src/data/exerciseCatalog";
import type { ExerciseCatalogEntry, Equipment, MuscleGroup } from "../../src/data/catalogTypes";
import { useAppTheme } from "../../contexts/ThemeContext";
import { spacing, radius } from "../../lib/theme";

type ExercisePickerProps = {
  visible: boolean;
  onClose: () => void;
  onSelect: (exercise: { name: string; equipment: string }) => void;
  excludeNames?: string[];
};

// --- Pre-computed search index (built once at module load) ---
type IndexedEntry = ExerciseCatalogEntry & { _searchKey: string };

const indexedCatalog: IndexedEntry[] = exerciseCatalog.map((e) => ({
  ...e,
  _searchKey: [e.canonicalName, ...e.aliases].join(" ").toLowerCase(),
}));

// Deduplicate by canonicalName (catalog has variants with same name) and sort
const seenNames = new Set<string>();
const sortedCatalog = [...indexedCatalog]
  .sort((a, b) => a.canonicalName.localeCompare(b.canonicalName))
  .filter((e) => {
    if (seenNames.has(e.canonicalName)) return false;
    seenNames.add(e.canonicalName);
    return true;
  });

const EQUIPMENT_FILTERS: { label: string; value: Equipment | "all" }[] = [
  { label: "All", value: "all" },
  { label: "Barbell", value: "barbell" },
  { label: "Dumbbell", value: "dumbbell" },
  { label: "Cable", value: "cable" },
  { label: "Machine", value: "machine" },
  { label: "Bodyweight", value: "bodyweight" },
  { label: "Kettlebell", value: "kettlebell" },
  { label: "Smith", value: "smith" },
  { label: "Band", value: "band" },
];

const BODY_PARTS: { label: string; muscles: MuscleGroup[]; icon: string; iconSet?: "mci" }[] = [
  { label: "Chest", muscles: ["chest"], icon: "weight-lifter", iconSet: "mci" },
  { label: "Back", muscles: ["back", "lats", "traps"], icon: "body-outline" },
  { label: "Shoulders", muscles: ["shoulders"], icon: "man-outline" },
  { label: "Arms", muscles: ["biceps", "triceps", "forearms"], icon: "arm-flex-outline", iconSet: "mci" },
  { label: "Legs", muscles: ["quads", "hamstrings", "glutes", "calves"], icon: "walk-outline" },
  { label: "Core", muscles: ["core"], icon: "yoga", iconSet: "mci" },
];

const MAX_RESULTS = 50;
const SNAP_POINTS = ["85%"];

// --- Result row (memoised) ---
const ExerciseRow = React.memo(function ExerciseRow({
  item,
  onPress,
  colors,
  excluded,
}: {
  item: IndexedEntry;
  onPress: () => void;
  colors: ReturnType<typeof useAppTheme>["theme"]["colors"];
  excluded: boolean;
}) {
  const muscles = [...item.primaryMuscles, ...item.secondaryMuscles]
    .map((m) => m.charAt(0).toUpperCase() + m.slice(1))
    .join(", ");

  const equipLabel = item.equipment.replace(/_/g, " ");

  return (
    <TouchableOpacity
      style={[styles.row, { borderBottomColor: colors.border }]}
      onPress={onPress}
      activeOpacity={0.6}
    >
      <View style={[styles.rowLeft, excluded && styles.rowExcluded]}>
        <Text style={[styles.rowName, { color: excluded ? colors.muted : colors.text }]}>
          {item.canonicalName}
        </Text>
        <Text style={[styles.rowMuscles, { color: colors.muted }]}>{muscles}</Text>
      </View>
      <View style={[styles.equipBadge, { backgroundColor: colors.mutedBg }]}>
        <Text style={[styles.equipText, { color: colors.muted }]}>{equipLabel}</Text>
      </View>
    </TouchableOpacity>
  );
});

export function ExercisePicker({ visible, onClose, onSelect, excludeNames }: ExercisePickerProps) {
  const { theme } = useAppTheme();
  const { colors } = theme;
  const insets = useSafeAreaInsets();
  const sheetRef = useRef<BottomSheet>(null);
  const visibleRef = useRef(visible);
  visibleRef.current = visible;

  const [query, setQuery] = useState("");
  const [debouncedQuery, setDebouncedQuery] = useState("");
  const [equipFilter, setEquipFilter] = useState<Equipment | "all">("all");
  const [muscleFilter, setMuscleFilter] = useState<string | null>(null);

  // Debounce search input
  useEffect(() => {
    const id = setTimeout(() => setDebouncedQuery(query), 200);
    return () => clearTimeout(id);
  }, [query]);

  // Open / close
  useEffect(() => {
    if (visible) {
      const id = setTimeout(() => sheetRef.current?.expand(), 50);
      return () => clearTimeout(id);
    } else {
      sheetRef.current?.close();
    }
  }, [visible]);

  // Reset state when opened
  useEffect(() => {
    if (visible) {
      setQuery("");
      setDebouncedQuery("");
      setEquipFilter("all");
      setMuscleFilter(null);
    }
  }, [visible]);

  const excludeSet = useMemo(
    () => new Set((excludeNames ?? []).map((n) => n.toLowerCase())),
    [excludeNames],
  );

  // Filtered results
  const results = useMemo(() => {
    let list = sortedCatalog;

    if (muscleFilter && muscleFilter !== "All") {
      const muscles = BODY_PARTS.find((b) => b.label === muscleFilter)?.muscles ?? [];
      list = list.filter((e) => e.primaryMuscles.some((m) => muscles.includes(m)));
    }

    if (equipFilter !== "all") {
      list = list.filter((e) => e.equipment === equipFilter);
    }

    if (debouncedQuery.trim()) {
      const q = debouncedQuery.toLowerCase().trim();
      list = list.filter((e) => e._searchKey.includes(q));
    }

    return list.slice(0, MAX_RESULTS);
  }, [debouncedQuery, equipFilter, muscleFilter]);

  const handleSheetClose = useCallback(() => {
    if (visibleRef.current) onClose();
  }, [onClose]);

  const handleSelect = useCallback(
    (item: IndexedEntry) => {
      onSelect({ name: item.canonicalName, equipment: item.equipment });
      onClose();
    },
    [onSelect, onClose],
  );

  const renderBackdrop = useCallback(
    (props: any) => (
      <BottomSheetBackdrop
        {...props}
        disappearsOnIndex={-1}
        appearsOnIndex={0}
        pressBehavior="close"
        opacity={0.4}
      />
    ),
    [],
  );

  const renderItem = useCallback(
    ({ item }: { item: IndexedEntry }) => (
      <ExerciseRow
        item={item}
        onPress={() => handleSelect(item)}
        colors={colors}
        excluded={excludeSet.has(item.canonicalName.toLowerCase())}
      />
    ),
    [colors, handleSelect, excludeSet],
  );

  const keyExtractor = useCallback((item: IndexedEntry) => item.id, []);

  const handleBodyPartTap = useCallback((label: string) => {
    impact(ImpactStyle.Light);
    setMuscleFilter(label);
  }, []);

  return (
    <BottomSheet
      ref={sheetRef}
      index={-1}
      snapPoints={SNAP_POINTS}
      topInset={insets.top}
      enablePanDownToClose
      onClose={handleSheetClose}
      backdropComponent={renderBackdrop}
      keyboardBehavior="extend"
      keyboardBlurBehavior="restore"
      android_keyboardInputMode="adjustResize"
      backgroundStyle={[styles.background, { backgroundColor: colors.surface }]}
      handleIndicatorStyle={{ backgroundColor: colors.muted }}
    >
      {muscleFilter === null ? (
        <>
          {/* Header — body part grid */}
          <View style={[styles.header, { borderBottomColor: colors.border }]}>
            <Text style={[styles.title, { color: colors.text }]}>Add Exercise</Text>
          </View>

          {/* Body Part Cards */}
          <BottomSheetScrollView contentContainerStyle={styles.cardGrid}>
            {BODY_PARTS.map((bp) => (
              <TouchableOpacity
                key={bp.label}
                style={[styles.card, { backgroundColor: colors.mutedBg, borderColor: colors.border }]}
                onPress={() => handleBodyPartTap(bp.label)}
                activeOpacity={0.7}
              >
                <View style={styles.cardIconWrap}>
                  {bp.iconSet === "mci" ? (
                    <MaterialCommunityIcons name={bp.icon as any} size={28} color={colors.primary} />
                  ) : (
                    <Ionicons name={bp.icon as any} size={32} color={colors.primary} />
                  )}
                </View>
                <Text style={[styles.cardLabel, { color: colors.text }]}>{bp.label}</Text>
              </TouchableOpacity>
            ))}
            {/* "All" card */}
            <TouchableOpacity
              style={[styles.card, { backgroundColor: colors.mutedBg, borderColor: colors.border }]}
              onPress={() => handleBodyPartTap("All")}
              activeOpacity={0.7}
            >
              <Ionicons name="grid-outline" size={32} color={colors.primary} />
              <Text style={[styles.cardLabel, { color: colors.text }]}>All</Text>
            </TouchableOpacity>
          </BottomSheetScrollView>
        </>
      ) : (
        <>
          {/* Header — filtered list with back button */}
          <View style={[styles.header, styles.headerRow, { borderBottomColor: colors.border }]}>
            <TouchableOpacity onPress={() => setMuscleFilter(null)} hitSlop={8}>
              <Ionicons name="chevron-back" size={24} color={colors.text} />
            </TouchableOpacity>
            <Text style={[styles.title, { color: colors.text, flex: 1, textAlign: "center" }]}>
              {muscleFilter === "All" ? "All Exercises" : `${muscleFilter} Exercises`}
            </Text>
            {/* Spacer to center the title */}
            <View style={{ width: 24 }} />
          </View>

          {/* Search */}
          <View style={[styles.searchWrap, { backgroundColor: colors.mutedBg }]}>
            <Ionicons name="search" size={18} color={colors.muted} style={styles.searchIcon} />
            <TextInput
              style={[styles.searchInput, { color: colors.text }]}
              placeholder="Search exercises..."
              placeholderTextColor={colors.muted}
              value={query}
              onChangeText={setQuery}
              autoCapitalize="none"
              autoCorrect={false}
            />
            {query.length > 0 && (
              <TouchableOpacity onPress={() => setQuery("")} hitSlop={8}>
                <Ionicons name="close-circle" size={18} color={colors.muted} />
              </TouchableOpacity>
            )}
          </View>

          {/* Filter chips */}
          <View style={styles.chipContainer}>
            <ScrollView
              horizontal
              showsHorizontalScrollIndicator={false}
              contentContainerStyle={styles.chipRow}
              keyboardShouldPersistTaps="handled"
            >
              {EQUIPMENT_FILTERS.map((f) => {
                const active = equipFilter === f.value;
                return (
                  <TouchableOpacity
                    key={f.value}
                    onPress={() => setEquipFilter(f.value)}
                    style={[
                      styles.chip,
                      {
                        backgroundColor: active ? colors.primary : colors.mutedBg,
                        borderColor: active ? colors.primary : colors.border,
                      },
                    ]}
                  >
                    <Text
                      style={[
                        styles.chipText,
                        { color: active ? colors.primaryText : colors.text },
                      ]}
                    >
                      {f.label}
                    </Text>
                  </TouchableOpacity>
                );
              })}
            </ScrollView>
          </View>

          {/* Results */}
          <BottomSheetFlatList
            data={results}
            keyExtractor={keyExtractor}
            renderItem={renderItem}
            keyboardShouldPersistTaps="handled"
            contentContainerStyle={styles.listContent}
            ListEmptyComponent={
              <View style={styles.empty}>
                <Ionicons name="barbell-outline" size={36} color={colors.muted} />
                <Text style={[styles.emptyText, { color: colors.muted }]}>
                  No exercises found
                </Text>
              </View>
            }
          />
        </>
      )}
    </BottomSheet>
  );
}

const styles = StyleSheet.create({
  background: {
    borderTopLeftRadius: 20,
    borderTopRightRadius: 20,
  },
  header: {
    paddingHorizontal: spacing.lg,
    paddingTop: spacing.xs,
    paddingBottom: spacing.sm,
    borderBottomWidth: StyleSheet.hairlineWidth,
  },
  headerRow: {
    flexDirection: "row",
    alignItems: "center",
  },
  title: {
    fontSize: 18,
    fontWeight: "700",
  },
  cardGrid: {
    flexDirection: "row",
    flexWrap: "wrap",
    padding: spacing.lg,
    gap: spacing.md,
  },
  card: {
    width: "47%",
    aspectRatio: 1.4,
    borderRadius: radius.lg,
    borderWidth: 1,
    alignItems: "center",
    justifyContent: "center",
    gap: spacing.sm,
  },
  cardIconWrap: {
    height: 36,
    alignItems: "center",
    justifyContent: "center",
  },
  cardLabel: {
    fontSize: 15,
    fontWeight: "600",
  },
  searchWrap: {
    flexDirection: "row",
    alignItems: "center",
    marginHorizontal: spacing.lg,
    marginTop: spacing.sm,
    borderRadius: radius.md,
    paddingHorizontal: spacing.sm,
    height: 42,
  },
  searchIcon: {
    marginRight: spacing.xs,
  },
  searchInput: {
    flex: 1,
    fontSize: 15,
    paddingVertical: 0,
  },
  chipContainer: {
    height: 52,
  },
  chipRow: {
    paddingHorizontal: spacing.lg,
    paddingVertical: 10,
    gap: spacing.sm,
    alignItems: "center",
  },
  chip: {
    paddingHorizontal: 14,
    paddingVertical: 8,
    borderRadius: radius.full,
    borderWidth: 1,
  },
  chipText: {
    fontSize: 13,
    fontWeight: "600",
  },
  listContent: {
    paddingBottom: 40,
  },
  row: {
    flexDirection: "row",
    alignItems: "center",
    paddingVertical: spacing.sm + 2,
    paddingHorizontal: spacing.lg,
    borderBottomWidth: StyleSheet.hairlineWidth,
  },
  rowLeft: {
    flex: 1,
    marginRight: spacing.sm,
  },
  rowExcluded: {
    opacity: 0.45,
  },
  rowName: {
    fontSize: 15,
    fontWeight: "600",
  },
  rowMuscles: {
    fontSize: 12,
    marginTop: 2,
  },
  equipBadge: {
    paddingHorizontal: spacing.sm,
    paddingVertical: 3,
    borderRadius: radius.full,
  },
  equipText: {
    fontSize: 11,
    fontWeight: "500",
    textTransform: "capitalize",
  },
  empty: {
    alignItems: "center",
    paddingTop: 48,
    gap: spacing.sm,
  },
  emptyText: {
    fontSize: 15,
  },
});
