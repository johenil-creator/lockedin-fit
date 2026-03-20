import React from "react";
import { View, Text, Pressable, StyleSheet } from "react-native";
import { useRouter } from "expo-router";
import { Ionicons } from "@expo/vector-icons";
import { useAppTheme } from "../../contexts/ThemeContext";
import { LockePreview } from "./LockePreview";
import { spacing, typography, radius } from "../../lib/theme";
import { impact, ImpactStyle } from "../../lib/haptics";
import type { PackInfo, PackMember } from "../../lib/types";

type Props = {
  pack: PackInfo | null;
  members: PackMember[];
  loading: boolean;
};

function PackCardInner({ pack, members, loading }: Props) {
  const { theme } = useAppTheme();
  const router = useRouter();

  if (loading) return null;

  // No pack — show CTA
  if (!pack) {
    return (
      <View style={[styles.card, { backgroundColor: theme.colors.surface }]}>
        <Text style={[typography.subheading, { color: theme.colors.text, marginBottom: spacing.sm }]}>
          Your Pack
        </Text>
        <Text style={[typography.caption, { color: theme.colors.muted, textAlign: "center", marginBottom: spacing.md }]}>
          Form a pack with friends for weekly XP competitions!
        </Text>
        <View style={styles.ctaRow}>
          <Pressable
            style={[styles.ctaBtn, { backgroundColor: theme.colors.primary }]}
            onPress={() => { impact(ImpactStyle.Light); router.push("/create-pack"); }}
          >
            <Text style={[styles.ctaBtnText, { color: theme.colors.primaryText }]}>
              Forge Pack
            </Text>
          </Pressable>
          <Pressable
            style={[styles.ctaBtn, { backgroundColor: theme.colors.mutedBg, borderWidth: 1, borderColor: theme.colors.border }]}
            onPress={() => { impact(ImpactStyle.Light); router.push("/join-pack"); }}
          >
            <Text style={[styles.ctaBtnText, { color: theme.colors.text }]}>
              Join the Pack
            </Text>
          </Pressable>
        </View>
      </View>
    );
  }

  // Has pack — show info
  return (
    <View style={[styles.card, { backgroundColor: theme.colors.surface }]}>
      <View style={styles.headerRow}>
        <View style={{ flex: 1 }}>
          <View style={styles.nameRow}>
            <Text style={{ fontSize: 18 }}>{"\uD83D\uDC3A"}</Text>
            <Text style={[typography.subheading, { color: theme.colors.text }]}>
              {pack.name}
            </Text>
          </View>
          {pack.motto ? (
            <Text style={[typography.caption, { color: theme.colors.muted, fontStyle: "italic", marginTop: 2 }]}>
              "{pack.motto}"
            </Text>
          ) : null}
        </View>
        <Text style={[typography.caption, { color: theme.colors.muted }]}>
          {pack.memberCount} members
        </Text>
      </View>

      {/* Mini member avatars */}
      <View style={styles.avatarRow}>
        {members.slice(0, 5).map((m) => (
          <LockePreview key={m.userId} size={28} />
        ))}
        {members.length > 5 && (
          <View style={[styles.moreBadge, { backgroundColor: theme.colors.mutedBg }]}>
            <Text style={[typography.caption, { color: theme.colors.muted }]}>
              +{members.length - 5}
            </Text>
          </View>
        )}
      </View>

      {/* Weekly XP */}
      <View style={styles.statsRow}>
        <Text style={[typography.small, { color: theme.colors.muted }]}>Weekly XP</Text>
        <Text style={[typography.body, { color: theme.colors.accent, fontWeight: "700" }]}>
          {pack.weeklyXp.toLocaleString()}
        </Text>
      </View>

      <Pressable
        style={[styles.viewBtn, { backgroundColor: theme.colors.mutedBg }]}
        onPress={() => { impact(ImpactStyle.Light); router.push(`/pack-detail?id=${pack.id}`); }}
      >
        <Text style={[typography.small, { color: theme.colors.text, fontWeight: "600" }]}>
          Enter the Den
        </Text>
        <Ionicons name="chevron-forward" size={14} color={theme.colors.muted} />
      </Pressable>
    </View>
  );
}

export const PackCard = React.memo(PackCardInner);

const styles = StyleSheet.create({
  card: {
    borderRadius: radius.lg,
    padding: spacing.lg,
    marginBottom: spacing.md,
    shadowColor: "#000",
    shadowOffset: { width: 0, height: 2 },
    shadowOpacity: 0.08,
    shadowRadius: 6,
    elevation: 3,
  },
  headerRow: {
    flexDirection: "row",
    justifyContent: "space-between",
    alignItems: "flex-start",
    marginBottom: spacing.sm,
  },
  nameRow: {
    flexDirection: "row",
    alignItems: "center",
    gap: spacing.xs,
  },
  avatarRow: {
    flexDirection: "row",
    gap: spacing.xs,
    marginBottom: spacing.sm,
  },
  moreBadge: {
    width: 28,
    height: 28,
    borderRadius: 14,
    alignItems: "center",
    justifyContent: "center",
  },
  statsRow: {
    flexDirection: "row",
    justifyContent: "space-between",
    alignItems: "center",
    marginBottom: spacing.sm,
  },
  viewBtn: {
    flexDirection: "row",
    alignItems: "center",
    justifyContent: "center",
    paddingVertical: 10,
    borderRadius: radius.md,
    gap: spacing.xs,
  },
  ctaRow: {
    flexDirection: "row",
    gap: spacing.sm,
  },
  ctaBtn: {
    flex: 1,
    paddingVertical: 12,
    borderRadius: radius.md,
    alignItems: "center",
  },
  ctaBtnText: {
    fontSize: 14,
    fontWeight: "700",
  },
});
