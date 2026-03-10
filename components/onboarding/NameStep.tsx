import { View, Text, TextInput, KeyboardAvoidingView, Platform } from "react-native";
import { Button } from "../Button";
import { BackButton } from "../BackButton";
import { useAppTheme } from "../../contexts/ThemeContext";
import { StepSlide, onboardingStyles as styles } from "./shared";

type Props = {
  userName: string;
  onChangeUserName: (name: string) => void;
  onContinue: () => void;
  onBack?: () => void;
};

export function NameStep({ userName, onChangeUserName, onContinue, onBack }: Props) {
  const { theme } = useAppTheme();
  return (
    <StepSlide>
      <KeyboardAvoidingView
        style={[styles.container, { backgroundColor: theme.colors.bg }]}
        behavior={Platform.OS === "ios" ? "padding" : undefined}
      >
        {onBack && (
          <View style={{ paddingHorizontal: 24, marginBottom: 4 }}>
            <BackButton onPress={onBack} />
          </View>
        )}
        <View style={styles.center}>
          <Text style={[styles.welcomeTitle, { color: theme.colors.text }]}>
            What should I call you?
          </Text>
          <Text style={[styles.welcomeSub, { color: theme.colors.muted }]}>
            This is how Locke will greet you.
          </Text>
          <TextInput
            style={[styles.nameInput, { backgroundColor: theme.colors.surface, color: theme.colors.text, borderColor: theme.colors.border }]}
            value={userName}
            onChangeText={onChangeUserName}
            placeholder="Your name"
            placeholderTextColor={theme.colors.muted}
            maxLength={30}
            autoFocus
          />
        </View>

        <View style={styles.bottom}>
          <Button label="Continue" onPress={onContinue} disabled={!userName.trim()} />
        </View>
      </KeyboardAvoidingView>
    </StepSlide>
  );
}
