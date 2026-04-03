import { useEffect, useCallback, useState } from "react";
import { LogBox, Alert, Platform, NativeModules } from "react-native";
import { Stack } from "expo-router";
import { GestureHandlerRootView } from "react-native-gesture-handler";
import { View, Text, Pressable, ScrollView } from "react-native";
import * as SplashScreen from "expo-splash-screen";
import { ThemeProvider } from "../contexts/ThemeContext";

// Reanimated 4.x layout animations (FadeIn/FadeInDown entering) internally
// write to shared values during render. This is a known library issue.
LogBox.ignoreLogs(["[Reanimated] Writing to `value` during component render"]);

const origWarn = console.warn;
console.warn = (...args: any[]) => {
  if (typeof args[0] === "string" && args[0].includes("[Reanimated] Writing to `value`")) return;
  origWarn(...args);
};
import { ToastProvider } from "../contexts/ToastContext";
import { LockeProvider } from "../contexts/LockeContext";
import { PlanProvider } from "../contexts/PlanContext";
import { ProfileProvider } from "../contexts/ProfileContext";
import { AuthProvider } from "../contexts/AuthContext";
import { preloadLockeAssets } from "../components/Locke/LockeMascot";
import { AvatarPrewarmer } from "../components/avatar/LockeAvatarBuilder";
import { loadLockeCustomization } from "../lib/storage";
import { useHealthWeightSync } from "../hooks/useHealthWeightSync";
import mobileAds from "react-native-google-mobile-ads";

SplashScreen.preventAutoHideAsync();

/** Runs app-level background syncs that need context providers. */
function AppSyncEffects() {
  useHealthWeightSync();
  return null;
}


export function ErrorBoundary({ error, retry }: { error: Error; retry: () => void }) {
  return (
    <View style={{ flex: 1, backgroundColor: "#0D1117", justifyContent: "center", alignItems: "center", padding: 24 }}>
      <Text style={{ color: "#E63946", fontSize: 20, fontWeight: "700", marginBottom: 12 }}>Even wolves hit walls</Text>
      <ScrollView style={{ maxHeight: 300, marginBottom: 24 }}>
        <Text selectable style={{ color: "#9DA5B0", fontSize: 14, textAlign: "center" }}>{error.message}</Text>
        <Text selectable style={{ color: "#6A737D", fontSize: 11, textAlign: "center", marginTop: 8 }}>{error.stack}</Text>
      </ScrollView>
      <Pressable onPress={retry} style={{ backgroundColor: "#00875A", paddingHorizontal: 24, paddingVertical: 12, borderRadius: 8 }}>
        <Text style={{ color: "#0D1117", fontWeight: "600", fontSize: 16 }}>Try Again</Text>
      </Pressable>
    </View>
  );
}

export default function RootLayout() {
  const [appReady, setAppReady] = useState(false);

  useEffect(() => {
    async function prepare() {
      try {
        await preloadLockeAssets();
        await loadLockeCustomization();
        // ATT prompt before ads — requires native rebuild; skip gracefully if unavailable
        if (Platform.OS === "ios" && NativeModules.ExpoTrackingTransparency) {
          try {
            const { requestTrackingPermissionsAsync } = require("expo-tracking-transparency");
            await requestTrackingPermissionsAsync();
          } catch {
            // ATT request failed — continue without it
          }
        }
        mobileAds().initialize();
      } catch {
        // continue even if prep fails
      } finally {
        setAppReady(true);
      }
    }
    prepare();
  }, []);

  const onLayoutRootView = useCallback(() => {
    if (appReady) {
      SplashScreen.hideAsync();
    }
  }, [appReady]);

  if (!appReady) return null;

  return (
    <GestureHandlerRootView style={{ flex: 1 }} onLayout={onLayoutRootView}>
      <AvatarPrewarmer />
      <AuthProvider>
        <ProfileProvider>
          <AppSyncEffects />
          <ThemeProvider>
            <ToastProvider>
              <LockeProvider>
                <PlanProvider>
                  <Stack screenOptions={{ headerShown: false, animation: "slide_from_right", contentStyle: { backgroundColor: "#0D1117" } }}>
                    <Stack.Screen name="(tabs)" />
                    <Stack.Screen name="onboarding" options={{ gestureEnabled: false, animation: "none" }} />
                    <Stack.Screen name="session/[id]" />
                    <Stack.Screen name="start-session" />
                    <Stack.Screen name="quick-workout" />
                    <Stack.Screen name="catalog" />
                    <Stack.Screen name="orm-test" />
                    <Stack.Screen name="evolution" />
                    <Stack.Screen name="plan-builder" />
                    <Stack.Screen name="saved-plans" />
                    <Stack.Screen name="workout-complete" options={{ gestureEnabled: false, animation: "slide_from_bottom" }} />
                    <Stack.Screen name="cardio-setup" />
                    <Stack.Screen name="cardio-session" options={{ gestureEnabled: false }} />
                    <Stack.Screen name="profile" />
                    <Stack.Screen name="settings" />
                    <Stack.Screen name="exercise-library" options={{ headerShown: false }} />
                    <Stack.Screen name="import-drive" />
                    <Stack.Screen name="auth" options={{ animation: "slide_from_bottom" }} />
                    <Stack.Screen name="locke-studio" options={{ animation: "slide_from_bottom" }} />
                    <Stack.Screen name="pack-detail" />
                    <Stack.Screen name="create-pack" options={{ animation: "slide_from_bottom" }} />
                    <Stack.Screen name="join-pack" options={{ animation: "slide_from_bottom" }} />
                    <Stack.Screen name="friends" />
                    <Stack.Screen name="user-profile" />
                    <Stack.Screen name="pack-discovery" />
                    <Stack.Screen name="lifts" />
                    <Stack.Screen name="quests" />
                    <Stack.Screen name="event" />
                    <Stack.Screen name="meals" />
                  </Stack>
                </PlanProvider>
              </LockeProvider>
            </ToastProvider>
          </ThemeProvider>
        </ProfileProvider>
      </AuthProvider>
    </GestureHandlerRootView>
  );
}
