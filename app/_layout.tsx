import { useEffect } from "react";
import { Stack } from "expo-router";
import { GestureHandlerRootView } from "react-native-gesture-handler";
import { View, Text, Pressable } from "react-native";
import { ThemeProvider } from "../contexts/ThemeContext";
import { ToastProvider } from "../contexts/ToastContext";
import { LockeProvider } from "../contexts/LockeContext";
import { PlanProvider } from "../contexts/PlanContext";
import { ProfileProvider } from "../contexts/ProfileContext";
import { preloadLockeAssets } from "../components/Locke/LockeMascot";

export function ErrorBoundary({ error, retry }: { error: Error; retry: () => void }) {
  return (
    <View style={{ flex: 1, backgroundColor: "#0D1117", justifyContent: "center", alignItems: "center", padding: 24 }}>
      <Text style={{ color: "#E63946", fontSize: 20, fontWeight: "700", marginBottom: 12 }}>Something went wrong</Text>
      <Text style={{ color: "#9DA5B0", fontSize: 14, textAlign: "center", marginBottom: 24 }}>{error.message}</Text>
      <Pressable onPress={retry} style={{ backgroundColor: "#00E85C", paddingHorizontal: 24, paddingVertical: 12, borderRadius: 8 }}>
        <Text style={{ color: "#0D1117", fontWeight: "600", fontSize: 16 }}>Try Again</Text>
      </Pressable>
    </View>
  );
}

export default function RootLayout() {
  useEffect(() => { preloadLockeAssets(); }, []);
  return (
    <GestureHandlerRootView style={{ flex: 1 }}>
      <ProfileProvider>
        <ThemeProvider>
          <ToastProvider>
            <LockeProvider>
              <PlanProvider>
                <Stack screenOptions={{ headerShown: false, animation: "slide_from_right", contentStyle: { backgroundColor: "#0D1117" } }}>
                  <Stack.Screen name="(tabs)" />
                  <Stack.Screen name="onboarding" options={{ gestureEnabled: false, animation: "none" }} />
                  <Stack.Screen name="session/[id]" />
                  <Stack.Screen name="start-session" />
                  <Stack.Screen name="catalog" />
                  <Stack.Screen name="orm-test" />
                  <Stack.Screen name="evolution" />
                  <Stack.Screen name="workout-complete" options={{ gestureEnabled: false, animation: "slide_from_bottom" }} />
                  <Stack.Screen name="cardio-setup" />
                  <Stack.Screen name="cardio-session" options={{ gestureEnabled: false }} />
                  <Stack.Screen name="settings" />
                </Stack>
              </PlanProvider>
            </LockeProvider>
          </ToastProvider>
        </ThemeProvider>
      </ProfileProvider>
    </GestureHandlerRootView>
  );
}
