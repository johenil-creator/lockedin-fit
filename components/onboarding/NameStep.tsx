import { View, Text, TextInput, KeyboardAvoidingView, Platform } from "react-native";
import { Button } from "../Button";
import { useAppTheme } from "../../contexts/ThemeContext";
import { StepSlide, onboardingStyles as styles } from "./shared";

type Props = {
  userName: string;
  onChangeUserName: (name: string) => void;
  onContinue: () => void;
};

export function NameStep({ userName, onChangeUserName, onContinue }: Props) {
  const { theme } = useAppTheme();
  return (
    <StepSlide>
      <KeyboardAvoidingView
        style={[styles.container, { backgroundColor: theme.colors.bg }]}
        behavior={Platform.OS === "ios" ? "padding" : undefined}
      >
        <View style={styles.center}>
          <Text style={[styles.welcomeTitle, { color: theme.colors.text }]}>
            What should I call you?
          </Text>
          <TextInput
            style={[styles.nameInput, { backgroundColor: theme.colors.surface, color: theme.colors.text, borderColor: theme.colors.border }]}
            value={userName}
            onChangeText={onChangeUserName}
            placeholder="Your name"
            placeholderTextColor={theme.colors.muted}
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
