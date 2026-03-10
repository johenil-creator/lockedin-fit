import { ScrollView, Text, View, Pressable } from "react-native";
import { useSafeAreaInsets } from "react-native-safe-area-context";
import { useLocalSearchParams, useRouter } from "expo-router";
import { useAppTheme } from "../contexts/ThemeContext";
import { PRIVACY_POLICY, TERMS_OF_SERVICE } from "../legal";

export default function LegalScreen() {
  const { doc } = useLocalSearchParams<{ doc?: string }>();
  const { theme } = useAppTheme();
  const insets = useSafeAreaInsets();
  const router = useRouter();

  const isPrivacy = doc === "privacy";
  const title = isPrivacy ? "Privacy Policy" : "Terms of Service";
  const content = isPrivacy ? PRIVACY_POLICY : TERMS_OF_SERVICE;

  return (
    <View style={{ flex: 1, backgroundColor: theme.colors.bg, paddingTop: insets.top }}>
      <View style={{ flexDirection: "row", alignItems: "center", paddingHorizontal: 20, paddingVertical: 12 }}>
        <Pressable onPress={() => router.back()}>
          <Text style={{ fontSize: 15, fontWeight: "600", color: theme.colors.primary }}>← Back</Text>
        </Pressable>
        <Text style={{ fontSize: 18, fontWeight: "700", color: theme.colors.text, marginLeft: 12 }}>{title}</Text>
      </View>
      <ScrollView
        style={{ flex: 1 }}
        contentContainerStyle={{ paddingHorizontal: 20, paddingBottom: insets.bottom + 40 }}
      >
        <Text style={{ fontSize: 13, lineHeight: 20, color: theme.colors.muted }}>{content}</Text>
      </ScrollView>
    </View>
  );
}
