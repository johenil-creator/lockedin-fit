import React, { useState, useCallback } from "react";
import { View, TextInput, Text, Pressable, StyleSheet } from "react-native";
import { useAppTheme } from "../../contexts/ThemeContext";
import { spacing, radius, typography } from "../../lib/theme";

const MAX_CHARS = 280;

type Props = {
  onSubmit: (text: string) => Promise<void>;
  posting?: boolean;
};

function PostComposerInner({ onSubmit, posting = false }: Props) {
  const { theme } = useAppTheme();
  const [text, setText] = useState("");

  const remaining = MAX_CHARS - text.length;
  const isValid = text.trim().length > 0 && remaining >= 0;
  const isDisabled = !isValid || posting;

  const handlePost = useCallback(async () => {
    if (isDisabled) return;
    await onSubmit(text.trim());
    setText("");
  }, [text, isDisabled, onSubmit]);

  return (
    <View
      style={[
        styles.container,
        {
          backgroundColor: theme.colors.surface,
          borderColor: theme.colors.border,
        },
      ]}
    >
      <TextInput
        style={[styles.input, { color: theme.colors.text }]}
        placeholder="Share your victory..."
        placeholderTextColor={theme.colors.muted}
        value={text}
        onChangeText={setText}
        maxLength={MAX_CHARS + 10} // allow slight overshoot for UX feedback
        multiline
        numberOfLines={3}
      />
      <View style={styles.footer}>
        <Text
          style={[
            styles.counter,
            { color: remaining < 0 ? theme.colors.danger : theme.colors.muted },
          ]}
        >
          {remaining}
        </Text>
        <Pressable
          onPress={handlePost}
          disabled={isDisabled}
          style={[
            styles.postButton,
            {
              backgroundColor: isDisabled
                ? theme.colors.border
                : theme.colors.primary,
            },
          ]}
        >
          <Text
            style={[
              styles.postButtonText,
              {
                color: isDisabled
                  ? theme.colors.muted
                  : theme.colors.primaryText,
              },
            ]}
          >
            {posting ? "Posting..." : "Post"}
          </Text>
        </Pressable>
      </View>
    </View>
  );
}

export const PostComposer = React.memo(PostComposerInner);

const styles = StyleSheet.create({
  container: {
    borderRadius: radius.md,
    borderWidth: 1,
    padding: spacing.md,
  },
  input: {
    ...typography.body,
    minHeight: 60,
    textAlignVertical: "top",
  },
  footer: {
    flexDirection: "row",
    alignItems: "center",
    justifyContent: "space-between",
    marginTop: spacing.sm,
  },
  counter: {
    ...typography.caption,
    fontWeight: "600",
  },
  postButton: {
    paddingHorizontal: spacing.lg,
    paddingVertical: spacing.sm,
    borderRadius: radius.sm,
  },
  postButtonText: {
    ...typography.small,
    fontWeight: "700",
  },
});
