/**
 * app/cardio-setup.tsx — Cardio setup: tap a preset, see Locke tip, start session.
 *
 * Enhancements:
 *  - Staggered card entry animations (FadeInDown cascade)
 *  - Press-scale + haptics on card taps (matches Button component)
 *  - Larger icons in circular colored backgrounds
 *  - Card shadows for depth
 *  - Brand-aligned subtitle + "Custom" option
 *  - Improved tag styling with borders
 */

import { useState, useRef, useMemo, useCallback } from "react";
import {
  View,
  Text,
  Pressable,
  ScrollView,
  StyleSheet,
  Modal,
  Platform,
} from "react-native";
import { useSafeAreaInsets } from "react-native-safe-area-context";
import Animated, {
  FadeIn,
  FadeOut,
  useSharedValue,
  useAnimatedStyle,
  withSpring,
} from "react-native-reanimated";
import * as Haptics from "expo-haptics";
import { useRouter } from "expo-router";
import { useAppTheme } from "../contexts/ThemeContext";
import { LockeMascot } from "../components/Locke/LockeMascot";
import { Button } from "../components/Button";
import { spacing, radius, typography } from "../lib/theme";
import { CARDIO_SUGGESTIONS, startFromSuggestion } from "../lib/cardioSuggestions";
import { getLockeTip } from "../lib/lockeTips";
import type { CardioModality, CardioSessionParams } from "../lib/cardioSuggestions";

// ── Modality catalogue (for custom picker) ──────────────────────────────────

type ModalityDef = { id: CardioModality; label: string; icon: string };

const MODALITIES: ModalityDef[] = [
  { id: "running",      label: "Running",       icon: "\u{1F3C3}" },
  { id: "cycling",      label: "Cycling",        icon: "\u{1F6B4}" },
  { id: "rowing",       label: "Rowing",         icon: "\u{1F6A3}" },
  { id: "walking",      label: "Walking",        icon: "\u{1F6B6}" },
  { id: "swimming",     label: "Swimming",       icon: "\u{1F3CA}" },
  { id: "elliptical",   label: "Elliptical",     icon: "\u25EF" },
  { id: "stairclimber", label: "Stair Climber",  icon: "\u{1FA9C}" },
  { id: "jump_rope",    label: "Jump Rope",      icon: "\u27B0" },
  { id: "other",        label: "Other",          icon: "\u26A1" },
];

// ── Intensity helpers ────────────────────────────────────────────────────────

function intensityTag(rpe: number): { label: string; color: string } {
  if (rpe <= 3) return { label: "Easy", color: "#3FB950" };
  if (rpe <= 5) return { label: "Moderate", color: "#D9A100" };
  if (rpe <= 7) return { label: "Hard", color: "#E07A3F" };
  return { label: "Very Hard", color: "#E63946" };
}

const RPE_OPTIONS: { rpe: number; label: string; color: string }[] = [
  { rpe: 3,  label: "Easy",      color: "#3FB950" },
  { rpe: 5,  label: "Moderate",  color: "#D9A100" },
  { rpe: 7,  label: "Hard",      color: "#E07A3F" },
  { rpe: 9,  label: "Very Hard", color: "#E63946" },
];

// ── Animated preset card ────────────────────────────────────────────────────

