import React, { useState } from "react";
import { View, Text, Pressable, StyleSheet, Image, Modal } from "react-native";
import { Ionicons } from "@expo/vector-icons";
import { useAppTheme } from "../../contexts/ThemeContext";
import { spacing, radius, typography } from "../../lib/theme";
import type { SeasonalCosmeticItem } from "../../lib/types";

type Props = {
  items: SeasonalCosmeticItem[];
  ownedIds: string[];
  equippedIds?: string[];
  onPurchase: (itemId: string) => void;
  onEquip?: (itemId: string) => void;
};

const RARITY_COLORS: Record<string, string> = {
  common: "#9E9E9E",
  uncommon: "#4CAF50",
  rare: "#2196F3",
  epic: "#9C27B0",
  legendary: "#FFD700",
  prestige: "#FF5622",
};

const SEASONAL_THUMBNAILS: Record<string, ReturnType<typeof require>> = {
  flower_crown: require("../../assets/avatar/thumbnails/flower_crown.png"),
  apex_crown:   require("../../assets/avatar/thumbnails/apex_crown.png"),
};

function getCountdown(until: string): string {
  const diff = new Date(until).getTime() - Date.now();
  if (diff <= 0) return "Expired";
  const days = Math.floor(diff / 86400000);
  if (days > 30) return `${Math.floor(days / 30)} months`;
  if (days > 0) return `${days}d left`;
  const hours = Math.floor(diff / 3600000);
  return `${hours}h left`;
}

function SeasonalShopSectionInner({ items, ownedIds, equippedIds = [], onPurchase, onEquip }: Props) {
  const { theme } = useAppTheme();
  const [showInfo, setShowInfo] = useState(false);

  if (items.length === 0) return null;

  return (
    <View style={styles.section}>
      <View style={styles.sectionHeader}>
        <View style={[styles.sectionAccent, { backgroundColor: theme.colors.primary + "60" }]} />
        <Text style={[styles.sectionLabel, { color: theme.colors.muted }]}>
          Seasonal Collection
        </Text>
        <Pressable hitSlop={8} onPress={() => setShowInfo(true)}>
          <Ionicons name="help-circle-outline" size={15} color="#FFD700" />
        </Pressable>
      </View>

      <Modal visible={showInfo} transparent animationType="fade" onRequestClose={() => setShowInfo(false)}>
        <Pressable style={styles.modalOverlay} onPress={() => setShowInfo(false)}>
          <View style={[styles.modalCard, { backgroundColor: theme.colors.surface }]}>
            <View style={styles.modalHeader}>
              <Ionicons name="leaf-outline" size={22} color="#FFD700" />
              <Text style={[typography.heading, { color: theme.colors.text, marginLeft: 8 }]}>
                Seasonal Den
              </Text>
            </View>
            <Text style={[typography.body, { color: theme.colors.muted, lineHeight: 22, marginTop: spacing.sm }]}>
              Limited-time gear that rotates each season. Claim them before they vanish from the den.
            </Text>
            <Text style={[typography.body, { color: theme.colors.muted, lineHeight: 22, marginTop: spacing.sm }]}>
              Spend Fangs earned through training, streaks, and conquering quests.
            </Text>
            <Pressable
              style={[styles.modalButton, { backgroundColor: theme.colors.primary }]}
              onPress={() => setShowInfo(false)}
            >
              <Text style={[typography.body, { color: theme.colors.primaryText, fontWeight: "700" }]}>Got it</Text>
            </Pressable>
          </View>
        </Pressable>
      </Modal>

      <View style={styles.grid}>
        {items.map((item) => {
          const owned = ownedIds.includes(item.id);
          const equipped = equippedIds.includes(item.preview);
          const rarityColor = RARITY_COLORS[item.rarity] ?? theme.colors.border;

          return (
            <Pressable
              key={item.id}
              style={[
                styles.gridItem,
                {
                  backgroundColor: equipped ? theme.colors.primary + "12" : theme.colors.surface,
                  borderColor: equipped ? theme.colors.primary : theme.colors.border + "80",
                  borderWidth: equipped ? 2 : 1,
                },
              ]}
              onPress={() => owned ? onEquip?.(item.id) : onPurchase(item.id)}
            >
              {/* Lock overlay for unowned */}
              {!owned && (
                <View style={[StyleSheet.absoluteFill, styles.lockOverlay]}>
                  <View style={styles.lockBadge}>
                    <Ionicons name="lock-closed" size={12} color="#fff" />
                  </View>
                </View>
              )}

              {/* Preview */}
              {SEASONAL_THUMBNAILS[item.preview] ? (
                <Image source={SEASONAL_THUMBNAILS[item.preview]} style={styles.thumbnail} resizeMode="contain" />
              ) : (
                <View style={[styles.preview, { backgroundColor: theme.colors.mutedBg }]}>
                  <Ionicons name="sparkles-outline" size={20} color={theme.colors.accent} />
                </View>
              )}

              <Text
                style={[typography.caption, styles.itemName, { color: theme.colors.text }]}
                numberOfLines={1}
              >
                {item.name}
              </Text>

              <Text style={[styles.rarityLabel, { color: rarityColor }]}>
                {item.rarity.toUpperCase()}
              </Text>

              {owned ? (
                <View style={[styles.ownedBadge, { backgroundColor: theme.colors.success + "18" }]}>
                  <Text style={[styles.ownedText, { color: theme.colors.success }]}>OWNED</Text>
                </View>
              ) : (
                <View style={[styles.priceBadge, { backgroundColor: "#FFD70015" }]}>
                  <View style={styles.priceRow}>
                    <Ionicons name="flash" size={10} color="#FFD700" />
                    <Text style={styles.priceText}>{item.price}</Text>
                  </View>
                </View>
              )}

              <Text style={[styles.countdown, { color: theme.colors.muted }]}>
                {getCountdown(item.availableUntil)}
              </Text>

              {equipped && (
                <View style={[styles.equippedCheck, { backgroundColor: theme.colors.primary }]}>
                  <Ionicons name="checkmark" size={10} color="#fff" />
                </View>
              )}
            </Pressable>
          );
        })}
      </View>
    </View>
  );
}

