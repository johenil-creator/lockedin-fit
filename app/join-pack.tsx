import { useState } from "react";
import {
  View,
  Text,
  TextInput,
  Pressable,
  StyleSheet,
  ActivityIndicator,
  KeyboardAvoidingView,
  Platform,
} from "react-native";
import { useSafeAreaInsets } from "react-native-safe-area-context";
import { useRouter } from "expo-router";
import { useAppTheme } from "../contexts/ThemeContext";
import { BackButton } from "../components/BackButton";
import { usePack } from "../hooks/usePack";
import { spacing, typography, radius } from "../lib/theme";
import { notification, NotificationType } from "../lib/haptics";
import { maybePromptNotifications } from "../lib/notificationPrompt";

export default function JoinPackScreen() {
  const insets = useSafeAreaInsets();
  const router = useRouter();
  const { theme } = useAppTheme();
  const { join } = usePack();

  const [code, setCode] = useState("");
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState("");

  async function handleJoin() {
    setError("");
    const trimmed = code.trim().toUpperCase();
    if (trimmed.length !== 6 || !/^[A-Z0-9]{6}$/.test(trimmed)) {
      setError("Enter a valid 6-character pack code.");
      return;
    }

    setLoading(true);
    try {
      const success = await join(trimmed);
      if (success) {
        notification(NotificationType.Success);
        maybePromptNotifications("pack").catch(() => {});
        router.back();
      } else {
        setError("Pack not found or is full (max 10 members).");
      }
    } catch {
      setError("Something went wrong.");
    } finally {
      setLoading(false);
    }
  }

  return (
    <KeyboardAvoidingView
      style={{ flex: 1, backgroundColor: theme.colors.bg }}
      behavior={Platform.OS === "ios" ? "padding" : undefined}
    >
      <View style={[styles.container, { paddingTop: insets.top }]}>
        <View style={styles.header}>
          <BackButton />
          <Text style={[typography.heading, { color: theme.colors.text, marginLeft: spacing.sm }]}>
            Join the Pack
          </Text>
        </View>

        <View style={[styles.card, { backgroundColor: theme.colors.surface }]}>
          <Text style={[typography.small, { color: theme.colors.muted, fontWeight: "500", marginBottom: 6 }]}>
            Pack Code
          </Text>
          <TextInput
            style={[
              styles.input,
              styles.codeInput,
              {
                backgroundColor: theme.colors.mutedBg,
                color: theme.colors.text,
                borderColor: error ? theme.colors.danger : theme.colors.border,
              },
            ]}
            value={code}
            onChangeText={(val) => {
              setCode(val.toUpperCase().replace(/[^A-Z0-9]/g, "").slice(0, 6));
              if (error) setError("");
            }}
            placeholder="Enter code"
            placeholderTextColor={theme.colors.muted}
            autoCapitalize="characters"
            maxLength={6}
            returnKeyType="done"
            onSubmitEditing={handleJoin}
          />

          {error ? (
            <Text style={[typography.small, { color: theme.colors.danger, marginTop: spacing.sm }]}>
              {error}
            </Text>
          ) : null}

          <Pressable
            style={[styles.joinBtn, { backgroundColor: theme.colors.primary, opacity: loading ? 0.5 : 1 }]}
            onPress={handleJoin}
            disabled={loading}
          >
            {loading ? (
              <ActivityIndicator color={theme.colors.primaryText} />
            ) : (
              <Text style={[styles.joinBtnText, { color: theme.colors.primaryText }]}>
                Join Pack
              </Text>
            )}
          </Pressable>
        </View>
      </View>
    </KeyboardAvoidingView>
  );
}

const styles = StyleSheet.create({
  container: { flex: 1, padding: spacing.md },
  header: {
    flexDirection: "row",
    alignItems: "center",
    marginBottom: spacing.lg,
  },
  card: {
    borderRadius: radius.lg,
    padding: spacing.lg,
    shadowColor: "#000",
    shadowOffset: { width: 0, height: 2 },
    shadowOpacity: 0.08,
    shadowRadius: 6,
    elevation: 3,
  },
  input: {
    borderWidth: 1,
    borderRadius: radius.md,
    paddingVertical: 12,
    paddingHorizontal: 14,
    fontSize: 15,
  },
  codeInput: {
    letterSpacing: 4,
    fontSize: 20,
    fontWeight: "700",
    textAlign: "center",
  },
  joinBtn: {
    marginTop: spacing.lg,
    paddingVertical: 16,
    borderRadius: radius.md,
    alignItems: "center",
  },
  joinBtnText: {
    fontSize: 16,
    fontWeight: "700",
  },
});
