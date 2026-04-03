import React, { useState, useCallback, useEffect } from "react";
import {
  Modal,
  View,
  Text,
  TextInput,
  TouchableOpacity,
  ScrollView,
  StyleSheet,
  KeyboardAvoidingView,
  Platform,
} from "react-native";
import { Ionicons } from "@expo/vector-icons";
import { useAppTheme } from "../../contexts/ThemeContext";
import { spacing, radius, typography } from "../../lib/theme";
import type {
  MealSlot,
  Recipe,
  FoodLogEntry,
  Macros,
  SavedMeal,
} from "../../src/data/mealTypes";
import { loadSavedMeals, addSavedMeal, removeSavedMeal } from "../../lib/mealStorage";

// ---------------------------------------------------------------------------
// Helpers
// ---------------------------------------------------------------------------

const SLOT_LABELS: Record<MealSlot, string> = {
  breakfast: "Breakfast",
  lunch: "Lunch",
  dinner: "Dinner",
  snack1: "Snack 1",
  snack2: "Snack 2",
};

const EMPTY_FORM = { name: "", calories: "", protein: "", carbs: "", fat: "" };

// ---------------------------------------------------------------------------
// Props
// ---------------------------------------------------------------------------

type Props = {
  visible: boolean;
  onClose: () => void;
  onLog: (entry: Omit<FoodLogEntry, "id" | "loggedAt">) => void;
  slot: MealSlot;
  date: string;
  quickPicks?: Recipe[];
};

// ---------------------------------------------------------------------------
// Component
// ---------------------------------------------------------------------------

