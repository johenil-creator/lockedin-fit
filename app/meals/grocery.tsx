import React, { useMemo, useState, useCallback, useEffect, useRef } from "react";
import { View, Text, SectionList, StyleSheet, Pressable } from "react-native";
import { useRouter } from "expo-router";
import { useAppTheme } from "../../contexts/ThemeContext";
import { useSafeAreaInsets } from "react-native-safe-area-context";
import Animated, { FadeIn, FadeInDown } from "react-native-reanimated";
import { spacing, radius, typography } from "../../lib/theme";
import { Ionicons } from "@expo/vector-icons";
import type { GroceryItem, GroceryCategory } from "../../src/data/mealTypes";
import { buildGroceryList } from "../../lib/mealService";
import { useMealPlan } from "../../hooks/useMealPlan";
import { recipeCatalog } from "../../src/data/recipeCatalog";
import { GroceryRow } from "../../components/meals";
import { TierBadge } from "../../components/meals";
import { loadGroceryList, saveGroceryList } from "../../lib/mealStorage";

const CATEGORY_ICONS: Record<string, { icon: keyof typeof Ionicons.glyphMap; color: string }> = {
  Proteins: { icon: "fitness-outline", color: "#F85149" },
  Dairy: { icon: "water-outline", color: "#58A6FF" },
  Grains: { icon: "leaf-outline", color: "#D2A038" },
  Produce: { icon: "nutrition-outline", color: "#3FB950" },
  Pantry: { icon: "cube-outline", color: "#7D8590" },
  Spices: { icon: "flame-outline", color: "#BA7517" },
  "Canned & Jarred": { icon: "file-tray-stacked-outline", color: "#A371F7" },
};

type Section = {
  title: GroceryCategory;
  data: GroceryItem[];
};

export default function GroceryScreen() {
  const router = useRouter();
  const { theme } = useAppTheme();
  const insets = useSafeAreaInsets();
  const { plan, prefs } = useMealPlan();
  const startDay = prefs.startDayIndex ?? 0;

  const [checked, setChecked] = useState<Set<string>>(new Set());
  const persistRef = useRef(false);

  // Filter plan to only include days from start day onward
  const filteredPlan = useMemo(() => {
    if (!plan) return null;
    if (startDay === 0) return plan;
    return {
      ...plan,
      days: plan.days.filter((d) => d.dayIndex >= startDay),
    };
  }, [plan, startDay]);

  const items = useMemo(() => {
    if (!filteredPlan) return [];
    return buildGroceryList(filteredPlan, recipeCatalog);
  }, [filteredPlan]);

  // Restore checked state from AsyncStorage on mount
  useEffect(() => {
    if (!plan?.weekKey) return;
    loadGroceryList().then((saved) => {
      if (saved.weekKey === plan.weekKey && saved.items.length > 0) {
        const ids = new Set(saved.items.filter((i) => i.checked).map((i) => i.id));
        if (ids.size > 0) setChecked(ids);
      }
      persistRef.current = true;
    });
  }, [plan?.weekKey]);

  // Persist checked state whenever it changes
  useEffect(() => {
    if (!persistRef.current || !plan) return;
    const persisted = items.map((item) => ({
      ...item,
      checked: checked.has(item.id),
    }));
    saveGroceryList({ weekKey: plan.weekKey, tier: plan.tier, items: persisted });
  }, [checked, items, plan]);

  const sections = useMemo<Section[]>(() => {
    const map = new Map<GroceryCategory, GroceryItem[]>();
    for (const item of items) {
      const list = map.get(item.category);
      if (list) {
        list.push(item);
      } else {
        map.set(item.category, [item]);
      }
    }
    return Array.from(map.entries()).map(([title, data]) => ({ title, data }));
  }, [items]);

  const toggleItem = useCallback((id: string) => {
    setChecked((prev) => {
      const next = new Set(prev);
      if (next.has(id)) {
        next.delete(id);
      } else {
        next.add(id);
      }
      return next;
    });
  }, []);

  const checkedCount = checked.size;
  const totalCount = items.length;

  return (
    <View style={[styles.container, { backgroundColor: theme.colors.bg, paddingTop: insets.top }]}>
      {/* Header */}
      <Animated.View entering={FadeIn.duration(300)} style={styles.header}>
        <Pressable
          onPress={() => router.back()}
          style={styles.backBtn}
          accessibilityRole="button"
          accessibilityLabel="Go back"
        >
          <Ionicons name="chevron-back" size={24} color={theme.colors.text} />
        </Pressable>
        <View style={styles.titleCol}>
          <Text style={[styles.title, { color: theme.colors.text }]}>Grocery List</Text>
          {totalCount > 0 && (
            <Text style={[styles.titleSub, { color: theme.colors.muted }]}>
              {totalCount} items across {sections.length} categories
            </Text>
          )}
        </View>
        {plan && <TierBadge tier={plan.tier} size="sm" />}
      </Animated.View>

      {!plan || items.length === 0 ? (
        <View style={styles.empty}>
          <Ionicons name="cart-outline" size={48} color={theme.colors.muted} />
          <Text style={[styles.emptyText, { color: theme.colors.muted }]}>
            Generate a weekly plan first to see your grocery list.
          </Text>
        </View>
      ) : (
        <>
          <SectionList
            sections={sections}
            keyExtractor={(item) => item.id}
            renderSectionHeader={({ section }) => {
              const catMeta = CATEGORY_ICONS[section.title] ?? { icon: "cube-outline", color: "#7D8590" };
              const checkedInSection = section.data.filter((i) => checked.has(i.id)).length;
              return (
                <View style={[styles.sectionHeader, { backgroundColor: theme.colors.bg }]}>
                  <View style={[styles.sectionIconWrap, { backgroundColor: catMeta.color + "18" }]}>
                    <Ionicons name={catMeta.icon} size={14} color={catMeta.color} />
                  </View>
                  <Text style={[styles.sectionTitle, { color: theme.colors.text }]}>
                    {section.title}
                  </Text>
                  <Text style={[styles.sectionCount, { color: theme.colors.muted }]}>
                    {checkedInSection}/{section.data.length}
                  </Text>
                </View>
              );
            }}
            renderItem={({ item }) => (
              <GroceryRow
                item={{ ...item, checked: checked.has(item.id) }}
                onToggle={() => toggleItem(item.id)}
              />
            )}
            contentContainerStyle={{ paddingBottom: insets.bottom + 80 }}
            stickySectionHeadersEnabled
            showsVerticalScrollIndicator={false}
          />

          {/* Summary footer */}
          <View
            style={[
              styles.footer,
              {
                backgroundColor: theme.colors.surface,
                borderTopColor: theme.colors.border,
                paddingBottom: insets.bottom + spacing.md,
              },
            ]}
          >
            <View style={styles.footerTop}>
              <Ionicons
                name={checkedCount === totalCount ? "checkmark-done-circle" : "checkmark-circle"}
                size={20}
                color={checkedCount === totalCount ? theme.colors.success : theme.colors.primary}
              />
              <Text style={[styles.footerText, { color: theme.colors.text }]}>
                {checkedCount} of {totalCount} items checked
              </Text>
              {checkedCount === totalCount && totalCount > 0 && (
                <Text style={[styles.footerDone, { color: theme.colors.success }]}>
                  All done!
                </Text>
              )}
            </View>
            <View style={[styles.footerTrack, { backgroundColor: theme.colors.mutedBg }]}>
              <View
                style={[
                  styles.footerFill,
                  {
                    backgroundColor: checkedCount === totalCount ? theme.colors.success : theme.colors.primary,
                    width: totalCount > 0 ? `${Math.round((checkedCount / totalCount) * 100)}%` : "0%",
                  },
                ]}
              />
            </View>
          </View>
        </>
      )}
    </View>
  );
}

