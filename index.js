// Custom entry point — wraps expo-router with a global error handler
// so we can see crash messages in preview/release builds.
import { Alert, Platform } from "react-native";

// Capture any unhandled JS errors and show an alert instead of silently crashing
if (ErrorUtils && typeof ErrorUtils.setGlobalHandler === "function") {
  const originalHandler = ErrorUtils.getGlobalHandler();
  ErrorUtils.setGlobalHandler((error, isFatal) => {
    if (Platform.OS === "ios" || Platform.OS === "android") {
      Alert.alert(
        isFatal ? "Fatal Error" : "Error",
        (error?.message || String(error)) +
          "\n\n" +
          (error?.stack || "").slice(0, 500),
      );
    }
    if (originalHandler) {
      originalHandler(error, isFatal);
    }
  });
}

// Now load expo-router
require("expo-router/entry");
