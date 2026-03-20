import { useState, useEffect, useCallback, useRef, useMemo } from "react";
import {
  View,
  Text,
  ScrollView,
  Pressable,
  StyleSheet,
  Modal,
  Image,
  LayoutAnimation,
  Platform,
  UIManager,
} from "react-native";
import Animated, {
  useSharedValue,
  useAnimatedStyle,
  withSpring,
  withTiming,
  withSequence,
  withRepeat,
  Easing,
} from "react-native-reanimated";
import { useSafeAreaInsets } from "react-native-safe-area-context";
import { useRouter } from "expo-router";
import { Ionicons } from "@expo/vector-icons";
import { useAppTheme } from "../contexts/ThemeContext";
import { BackButton } from "../components/BackButton";
import { useLockeStudio } from "../hooks/useLockeStudio";
import { useFangs } from "../hooks/useFangs";
import { LockePreview } from "../components/social/LockePreview";
import { LockeAvatarBuilder } from "../components/avatar/LockeAvatarBuilder";
import { FangsDisplay } from "../components/social/FangsDisplay";
import {
  getStudioTabs,
  isUnlocked,
  getActiveItemId,
  RARITY_COLORS,
  getCosmeticsByCategory,
} from "../lib/lockeCustomization";
import { spacing, typography, radius } from "../lib/theme";
import { impact, notification, ImpactStyle, NotificationType } from "../lib/haptics";
import { useSeasonalShop } from "../hooks/useSeasonalShop";
import { useXP } from "../hooks/useXP";
import { SeasonalShopSection } from "../components/social/SeasonalShopSection";
import { PrestigeShopSection } from "../components/social/PrestigeShopSection";
import type { CosmeticCategory, CosmeticItem, RankLevel, LockeCustomization } from "../lib/types";

if (Platform.OS === "android" && UIManager.setLayoutAnimationEnabledExperimental) {
  UIManager.setLayoutAnimationEnabledExperimental(true);
}

const AnimatedPressable = Animated.createAnimatedComponent(Pressable);

const DEV_RANKS: RankLevel[] = ["Runt", "Scout", "Stalker", "Hunter", "Sentinel", "Alpha", "Apex"];

/** Tab icons */
const TAB_ICONS: Record<string, keyof typeof Ionicons.glyphMap> = {
  fur: "paw-outline",
  face: "eye-outline",
  gear: "shield-outline",
  auras: "sparkles-outline",
};

/** Human-readable labels for customization summary */
const VARIANT_LABELS: Record<string, string> = {
  brown: "Brown", black: "Black", arctic_white: "Arctic White", merle: "Merle",
  green: "Green", blue: "Blue", red: "Red", purple: "Purple",
  neutral: "Classic", happy: "Arched", angry: "Fierce",
  smile: "Smile", smirk: "Smirk",
  flower_crown: "Flower Crown",
  apex_crown: "Apex Crown",
  scout_bandana: "Scout Bandana",
  collar_diamond: "Diamond", collar_round: "Round", collar_spikes: "Spikes",
  earring_left: "Right Earring", earring_right: "Left Earring",
};

/** Preview swatch colors for layer-swap variants */
const SWATCH_COLORS: Record<string, string> = {
  "": "#TRANSPARENT",
  brown: "#8B5E3C", black: "#2A2A2A", arctic_white: "#E8E8E8", merle: "#9B8BA0",
  green: "#2E8B57", blue: "#3A8DFF", red: "#DC143C", purple: "#7B3FA0",
  neutral: "#808080", happy: "#4CAF50", angry: "#E53935",
  smile: "#4CAF50", smirk: "#FF9800",
  yellow: "#FFD54A",
};

/** Thumbnail images for accessories and auras */
const PREVIEW_THUMBNAILS: Record<string, ReturnType<typeof require>> = {
  collar_diamond: require("../assets/avatar/thumbnails/collar_diamond.png"),
  collar_round:   require("../assets/avatar/thumbnails/collar_round.png"),
  collar_spikes:   require("../assets/avatar/thumbnails/collar_spikes.png"),
  scout_bandana:   require("../assets/avatar/thumbnails/scout_bandana.png"),
  flower_crown:  require("../assets/avatar/thumbnails/flower_crown.png"),
  apex_crown:    require("../assets/avatar/thumbnails/apex_crown.png"),
  earring_left:  require("../assets/avatar/thumbnails/earring_left.png"),
  earring_right: require("../assets/avatar/thumbnails/earring_right.png"),
  blue:   require("../assets/avatar/thumbnails/aura_blue.png"),
  green:  require("../assets/avatar/thumbnails/aura_green.png"),
  purple: require("../assets/avatar/thumbnails/aura_purple.png"),
  red:    require("../assets/avatar/thumbnails/aura_red.png"),
  yellow: require("../assets/avatar/thumbnails/aura_yellow.png"),
};

/** Fur texture swatches */
const FUR_BODY_THUMBNAILS: Record<string, ReturnType<typeof require>> = {
  brown:        require("../assets/avatar/thumbnails/fur_body_brown.png"),
  black:        require("../assets/avatar/thumbnails/fur_body_black.png"),
  arctic_white: require("../assets/avatar/thumbnails/fur_body_arctic_white.png"),
  merle:        require("../assets/avatar/thumbnails/fur_body_merle.png"),
};

