import React, { useState } from "react";
import { View, Text, Pressable, StyleSheet, Image, Modal } from "react-native";
import { Ionicons } from "@expo/vector-icons";
import { useAppTheme } from "../../contexts/ThemeContext";
import { spacing, radius, typography } from "../../lib/theme";
import type { SeasonalCosmeticItem, RankLevel } from "../../lib/types";
import { rankDisplayName } from "../../lib/rankService";

type Props = {
  items: SeasonalCosmeticItem[];
  ownedIds: string[];
  equippedIds?: string[];
  currentRank: RankLevel;
  onPurchase: (itemId: string) => void;
  onEquip?: (itemId: string) => void;
};

const RANK_ORDER: RankLevel[] = ["Runt", "Scout", "Stalker", "Hunter", "Sentinel", "Alpha", "Apex", "Apex_Bronze", "Apex_Silver", "Apex_Gold"];

const PRESTIGE_THUMBNAILS: Record<string, ReturnType<typeof require>> = {
  apex_crown:     require("../../assets/avatar/thumbnails/apex_crown.png"),
  scout_bandana:  require("../../assets/avatar/thumbnails/scout_bandana.png"),
};

function isRankUnlocked(currentRank: RankLevel, requiredRank?: RankLevel): boolean {
  if (!requiredRank) return true;
  return RANK_ORDER.indexOf(currentRank) >= RANK_ORDER.indexOf(requiredRank);
}

function PrestigeShopSectionInner({ items, ownedIds, equippedIds = [], currentRank, onPurchase, onEquip }: Props) {
  const { theme } = useAppTheme();
  const [showInfo, setShowInfo] = useState(false);

  if (items.length === 0) return null;

  return (
    <View style={styles.section}>
      <View style={styles.sectionHeader}>
        <View style={[styles.sectionAccent, { backgroundColor: theme.colors.primary + "60" }]} />
        <Text style={[styles.sectionLabel, { color: theme.colors.muted }]}>
          Prestige Collection
        </Text>
        <Pressable hitSlop={8} onPress={() => setShowInfo(true)}>
          <Ionicons name="help-circle-outline" size={15} color="#FFD700" />
        </Pressable>
      </View>

      <Modal visible={showInfo} transparent animationType="fade" onRequestClose={() => setShowInfo(false)}>
        <Pressable style={styles.modalOverlay} onPress={() => setShowInfo(false)}>
          <View style={[styles.modalCard, { backgroundColor: theme.colors.surface }]}>
            <View style={styles.modalHeader}>
              <Ionicons name="trophy-outline" size={22} color="#FF5722" />
              <Text style={[typography.heading, { color: theme.colors.text, marginLeft: 8 }]}>
                Alpha Vault
              </Text>
            </View>
            <Text style={[typography.body, { color: theme.colors.muted, lineHeight: 22, marginTop: spacing.sm }]}>
              Exclusive gear forged for wolves who've proven their rank. Rise through the pack to unlock these trophies.
            </Text>
            <Text style={[typography.body, { color: theme.colors.muted, lineHeight: 22, marginTop: spacing.sm }]}>
              Once your rank is high enough, claim them with Fangs.
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
          const unlocked = isRankUnlocked(currentRank, item.requiredRank);

          return (
            <Pressable
              key={item.id}
              style={[
                styles.gridItem,
                {
                  backgroundColor: equipped ? theme.colors.primary + "12" : theme.colors.surface,
                  borderColor: equipped ? theme.colors.primary : theme.colors.border + "80",
                  borderWidth: equipped ? 2 : 1,
                  opacity: unlocked ? 1 : 0.5,
                },
              ]}
              onPress={() => owned ? onEquip?.(item.id) : onPurchase(item.id)}
              disabled={!unlocked}
            >
              {/* Lock overlay for rank-locked */}
              {!unlocked && (
                <View style={styles.lockOverlay}>
                  <View style={styles.lockPill}>
                    <Ionicons name="lock-closed" size={14} color="#fff" />
                    <Text style={styles.lockPillText}>
                      {rankDisplayName(item.requiredRank!)}
                    </Text>
                  </View>
                </View>
              )}

              {/* Lock badge for purchasable but unowned */}
              {unlocked && !owned && (
                <View style={styles.purchaseOverlay}>
                  <View style={styles.lockBadge}>
                    <Ionicons name="lock-closed" size={12} color="#fff" />
                  </View>
                </View>
              )}

              {/* Preview */}
              {PRESTIGE_THUMBNAILS[item.preview] ? (
                <Image source={PRESTIGE_THUMBNAILS[item.preview]} style={styles.thumbnail} resizeMode="contain" />
              ) : (
                <View style={[styles.preview, { backgroundColor: theme.colors.mutedBg }]}>
                  <Ionicons name="trophy-outline" size={20} color={theme.colors.accent} />
                </View>
              )}

              <Text
                style={[typography.caption, { color: theme.colors.text, fontWeight: "600", textAlign: "center", marginTop: 2 }]}
                numberOfLines={1}
              >
                {item.name}
              </Text>

              <Text style={styles.prestigeLabel}>PRESTIGE</Text>

              {owned ? (
                <View style={[styles.ownedBadge, { backgroundColor: theme.colors.success + "18" }]}>
                  <Text style={[styles.ownedText, { color: theme.colors.success }]}>OWNED</Text>
                </View>
              ) : unlocked ? (
                <View style={[styles.priceBadge, { backgroundColor: "#FFD70015" }]}>
                  <View style={styles.priceRow}>
                    <Ionicons name="flash" size={10} color="#FFD700" />
                    <Text style={styles.priceText}>{item.price}</Text>
                  </View>
                </View>
              ) : null}

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

export const PrestigeShopSection = React.memo(PrestigeShopSectionInner);

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
    ...StyleSheet.absoluteFillObject,
    backgroundColor: "rgba(0,0,0,0.45)",
    borderRadius: radius.md,
    zIndex: 1,
    alignItems: "center",
    justifyContent: "center",
  },
  purchaseOverlay: {
    ...StyleSheet.absoluteFillObject,
    backgroundColor: "rgba(0,0,0,0.25)",
    borderRadius: radius.md,
    zIndex: 1,
  },
  lockPill: {
    flexDirection: "row",
    alignItems: "center",
    backgroundColor: "rgba(0,0,0,0.7)",
    paddingHorizontal: 10,
    paddingVertical: 6,
    borderRadius: 20,
    gap: 5,
  },
  lockPillText: {
    fontSize: 12,
    fontWeight: "800",
    color: "#FFD700",
    letterSpacing: 0.5,
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
  priceRow: {
    flexDirection: "row",
    alignItems: "center",
    gap: 2,
  },
  prestigeLabel: {
    fontSize: 9,
    fontWeight: "800",
    letterSpacing: 1,
    color: "#FF5722",
    textAlign: "center",
    marginTop: 1,
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