const styles = StyleSheet.create({
  container: {
    flex: 1,
  },
  header: {
    flexDirection: "row",
    alignItems: "center",
    gap: spacing.sm,
    paddingHorizontal: spacing.md,
    paddingVertical: spacing.md,
  },
  backBtn: {
    width: 36,
    height: 36,
    justifyContent: "center",
    alignItems: "center",
  },
  titleCol: {
    flex: 1,
  },
  title: {
    ...typography.heading,
  },
  titleSub: {
    fontSize: typography.caption.fontSize,
    marginTop: 2,
  },
  empty: {
    flex: 1,
    justifyContent: "center",
    alignItems: "center",
    gap: spacing.md,
    paddingHorizontal: spacing.xl,
  },
  emptyText: {
    ...typography.body,
    textAlign: "center",
  },
  sectionHeader: {
    flexDirection: "row",
    alignItems: "center",
    gap: spacing.sm,
    paddingHorizontal: spacing.md,
    paddingVertical: spacing.sm + 2,
  },
  sectionIconWrap: {
    width: 26,
    height: 26,
    borderRadius: 7,
    alignItems: "center",
    justifyContent: "center",
  },
  sectionTitle: {
    ...typography.subheading,
    flex: 1,
  },
  sectionCount: {
    ...typography.caption,
    fontWeight: "600",
  },
  footer: {
    position: "absolute",
    bottom: 0,
    left: 0,
    right: 0,
    paddingHorizontal: spacing.md,
    paddingTop: spacing.md,
    borderTopWidth: 1,
  },
  footerTop: {
    flexDirection: "row",
    alignItems: "center",
    gap: spacing.sm,
    marginBottom: spacing.sm,
  },
  footerText: {
    ...typography.body,
    fontWeight: "600",
    flex: 1,
  },
  footerDone: {
    fontSize: typography.caption.fontSize,
    fontWeight: "700",
  },
  footerTrack: {
    height: 6,
    borderRadius: radius.full,
    overflow: "hidden",
  },
  footerFill: {
    height: "100%",
    borderRadius: radius.full,
    minWidth: 4,
  },
});
