import React from "react";
import { View, Text, Pressable, StyleSheet } from "react-native";
import { Ionicons } from "@expo/vector-icons";
import { useAppTheme } from "../../contexts/ThemeContext";
import { spacing, radius, typography } from "../../lib/theme";
import type { CosmeticGift } from "../../lib/types";

type Props = {
  gifts: CosmeticGift[];
  onClaim: (giftId: string, itemId: string) => void;
};

function GiftBannerInner({ gifts, onClaim }: Props) {
  const { theme } = useAppTheme();

  if (gifts.length === 0) return null;

  return (
    <View style={[styles.banner, { backgroundColor: "#FFD70015", borderColor: "#FFD70030" }]}>
      <Ionicons name="gift-outline" size={20} color="#FFD700" />
      <View style={styles.info}>
        <Text style={[typography.body, { color: theme.colors.text, fontWeight: "600" }]}>
          {gifts.length === 1
            ? `${gifts[0].fromDisplayName} sent you a gift!`
            : `You have ${gifts.length} pending gifts!`}
        </Text>
        {gifts.length === 1 && gifts[0].message ? (
          <Text style={[typography.caption, { color: theme.colors.muted, fontStyle: "italic" }]}>
            "{gifts[0].message}"
          </Text>
        ) : null}
      </View>
      <Pressable
        style={[styles.claimBtn, { backgroundColor: "#FFD700" }]}
        onPress={() => {
          const gift = gifts[0];
          onClaim(gift.id, gift.itemId);
        }}
      >
        <Text style={[styles.claimText, { color: "#000" }]}>Claim</Text>
      </Pressable>
    </View>
  );
}

export const GiftBanner = React.memo(GiftBannerInner);

const styles = StyleSheet.create({
  banner: {
    flexDirection: "row",
    alignItems: "center",
    padding: spacing.md,
    borderRadius: radius.lg,
    borderWidth: 1,
    marginBottom: spacing.md,
    gap: spacing.sm,
  },
  info: {
    flex: 1,
  },
  claimBtn: {
    paddingHorizontal: 14,
    paddingVertical: 6,
    borderRadius: radius.full,
  },
  claimText: {
    fontSize: 13,
    fontWeight: "700",
  },
});
