import React from "react";
import { View, Text, StyleSheet } from "react-native";
import { useAppTheme } from "../../contexts/ThemeContext";
import { spacing, radius, typography } from "../../lib/theme";
import type { PackMessage } from "../../lib/types";

type Props = {
  message: PackMessage;
  isSelf: boolean;
};

function formatTime(iso: string): string {
  const d = new Date(iso);
  return d.toLocaleTimeString([], { hour: "2-digit", minute: "2-digit" });
}

function PackChatBubbleInner({ message, isSelf }: Props) {
  const { theme } = useAppTheme();

  return (
    <View style={[styles.row, isSelf && styles.rowSelf]}>
      <View
        style={[
          styles.bubble,
          isSelf
            ? { backgroundColor: theme.colors.primary, borderBottomRightRadius: 4 }
            : { backgroundColor: theme.colors.mutedBg, borderBottomLeftRadius: 4 },
        ]}
      >
        <Text style={[styles.name, { color: isSelf ? theme.colors.primaryText + "CC" : theme.colors.accent }]}>
          {message.displayName}
        </Text>
        <Text style={[styles.text, { color: isSelf ? theme.colors.primaryText : theme.colors.text }]}>
          {message.text}
        </Text>
        <Text style={[styles.time, { color: isSelf ? theme.colors.primaryText + "99" : theme.colors.muted }]}>
          {formatTime(message.createdAt)}
        </Text>
      </View>
    </View>
  );
}

export const PackChatBubble = React.memo(PackChatBubbleInner);

const styles = StyleSheet.create({
  row: {
    flexDirection: "row",
    marginBottom: 6,
    justifyContent: "flex-start",
  },
  rowSelf: {
    justifyContent: "flex-end",
  },
  bubble: {
    maxWidth: "75%",
    borderRadius: radius.lg,
    paddingHorizontal: 12,
    paddingVertical: 8,
  },
  name: {
    fontSize: 11,
    fontWeight: "700",
    marginBottom: 2,
  },
  text: {
    fontSize: 15,
    lineHeight: 20,
  },
  time: {
    fontSize: 10,
    marginTop: 4,
    textAlign: "right",
  },
});
