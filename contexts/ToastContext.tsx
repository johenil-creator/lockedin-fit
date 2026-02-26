import { createContext, useContext, useState, useCallback, useRef } from "react";
import { StyleSheet, Text } from "react-native";
import Animated, {
  useSharedValue,
  useAnimatedStyle,
  withTiming,
  runOnJS,
} from "react-native-reanimated";
import { useSafeAreaInsets } from "react-native-safe-area-context";
import { useAppTheme } from "./ThemeContext";
import { radius } from "../lib/theme";

type ToastType = "success" | "error" | "info";

type ToastConfig = {
  message: string;
  type?: ToastType;
  duration?: number;
};

type ToastContextValue = {
  showToast: (config: ToastConfig) => void;
};

const ToastContext = createContext<ToastContextValue>({
  showToast: () => {},
});

export function useToast() {
  return useContext(ToastContext);
}

export function ToastProvider({ children }: { children: React.ReactNode }) {
  const { theme } = useAppTheme();
  const insets = useSafeAreaInsets();
  const [toast, setToast] = useState<ToastConfig | null>(null);
  const translateY = useSharedValue(-100);
  const timerRef = useRef<ReturnType<typeof setTimeout> | null>(null);

  const hide = useCallback(() => {
    translateY.value = withTiming(-100, { duration: 300 });
    setTimeout(() => setToast(null), 300);
  }, []);

  const showToast = useCallback((config: ToastConfig) => {
    if (timerRef.current) clearTimeout(timerRef.current);
    setToast(config);
    translateY.value = withTiming(0, { duration: 300 });
    timerRef.current = setTimeout(() => {
      hide();
    }, config.duration ?? 3000);
  }, [hide]);

  const animatedStyle = useAnimatedStyle(() => ({
    transform: [{ translateY: translateY.value }],
  }));

  const bgColor = toast
    ? {
        success: theme.colors.success,
        error: theme.colors.danger,
        info: theme.colors.surface,
      }[toast.type ?? "info"]
    : theme.colors.surface;

  const textColor = toast
    ? {
        success: theme.colors.successText,
        error: theme.colors.dangerText,
        info: theme.colors.text,
      }[toast.type ?? "info"]
    : theme.colors.text;

  return (
    <ToastContext.Provider value={{ showToast }}>
      {children}
      {toast && (
        <Animated.View
          style={[
            styles.toast,
            { backgroundColor: bgColor, top: insets.top + 8 },
            animatedStyle,
          ]}
        >
          <Text style={[styles.toastText, { color: textColor }]} numberOfLines={2}>
            {toast.message}
          </Text>
        </Animated.View>
      )}
    </ToastContext.Provider>
  );
}

const styles = StyleSheet.create({
  toast: {
    position: "absolute",
    left: 16,
    right: 16,
    paddingVertical: 14,
    paddingHorizontal: 20,
    borderRadius: radius.md,
    zIndex: 9999,
    shadowColor: "#000",
    shadowOffset: { width: 0, height: 4 },
    shadowOpacity: 0.2,
    shadowRadius: 8,
    elevation: 6,
  },
  toastText: {
    fontSize: 14,
    fontWeight: "600",
    textAlign: "center",
  },
});
