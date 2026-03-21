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
import { useAuth } from "../contexts/AuthContext";
import { usePack } from "../hooks/usePack";
import { spacing, typography, radius } from "../lib/theme";
import { notification, NotificationType } from "../lib/haptics";
import { maybePromptNotifications } from "../lib/notificationPrompt";

export default function CreatePackScreen() {
  const insets = useSafeAreaInsets();
  const router = useRouter();
  const { theme } = useAppTheme();
  const { user } = useAuth();
  const { create } = usePack();

  const [name, setName] = useState("");
  const [motto, setMotto] = useState("");
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState("");

  async function handleCreate() {
    setError("");
    const trimmed = name.trim();
    if (trimmed.length < 3 || trimmed.length > 20) {
      setError("Pack name must be 3-20 characters.");
      return;
    }

    if (!user) {
      router.push("/auth");
      return;
    }

    setLoading(true);
    try {
      const success = await create(trimmed, motto.trim() || undefined);
      if (success) {
        notification(NotificationType.Success);
        maybePromptNotifications("pack").catch(() => {});
        router.back();
      } else {
        setError("Failed to create pack. Please try again.");
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
            Forge a Pack
          </Text>
        </View>

        <View style={[styles.card, { backgroundColor: theme.colors.surface }]}>
          <Text style={[typography.small, { color: theme.colors.muted, fontWeight: "500", marginBottom: 6 }]}>
            Pack Name
          </Text>
          <TextInput
            style={[styles.input, { backgroundColor: theme.colors.mutedBg, color: theme.colors.text, borderColor: theme.colors.border }]}
            value={name}
            onChangeText={(v) => { setName(v.slice(0, 20)); setError(""); }}
            placeholder="e.g. Iron Wolves"
            placeholderTextColor={theme.colors.muted}
            maxLength={20}
          />
          <Text style={[typography.caption, { color: theme.colors.muted, marginTop: spacing.xs }]}>
            {name.length}/20
          </Text>

          <Text style={[typography.small, { color: theme.colors.muted, fontWeight: "500", marginBottom: 6, marginTop: spacing.md }]}>
            Motto (optional)
          </Text>
          <TextInput
            style={[styles.input, { backgroundColor: theme.colors.mutedBg, color: theme.colors.text, borderColor: theme.colors.border }]}
            value={motto}
            onChangeText={(v) => setMotto(v.slice(0, 60))}
            placeholder="e.g. Never skip leg day"
            placeholderTextColor={theme.colors.muted}
            maxLength={60}
          />
          <Text style={[typography.caption, { color: theme.colors.muted, marginTop: spacing.xs }]}>
            {motto.length}/60
          </Text>

          {error ? (
            <Text style={[typography.small, { color: theme.colors.danger, marginTop: spacing.sm }]}>
              {error}
            </Text>
          ) : null}

          <Pressable
            style={[styles.createBtn, { backgroundColor: theme.colors.primary, opacity: loading ? 0.5 : 1 }]}
            onPress={handleCreate}
            disabled={loading}
          >
            {loading ? (
              <ActivityIndicator color={theme.colors.primaryText} />
            ) : (
              <Text style={[styles.createBtnText, { color: theme.colors.primaryText }]}>
                Forge Pack
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
  createBtn: {
    marginTop: spacing.lg,
    paddingVertical: 16,
    borderRadius: radius.md,
    alignItems: "center",
  },
  createBtnText: {
    fontSize: 16,
    fontWeight: "700",
  },
});