function PresetCard({
  suggestion,
  index,
  onPress,
}: {
  suggestion: (typeof CARDIO_SUGGESTIONS)[number];
  index: number;
  onPress: () => void;
}) {
  const { theme } = useAppTheme();
  const tag = intensityTag(suggestion.intensity);
  const scale = useSharedValue(1);

  const animStyle = useAnimatedStyle(() => ({
    transform: [{ scale: scale.value }],
  }));

  return (
    <Animated.View entering={FadeIn.delay(index * 30).duration(250)}>
      <Animated.View style={animStyle}>
      <Pressable
        style={[
          styles.presetCard,
          {
            backgroundColor: theme.colors.surface,
            borderColor: theme.colors.border,
            ...Platform.select({
              ios: {
                shadowColor: tag.color,
                shadowOffset: { width: 0, height: 4 },
                shadowOpacity: 0.12,
                shadowRadius: 12,
              },
              android: { elevation: 3 },
            }),
          },
        ]}
        onPressIn={() => {
          scale.value = withSpring(0.97, { damping: 15, stiffness: 400 });
        }}
        onPressOut={() => {
          scale.value = withSpring(1, { damping: 15, stiffness: 400 });
        }}
        onPress={() => {
          Haptics.impactAsync(Haptics.ImpactFeedbackStyle.Light);
          onPress();
        }}
      >
        <View style={styles.presetTop}>
          {/* Icon in circular background */}
          <View style={[styles.iconCircle, { backgroundColor: tag.color + "20" }]}>
            <Text style={styles.presetIcon}>{suggestion.icon}</Text>
          </View>
          <View style={styles.presetInfo}>
            <Text style={[styles.presetName, { color: theme.colors.text }]}>
              {suggestion.name}
            </Text>
            <Text
              style={[styles.presetDesc, { color: theme.colors.muted }]}
              numberOfLines={2}
            >
              {suggestion.description}
            </Text>
          </View>
        </View>
        <View style={styles.presetTags}>
          <View style={[styles.tag, { backgroundColor: theme.colors.mutedBg, borderColor: theme.colors.border }]}>
            <Text style={[styles.tagText, { color: theme.colors.muted }]}>
              {suggestion.modality.replace("_", " ")}
            </Text>
          </View>
          <View style={[styles.tag, { backgroundColor: tag.color + "18", borderColor: tag.color + "40" }]}>
            <Text style={[styles.tagText, { color: tag.color }]}>
              {tag.label}
            </Text>
          </View>
        </View>
      </Pressable>
      </Animated.View>
    </Animated.View>
  );
}

// ── Custom modality modal ───────────────────────────────────────────────────

function CustomCardioModal({
  visible,
  onStart,
  onClose,
}: {
  visible: boolean;
  onStart: (params: CardioSessionParams) => void;
  onClose: () => void;
}) {
  const { theme } = useAppTheme();
  const [selectedModality, setSelectedModality] = useState<CardioModality>("running");
  const [selectedRpe, setSelectedRpe] = useState(5);

  if (!visible) return null;

  const handleStart = () => {
    Haptics.impactAsync(Haptics.ImpactFeedbackStyle.Medium);
    const label = selectedModality.charAt(0).toUpperCase() + selectedModality.slice(1).replace("_", " ");
    onStart({
      modality: selectedModality,
      intensity: String(selectedRpe),
      name: `${label} Session`,
    });
  };

  return (
    <Modal transparent animationType="none" visible={visible} statusBarTranslucent>
      <Animated.View
        entering={FadeIn.duration(200)}
        exiting={FadeOut.duration(180)}
        style={[styles.modalScrim, { backgroundColor: "rgba(0,0,0,0.85)" }]}
      >
        <Animated.View
          entering={FadeIn.delay(60).duration(260)}
          style={[styles.customModal, { backgroundColor: theme.colors.surface }]}
        >
          <Text style={[styles.customTitle, { color: theme.colors.text }]}>
            Custom Cardio
          </Text>

          {/* Modality grid */}
          <Text style={[styles.customSectionLabel, { color: theme.colors.muted }]}>
            MODALITY
          </Text>
          <View style={styles.modalityGrid}>
            {MODALITIES.map((m) => {
              const active = selectedModality === m.id;
              return (
                <Pressable
                  key={m.id}
                  style={[
                    styles.modalityChip,
                    {
                      backgroundColor: active ? theme.colors.primary + "20" : theme.colors.mutedBg,
                      borderColor: active ? theme.colors.primary : theme.colors.border,
                    },
                  ]}
                  onPress={() => {
                    setSelectedModality(m.id);
                    Haptics.selectionAsync();
                  }}
                >
                  <Text style={styles.modalityChipIcon}>{m.icon}</Text>
                  <Text
                    style={[
                      styles.modalityChipLabel,
                      { color: active ? theme.colors.primary : theme.colors.text },
                    ]}
                    numberOfLines={1}
                  >
                    {m.label}
                  </Text>
                </Pressable>
              );
            })}
          </View>

          {/* Intensity pills */}
          <Text style={[styles.customSectionLabel, { color: theme.colors.muted }]}>
            INTENSITY
          </Text>
          <View style={styles.rpePillRow}>
            {RPE_OPTIONS.map((opt) => {
              const active = selectedRpe === opt.rpe;
              return (
                <Pressable
                  key={opt.rpe}
                  style={[
                    styles.rpePill,
                    {
                      backgroundColor: active ? opt.color : theme.colors.mutedBg,
                      borderColor: active ? opt.color : theme.colors.border,
                    },
                  ]}
                  onPress={() => {
                    setSelectedRpe(opt.rpe);
                    Haptics.selectionAsync();
                  }}
                >
                  <Text
                    style={[
                      styles.rpePillText,
                      { color: active ? "#fff" : theme.colors.muted },
                    ]}
                  >
                    {opt.label}
                  </Text>
                </Pressable>
              );
            })}
          </View>

          {/* Actions */}
          <View style={styles.customActions}>
            <Button label="Start Session" onPress={handleStart} />
            <Pressable onPress={onClose} style={styles.customCancel}>
              <Text style={[styles.customCancelText, { color: theme.colors.muted }]}>Cancel</Text>
            </Pressable>
          </View>
        </Animated.View>
      </Animated.View>
    </Modal>
  );
}