export function AddFoodSheet({
  visible,
  onClose,
  onLog,
  slot,
  date,
  quickPicks,
}: Props) {
  const { theme } = useAppTheme();
  const c = theme.colors;

  const [form, setForm] = useState(EMPTY_FORM);
  const [selectedRecipeId, setSelectedRecipeId] = useState<string | null>(null);
  const [saveForLater, setSaveForLater] = useState(false);
  const [savedMeals, setSavedMeals] = useState<SavedMeal[]>([]);

  // Reset form and load saved meals when sheet opens
  useEffect(() => {
    if (visible) {
      setForm(EMPTY_FORM);
      setSelectedRecipeId(null);
      setSaveForLater(false);
      loadSavedMeals().then(setSavedMeals);
    }
  }, [visible]);

  const updateField = useCallback(
    (field: keyof typeof EMPTY_FORM, value: string) => {
      setForm((prev) => ({ ...prev, [field]: value }));
    },
    [],
  );

  const handleQuickPick = useCallback((recipe: Recipe) => {
    setSelectedRecipeId(recipe.id);
    setSaveForLater(false);
    setForm({
      name: recipe.name,
      calories: String(recipe.macros.calories),
      protein: String(recipe.macros.protein),
      carbs: String(recipe.macros.carbs),
      fat: String(recipe.macros.fat),
    });
  }, []);

  const handleSavedPick = useCallback((meal: SavedMeal) => {
    setSelectedRecipeId(null);
    setSaveForLater(false);
    setForm({
      name: meal.name,
      calories: String(meal.macros.calories),
      protein: String(meal.macros.protein),
      carbs: String(meal.macros.carbs),
      fat: String(meal.macros.fat),
    });
  }, []);

  const handleDeleteSaved = useCallback(async (id: string) => {
    await removeSavedMeal(id);
    setSavedMeals((prev) => prev.filter((m) => m.id !== id));
  }, []);

  const canSubmit =
    form.name.trim().length > 0 && form.calories.trim().length > 0;

  const handleLog = useCallback(() => {
    if (!canSubmit) return;

    const macros: Macros = {
      calories: Number(form.calories) || 0,
      protein: Number(form.protein) || 0,
      carbs: Number(form.carbs) || 0,
      fat: Number(form.fat) || 0,
    };

    const picked = quickPicks?.find((r) => r.id === selectedRecipeId);

    // Save for future use if toggled
    if (saveForLater && !selectedRecipeId) {
      addSavedMeal({
        id: `saved_${Date.now()}`,
        name: form.name.trim(),
        macros,
        createdAt: new Date().toISOString(),
      });
    }

    onLog({
      date,
      slot,
      recipeId: selectedRecipeId,
      name: form.name.trim(),
      flag: picked?.flag,
      macros,
    });

    onClose();
  }, [canSubmit, form, date, slot, selectedRecipeId, quickPicks, saveForLater, onLog, onClose]);

  // ------ Styles (theme-dependent) ------
  const inputStyle = [
    styles.input,
    {
      backgroundColor: c.mutedBg,
      borderColor: c.border,
      color: c.text,
    },
  ];

  return (
    <Modal
      visible={visible}
      animationType="slide"
      presentationStyle="pageSheet"
      onRequestClose={onClose}
    >
      <KeyboardAvoidingView
        style={[styles.container, { backgroundColor: c.bg }]}
        behavior={Platform.OS === "ios" ? "padding" : undefined}
      >
        {/* ── Header ─────────────────────────────────────── */}
        <View style={[styles.header, { borderBottomColor: c.border }]}>
          <Text style={[styles.headerTitle, { color: c.text }]}>
            Log {SLOT_LABELS[slot]}
          </Text>
          <TouchableOpacity
            onPress={onClose}
            hitSlop={{ top: 12, bottom: 12, left: 12, right: 12 }}
          >
            <Ionicons name="close" size={24} color={c.muted} />
          </TouchableOpacity>
        </View>

        <ScrollView
          style={styles.scrollBody}
          contentContainerStyle={styles.scrollContent}
          keyboardShouldPersistTaps="handled"
        >
          {/* ── Quick-pick section ────────────────────────── */}
          {quickPicks && quickPicks.length > 0 && (
            <>
              <Text style={[styles.sectionLabel, { color: c.muted }]}>
                From your plan
              </Text>
              <ScrollView
                horizontal
                showsHorizontalScrollIndicator={false}
                contentContainerStyle={styles.quickPickRow}
              >
                {quickPicks.map((recipe) => {
                  const isSelected = selectedRecipeId === recipe.id;
                  return (
                    <TouchableOpacity
                      key={recipe.id}
                      style={[
                        styles.quickPickCard,
                        {
                          backgroundColor: isSelected ? c.primary + "20" : c.surface,
                          borderColor: isSelected ? c.primary : c.border,
                        },
                      ]}
                      activeOpacity={0.7}
                      onPress={() => handleQuickPick(recipe)}
                    >
                      <Text style={styles.quickPickFlag}>{recipe.flag}</Text>
                      <Text
                        style={[styles.quickPickName, { color: c.text }]}
                        numberOfLines={2}
                      >
                        {recipe.name}
                      </Text>
                      <Text style={[styles.quickPickCal, { color: c.muted }]}>
                        {recipe.macros.calories} cal
                      </Text>
                    </TouchableOpacity>
                  );
                })}
              </ScrollView>

              {/* ── Divider ──────────────────────────────────── */}
              <View style={styles.dividerRow}>
                <View style={[styles.dividerLine, { backgroundColor: c.border }]} />
                <Text style={[styles.dividerText, { color: c.muted }]}>
                  or enter manually
                </Text>
                <View style={[styles.dividerLine, { backgroundColor: c.border }]} />
              </View>
            </>
          )}

          {/* ── Saved meals section ──────────────────────── */}
          {savedMeals.length > 0 && (
            <>
              <Text style={[styles.sectionLabel, { color: c.muted }]}>
                Saved meals
              </Text>
              <ScrollView
                horizontal
                showsHorizontalScrollIndicator={false}
                contentContainerStyle={styles.quickPickRow}
              >
                {savedMeals.map((meal) => (
                  <TouchableOpacity
                    key={meal.id}
                    style={[
                      styles.quickPickCard,
                      {
                        backgroundColor: form.name === meal.name ? c.primary + "20" : c.surface,
                        borderColor: form.name === meal.name ? c.primary : c.border,
                      },
                    ]}
                    activeOpacity={0.7}
                    onPress={() => handleSavedPick(meal)}
                    onLongPress={() => handleDeleteSaved(meal.id)}
                  >
                    <Ionicons name="bookmark" size={22} color={c.primary} style={{ marginBottom: spacing.xs }} />
                    <Text
                      style={[styles.quickPickName, { color: c.text }]}
                      numberOfLines={2}
                    >
                      {meal.name}
                    </Text>
                    <Text style={[styles.quickPickCal, { color: c.muted }]}>
                      {meal.macros.calories} cal
                    </Text>
                  </TouchableOpacity>
                ))}
              </ScrollView>
            </>
          )}

          {/* ── Form fields ──────────────────────────────── */}
          <Text style={[styles.fieldLabel, { color: c.muted }]}>Meal name</Text>
          <TextInput
            style={inputStyle}
            value={form.name}
            onChangeText={(v) => updateField("name", v)}
            placeholder="e.g. Chicken & rice"
            placeholderTextColor={c.muted}
            returnKeyType="next"
          />

          <Text style={[styles.fieldLabel, { color: c.muted }]}>Calories</Text>
          <TextInput
            style={inputStyle}
            value={form.calories}
            onChangeText={(v) => updateField("calories", v)}
            placeholder="0"
            placeholderTextColor={c.muted}
            keyboardType="numeric"
            returnKeyType="next"
          />

          <View style={styles.macroRow}>
            <View style={styles.macroField}>
              <Text style={[styles.fieldLabel, { color: c.muted }]}>
                Protein (g)
              </Text>
              <TextInput
                style={inputStyle}
                value={form.protein}
                onChangeText={(v) => updateField("protein", v)}
                placeholder="0"
                placeholderTextColor={c.muted}
                keyboardType="numeric"
                returnKeyType="next"
              />
            </View>
            <View style={styles.macroField}>
              <Text style={[styles.fieldLabel, { color: c.muted }]}>
                Carbs (g)
              </Text>
              <TextInput
                style={inputStyle}
                value={form.carbs}
                onChangeText={(v) => updateField("carbs", v)}
                placeholder="0"
                placeholderTextColor={c.muted}
                keyboardType="numeric"
                returnKeyType="next"
              />
            </View>
            <View style={styles.macroField}>
              <Text style={[styles.fieldLabel, { color: c.muted }]}>Fat (g)</Text>
              <TextInput
                style={inputStyle}
                value={form.fat}
                onChangeText={(v) => updateField("fat", v)}
                placeholder="0"
                placeholderTextColor={c.muted}
                keyboardType="numeric"
                returnKeyType="done"
              />
            </View>
          </View>

          {/* ── Save for later toggle ────────────────────── */}
          {!selectedRecipeId && (
            <TouchableOpacity
              style={[
                styles.saveToggle,
                {
                  backgroundColor: saveForLater ? c.primary + "15" : "transparent",
                  borderColor: saveForLater ? c.primary : c.border,
                },
              ]}
              activeOpacity={0.7}
              onPress={() => setSaveForLater((v) => !v)}
            >
              <Ionicons
                name={saveForLater ? "bookmark" : "bookmark-outline"}
                size={20}
                color={saveForLater ? c.primary : c.muted}
              />
              <Text
                style={[
                  styles.saveToggleText,
                  { color: saveForLater ? c.primary : c.text },
                ]}
              >
                Save for future use
              </Text>
            </TouchableOpacity>
          )}

          {/* ── Log button ───────────────────────────────── */}
          <TouchableOpacity
            style={[
              styles.logButton,
              { backgroundColor: canSubmit ? c.success : c.muted + "40" },
            ]}
            activeOpacity={0.8}
            disabled={!canSubmit}
            onPress={handleLog}
          >
            <Ionicons
              name="checkmark-circle"
              size={20}
              color={canSubmit ? c.successText : c.muted}
              style={{ marginRight: spacing.xs }}
            />
            <Text
              style={[
                styles.logButtonText,
                { color: canSubmit ? c.successText : c.muted },
              ]}
            >
              Log {SLOT_LABELS[slot]}
            </Text>
          </TouchableOpacity>
        </ScrollView>
      </KeyboardAvoidingView>
    </Modal>
  );
}

