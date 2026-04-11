import { useEffect, useCallback, useState, useRef } from "react";
import { LogBox, Platform, NativeModules, StyleSheet } from "react-native";
import { Stack } from "expo-router";
import { GestureHandlerRootView } from "react-native-gesture-handler";
import { View, Text, Pressable, ScrollView, Image } from "react-native";
import { StatusBar } from "expo-status-bar";
import * as SplashScreen from "expo-splash-screen";
import Animated, {
  useSharedValue,
  useAnimatedStyle,
  withRepeat,
  withSequence,
  withTiming,
  withDelay,
  FadeOut,
  Easing,
} from "react-native-reanimated";
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

const MIN_SPLASH_MS = 2200;

// ── Animated loading screen ─────────────────────────────────────────────────

function LoadingDot({ delay }: { delay: number }) {
  const opacity = useSharedValue(0.25);

  useEffect(() => {
    opacity.value = withDelay(
      delay,
      withRepeat(
        withSequence(
          withTiming(1, { duration: 400, easing: Easing.inOut(Easing.ease) }),
          withTiming(0.25, { duration: 400, easing: Easing.inOut(Easing.ease) }),
        ),
        -1,
        false,
      ),
    );
  }, []);

  const style = useAnimatedStyle(() => ({
    opacity: opacity.value,
  }));

  return (
    <Animated.View
      style={[styles.loadingDot, style]}
    />
  );
}

function AppLoadingScreen() {
  return (
    <Animated.View
      exiting={FadeOut.duration(400)}
      style={styles.loadingScreen}
    >
      <Image
        source={require("../assets/splash-icon.png")}
        style={styles.splashImage}
        resizeMode="contain"
      />

      {/* 3-dot loader overlaid at the bottom */}
      <View
        style={styles.dotLoaderContainer}
      >
        <LoadingDot delay={0} />
        <LoadingDot delay={150} />
        <LoadingDot delay={300} />
      </View>
    </Animated.View>
  );
}

/** Runs app-level background syncs that need context providers. */
function AppSyncEffects() {
  useHealthWeightSync();
  return null;
}


export function ErrorBoundary({ error, retry }: { error: Error; retry: () => void }) {
  return (
    <View style={styles.errorContainer}>
      <Text style={styles.errorTitle}>Even wolves hit walls</Text>
      <ScrollView style={styles.errorScroll}>
        <Text selectable style={styles.errorMessage}>{error.message}</Text>
        <Text selectable style={styles.errorStack}>{error.stack}</Text>
      </ScrollView>
      <Pressable onPress={retry} style={styles.errorRetryButton}>
        <Text style={styles.errorRetryText}>Try Again</Text>
      </Pressable>
    </View>
  );
}

export default function RootLayout() {
  const [appReady, setAppReady] = useState(false);
  const [showLoading, setShowLoading] = useState(true);
  const splashHidden = useRef(false);

  useEffect(() => {
    const startTime = Date.now();
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
        // Ensure the loading screen shows for at least MIN_SPLASH_MS
        const elapsed = Date.now() - startTime;
        const remaining = Math.max(0, MIN_SPLASH_MS - elapsed);
        setTimeout(() => setShowLoading(false), remaining);
      }
    }
    prepare();
  }, []);

  // Hide native splash as soon as our custom loading screen renders
  const onLoadingLayout = useCallback(() => {
    if (!splashHidden.current) {
      splashHidden.current = true;
      SplashScreen.hideAsync();
    }
  }, []);

  if (!appReady) return null;

  return (
    <GestureHandlerRootView style={{ flex: 1, backgroundColor: "#0D1117" }} onLayout={onLoadingLayout}>
      <StatusBar style="light" />
      {showLoading && <AppLoadingScreen />}
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
                    <Stack.Screen name="challenges/index" />
                    <Stack.Screen name="challenges/[id]" />
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

const styles = StyleSheet.create({
  loadingDot: {
    width: 10,
    height: 10,
    borderRadius: 5,
    backgroundColor: "#00875A",
    marginHorizontal: 6,
  },
  loadingScreen: {
    ...StyleSheet.absoluteFillObject,
    backgroundColor: "#0D1117",
    zIndex: 10,
    alignItems: "center",
    justifyContent: "center",
  },
  splashImage: {
    width: "100%",
    height: "100%",
  },
  dotLoaderContainer: {
    position: "absolute",
    bottom: 80,
    flexDirection: "row",
    justifyContent: "center",
    alignItems: "center",
  },
  errorContainer: {
    flex: 1,
    backgroundColor: "#0D1117",
    justifyContent: "center",
    alignItems: "center",
    padding: 24,
  },
  errorTitle: {
    color: "#E63946",
    fontSize: 20,
    fontWeight: "700",
    marginBottom: 12,
  },
  errorScroll: {
    maxHeight: 300,
    marginBottom: 24,
  },
  errorMessage: {
    color: "#9DA5B0",
    fontSize: 14,
    textAlign: "center",
  },
  errorStack: {
    color: "#6A737D",
    fontSize: 11,
    textAlign: "center",
    marginTop: 8,
  },
  errorRetryButton: {
    backgroundColor: "#00875A",
    paddingHorizontal: 24,
    paddingVertical: 12,
    borderRadius: 8,
  },
  errorRetryText: {
    color: "#0D1117",
    fontWeight: "600",
    fontSize: 16,
  },
});