// ── Locke tip modal ─────────────────────────────────────────────────────────

function LockeTipModal({
  visible,
  modality,
  onLetsGo,
}: {
  visible: boolean;
  modality: string;
  onLetsGo: () => void;
}) {
  const { theme } = useAppTheme();
  const tip = getLockeTip(modality);

  if (!visible) return null;

  return (
    <Modal transparent animationType="none" visible={visible} statusBarTranslucent>
      <Animated.View
        entering={FadeIn.duration(200)}
        exiting={FadeOut.duration(180)}
        style={[styles.modalScrim, { backgroundColor: "rgba(0,0,0,0.85)" }]}
      >
        <Animated.View
          entering={FadeIn.delay(60).duration(260)}
          style={[styles.tipModal, { backgroundColor: theme.colors.surface }]}
        >
          <View style={styles.tipMascot}>
            <LockeMascot size={56} mood="encouraging" />
          </View>

          <Text style={[styles.tipSetup, { color: theme.colors.text }]}>
            {tip.setup}
          </Text>

          <View style={styles.tipCues}>
            {tip.cues.map((cue, i) => (
              <View key={i} style={styles.tipCueRow}>
                <Text style={[styles.tipCueBullet, { color: theme.colors.success }]}>
                  {"\u2713"}
                </Text>
                <Text style={[styles.tipCueText, { color: theme.colors.text }]}>{cue}</Text>
              </View>
            ))}
          </View>

          <Button label="Let's Go!" onPress={() => {
            Haptics.impactAsync(Haptics.ImpactFeedbackStyle.Medium);
            onLetsGo();
          }} />
        </Animated.View>
      </Animated.View>
    </Modal>
  );
}

// ── Main screen ──────────────────────────────────────────────────────────────