const FUR_HEAD_THUMBNAILS: Record<string, ReturnType<typeof require>> = {
  brown:        require("../assets/avatar/thumbnails/fur_head_brown.png"),
  black:        require("../assets/avatar/thumbnails/fur_head_black.png"),
  arctic_white: require("../assets/avatar/thumbnails/fur_head_arctic_white.png"),
  merle:        require("../assets/avatar/thumbnails/fur_head_merle.png"),
};

const EYES_THUMBNAILS: Record<string, ReturnType<typeof require>> = {
  green:  require("../assets/avatar/thumbnails/eyes_green.png"),
  blue:   require("../assets/avatar/thumbnails/eyes_blue.png"),
  red:    require("../assets/avatar/thumbnails/eyes_red.png"),
  purple: require("../assets/avatar/thumbnails/eyes_purple.png"),
};

const BROWS_THUMBNAILS: Record<string, ReturnType<typeof require>> = {
  neutral: require("../assets/avatar/thumbnails/brows_neutral.png"),
  happy:   require("../assets/avatar/thumbnails/brows_happy.png"),
  angry:   require("../assets/avatar/thumbnails/brows_angry.png"),
};

const MOUTH_THUMBNAILS: Record<string, ReturnType<typeof require>> = {
  neutral: require("../assets/avatar/thumbnails/mouth_neutral.png"),
  smile:   require("../assets/avatar/thumbnails/mouth_smile.png"),
  smirk:   require("../assets/avatar/thumbnails/mouth_smirk.png"),
};

const shadowLight = {
  shadowColor: "#000",
  shadowOffset: { width: 0, height: 1 },
  shadowOpacity: 0.08,
  shadowRadius: 3,
  elevation: 2,
};

// ── Helpers ──────────────────────────────────────────────────────────────────

function customizationsEqual(a: LockeCustomization, b: LockeCustomization): boolean {
  return a.bodyFur === b.bodyFur && a.headFur === b.headFur && a.eyes === b.eyes
    && a.brows === b.brows && a.noseMouth === b.noseMouth
    && a.headAccessory === b.headAccessory && a.neckAccessory === b.neckAccessory
    && a.earAccessory === b.earAccessory && a.aura === b.aura;
}

function countChanges(a: LockeCustomization, b: LockeCustomization): number {
  let n = 0;
  if (a.bodyFur !== b.bodyFur) n++;
  if (a.headFur !== b.headFur) n++;
  if (a.eyes !== b.eyes) n++;
  if (a.brows !== b.brows) n++;
  if (a.noseMouth !== b.noseMouth) n++;
  if (a.headAccessory !== b.headAccessory) n++;
  if (a.neckAccessory !== b.neckAccessory) n++;
  if (a.earAccessory !== b.earAccessory) n++;
  if (a.aura !== b.aura) n++;
  return n;
}

// ── Grid Item Card ──────────────────────────────────────────────────────────

function GridItemCard({
  item, isActive, owned, rarityColor, section, theme, onPress,
}: {
  item: CosmeticItem; isActive: boolean; owned: boolean; rarityColor?: string;
  section: { category: CosmeticCategory }; theme: any; onPress: () => void;
}) {
  const scale = useSharedValue(1);
  const animStyle = useAnimatedStyle(() => ({ transform: [{ scale: scale.value }] }));

  const handlePressIn = useCallback(() => {
    scale.value = withSpring(0.95, { damping: 15, stiffness: 300 });
  }, []);
  const handlePressOut = useCallback(() => {
    scale.value = withSpring(1, { damping: 12, stiffness: 200 });
  }, []);

  const activeGlow = isActive
    ? { shadowColor: theme.colors.primary, shadowOffset: { width: 0, height: 0 }, shadowOpacity: 0.4, shadowRadius: 10, elevation: 8 }
    : shadowLight;

  const isFurNone = item.preview === "" && (section.category === "body_fur" || section.category === "head_fur");
  const isThumbnail = item.preview !== "" && (section.category === "head_accessory" || section.category === "neck_accessory" || section.category === "ear_accessory" || section.category === "aura") && PREVIEW_THUMBNAILS[item.preview];
  const layerThumb = section.category === "body_fur" ? FUR_BODY_THUMBNAILS[item.preview]
    : section.category === "head_fur" ? FUR_HEAD_THUMBNAILS[item.preview]
    : section.category === "eyes" ? EYES_THUMBNAILS[item.preview]
    : section.category === "brows" ? BROWS_THUMBNAILS[item.preview]
    : section.category === "nose_mouth" ? MOUTH_THUMBNAILS[item.preview]
    : null;

  return (
    <AnimatedPressable
      style={[
        styles.gridItem, animStyle, activeGlow,
        {
          backgroundColor: isActive ? theme.colors.primary + "12" : theme.colors.surface,
          borderColor: isActive ? theme.colors.primary : theme.colors.border + "80",
          borderWidth: isActive ? 2 : 1,
        },
      ]}
      onPress={onPress}
      onPressIn={handlePressIn}
      onPressOut={handlePressOut}
    >
      {/* Lock overlay for unowned items */}
      {!owned && (
        <View style={[StyleSheet.absoluteFill, { backgroundColor: "rgba(0,0,0,0.25)", borderRadius: radius.md, zIndex: 1 }]}>
          <View style={styles.lockBadge}>
            <Ionicons name="lock-closed" size={12} color="#fff" />
          </View>
        </View>
      )}

      {/* Preview */}
      {isFurNone ? (
        <Image source={require("../assets/avatar/layers/base/master_base.png")} style={styles.thumbnail} resizeMode="contain" />
      ) : isThumbnail ? (
        <Image source={PREVIEW_THUMBNAILS[item.preview]} style={styles.thumbnail} resizeMode="contain" />
      ) : layerThumb ? (
        <Image source={layerThumb} style={[styles.furSwatch, { opacity: owned ? 1 : 0.5 }]} resizeMode="cover" />
      ) : (
        <View style={[styles.colorBar, {
          backgroundColor: item.preview === "" ? "transparent" : (SWATCH_COLORS[item.preview] ?? theme.colors.border),
          opacity: owned ? 1 : 0.5,
        }]}>
          {item.preview === "" && (
            <View style={{ width: 20, height: 1.5, backgroundColor: theme.colors.muted + "80", transform: [{ rotate: "45deg" }] }} />
          )}
        </View>
      )}

      <Text
        style={[typography.caption, {
          color: isActive ? theme.colors.text : theme.colors.text + "CC",
          fontWeight: "600", textAlign: "center", marginTop: 2,
        }]}
        numberOfLines={1}
      >
        {item.name}
      </Text>

      {rarityColor && (
        <Text style={{ fontSize: 9, fontWeight: "800", letterSpacing: 1, color: rarityColor, textAlign: "center", marginTop: 1 }}>
          {item.rarity.toUpperCase()}
        </Text>
      )}

      {owned ? (
        <View style={[styles.ownedBadge, { backgroundColor: theme.colors.success + "18" }]}>
          <Text style={[styles.ownedText, { color: theme.colors.success }]}>Owned</Text>
        </View>
      ) : (
        <View style={[styles.priceBadge, { backgroundColor: "#FFD70015" }]}>
          <View style={{ flexDirection: "row", alignItems: "center", gap: 2 }}><Ionicons name="flash" size={10} color="#FFD700" /><Text style={[styles.priceText, { color: "#FFD700" }]}>{item.price}</Text></View>
        </View>
      )}

      {isActive && (
        <View style={[styles.activeCheck, { backgroundColor: theme.colors.primary }]}>
          <Ionicons name="checkmark" size={10} color={theme.colors.primaryText} />
        </View>
      )}
    </AnimatedPressable>
  );
}