// ---------------------------------------------------------------------------
// Styles
// ---------------------------------------------------------------------------

const styles = StyleSheet.create({
  container: {
    flex: 1,
  },
  header: {
    flexDirection: "row",
    alignItems: "center",
    justifyContent: "space-between",
    paddingHorizontal: spacing.lg,
    paddingTop: spacing.lg,
    paddingBottom: spacing.md,
    borderBottomWidth: StyleSheet.hairlineWidth,
  },
  headerTitle: {
    ...typography.heading,
  },
  scrollBody: {
    flex: 1,
  },
  scrollContent: {
    padding: spacing.lg,
    paddingBottom: spacing.xl + 40,
  },

  // Quick picks
  sectionLabel: {
    ...typography.small,
    textTransform: "uppercase",
    letterSpacing: 0.8,
    marginBottom: spacing.sm,
  },
  quickPickRow: {
    gap: spacing.sm,
    paddingBottom: spacing.md,
  },
  quickPickCard: {
    width: 120,
    borderRadius: radius.md,
    borderWidth: 1,
    padding: spacing.sm,
    alignItems: "center",
  },
  quickPickFlag: {
    fontSize: 28,
    marginBottom: spacing.xs,
  },
  quickPickName: {
    ...typography.small,
    fontWeight: "600",
    textAlign: "center",
    marginBottom: 2,
  },
  quickPickCal: {
    ...typography.caption,
  },

  // Divider
  dividerRow: {
    flexDirection: "row",
    alignItems: "center",
    marginVertical: spacing.lg,
  },
  dividerLine: {
    flex: 1,
    height: StyleSheet.hairlineWidth,
  },
  dividerText: {
    ...typography.caption,
    marginHorizontal: spacing.sm,
  },

  // Form
  fieldLabel: {
    ...typography.small,
    marginBottom: spacing.xs,
    marginTop: spacing.md,
  },
  input: {
    ...typography.body,
    borderWidth: 1,
    borderRadius: radius.sm,
    paddingHorizontal: spacing.md,
    paddingVertical: Platform.OS === "ios" ? 14 : 10,
  },
  macroRow: {
    flexDirection: "row",
    gap: spacing.sm,
  },
  macroField: {
    flex: 1,
  },

  // Save toggle
  saveToggle: {
    flexDirection: "row",
    alignItems: "center",
    gap: spacing.sm,
    marginTop: spacing.lg,
    paddingVertical: 14,
    paddingHorizontal: spacing.md,
    borderRadius: radius.md,
    borderWidth: 1,
  },
  saveToggleText: {
    ...typography.body,
    fontWeight: "600",
  },

  // Log button
  logButton: {
    flexDirection: "row",
    alignItems: "center",
    justifyContent: "center",
    borderRadius: radius.md,
    paddingVertical: 16,
    marginTop: spacing.xl,
  },
  logButtonText: {
    ...typography.subheading,
  },
});
