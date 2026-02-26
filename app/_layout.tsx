import { Stack } from "expo-router";
import { GestureHandlerRootView } from "react-native-gesture-handler";
import { ThemeProvider } from "../contexts/ThemeContext";
import { ToastProvider } from "../contexts/ToastContext";
import { LockeProvider } from "../contexts/LockeContext";
import { PlanProvider } from "../contexts/PlanContext";
import { ProfileProvider } from "../contexts/ProfileContext";

export default function RootLayout() {
  return (
    <GestureHandlerRootView style={{ flex: 1 }}>
      <ProfileProvider>
        <ThemeProvider>
          <ToastProvider>
            <LockeProvider>
              <PlanProvider>
                <Stack screenOptions={{ headerShown: false, animation: "slide_from_right" }}>
                  <Stack.Screen name="(tabs)" />
                  <Stack.Screen name="onboarding" options={{ gestureEnabled: false }} />
                  <Stack.Screen name="session/[id]" />
                  <Stack.Screen name="start-session" />
                  <Stack.Screen name="catalog" />
                  <Stack.Screen name="orm-test" />
                  <Stack.Screen name="evolution" />
                  <Stack.Screen name="workout-complete" options={{ gestureEnabled: false, animation: "slide_from_bottom" }} />
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
