/**
 * hooks/useHealthWeightSync.ts — Keeps profile weight in sync with Apple Health.
 *
 * On each app foreground (debounced to once per 15 min), fetches the latest
 * body weight from HealthKit and updates the profile if it changed.
 *
 * Only runs when:
 *  - Platform is iOS
 *  - HealthKit minimum permissions have been granted (persisted status)
 *  - Profile is hydrated
 */

import { useEffect, useRef } from 'react';
import { AppState, Platform } from 'react-native';
import type { AppStateStatus } from 'react-native';
import { getCached } from '../lib/healthkit/cache';
import { useProfileContext } from '../contexts/ProfileContext';
import { loadWeightLog, saveWeightLog } from '../lib/mealStorage';
import type { WeightLogEntry } from '../src/data/mealTypes';

/** Minimum ms between foreground-triggered weight syncs. */
const DEBOUNCE_MS = 15 * 60_000; // 15 min

export function useHealthWeightSync() {
  const { profile, hydrated, updateProfile, profileRef } = useProfileContext();
  const lastSyncRef = useRef(0);

  useEffect(() => {
    if (Platform.OS !== 'ios' || !hydrated) return;

    async function syncWeight() {
      // Only sync if HealthKit permissions were granted
      const grant = await getCached<{
        tiers: { minimum: boolean };
      }>('permission-status');
      if (!grant?.tiers?.minimum) return;

      try {
        const AppleHealthKit =
          require('react-native-health') as import('react-native-health').AppleHealthKit;

        if (!AppleHealthKit || typeof AppleHealthKit.getLatestWeight !== 'function') return;

        const unit = profileRef.current.weightUnit ?? 'kg';
        const hkUnit = unit === 'lbs' ? 'pound' : 'gram';

        const value = await new Promise<number>((resolve, reject) => {
          AppleHealthKit.getLatestWeight(
            { unit: hkUnit as any },
            (err: string, result: { value: number }) => {
              if (err) reject(new Error(err));
              else resolve(result.value);
            },
          );
        });

        const finalValue = hkUnit === 'gram' ? value / 1000 : value;
        const rounded = String(Math.round(finalValue * 10) / 10);

        // Only update if weight actually changed
        if (rounded && rounded !== profileRef.current.weight) {
          updateProfile({ weight: rounded });

          // Also log to weight trend graph
          const weightKg = unit === 'lbs' ? finalValue / 2.20462 : finalValue;
          const today = new Date().toISOString().slice(0, 10);
          const existing = await loadWeightLog();
          const filtered = existing.filter((e) => e.date !== today);
          const entry: WeightLogEntry = {
            id: `wt-hk-${Date.now()}`,
            date: today,
            weightKg: Math.round(weightKg * 100) / 100,
            loggedAt: new Date().toISOString(),
            source: "healthkit",
          };
          await saveWeightLog([...filtered, entry]);
        }
      } catch {
        // Silent fail — weight sync is best-effort
      }
    }

    // Sync once on mount
    syncWeight();
    lastSyncRef.current = Date.now();

    // Sync on foreground resume (debounced)
    const handleAppState = (nextState: AppStateStatus) => {
      if (nextState === 'active') {
        const now = Date.now();
        if (now - lastSyncRef.current > DEBOUNCE_MS) {
          lastSyncRef.current = now;
          syncWeight();
        }
      }
    };

    const subscription = AppState.addEventListener('change', handleAppState);
    return () => subscription.remove();
  }, [hydrated, updateProfile, profileRef]);
}
