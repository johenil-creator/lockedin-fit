import { useState } from "react";
import {
  View,
  Text,
  TextInput,
  Pressable,
  ScrollView,
  StyleSheet,
  ActivityIndicator,
  KeyboardAvoidingView,
  Platform,
  Linking,
} from "react-native";
import { Ionicons } from "@expo/vector-icons";
import { useRouter } from "expo-router";
import { useSafeAreaInsets } from "react-native-safe-area-context";
import { useAppTheme } from "../contexts/ThemeContext";
import { useAuth } from "../contexts/AuthContext";
import { useProfileContext } from "../contexts/ProfileContext";
import { useXP } from "../hooks/useXP";
import { doc, setDoc, serverTimestamp } from "firebase/firestore";
import { db } from "../lib/firebase";
import { auth as firebaseAuth } from "../lib/firebase";
import { BackButton } from "../components/BackButton";
import { Card } from "../components/Card";
import { spacing, typography, radius } from "../lib/theme";

export default function AuthScreen() {
  const router = useRouter();
  const insets = useSafeAreaInsets();
  const { theme } = useAppTheme();
  const { signUp, signIn, resetPassword } = useAuth();
  const { profile } = useProfileContext();
  const { rank } = useXP();

  const [mode, setMode] = useState<"signin" | "signup">("signin");
  const [email, setEmail] = useState("");
  const [password, setPassword] = useState("");
  const [error, setError] = useState<string | null>(null);
  const [loading, setLoading] = useState(false);
  const [agreedToTerms, setAgreedToTerms] = useState(false);
  const [resetSent, setResetSent] = useState(false);

  const isSignUp = mode === "signup";

  async function handleSubmit() {
    setError(null);
    if (!email.trim() || !password.trim()) {
      setError("Email and password are required.");
      return;
    }
    if (isSignUp) {
      if (!/^[^\s@]+@[^\s@]+\.[^\s@]+$/.test(email.trim())) {
        setError("Please enter a valid email address.");
        return;
      }
      if (password.length < 8) {
        setError("Password must be at least 8 characters.");
        return;
      }
    }
    setLoading(true);
    try {
      if (isSignUp) {
        const { error: err } = await signUp(email.trim(), password);
        if (err) { setError(err); return; }

        // Sync profile to Firestore users collection
        const user = firebaseAuth.currentUser;
        if (user) {
          await setDoc(doc(db, "users", user.uid), {
            friendCode: profile.friendCode ?? "",
            displayName: profile.name,
            rank: rank,
            createdAt: serverTimestamp(),
          });
        }
      } else {
        const { error: err } = await signIn(email.trim(), password);
        if (err) { setError(err); return; }
      }
      router.back();
    } catch {
      setError("Something went wrong. Please try again.");
    } finally {
      setLoading(false);
    }
  }

  async function handleForgotPassword() {
    const trimmed = email.trim();
    if (!trimmed || !/^[^\s@]+@[^\s@]+\.[^\s@]+$/.test(trimmed)) {
      setError("Enter your email above, then tap Forgot Password.");
      return;
    }
    setLoading(true);
    setError(null);
    try {
      const { error: err } = await resetPassword(trimmed);
      if (err) { setError(err); return; }
      setResetSent(true);
    } finally {
      setLoading(false);
    }
  }

  return (
    <KeyboardAvoidingView
      style={{ flex: 1, backgroundColor: theme.colors.bg }}
      behavior={Platform.OS === "ios" ? "padding" : undefined}
    >
      <ScrollView
        style={[styles.container, { paddingTop: insets.top }]}
        contentContainerStyle={styles.content}
        keyboardShouldPersistTaps="handled"
      >
        {/* Header */}
        <View style={styles.header}>
          <BackButton />
          <Text style={[typography.title, { color: theme.colors.text }]}>
            {isSignUp ? "Create Account" : "Sign In"}
          </Text>
        </View>

        {/* Mode Toggle */}
        <View style={[styles.toggleRow, { backgroundColor: theme.colors.mutedBg, borderRadius: radius.full }]}>
          {(["signin", "signup"] as const).map((m) => {
            const active = mode === m;
            return (
              <Pressable
                key={m}
                style={[
                  styles.toggleSegment,
                  { backgroundColor: active ? theme.colors.primary : "transparent" },
                ]}
                onPress={() => { setMode(m); setError(null); setAgreedToTerms(false); setResetSent(false); }}
              >
                <Text
                  style={[
                    styles.toggleText,
                    { color: active ? theme.colors.primaryText : theme.colors.muted },
                  ]}
                >
                  {m === "signin" ? "Sign In" : "Sign Up"}
                </Text>
              </Pressable>
            );
          })}
        </View>

        {/* Form */}
        <Card>
          <Text style={[typography.subheading, { color: theme.colors.text, marginBottom: spacing.sm }]}>
            Email
          </Text>
          <TextInput
            style={[
              styles.input,
              {
                backgroundColor: theme.colors.mutedBg,
                color: theme.colors.text,
                borderColor: theme.colors.border,
              },
            ]}
            placeholder="you@example.com"
            placeholderTextColor={theme.colors.muted}
            autoCapitalize="none"
            autoCorrect={false}
            keyboardType="email-address"
            textContentType="emailAddress"
            autoComplete="email"
            value={email}
            onChangeText={(t) => { setEmail(t); setError(null); setResetSent(false); }}
          />

          <Text style={[typography.subheading, { color: theme.colors.text, marginBottom: spacing.sm, marginTop: spacing.md }]}>
            Password
          </Text>
          <TextInput
            style={[
              styles.input,
              {
                backgroundColor: theme.colors.mutedBg,
                color: theme.colors.text,
                borderColor: theme.colors.border,
              },
            ]}
            placeholder={isSignUp ? "Min. 8 characters" : "Password"}
            placeholderTextColor={theme.colors.muted}
            secureTextEntry
            textContentType={isSignUp ? "newPassword" : "password"}
            autoComplete={isSignUp ? "password-new" : "password"}
            value={password}
            onChangeText={(t) => { setPassword(t); setError(null); }}
          />

          {!isSignUp && (
            <Pressable onPress={handleForgotPassword} disabled={loading} style={{ marginTop: spacing.sm }}>
              <Text style={{ fontSize: 13, color: theme.colors.primary, fontWeight: "600" }}>
                Forgot Password?
              </Text>
            </Pressable>
          )}

          {resetSent && (
            <Text style={[typography.small, { color: theme.colors.primary, marginTop: spacing.sm }]}>
              Password reset email sent. Check your inbox.
            </Text>
          )}

          {error && (
            <Text style={[typography.small, { color: theme.colors.danger, marginTop: spacing.sm }]}>
              {error}
            </Text>
          )}

          {isSignUp && (
            <Pressable
              style={{ flexDirection: "row", alignItems: "flex-start", marginTop: spacing.md, gap: 10 }}
              onPress={() => setAgreedToTerms((v) => !v)}
            >
              <View style={{
                width: 22, height: 22, borderRadius: 6, borderWidth: 2,
                borderColor: agreedToTerms ? theme.colors.primary : theme.colors.border,
                backgroundColor: agreedToTerms ? theme.colors.primary : "transparent",
                alignItems: "center", justifyContent: "center", marginTop: 1,
              }}>
                {agreedToTerms && <Ionicons name="checkmark" size={15} color={theme.colors.primaryText} />}
              </View>
              <Text style={{ flex: 1, fontSize: 13, lineHeight: 18, color: theme.colors.muted }}>
                I am 13 years or older and agree to the{" "}
                <Text style={{ color: theme.colors.primary, textDecorationLine: "underline" }} onPress={() => router.push("/legal?doc=tos")}>Terms of Service</Text>
                {" "}and{" "}
                <Text style={{ color: theme.colors.primary, textDecorationLine: "underline" }} onPress={() => router.push("/legal?doc=privacy")}>Privacy Policy</Text>.
              </Text>
            </Pressable>
          )}

          <Pressable
            style={[
              styles.submitButton,
              { backgroundColor: theme.colors.primary, opacity: loading || (isSignUp && !agreedToTerms) ? 0.5 : 1 },
            ]}
            onPress={handleSubmit}
            disabled={loading || (isSignUp && !agreedToTerms)}
          >
            {loading ? (
              <ActivityIndicator color={theme.colors.primaryText} />
            ) : (
              <Text style={[styles.submitText, { color: theme.colors.primaryText }]}>
                {isSignUp ? "Create Account" : "Sign In"}
              </Text>
            )}
          </Pressable>
        </Card>
      </ScrollView>
    </KeyboardAvoidingView>
  );
}

const styles = StyleSheet.create({
  container: { flex: 1 },
  content: { padding: spacing.md, paddingBottom: spacing.xl },
  header: { marginBottom: spacing.lg },
  toggleRow: {
    flexDirection: "row",
    padding: 3,
    marginBottom: spacing.md,
  },
  toggleSegment: {
    flex: 1,
    paddingVertical: 10,
    borderRadius: radius.full,
    alignItems: "center",
  },
  toggleText: {
    fontSize: 14,
    fontWeight: "700",
  },
  input: {
    borderWidth: 1,
    borderRadius: radius.md,
    paddingHorizontal: spacing.md,
    paddingVertical: 14,
    fontSize: 15,
  },
  submitButton: {
    marginTop: spacing.lg,
    borderRadius: radius.md,
    paddingVertical: 16,
    alignItems: "center",
    justifyContent: "center",
  },
  submitText: {
    fontSize: 16,
    fontWeight: "700",
  },
});