export const SeasonalShopSection = React.memo(SeasonalShopSectionInner);

const styles = StyleSheet.create({
  section: { marginBottom: spacing.sm },
  sectionHeader: {
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
  modalOverlay: {
    flex: 1,
    backgroundColor: "rgba(0,0,0,0.6)",
    justifyContent: "center",
    alignItems: "center",
    padding: spacing.lg,
  },
  modalCard: {
    width: "100%",
    maxWidth: 340,
    borderRadius: radius.lg,
    padding: spacing.lg,
    shadowColor: "#000",
    shadowOffset: { width: 0, height: 8 },
    shadowOpacity: 0.3,
    shadowRadius: 16,
    elevation: 10,
  },
  modalHeader: {
    flexDirection: "row",
    alignItems: "center",
  },
  modalButton: {
    marginTop: spacing.lg,
    paddingVertical: 12,
    borderRadius: radius.md,
    alignItems: "center",
  },
  grid: {
    flexDirection: "row",
    flexWrap: "wrap",
    gap: 10,
  },
  gridItem: {
    width: "31%",
    borderRadius: radius.md,
    alignItems: "center",
    justifyContent: "center",
    padding: spacing.sm,
  },
  lockOverlay: {
    backgroundColor: "rgba(0,0,0,0.25)",
    borderRadius: radius.md,
    zIndex: 1,
  },
  lockBadge: {
    position: "absolute",
    top: 5,
    right: 5,
    width: 18,
    height: 18,
    borderRadius: 9,
    backgroundColor: "rgba(0,0,0,0.55)",
    alignItems: "center",
    justifyContent: "center",
  },
  preview: {
    width: 48,
    height: 48,
    borderRadius: 24,
    alignItems: "center",
    justifyContent: "center",
    marginBottom: 4,
  },
  thumbnail: {
    width: 80,
    height: 80,
    marginBottom: 4,
  },
  itemName: {
    fontWeight: "600",
    textAlign: "center" as const,
    marginTop: 2,
  },
  rarityLabel: {
    fontSize: 9,
    fontWeight: "800" as const,
    letterSpacing: 1,
    textAlign: "center" as const,
    marginTop: 1,
  },
  priceRow: {
    flexDirection: "row" as const,
    alignItems: "center" as const,
    gap: 2,
  },
  ownedBadge: {
    marginTop: 3,
    paddingHorizontal: 8,
    paddingVertical: 2,
    borderRadius: 999,
  },
  ownedText: {
    fontSize: 9,
    fontWeight: "800",
    letterSpacing: 0.5,
  },
  priceBadge: {
    marginTop: 3,
    paddingHorizontal: 8,
    paddingVertical: 2,
    borderRadius: 999,
  },
  priceText: {
    fontSize: 10,
    fontWeight: "700",
    color: "#FFD700",
  },
  countdown: {
    fontSize: 9,
    fontWeight: "500",
    marginTop: 2,
  },
  equippedCheck: {
    position: "absolute",
    top: 5,
    left: 5,
    width: 18,
    height: 18,
    borderRadius: 9,
    alignItems: "center",
    justifyContent: "center",
  },
});
