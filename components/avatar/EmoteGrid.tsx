import React, { useState } from "react";
import { View, Text, Pressable, StyleSheet } from "react-native";
import { useAppTheme } from "../../contexts/ThemeContext";
import { spacing, typography, radius } from "../../lib/theme";
import type { EmoteItem, EmoteId } from "../../lib/types";

const EMOTE_EMOJIS: Record<EmoteId, string> = {
  howl: "\uD83D\uDC3A",
  flex: "\uD83D\uDCAA",
  meditate: "\uD83E\uDDD8",
  sprint: "\uD83C\uDFC3",
  celebrate: "\uD83C\uDF89",
  challenge: "\u2694\uFE0F",
};

type Props = {
  catalog: EmoteItem[];
  ownedEmotes: string[];
  onPurchase: (emoteId: string) => void;
  onPreview?: (emoteId: EmoteId) => void;
};

function EmoteGridInner({ catalog, ownedEmotes, onPurchase, onPreview }: Props) {
  const { theme } = useAppTheme();
  const [highlighted, setHighlighted] = useState<EmoteId | null>(null);

  function handlePress(emote: EmoteItem) {
    const owned = ownedEmotes.includes(emote.id);
    if (owned) {
      setHighlighted(emote.id);
      onPreview?.(emote.id);
    } else {
      onPurchase(emote.id);
    }
  }

  return (
    <View style={styles.container}>
      <Text style={[typography.subheading, { color: theme.colors.text, marginBottom: spacing.sm }]}>
        Emotes
      </Text>
      <View style={styles.grid}>
        {catalog.map((emote) => {
          const owned = ownedEmotes.includes(emote.id);
          const isHighlighted = highlighted === emote.id;

          return (
            <Pressable
              key={emote.id}
              style={[
                styles.gridItem,
                {
                  backgroundColor: isHighlighted ? theme.colors.mutedBg : theme.colors.surface,
                  borderColor: isHighlighted ? theme.colors.primary : theme.colors.border,
                  borderWidth: isHighlighted ? 2 : 1,
                },
              ]}
              onPress={() => handlePress(emote)}
            >
              <Text style={styles.emoji}>{EMOTE_EMOJIS[emote.id]}</Text>
              <Text
                style={[
                  typography.caption,
                  { color: theme.colors.text, fontWeight: "600", textAlign: "center" },
                ]}
                numberOfLines={1}
              >
                {emote.name}
              </Text>
              {owned ? (
                <Text style={[typography.caption, { color: theme.colors.success, fontSize: 10 }]}>
                  Owned
                </Text>
              ) : (
                <Text style={[styles.priceText, { color: "#FFD700" }]}>
                  {"\u26A1"} {emote.price}
                </Text>
              )}
            </Pressable>
          );
        })}
      </View>
    </View>
  );
}

export const EmoteGrid = React.memo(EmoteGridInner);

const styles = StyleSheet.create({
  container: {
    marginBottom: spacing.md,
  },
  grid: {
    flexDirection: "row",
    flexWrap: "wrap",
    gap: spacing.sm,
  },
  gridItem: {
    width: "31%",
    aspectRatio: 0.85,
    borderRadius: radius.md,
    alignItems: "center",
    justifyContent: "center",
    padding: spacing.sm,
  },
  emoji: {
    fontSize: 32,
    marginBottom: 4,
  },
  priceText: {
    fontSize: 11,
    fontWeight: "700",
  },
});