// ── Main Screen ─────────────────────────────────────────────────────────────

export default function LockeStudioScreen() {
  const insets = useSafeAreaInsets();
  const router = useRouter();
  const { theme } = useAppTheme();
  const {
    customization, ownedItems, loading, selectItem, purchaseItem, save, reset,
  } = useLockeStudio();
  const { balance, refresh: refreshFangs } = useFangs();
  const { rank: realRank } = useXP();
  const [devRank, setDevRank] = useState<typeof realRank>(realRank);
  const rank = __DEV__ ? devRank : realRank;
  const { seasonalItems, prestigeItems, ownedIds: shopOwnedIds, purchase: purchaseSeasonal } = useSeasonalShop(rank);
  const studioTabs = getStudioTabs();
  const [activeTabKey, setActiveTabKey] = useState(studioTabs[0]?.key ?? "fur");

  // ── Themed alert modal ──────────────────────────────────────────────────────
  const [alertModal, setAlertModal] = useState<{
    title: string;
    message: string;
    buttons: { text: string; onPress?: () => void; destructive?: boolean }[];
  } | null>(null);

  function showAlert(
    title: string,
    message: string,
    buttons?: { text: string; onPress?: () => void; style?: string }[],
  ) {
    const mapped = (buttons ?? [{ text: "OK" }]).map((b) => ({
      text: b.text,
      onPress: b.onPress,
      destructive: b.style === "destructive",
    }));
    setAlertModal({ title, message, buttons: mapped });
  }

  // ── Unsaved changes tracking ──────────────────────────────────────────────
  const [savedSnapshot, setSavedSnapshot] = useState<LockeCustomization>(customization);
  const hasChanges = !customizationsEqual(customization, savedSnapshot);
  const changeCount = countChanges(customization, savedSnapshot);

  // Update snapshot when loading finishes
  useEffect(() => {
    if (!loading) setSavedSnapshot(customization);
  }, [loading]);

  // ── Undo history ──────────────────────────────────────────────────────────
  const [history, setHistory] = useState<LockeCustomization[]>([]);
  const skipHistoryPush = useRef(false);
  const prevCustomizationForHistory = useRef(customization);

  useEffect(() => {
    if (skipHistoryPush.current) {
      skipHistoryPush.current = false;
      prevCustomizationForHistory.current = customization;
      return;
    }
    if (prevCustomizationForHistory.current !== customization && !loading) {
      setHistory((h) => [...h.slice(-19), prevCustomizationForHistory.current]);
      prevCustomizationForHistory.current = customization;
    }
  }, [customization, loading]);

  // ── Preview bounce animation ──────────────────────────────────────────────
  const previewScale = useSharedValue(1);
  const prevCustomization = useRef(customization);

  useEffect(() => {
    if (prevCustomization.current !== customization) {
      prevCustomization.current = customization;
      previewScale.value = withSequence(
        withTiming(1.04, { duration: 120, easing: Easing.out(Easing.ease) }),
        withSpring(1, { damping: 10, stiffness: 200 }),
      );
    }
  }, [customization]);

  const previewAnimStyle = useAnimatedStyle(() => ({
    transform: [{ scale: previewScale.value }],
  }));

  // ── Customization summary chips ───────────────────────────────────────────
  const summaryChips = useMemo(() => {
    const chips: { label: string; color: string }[] = [];
    if (customization.bodyFur) chips.push({ label: VARIANT_LABELS[customization.bodyFur] ?? customization.bodyFur, color: SWATCH_COLORS[customization.bodyFur] ?? "#888" });
    if (customization.eyes) chips.push({ label: (VARIANT_LABELS[customization.eyes] ?? customization.eyes) + " Eyes", color: SWATCH_COLORS[customization.eyes] ?? "#888" });
    if (customization.headAccessory) chips.push({ label: VARIANT_LABELS[customization.headAccessory] ?? "Crown", color: "#FF69B4" });
    if (customization.neckAccessory) chips.push({ label: VARIANT_LABELS[customization.neckAccessory] ?? "Collar", color: "#FFD700" });
    if (customization.aura) chips.push({ label: (VARIANT_LABELS[customization.aura] ?? customization.aura) + " Aura", color: SWATCH_COLORS[customization.aura] ?? "#888" });
    return chips;
  }, [customization]);

  // Dev: seed Fangs for testing
  useEffect(() => {
    if (__DEV__) {
      (async () => {
        const { saveFangs } = await import("../lib/storage");
        await saveFangs({ balance: 99999, lastUpdated: new Date().toISOString() });
        refreshFangs();
      })();
    }
  }, []);

  // ── Randomize ─────────────────────────────────────────────────────────────
  function handleRandomize() {
    impact(ImpactStyle.Medium);
    const categories: CosmeticCategory[] = [
      "body_fur", "head_fur", "eyes", "brows", "nose_mouth",
      "head_accessory", "neck_accessory", "ear_accessory", "aura",
    ];
    const optionalCats = ["head_accessory", "neck_accessory", "ear_accessory", "aura"];
    for (const cat of categories) {
      const isOptional = optionalCats.includes(cat);
      const items = getCosmeticsByCategory(cat)
        .filter((i) => (isUnlocked(i.id, ownedItems) || i.price === 0) && (isOptional || i.preview !== ""));
      if (items.length === 0) continue;
      // Optional categories: 30% chance of "none"
      if (isOptional && Math.random() < 0.3) {
        selectItem(cat, "");
        continue;
      }
      const pick = items[Math.floor(Math.random() * items.length)];
      selectItem(cat, pick.preview);
    }
  }

  // ── Handlers ──────────────────────────────────────────────────────────────

  async function handleItemPress(item: CosmeticItem, category: CosmeticCategory) {
    impact(ImpactStyle.Light);
    if (isUnlocked(item.id, ownedItems) || item.price === 0) {
      selectItem(category, item.preview);
      return;
    }
    if (balance < item.price) {
      showAlert("Not Enough Fangs", `You need ${item.price} Fangs to unlock ${item.name}. You have ${balance}.\n\nEarn Fangs by completing workouts, hitting streaks, and finishing quests.`);
      return;
    }
    showAlert("Unlock " + item.name, `Spend ${item.price} Fangs to unlock ${item.name}?`, [
      { text: "Cancel", style: "cancel" },
      {
        text: "Unlock",
        onPress: async () => {
          const success = await purchaseItem(item.id);
          if (success) {
            notification(NotificationType.Success);
            selectItem(category, item.preview);
            refreshFangs();
          } else {
            showAlert("Error", "Purchase failed. Please try again.");
          }
        },
      },
    ]);
  }

  function handleTabChange(key: string) {
    LayoutAnimation.configureNext(LayoutAnimation.Presets.easeInEaseOut);
    setActiveTabKey(key);
    impact(ImpactStyle.Light);
  }

  const REQUIRED_SLOTS = ["bodyFur", "headFur", "eyes", "brows", "noseMouth"] as const;
  const missingSlots = REQUIRED_SLOTS.filter((k) => customization[k] === null);
  const canSave = hasChanges && missingSlots.length === 0;

  const [saving, setSaving] = useState(false);
  async function handleSave() {
    if (saving) return;
    if (missingSlots.length > 0) {
      const labels: Record<string, string> = { bodyFur: "Body Fur", headFur: "Head Fur", eyes: "Eyes", brows: "Eyebrows", noseMouth: "Mouth" };
      const missing = missingSlots.map((k) => labels[k]).join(", ");
      showAlert("Incomplete Avatar", `Select a style for: ${missing}`);
      return;
    }
    if (!hasChanges) return;
    setSaving(true);
    impact(ImpactStyle.Medium);
    await save();

    setSavedSnapshot(customization);
    setHistory([]);
    notification(NotificationType.Success);
    // Celebration bounce
    previewScale.value = withSequence(
      withTiming(1.1, { duration: 150 }),
      withSpring(1, { damping: 8, stiffness: 200 }),
    );
    setTimeout(() => {
      setSaving(false);
      router.back();
    }, 600);
  }

  function handleUndo() {
    if (history.length === 0) return;
    impact(ImpactStyle.Light);
    skipHistoryPush.current = true;
    const prev = history[history.length - 1];
    setHistory((h) => h.slice(0, -1));
    // Apply each field
    if (prev.bodyFur !== customization.bodyFur) selectItem("body_fur", prev.bodyFur ?? "");
    if (prev.headFur !== customization.headFur) selectItem("head_fur", prev.headFur ?? "");
    if (prev.eyes !== customization.eyes) selectItem("eyes", prev.eyes ?? "");
    if (prev.brows !== customization.brows) selectItem("brows", prev.brows ?? "");
    if (prev.noseMouth !== customization.noseMouth) selectItem("nose_mouth", prev.noseMouth ?? "");
    if (prev.headAccessory !== customization.headAccessory) selectItem("head_accessory", prev.headAccessory ?? "");
    if (prev.neckAccessory !== customization.neckAccessory) selectItem("neck_accessory", prev.neckAccessory ?? "");
    if (prev.earAccessory !== customization.earAccessory) selectItem("ear_accessory", prev.earAccessory ?? "");
    if (prev.aura !== customization.aura) selectItem("aura", prev.aura ?? "");
  }

  function handleReset() {
    if (!hasChanges) return;
    impact(ImpactStyle.Light);
    if (changeCount >= 3) {
      showAlert("Reset Changes?", `You have ${changeCount} unsaved changes. Reset everything?`, [
        { text: "Cancel", style: "cancel" },
        { text: "Reset", style: "destructive", onPress: () => { skipHistoryPush.current = true; reset(); setHistory([]); } },
      ]);
    } else {
      skipHistoryPush.current = true;
      reset();
      setHistory([]);
    }
  }

  if (loading) return <View style={[styles.container, { backgroundColor: theme.colors.bg }]} />;

  const activeTab = studioTabs.find((t) => t.key === activeTabKey) ?? studioTabs[0];

  function renderTabContent() {
    return (
      <>
        {activeTab.sections.map((section) => {
          const activeId = getActiveItemId(customization, section.category);
          return (
            <View key={section.category}>
              <View style={styles.sectionLabelRow}>
                <View style={[styles.sectionAccent, { backgroundColor: theme.colors.primary + "60" }]} />
                <Text style={[styles.sectionLabel, { color: theme.colors.muted }]}>{section.label}</Text>
              </View>
              <View style={styles.grid}>
                {section.items.map((item) => {
                  const owned = isUnlocked(item.id, ownedItems) || item.price === 0;
                  const isActive = item.id === activeId;
                  const rarityColor = item.rarity ? RARITY_COLORS[item.rarity] : undefined;
                  return (
                    <GridItemCard
                      key={item.id} item={item} isActive={isActive} owned={owned}
                      rarityColor={rarityColor} section={section} theme={theme}
                      onPress={() => handleItemPress(item, section.category)}
                    />
                  );
                })}
              </View>
            </View>
          );
        })}

        {activeTabKey === "gear" && (
          <View>
            <SeasonalShopSection
              items={seasonalItems.filter((i) => i.category === "neck_accessory" || i.category === "ear_accessory" || i.category === "head_accessory")}
              ownedIds={shopOwnedIds}
              equippedIds={[customization.headAccessory, customization.neckAccessory, customization.earAccessory].filter(Boolean) as string[]}
              onPurchase={(itemId) => {
                const item = seasonalItems.find((i) => i.id === itemId);
                if (!item) return;
                showAlert(`Unlock ${item.name}`, `Spend ${item.price} Fangs to unlock ${item.name}?`, [
                  { text: "Cancel", style: "cancel" },
                  { text: "Unlock", onPress: async () => {
                    const result = await purchaseSeasonal(itemId);
                    if (result.success) { notification(NotificationType.Success); selectItem(item.category as CosmeticCategory, item.preview ?? itemId); refreshFangs(); }
                    else if (result.error) showAlert("Cannot Purchase", result.error);
                  }},
                ]);
              }}
              onEquip={(itemId) => { impact(ImpactStyle.Light); const item = seasonalItems.find((i) => i.id === itemId); if (item) selectItem(item.category as CosmeticCategory, item.preview ?? itemId); }}
            />
            <PrestigeShopSection
              items={prestigeItems.filter((i) => i.category === "head_accessory" || i.category === "neck_accessory" || i.category === "ear_accessory")}
              ownedIds={shopOwnedIds}
              equippedIds={[customization.headAccessory, customization.neckAccessory, customization.earAccessory].filter(Boolean) as string[]}
              currentRank={rank}
              onPurchase={(itemId) => {
                const item = prestigeItems.find((i) => i.id === itemId);
                if (!item) return;
                showAlert(`Unlock ${item.name}`, `Spend ${item.price} Fangs to unlock ${item.name}?`, [
                  { text: "Cancel", style: "cancel" },
                  { text: "Unlock", onPress: async () => {
                    const result = await purchaseSeasonal(itemId);
                    if (result.success) { notification(NotificationType.Success); selectItem(item.category as CosmeticCategory, item.preview ?? itemId); refreshFangs(); }
                    else if (result.error) showAlert("Cannot Purchase", result.error);
                  }},
                ]);
              }}
              onEquip={(itemId) => { impact(ImpactStyle.Light); const item = prestigeItems.find((i) => i.id === itemId); if (item) selectItem(item.category as CosmeticCategory, item.preview ?? itemId); }}
            />
          </View>
        )}
      </>
    );
  }

  return (
    <View style={[styles.container, { backgroundColor: theme.colors.bg, paddingTop: insets.top }]}>
      {/* ── Header ──────────────────────────────────────────────────────────── */}
      <View style={[styles.header, { borderBottomColor: theme.colors.border + "30" }]}>
        <BackButton />
        <View style={{ flex: 1, alignItems: "center" }}>
          <Text style={[styles.headerTitle, { color: theme.colors.text }]}>AVATAR STUDIO</Text>
          <Text style={[styles.headerSubtitle, { color: theme.colors.muted }]}>Customize Your Wolf</Text>
        </View>
        <FangsDisplay balance={__DEV__ ? 99999 : balance} size="sm" showInfo />
      </View>

      {/* Dev rank selector */}
      {__DEV__ && (
        <ScrollView horizontal showsHorizontalScrollIndicator={false} style={{ flexGrow: 0, marginHorizontal: spacing.md, marginBottom: 4 }}>
          {DEV_RANKS.map((r) => (
            <Pressable key={r} onPress={() => setDevRank(r)} style={{
              paddingHorizontal: 10, paddingVertical: 4, borderRadius: radius.full,
              backgroundColor: r === devRank ? "#FF980030" : theme.colors.mutedBg,
              borderWidth: r === devRank ? 1 : 0, borderColor: "#FF9800", marginRight: 6,
            }}>
              <Text style={{ color: r === devRank ? "#FF9800" : theme.colors.muted, fontSize: 11, fontWeight: "700" }}>{r}</Text>
            </Pressable>
          ))}
        </ScrollView>
      )}

      {/* ── Preview ─────────────────────────────────────────────────────────── */}
      <View style={[styles.previewSection, { backgroundColor: "#F5F0E8" }]}>
        <View style={[styles.previewGlow, { backgroundColor: theme.colors.primary + "08" }]} />
        <Animated.View style={previewAnimStyle}>
          <LockePreview size={180} customization={customization} />
        </Animated.View>

        {/* Randomize button */}
        <Pressable style={[styles.randomizeBtn, { backgroundColor: theme.colors.surface, borderColor: theme.colors.border + "60" }]} onPress={handleRandomize}>
          <Text style={{ fontSize: 13 }}>{"\uD83C\uDFB2"}</Text>
        </Pressable>

        {/* Unsaved changes indicator */}
        {hasChanges && (
          <View style={[styles.unsavedPill, { backgroundColor: theme.colors.primary + "20" }]}>
            <Text style={{ color: theme.colors.primary, fontSize: 10, fontWeight: "700" }}>
              {changeCount} unsaved {changeCount === 1 ? "change" : "changes"}
            </Text>
          </View>
        )}
      </View>

      {/* Summary chips */}
      {summaryChips.length > 0 && (
        <ScrollView horizontal showsHorizontalScrollIndicator={false} style={{ flexGrow: 0 }} contentContainerStyle={styles.chipsContainer}>
          {summaryChips.map((chip, i) => (
            <View key={i} style={[styles.chip, { backgroundColor: theme.colors.surface, borderColor: theme.colors.border + "40" }]}>
              <View style={[styles.chipDot, { backgroundColor: chip.color }]} />
              <Text style={[styles.chipText, { color: theme.colors.text + "CC" }]}>{chip.label}</Text>
            </View>
          ))}
        </ScrollView>
      )}

      {/* ── Tab bar ─────────────────────────────────────────────────────────── */}
      <View style={[styles.tabBarWrapper, { paddingHorizontal: spacing.md }]}>
          <View style={[styles.tabBar, { backgroundColor: theme.colors.surface, borderColor: theme.colors.border + "40" }]}>
            {studioTabs.map((tab) => {
              const isActiveTab = activeTabKey === tab.key;
              const icon = TAB_ICONS[tab.key];
              return (
                <Pressable
                  key={tab.key}
                  style={[styles.tab, isActiveTab && [styles.tabActive, { backgroundColor: theme.colors.primary }]]}
                  onPress={() => handleTabChange(tab.key)}
                >
                  <View style={{ flexDirection: "row", alignItems: "center", gap: 4 }}>
                    {icon && <Ionicons name={icon} size={14} color={isActiveTab ? theme.colors.primaryText : theme.colors.muted} />}
                    <Text style={[styles.tabText, { color: isActiveTab ? theme.colors.primaryText : theme.colors.muted }]}>
                      {tab.label}
                    </Text>
                  </View>
                </Pressable>
              );
            })}
          </View>
      </View>

      {/* ── Grid content ────────────────────────────────────────────────────── */}
      <ScrollView style={styles.gridScroll} contentContainerStyle={styles.gridContent} showsVerticalScrollIndicator={false}>
        {renderTabContent()}
      </ScrollView>

      {/* ── Bottom action bar ───────────────────────────────────────────────── */}
      <View style={[styles.bottomBar, {
        paddingBottom: insets.bottom + spacing.sm,
        backgroundColor: theme.colors.surface,
        borderTopColor: theme.colors.border + "40",
      }]}>
        {/* Undo / Reset */}
        {history.length > 0 ? (
          <View style={{ flexDirection: "row", gap: spacing.xs }}>
            <Pressable style={[styles.resetBtn, { borderColor: theme.colors.border }]} onPress={handleUndo}>
              <View style={{ flexDirection: "row", alignItems: "center", gap: 4 }}><Ionicons name="arrow-undo-outline" size={14} color={theme.colors.text} /><Text style={[styles.resetBtnText, { color: theme.colors.text }]}>Undo</Text></View>
            </Pressable>
            {hasChanges && (
              <Pressable style={[styles.resetBtn, { borderColor: theme.colors.border }]} onPress={handleReset}>
                <Text style={[styles.resetBtnText, { color: theme.colors.muted }]}>Reset</Text>
              </Pressable>
            )}
          </View>
        ) : (
          <Pressable
            style={[styles.resetBtn, { borderColor: theme.colors.border, opacity: hasChanges ? 1 : 0.4 }]}
            onPress={handleReset}
            disabled={!hasChanges}
          >
            <Text style={[styles.resetBtnText, { color: theme.colors.muted }]}>Reset</Text>
          </Pressable>
        )}

        {/* Save */}
        <Pressable
          style={[styles.saveBtn, {
            backgroundColor: canSave ? theme.colors.primary : theme.colors.primary + "40",
          }]}
          onPress={handleSave}
          disabled={!canSave || saving}
        >
          <Text style={[styles.saveBtnText, { color: theme.colors.primaryText }]}>
            {saving ? "Saving..." : canSave ? "Save & Apply" : hasChanges ? "Select Required" : "No Changes"}
          </Text>
        </Pressable>
      </View>

      {/* ── Themed Alert Modal ─────────────────────────────────────────────── */}
      <Modal visible={!!alertModal} transparent animationType="fade" onRequestClose={() => setAlertModal(null)}>
        <Pressable style={styles.alertOverlay} onPress={() => setAlertModal(null)}>
          <View style={[styles.alertCard, { backgroundColor: theme.colors.surface }]} onStartShouldSetResponder={() => true}>
            <Text style={[styles.alertTitle, { color: theme.colors.text }]}>
              {alertModal?.title}
            </Text>
            <Text style={[styles.alertMessage, { color: theme.colors.muted }]}>
              {alertModal?.message}
            </Text>
            <View style={styles.alertButtons}>
              {alertModal?.buttons.map((btn, i) => (
                <Pressable
                  key={i}
                  style={[
                    styles.alertBtn,
                    {
                      backgroundColor: btn.destructive
                        ? theme.colors.danger + "20"
                        : i === (alertModal.buttons.length - 1)
                          ? theme.colors.primary
                          : theme.colors.mutedBg,
                    },
                  ]}
                  onPress={() => {
                    setAlertModal(null);
                    btn.onPress?.();
                  }}
                >
                  <Text
                    style={[
                      styles.alertBtnText,
                      {
                        color: btn.destructive
                          ? theme.colors.danger
                          : i === (alertModal.buttons.length - 1)
                            ? theme.colors.primaryText
                            : theme.colors.text,
                      },
                    ]}
                  >
                    {btn.text}
                  </Text>
                </Pressable>
              ))}
            </View>
          </View>
        </Pressable>
      </Modal>
    </View>
  );
}

