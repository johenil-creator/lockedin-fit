import { useEffect, useCallback, useState, useRef } from "react";
import { LogBox, Platform, NativeModules, StyleSheet, AppState } from "react-native";
import { Stack, useRouter } from "expo-router";
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
  interpolate,
} from "react-native-reanimated";
import { ThemeProvider } from "../contexts/ThemeContext";

// Reanimated 4.x layout animations (FadeIn/FadeInDown entering) internally
// write to shared values during render. This is a known library issue.
// expo-notifications native module auto-fires a push-token registration check
// on startup; on restricted devices the native JSI call rejects before any JS
// .catch() can be attached — harmless, suppress the dev-only LogBox noise.
LogBox.ignoreLogs([
  "[Reanimated] Writing to `value` during component render",
  "Uncaught (in promise, id: 0) Error: The requested operation couldn't be completed because the feature is not supported.",
]);

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
import { preloadLockeAssets, LockeMascot } from "../components/Locke/LockeMascot";
import { AvatarPrewarmer } from "../components/avatar/LockeAvatarBuilder";
import { loadLockeCustomization } from "../lib/storage";
import { useHealthWeightSync } from "../hooks/useHealthWeightSync";
import { attemptRestore, hasLocalData, hadExistingDeviceId, triggerBackup } from "../lib/cloudBackup";
import { onAuthStateChanged } from "firebase/auth";
import { auth } from "../lib/firebase";
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

  useEffect(() => {
    const sub = AppState.addEventListener("change", (state) => {
      if (state === "background" || state === "inactive") {
        triggerBackup();
      }
    });
    return () => sub.remove();
  }, []);

  return null;
}


// ── Restore Prompt ───────────────────────────────────────────────────────────

const GLOW_SIZE = 220;

