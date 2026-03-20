import React, { useState } from "react";
import { View, Text, Pressable, StyleSheet } from "react-native";
import { useAppTheme } from "../../contexts/ThemeContext";
import { spacing, radius, typography } from "../../lib/theme";

type Props = {
  currentColor: string;
  currentEmoji: string;
  onSelect: (color: string, emoji: string) => void;
};

const PRESET_COLORS = [
  "#F85149",
  "#FF9F0A",
  "#FFD60A",
  "#3FB950",
  "#58A6FF",
  "#BF5AF2",
  "#FF375F",
  "#00875A",
  "#1F6FEB",
  "#6E5494",
  "#E6EDF3",
  "#30363D",
];

const PRESET_EMOJIS = [
  "\u{1F43A}", // wolf
  "\u{1F525}", // fire
  "\u2694\uFE0F",  // swords
  "\u{1F451}", // crown
  "\u{1F3AF}", // target
  "\u26A1",    // lightning
  "\u{1F4AA}", // flexed bicep
  "\u{1F480}", // skull
  "\u{1F30A}", // wave
  "\u{1F5FF}", // moai
  "\u{1F409}", // dragon
  "\u2B50",    // star
];

function PackBannerPickerInner({ currentColor, currentEmoji, onSelect }: Props) {
  const { theme } = useAppTheme();
  const [selectedColor, setSelectedColor] = useState(currentColor);
  const [selectedEmoji, setSelectedEmoji] = useState(currentEmoji);

  function handleColorPress(color: string) {
    setSelectedColor(color);
    onSelect(color, selectedEmoji);
  }

  function handleEmojiPress(emoji: string) {
    setSelectedEmoji(emoji);
    onSelect(selectedColor, emoji);
  }

  return (
    <View style={[styles.container, { backgroundColor: theme.colors.surface }]}>
      {/* Preview */}
      <View
        style={[styles.preview, { backgroundColor: selectedColor + "30" }]}
      >
        <Text style={styles.previewEmoji}>{selectedEmoji}</Text>
      </View>

      {/* Color picker */}
      <Text
        style={[
          typography.caption,
          { color: theme.colors.muted, marginTop: spacing.md, marginBottom: spacing.xs },
        ]}
      >
        Banner Color
      </Text>
      <View style={styles.grid}>
        {PRESET_COLORS.map((color) => (
          <Pressable
            key={color}
            style={[
              styles.colorSwatch,
              { backgroundColor: color },
              selectedColor === color && {
                borderWidth: 3,
                borderColor: theme.colors.text,
              },
            ]}
            onPress={() => handleColorPress(color)}
          />
        ))}
      </View>

      {/* Emoji picker */}
      <Text
        style={[
          typography.caption,
          { color: theme.colors.muted, marginTop: spacing.md, marginBottom: spacing.xs },
        ]}
      >
        Banner Emoji
      </Text>
      <View style={styles.grid}>
        {PRESET_EMOJIS.map((emoji) => (
          <Pressable
            key={emoji}
            style={[
              styles.emojiCell,
              { backgroundColor: theme.colors.mutedBg },
              selectedEmoji === emoji && {
                borderWidth: 2,
                borderColor: theme.colors.primary,
                backgroundColor: theme.colors.primary + "20",
              },
            ]}
            onPress={() => handleEmojiPress(emoji)}
          >
            <Text style={styles.emojiText}>{emoji}</Text>
          </Pressable>
        ))}
      </View>
    </View>
  );
}

export const PackBannerPicker = React.memo(PackBannerPickerInner);

const styles = StyleSheet.create({
  container: {
    borderRadius: radius.lg,
    padding: spacing.lg,
    marginBottom: spacing.md,
  },
  preview: {
    alignSelf: "center",
    width: 80,
    height: 80,
    borderRadius: radius.lg,
    alignItems: "center",
    justifyContent: "center",
  },
  previewEmoji: {
    fontSize: 40,
  },
  grid: {
    flexDirection: "row",
    flexWrap: "wrap",
    gap: spacing.sm,
  },
  colorSwatch: {
    width: 36,
    height: 36,
    borderRadius: 18,
  },
  emojiCell: {
    width: 44,
    height: 44,
    borderRadius: radius.sm,
    alignItems: "center",
    justifyContent: "center",
  },
  emojiText: {
    fontSize: 22,
  },
});
