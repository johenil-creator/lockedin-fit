import { View, Text } from "react-native";
import { LockeMascot } from "../Locke/LockeMascot";
import { Button } from "../Button";
import { useAppTheme } from "../../contexts/ThemeContext";
import { StepSlide, onboardingStyles as styles } from "./shared";

type Props = {
  onContinue: () => void;
};

export function WelcomeStep({ onContinue }: Props) {
  const { theme } = useAppTheme();
  return (
    <StepSlide>
      <View style={[styles.container, { backgroundColor: theme.colors.bg }]}>
        <View style={styles.center}>
          <LockeMascot size={400} mood="encouraging" />
          <Text style={[styles.lockeIntro, { color: theme.colors.primary }]}>I'm Locke.</Text>
          <Text style={[styles.welcomeSub, { color: theme.colors.muted }]}>
            I'll guide your sessions, track your progress, and help you crush PRs.
          </Text>
          <Text style={[styles.welcomeSub, { color: theme.colors.muted, marginTop: 8 }]}>
            Just a few quick questions and you're in.
          </Text>
        </View>

        <View style={styles.bottom}>
          <Text style={{ fontSize: 12, color: theme.colors.muted, textAlign: "center", lineHeight: 17, marginBottom: 12, paddingHorizontal: 24 }}>
            LockedInFIT is a fitness tracking tool, not a substitute for professional medical advice. Always consult a physician before beginning any exercise programme and listen to your body.
          </Text>
          <Text style={{ fontSize: 11, color: theme.colors.muted, textAlign: "center", opacity: 0.7, marginBottom: 16, paddingHorizontal: 24 }}>
            By continuing, you agree to our Terms of Service and Privacy Policy.
          </Text>
          <Button label="Let's Go" onPress={onContinue} />
        </View>
      </View>
    </StepSlide>
  );
}