export default function CardioSetupScreen() {
  const router = useRouter();
  const insets = useSafeAreaInsets();
  const { theme } = useAppTheme();

  // Tip modal state
  const [showTipModal, setShowTipModal] = useState(false);
  const [tipModalModality, setTipModalModality] = useState("other");
  const pendingParamsRef = useRef<Record<string, string> | null>(null);

  // Custom modal state
  const [showCustomModal, setShowCustomModal] = useState(false);

  const handlePresetTap = useCallback((suggestionParams: CardioSessionParams) => {
    const params: Record<string, string> = {
      modality: suggestionParams.modality,
      intensity: suggestionParams.intensity,
      name: suggestionParams.name,
    };
    pendingParamsRef.current = params;
    setTipModalModality(suggestionParams.modality);
    setShowTipModal(true);
  }, []);

  const handleCustomStart = useCallback((params: CardioSessionParams) => {
    setShowCustomModal(false);
    const navParams: Record<string, string> = {
      modality: params.modality,
      intensity: params.intensity,
      name: params.name,
    };
    pendingParamsRef.current = navParams;
    setTipModalModality(params.modality);
    // Delay tip modal until custom modal finishes unmounting —
    // two RN Modals transitioning simultaneously freezes the UI.
    setTimeout(() => setShowTipModal(true), 350);
  }, []);

  const handleTipDismiss = useCallback(() => {
    setShowTipModal(false);
    const params = pendingParamsRef.current;
    if (params) {
      pendingParamsRef.current = null;
      router.push({ pathname: "/cardio-session", params });
    }
  }, [router]);

  // Back button animation
  const backScale = useSharedValue(1);
  const backAnimStyle = useAnimatedStyle(() => ({
    transform: [{ scale: backScale.value }],
  }));

  return (
    <>
      <ScrollView
        style={{ flex: 1, backgroundColor: theme.colors.bg }}
        contentContainerStyle={[
          styles.scroll,
          { paddingTop: insets.top + spacing.md, paddingBottom: insets.bottom + spacing.xl },
        ]}
        showsVerticalScrollIndicator={false}
        scrollEventThrottle={16}
      >
        {/* Header */}
        <View style={styles.header}>
          <Animated.View style={backAnimStyle}>
            <Pressable
              onPress={() => router.back()}
              onPressIn={() => {
                backScale.value = withSpring(0.8, { damping: 14, stiffness: 400 });
                Haptics.impactAsync(Haptics.ImpactFeedbackStyle.Light);
              }}
              onPressOut={() => {
                backScale.value = withSpring(1, { damping: 14, stiffness: 400 });
              }}
              style={styles.backBtn}
              accessibilityRole="button"
              accessibilityLabel="Close"
            >
              <Text style={[styles.backText, { color: theme.colors.muted }]}>
                {"\u2715"}
              </Text>
            </Pressable>
          </Animated.View>
          <Text style={[styles.screenTitle, { color: theme.colors.text }]}>
            Choose Your Cardio
          </Text>
          <View style={{ width: 36 }} />
        </View>

        {/* Subtitle */}
        <Text style={[styles.subtitle, { color: theme.colors.muted }]}>
          Pick a preset and let Locke guide you in.
        </Text>

        {/* Preset cards */}
        <View style={styles.presetList}>
          {CARDIO_SUGGESTIONS.map((s, i) => (
            <PresetCard
              key={s.id}
              suggestion={s}
              index={i}
              onPress={() => handlePresetTap(startFromSuggestion(s))}
            />
          ))}
        </View>

        {/* Custom option */}
        <View>
          <Pressable
            style={[styles.customBtn, { borderColor: theme.colors.border }]}
            onPress={() => {
              Haptics.impactAsync(Haptics.ImpactFeedbackStyle.Light);
              setShowCustomModal(true);
            }}
          >
            <Text style={[styles.customBtnIcon, { color: theme.colors.muted }]}>+</Text>
            <Text style={[styles.customBtnText, { color: theme.colors.muted }]}>
              Custom Cardio
            </Text>
          </Pressable>
        </View>
      </ScrollView>

      {/* Locke tip modal */}
      <LockeTipModal
        visible={showTipModal}
        modality={tipModalModality}
        onLetsGo={handleTipDismiss}
      />

      {/* Custom cardio modal */}
      <CustomCardioModal
        visible={showCustomModal}
        onStart={handleCustomStart}
        onClose={() => setShowCustomModal(false)}
      />
    </>
  );
}

// ── Styles ────────────────────────────────────────────────────────────────────