function RestorePromptOverlay({ onStartFresh }: { onStartFresh: () => void }) {
  const router = useRouter();

  const lockeY       = useSharedValue(40);
  const lockeOpacity = useSharedValue(0);
  const glowPulse    = useSharedValue(0);
  const headY        = useSharedValue(20);
  const headOpacity  = useSharedValue(0);
  const subOpacity   = useSharedValue(0);
  const btnY         = useSharedValue(24);
  const btnOpacity   = useSharedValue(0);

  useEffect(() => {
    // Phase 1 — mascot drops in
    lockeY.value       = withTiming(0,  { duration: 420, easing: Easing.out(Easing.back(1.3)) });
    lockeOpacity.value = withTiming(1,  { duration: 380 });
    // Infinite glow pulse
    glowPulse.value = withRepeat(
      withSequence(
        withTiming(1, { duration: 1600, easing: Easing.inOut(Easing.ease) }),
        withTiming(0, { duration: 1600, easing: Easing.inOut(Easing.ease) }),
      ), -1, false,
    );
    // Phase 2 — headline
    headY.value       = withDelay(220, withTiming(0, { duration: 360, easing: Easing.out(Easing.quad) }));
    headOpacity.value = withDelay(220, withTiming(1, { duration: 360 }));
    // Phase 3 — subtitle
    subOpacity.value  = withDelay(400, withTiming(1, { duration: 360 }));
    // Phase 4 — buttons
    btnY.value        = withDelay(560, withTiming(0, { duration: 380, easing: Easing.out(Easing.back(1.1)) }));
    btnOpacity.value  = withDelay(560, withTiming(1, { duration: 360 }));
  }, []);

  const lockeAnim = useAnimatedStyle(() => ({
    opacity: lockeOpacity.value,
    transform: [{ translateY: lockeY.value }],
  }));
  const glowAnim = useAnimatedStyle(() => ({
    opacity: interpolate(glowPulse.value, [0, 1], [0.18, 0.48]),
  }));
  const headAnim = useAnimatedStyle(() => ({
    opacity: headOpacity.value,
    transform: [{ translateY: headY.value }],
  }));
  const subAnim = useAnimatedStyle(() => ({ opacity: subOpacity.value }));
  const btnAnim = useAnimatedStyle(() => ({
    opacity: btnOpacity.value,
    transform: [{ translateY: btnY.value }],
  }));

  return (
    <View style={rStyles.overlay}>
      {/* ── Mascot + glow ── */}
      <View style={rStyles.mascotSection}>
        <Animated.View style={[rStyles.glow, glowAnim]} />
        <Animated.View style={lockeAnim}>
          <LockeMascot size={290} mood="proud" />
        </Animated.View>
      </View>

      {/* ── Text ── */}
      <Animated.View style={[rStyles.textBlock, headAnim]}>
        <Text style={rStyles.eyebrow}>LOCKED IN FIT</Text>
        <Text style={rStyles.headline}>Welcome back.</Text>
      </Animated.View>

      <Animated.View style={[rStyles.subtitleWrap, subAnim]}>
        <Text style={rStyles.subtitle}>
          Sign in to restore your workouts, XP, and streak — on any device.
        </Text>
      </Animated.View>

      {/* ── Buttons ── */}
      <Animated.View style={[rStyles.btnBlock, btnAnim]}>
        <Pressable style={rStyles.primaryBtn} onPress={() => router.push("/auth")}>
          <Text style={rStyles.primaryBtnText}>Sign in to Restore</Text>
        </Pressable>
        <Pressable style={rStyles.skipBtn} onPress={onStartFresh}>
          <Text style={rStyles.skipBtnText}>Start Fresh</Text>
        </Pressable>
      </Animated.View>
    </View>
  );
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
  const [showRestorePrompt, setShowRestorePrompt] = useState(false);
  const splashHidden = useRef(false);

  useEffect(() => {
    const startTime = Date.now();
    async function prepare() {
      try {
        // Check Keychain BEFORE attemptRestore creates a new ID
        const [wasInstalled, alreadyHasData] = await Promise.all([
          hadExistingDeviceId(),
          hasLocalData(),
        ]);
        const restored = await attemptRestore();
        // Only prompt if this device previously had the app installed
        // (Keychain ID existed) but data is now missing — reinstall scenario
        if (!restored && !alreadyHasData && wasInstalled) {
          setShowRestorePrompt(true);
        }
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
        mobileAds().initialize().catch(() => {});
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

  // After user signs in from the restore prompt, re-attempt restore
  useEffect(() => {
    if (!showRestorePrompt) return;
    const unsub = onAuthStateChanged(auth, async (user) => {
      if (user) {
        const restored = await attemptRestore();
        if (restored) setShowRestorePrompt(false);
      }
    });
    return unsub;
  }, [showRestorePrompt]);

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
                    <Stack.Screen name="plan-complete" options={{ gestureEnabled: false, animation: "slide_from_bottom" }} />
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
                  {showRestorePrompt && (
                    <RestorePromptOverlay onStartFresh={() => setShowRestorePrompt(false)} />
                  )}
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

// ── Restore prompt styles (separate sheet to avoid collision) ────────────────
const rStyles = StyleSheet.create({
  overlay: {
    ...StyleSheet.absoluteFillObject,
    backgroundColor: "#0D1117",
    zIndex: 20,
    alignItems: "center",
    justifyContent: "flex-end",
    paddingBottom: 52,
  },
  mascotSection: {
    position: "absolute",
    top: 0,
    left: 0,
    right: 0,
    bottom: "45%",
    alignItems: "center",
    justifyContent: "flex-end",
  },
  glow: {
    position: "absolute",
    bottom: 10,
    width: GLOW_SIZE,
    height: GLOW_SIZE,
    borderRadius: GLOW_SIZE / 2,
    backgroundColor: "#00875A",
  },
  textBlock: {
    width: "100%",
    paddingHorizontal: 32,
    marginBottom: 10,
    alignItems: "center",
  },
  eyebrow: {
    fontSize: 11,
    fontWeight: "700",
    letterSpacing: 2,
    color: "#00875A",
    marginBottom: 10,
  },
  headline: {
    fontSize: 34,
    fontWeight: "800",
    color: "#E6EDF3",
    textAlign: "center",
    letterSpacing: -0.5,
  },
  subtitleWrap: {
    width: "100%",
    paddingHorizontal: 40,
    marginBottom: 36,
  },
  subtitle: {
    fontSize: 15,
    color: "#8B949E",
    textAlign: "center",
    lineHeight: 22,
  },
  btnBlock: {
    width: "100%",
    paddingHorizontal: 24,
    gap: 4,
  },
  primaryBtn: {
    height: 56,
    borderRadius: 14,
    backgroundColor: "#00875A",
    alignItems: "center",
    justifyContent: "center",
    shadowColor: "#00875A",
    shadowOffset: { width: 0, height: 0 },
    shadowOpacity: 0.35,
    shadowRadius: 16,
    elevation: 8,
  },
  primaryBtnText: {
    fontSize: 16,
    fontWeight: "700",
    color: "#FFFFFF",
    letterSpacing: 0.3,
  },
  skipBtn: {
    height: 48,
    alignItems: "center",
    justifyContent: "center",
  },
  skipBtnText: {
    fontSize: 14,
    fontWeight: "500",
    color: "#6A737D",
  },
});