const styles = StyleSheet.create({
  container: { flex: 1 },

  /* ── Header ──────────────────────────────────────────────────────────────── */
  header: {
    flexDirection: "row",
    alignItems: "center",
    paddingHorizontal: spacing.md,
    paddingVertical: spacing.sm,
    gap: spacing.sm,
    borderBottomWidth: StyleSheet.hairlineWidth,
  },
  headerTitle: {
    fontSize: 16,
    fontWeight: "800",
    letterSpacing: 2.5,
  },
  headerSubtitle: {
    fontSize: 11,
    fontWeight: "500",
    marginTop: 1,
  },

  /* ── Preview ─────────────────────────────────────────────────────────────── */
  previewSection: {
    alignItems: "center",
    justifyContent: "center",
    paddingVertical: spacing.md,
    borderRadius: radius.xl,
    marginHorizontal: spacing.md,
    marginBottom: spacing.sm,
    overflow: "visible",
    position: "relative",
  },
  previewGlow: {
    position: "absolute",
    width: 200,
    height: 200,
    borderRadius: 100,
    top: "50%",
    left: "50%",
    marginTop: -100,
    marginLeft: -100,
  },
  randomizeBtn: {
    position: "absolute",
    top: spacing.sm,
    right: spacing.sm,
    width: 36,
    height: 36,
    borderRadius: 18,
    alignItems: "center",
    justifyContent: "center",
    borderWidth: 1,
  },
  unsavedPill: {
    position: "absolute",
    bottom: spacing.sm,
    paddingHorizontal: 10,
    paddingVertical: 3,
    borderRadius: radius.full,
  },

  /* ── Summary chips ───────────────────────────────────────────────────────── */
  chipsContainer: {
    paddingHorizontal: spacing.md,
    paddingBottom: spacing.sm,
    gap: 6,
  },
  chip: {
    flexDirection: "row",
    alignItems: "center",
    paddingHorizontal: 10,
    paddingVertical: 4,
    borderRadius: radius.full,
    borderWidth: 1,
    gap: 5,
  },
  chipDot: {
    width: 6,
    height: 6,
    borderRadius: 3,
  },
  chipText: {
    fontSize: 11,
    fontWeight: "600",
  },

  /* ── Tab bar ─────────────────────────────────────────────────────────────── */
  tabBarWrapper: {
    marginBottom: spacing.sm,
  },
  tabBarScrollContent: {
    paddingHorizontal: spacing.md,
  },
  tabBar: {
    flexDirection: "row",
    borderRadius: radius.full,
    padding: 3,
    borderWidth: 1,
  },
  tab: {
    flex: 1,
    paddingVertical: 8,
    borderRadius: radius.full,
    alignItems: "center",
    justifyContent: "center",
  },
  tabActive: {
    shadowColor: "#000",
    shadowOffset: { width: 0, height: 2 },
    shadowOpacity: 0.2,
    shadowRadius: 4,
    elevation: 4,
  },
  tabText: {
    fontSize: 13,
    fontWeight: "700",
    letterSpacing: 0.2,
  },

  /* ── Section labels ──────────────────────────────────────────────────────── */
  sectionLabelRow: {
    flexDirection: "row",
    alignItems: "center",
    marginTop: spacing.md,
    marginBottom: spacing.sm,
    gap: spacing.sm,
  },
  sectionAccent: {
    width: 3,
    height: 14,
    borderRadius: 2,
  },
  sectionLabel: {
    fontSize: 12,
    fontWeight: "700",
    textTransform: "uppercase",
    letterSpacing: 1,
  },

  /* ── Grid ─────────────────────────────────────────────────────────────────── */
  gridScroll: { flex: 1 },
  gridContent: {
    paddingHorizontal: spacing.md,
    paddingBottom: spacing.lg,
  },
  grid: {
    flexDirection: "row",
    flexWrap: "wrap",
    gap: 10,
  },
  gridItem: {
    width: "31%",
    aspectRatio: 0.82,
    borderRadius: radius.md,
    alignItems: "center",
    justifyContent: "center",
    padding: spacing.sm,
    position: "relative",
    overflow: "hidden",
  },
  activeCheck: {
    position: "absolute",
    top: 5,
    left: 5,
    width: 16,
    height: 16,
    borderRadius: 8,
    alignItems: "center",
    justifyContent: "center",
    zIndex: 2,
  },
  lockBadge: {
    position: "absolute",
    top: 5,
    right: 5,
    width: 18,
    height: 18,
    borderRadius: 9,
    backgroundColor: "rgba(0,0,0,0.5)",
    alignItems: "center",
    justifyContent: "center",
  },
  colorBar: {
    width: "85%",
    height: 6,
    borderRadius: 3,
    marginBottom: 8,
    alignItems: "center",
    justifyContent: "center",
  },
  furSwatch: {
    width: 56,
    height: 40,
    borderRadius: 8,
    marginBottom: 6,
  },
  thumbnail: {
    width: 80,
    height: 80,
    marginBottom: 4,
  },

  /* ── Badges ──────────────────────────────────────────────────────────────── */
  ownedBadge: {
    marginTop: 3,
    paddingHorizontal: 8,
    paddingVertical: 2,
    borderRadius: radius.full,
  },
  ownedText: {
    fontSize: 9,
    fontWeight: "800",
    letterSpacing: 0.5,
    textTransform: "uppercase",
  },
  priceBadge: {
    marginTop: 3,
    paddingHorizontal: 8,
    paddingVertical: 2,
    borderRadius: radius.full,
  },
  priceText: {
    fontSize: 10,
    fontWeight: "700",
  },

  /* ── Bottom bar ──────────────────────────────────────────────────────────── */
  bottomBar: {
    flexDirection: "row",
    alignItems: "center",
    justifyContent: "space-between",
    paddingHorizontal: spacing.md,
    paddingTop: spacing.sm,
    gap: spacing.sm,
    borderTopWidth: 1,
  },
  resetBtn: {
    paddingVertical: 12,
    paddingHorizontal: 20,
    borderRadius: radius.md,
    borderWidth: 1,
  },
  resetBtnText: {
    fontSize: 14,
    fontWeight: "600",
  },
  saveBtn: {
    flex: 1,
    paddingVertical: 14,
    borderRadius: radius.md,
    alignItems: "center",
    shadowColor: "#00875A",
    shadowOffset: { width: 0, height: 4 },
    shadowOpacity: 0.3,
    shadowRadius: 8,
    elevation: 6,
  },
  saveBtnText: {
    fontSize: 16,
    fontWeight: "700",
    letterSpacing: 0.3,
  },
  alertOverlay: {
    flex: 1,
    backgroundColor: "rgba(0,0,0,0.6)",
    justifyContent: "center",
    alignItems: "center",
    padding: 32,
  },
  alertCard: {
    width: "100%",
    borderRadius: radius.lg,
    padding: spacing.lg,
    shadowColor: "#000",
    shadowOffset: { width: 0, height: 8 },
    shadowOpacity: 0.25,
    shadowRadius: 16,
    elevation: 8,
  },
  alertTitle: {
    fontSize: 18,
    fontWeight: "700",
    marginBottom: spacing.sm,
  },
  alertMessage: {
    fontSize: 14,
    lineHeight: 20,
    marginBottom: spacing.lg,
  },
  alertButtons: {
    flexDirection: "row",
    gap: spacing.sm,
  },
  alertBtn: {
    flex: 1,
    paddingVertical: 12,
    borderRadius: radius.md,
    alignItems: "center",
  },
  alertBtnText: {
    fontSize: 15,
    fontWeight: "600",
  },
});
