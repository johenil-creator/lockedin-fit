import { View, Text, Pressable, StyleSheet } from "react-native";
import { useRouter } from "expo-router";
import { LockeMascot } from "../Locke/LockeMascot";
import { Button } from "../Button";
import { BackButton } from "../BackButton";
import { useAppTheme } from "../../contexts/ThemeContext";
import { onboardingStyles as styles } from "./shared";

type Props = {
  onManual: () => void;
  onSkip: () => void;
  onBack: () => void;
};

export function ExplainStep({ onManual, onSkip, onBack }: Props) {
  const { theme } = useAppTheme();
  const router = useRouter();

  return (
    <View style={[styles.container, { backgroundColor: theme.colors.bg }]}>
      <View style={explainStyles.header}>
        <BackButton onPress={onBack} />
      </View>

      <View style={explainStyles.inner}>
        <LockeMascot size={200} mood="encouraging" />

        <Text style={[explainStyles.microcopy, { color: theme.colors.muted }]}>
          This starts your first session — warm-ups on 4 main lifts (~30–45 min).
        </Text>

        <Text style={[explainStyles.heading, { color: theme.colors.text }]}>
          Let's find your 1RM
        </Text>

        <Text style={[explainStyles.subtitle, { color: theme.colors.muted }]}>
          Your 1-Rep Max — the heaviest weight you can lift once. We'll use it
          to set your training weights and track PRs.
        </Text>
      </View>

      <View style={styles.bottom}>
        <Button
          label="Start 1RM Test"
          onPress={() => router.push("/orm-test?source=onboarding")}
        />
        <View style={{ height: 12 }} />
        <Button label="I Know My Numbers" onPress={onManual} variant="secondary" />
        <Pressable onPress={onSkip} style={styles.skipTextBtn}>
          <Text style={[styles.skipText, { color: theme.colors.muted }]}>
            Skip for now
          </Text>
        </Pressable>
      </View>
    </View>
  );
}

const explainStyles = StyleSheet.create({
  header: {
    paddingHorizontal: 24,
    marginBottom: 4,
  },
  inner: {
    flex: 1,
    alignItems: "center",
    justifyContent: "center",
    paddingHorizontal: 24,
  },
  microcopy: {
    fontSize: 13,
    textAlign: "center",
    marginTop: 8,
    marginBottom: 24,
  },
  heading: {
    fontSize: 22,
    fontWeight: "700",
    textAlign: "center",
    marginBottom: 8,
  },
  subtitle: {
    fontSize: 14,
    textAlign: "center",
    lineHeight: 20,
  },
});
