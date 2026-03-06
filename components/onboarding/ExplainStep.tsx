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

        <Text style={[explainStyles.heading, { color: theme.colors.text }]}>
          How heavy do you lift?
        </Text>

        <Text style={[explainStyles.subtitle, { color: theme.colors.muted }]}>
          Tell us your max lifts and we'll auto-fill every session for
          you — no guessing, just lift.
        </Text>
      </View>

      <View style={styles.bottom}>
        <Button label="I Know My Numbers" onPress={onManual} />
        <View style={{ height: 12 }} />
        <Button
          label="Test My 1RM at the Gym"
          onPress={() => router.push("/orm-test?source=onboarding")}
          variant="secondary"
        />
        <Text style={[explainStyles.testHint, { color: theme.colors.muted }]}>
          ~30 min · requires a barbell
        </Text>
        <Pressable onPress={onSkip} style={styles.skipTextBtn}>
          <Text style={[styles.skipText, { color: theme.colors.accent }]}>
            Skip for now
          </Text>
        </Pressable>
        <Text style={[explainStyles.skipHint, { color: theme.colors.muted }]}>
          You can always come back to this later
        </Text>
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
  testHint: {
    fontSize: 12,
    textAlign: "center",
    marginTop: 6,
    marginBottom: 4,
  },
  skipHint: {
    fontSize: 12,
    textAlign: "center",
    marginTop: 4,
  },
});
