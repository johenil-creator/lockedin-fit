import React, { useState, useCallback } from "react";
import {
  View,
  Text,
  TextInput,
  Pressable,
  StyleSheet,
  ActivityIndicator,
} from "react-native";
import { useAppTheme } from "../../contexts/ThemeContext";
import { spacing, radius, typography } from "../../lib/theme";
import { CommentBubble } from "./CommentBubble";
import type { Comment } from "../../lib/types";

type Props = {
  comments: Comment[];
  commentCount: number;
  loading: boolean;
  onPost: (text: string) => Promise<void>;
};

function CommentSectionInner({ comments, commentCount, loading, onPost }: Props) {
  const { theme } = useAppTheme();
  const [expanded, setExpanded] = useState(false);
  const [text, setText] = useState("");
  const [posting, setPosting] = useState(false);

  const toggleExpanded = useCallback(() => {
    setExpanded((prev) => !prev);
  }, []);

  const handlePost = useCallback(async () => {
    const trimmed = text.trim();
    if (!trimmed || posting) return;
    setPosting(true);
    try {
      await onPost(trimmed);
      setText("");
    } finally {
      setPosting(false);
    }
  }, [text, posting, onPost]);

  return (
    <View style={styles.container}>
      <Pressable onPress={toggleExpanded} style={styles.toggleRow}>
        <Text style={[styles.toggleText, { color: theme.colors.muted }]}>
          {commentCount > 0
            ? `${commentCount} comment${commentCount !== 1 ? "s" : ""}`
            : "Add a comment"}
        </Text>
        <Text style={[styles.chevron, { color: theme.colors.muted }]}>
          {expanded ? "\u25B2" : "\u25BC"}
        </Text>
      </Pressable>

      {expanded && (
        <View style={styles.expandedArea}>
          {loading ? (
            <ActivityIndicator
              size="small"
              color={theme.colors.primary}
              style={styles.loader}
            />
          ) : (
            comments.map((comment) => (
              <CommentBubble key={comment.id} comment={comment} />
            ))
          )}

          <View
            style={[
              styles.inputRow,
              {
                backgroundColor: theme.colors.mutedBg,
                borderColor: theme.colors.border,
              },
            ]}
          >
            <TextInput
              style={[styles.input, { color: theme.colors.text }]}
              placeholder="Write a comment..."
              placeholderTextColor={theme.colors.muted}
              value={text}
              onChangeText={setText}
              maxLength={280}
              multiline={false}
            />
            <Pressable
              onPress={handlePost}
              disabled={!text.trim() || posting}
              style={[
                styles.postButton,
                {
                  backgroundColor:
                    text.trim() && !posting
                      ? theme.colors.primary
                      : theme.colors.border,
                },
              ]}
            >
              <Text
                style={[
                  styles.postButtonText,
                  {
                    color:
                      text.trim() && !posting
                        ? theme.colors.primaryText
                        : theme.colors.muted,
                  },
                ]}
              >
                Post
              </Text>
            </Pressable>
          </View>
        </View>
      )}
    </View>
  );
}

export const CommentSection = React.memo(CommentSectionInner);

const styles = StyleSheet.create({
  container: {
    marginTop: spacing.xs,
  },
  toggleRow: {
    flexDirection: "row",
    alignItems: "center",
    justifyContent: "space-between",
    paddingVertical: spacing.xs,
  },
  toggleText: {
    ...typography.caption,
    fontWeight: "600",
  },
  chevron: {
    fontSize: 10,
  },
  expandedArea: {
    marginTop: spacing.xs,
  },
  loader: {
    marginVertical: spacing.md,
  },
  inputRow: {
    flexDirection: "row",
    alignItems: "center",
    borderRadius: radius.md,
    borderWidth: 1,
    paddingHorizontal: spacing.sm,
    paddingVertical: spacing.xs,
    marginTop: spacing.sm,
    gap: spacing.sm,
  },
  input: {
    flex: 1,
    ...typography.small,
    paddingVertical: spacing.xs,
  },
  postButton: {
    paddingHorizontal: spacing.md,
    paddingVertical: spacing.xs,
    borderRadius: radius.sm,
  },
  postButtonText: {
    ...typography.caption,
    fontWeight: "700",
  },
});
