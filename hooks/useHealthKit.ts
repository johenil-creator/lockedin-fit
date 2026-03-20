import { useState, useCallback } from "react";
import { Platform } from "react-native";
import type { HealthUnit } from "react-native-health";

type HealthKitResult = {
  /** Latest weight as a string (same format as UserProfile.weight) */
  weight: string | null;
  loading: boolean;
  error: string | null;
  /** HealthKit is only available on iOS devices */
  available: boolean;
  /** Fetch the latest body weight from Apple Health (assumes permissions already granted) */
  fetchWeight: (unit: "kg" | "lbs") => Promise<string | null>;
};

export function useHealthKit(): HealthKitResult {
  const [weight, setWeight] = useState<string | null>(null);
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState<string | null>(null);

  const available = Platform.OS === "ios";

  const fetchWeight = useCallback(
    async (unit: "kg" | "lbs"): Promise<string | null> => {
      if (!available) {
        setError("HealthKit is only available on iOS");
        return null;
      }

      setLoading(true);
      setError(null);

      try {
        const AppleHealthKit =
          require("react-native-health") as import("react-native-health").AppleHealthKit;

        if (!AppleHealthKit || typeof AppleHealthKit.getLatestWeight !== "function") {
          throw new Error(
            "HealthKit native module not linked. Rebuild your dev client with: npx expo run:ios",
          );
        }

        // Fetch latest weight — HealthKit uses "pound" or "gram" (no "kg")
        const hkUnit: HealthUnit = unit === "lbs" ? ("pound" as HealthUnit) : ("gram" as HealthUnit);

        if (__DEV__) console.log("[useHealthKit] calling getLatestWeight, unit:", hkUnit);

        const value = await new Promise<number | null>((resolve) => {
          const timeout = setTimeout(() => {
            if (__DEV__) console.warn("[useHealthKit] getLatestWeight timed out after 10s");
            resolve(null);
          }, 10_000);

          AppleHealthKit.getLatestWeight(
            { unit: hkUnit },
            (err: any, result: { value: number }) => {
              clearTimeout(timeout);
              if (__DEV__) console.log("[useHealthKit] getLatestWeight callback:", { err, result });
              if (err) {
                // Any error from getLatestWeight likely means no data — treat as null
                resolve(null);
              } else if (!result || result.value == null || result.value === 0) {
                resolve(null);
              } else {
                resolve(result.value);
              }
            },
          );
        });

        if (value == null) {
          // No weight data in Health — not an error, just skip
          setLoading(false);
          return null;
        }

        // Convert grams → kg when needed
        const finalValue = hkUnit === "gram" ? value / 1000 : value;
        const rounded = String(Math.round(finalValue * 10) / 10);

        setWeight(rounded);
        setLoading(false);
        return rounded;
      } catch (e: any) {
        const raw = typeof e === "string" ? e : typeof e?.message === "string" ? e.message : "";
        if (__DEV__) console.warn("[useHealthKit] error:", raw, e);
        setError("Could not read weight from Apple Health.");
        setLoading(false);
        return null;
      }
    },
    [available],
  );

  return { weight, loading, error, available, fetchWeight };
}