const styles = StyleSheet.create({
  scroll: {
    paddingHorizontal: spacing.md,
  },
  header: {
    flexDirection: "row",
    alignItems: "center",
    justifyContent: "space-between",
    marginBottom: spacing.xs,
  },
  backBtn: {
    width: 44,
    height: 44,
    alignItems: "center",
    justifyContent: "center",
  },
  backText: { fontSize: 22, fontWeight: "400" },
  screenTitle: { ...typography.heading, letterSpacing: -0.5 },
  subtitle: {
    ...typography.body,
    marginBottom: spacing.lg,
    textAlign: "center",
  },

  // Preset list
  presetList: {
    gap: spacing.md,
  },
  presetCard: {
    borderWidth: 1,
    borderRadius: radius.lg,
    padding: spacing.md,
    gap: spacing.sm,
  },
  presetTop: {
    flexDirection: "row",
    alignItems: "center",
    gap: spacing.md,
  },
  iconCircle: {
    width: 52,
    height: 52,
    borderRadius: 26,
    alignItems: "center",
    justifyContent: "center",
  },
  presetIcon: {
    fontSize: 28,
  },
  presetInfo: {
    flex: 1,
    gap: 2,
  },
  presetName: {
    fontSize: 16,
    fontWeight: "700",
    letterSpacing: -0.3,
  },
  presetDesc: {
    fontSize: 13,
    lineHeight: 18,
  },
  presetTags: {
    flexDirection: "row",
    gap: spacing.xs,
    marginLeft: 68, // align with text (52 icon + 16 gap)
  },
  tag: {
    paddingHorizontal: spacing.sm + 2,
    paddingVertical: 4,
    borderRadius: radius.full,
    borderWidth: 1,
  },
  tagText: {
    fontSize: 11,
    fontWeight: "700",
    textTransform: "capitalize",
  },

  // Custom button
  customBtn: {
    flexDirection: "row",
    alignItems: "center",
    justifyContent: "center",
    gap: spacing.sm,
    marginTop: spacing.lg,
    paddingVertical: 14,
    borderWidth: 1,
    borderStyle: "dashed",
    borderRadius: radius.lg,
  },
  customBtnIcon: {
    fontSize: 20,
    fontWeight: "300",
  },
  customBtnText: {
    fontSize: 14,
    fontWeight: "600",
  },

  // Shared modal scrim
  modalScrim: {
    flex: 1,
    alignItems: "center",
    justifyContent: "center",
    paddingHorizontal: spacing.lg,
  },

  // Locke tip modal
  tipModal: {
    width: "100%",
    borderRadius: radius.xl,
    padding: spacing.xl,
    alignItems: "center",
    shadowColor: "#000",
    shadowOffset: { width: 0, height: 8 },
    shadowOpacity: 0.25,
    shadowRadius: 24,
    elevation: 12,
  },
  tipMascot: {
    marginBottom: spacing.md,
  },
  tipSetup: {
    ...typography.subheading,
    textAlign: "center",
    marginBottom: spacing.md,
  },
  tipCues: {
    alignSelf: "stretch",
    gap: spacing.sm,
    marginBottom: spacing.lg,
  },
  tipCueRow: {
    flexDirection: "row",
    alignItems: "flex-start",
    gap: spacing.sm,
  },
  tipCueBullet: {
    fontSize: 14,
    fontWeight: "700",
    lineHeight: 21,
    width: 16,
  },
  tipCueText: {
    ...typography.body,
    flex: 1,
    lineHeight: 21,
  },

  // Custom cardio modal
  customModal: {
    width: "100%",
    borderRadius: radius.xl,
    padding: spacing.xl,
    shadowColor: "#000",
    shadowOffset: { width: 0, height: 8 },
    shadowOpacity: 0.25,
    shadowRadius: 24,
    elevation: 12,
  },
  customTitle: {
    ...typography.heading,
    textAlign: "center",
    marginBottom: spacing.lg,
  },
  customSectionLabel: {
    fontSize: 11,
    fontWeight: "700",
    letterSpacing: 1.2,
    textTransform: "uppercase",
    marginBottom: spacing.sm,
  },
  modalityGrid: {
    flexDirection: "row",
    flexWrap: "wrap",
    gap: spacing.xs + 2,
    marginBottom: spacing.lg,
  },
  modalityChip: {
    flexDirection: "row",
    alignItems: "center",
    gap: 4,
    paddingVertical: 6,
    paddingHorizontal: 10,
    borderRadius: radius.full,
    borderWidth: 1,
  },
  modalityChipIcon: { fontSize: 16 },
  modalityChipLabel: { fontSize: 12, fontWeight: "600" },

  // RPE pills
  rpePillRow: {
    flexDirection: "row",
    gap: spacing.xs,
    marginBottom: spacing.xl,
  },
  rpePill: {
    flex: 1,
    paddingVertical: spacing.sm + 2,
    borderRadius: radius.full,
    borderWidth: 1.5,
    alignItems: "center",
    justifyContent: "center",
  },
  rpePillText: {
    fontSize: 12,
    fontWeight: "700",
    textAlign: "center",
  },

  // Custom actions
  customActions: {
    gap: spacing.sm,
  },
  customCancel: {
    alignItems: "center",
    paddingVertical: spacing.sm,
  },
  customCancelText: {
    fontSize: 14,
    fontWeight: "500",
  },
});
