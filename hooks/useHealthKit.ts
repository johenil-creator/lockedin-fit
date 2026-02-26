import { useState, useCallback } from "react";
import { Platform } from "react-native";
import type { HealthPermission, HealthUnit } from "react-native-health";

type HealthKitResult = {
  /** Latest weight as a string (same format as UserProfile.weight) */
  weight: string | null;
  loading: boolean;
  error: string | null;
  /** HealthKit is only available on iOS devices */
  available: boolean;
  /** Request permission & fetch the latest body weight from Apple Health */
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

        const permissions = {
          permissions: {
            read: [AppleHealthKit.Constants.Permissions.BodyMass],
            write: [] as HealthPermission[],
          },
        };

        // Initialize (requests permission on first call)
        await new Promise<void>((resolve, reject) => {
          AppleHealthKit.initHealthKit(permissions, (err: string) => {
            if (err) reject(new Error(err));
            else resolve();
          });
        });

        // Fetch latest weight — HealthKit uses "pound" or "gram" (no "kg")
        const hkUnit: HealthUnit = unit === "lbs" ? ("pound" as HealthUnit) : ("gram" as HealthUnit);
        const value = await new Promise<number>((resolve, reject) => {
          AppleHealthKit.getLatestWeight(
            { unit: hkUnit },
            (err: string, result: { value: number }) => {
              if (err) reject(new Error(err));
              else resolve(result.value);
            },
          );
        });

        // Convert grams → kg when needed
        const finalValue = hkUnit === "gram" ? value / 1000 : value;
        const rounded = String(Math.round(finalValue * 10) / 10);

        setWeight(rounded);
        setLoading(false);
        return rounded;
      } catch (e: any) {
        const msg =
          e?.message?.includes("denied") || e?.message?.includes("not determined")
            ? "Health access denied. Enable it in Settings > Privacy > Health."
            : e?.message ?? "Failed to read weight from Health";
        setError(msg);
        setLoading(false);
        return null;
      }
    },
    [available],
  );

  return { weight, loading, error, available, fetchWeight };
}
