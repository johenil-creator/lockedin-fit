/**
 * lib/healthkit/cache.ts — AsyncStorage-backed TTL cache for health data.
 *
 * Each data type has its own TTL. All keys live under the
 * `@lockedinfit/health/` namespace to avoid collisions with the rest
 * of the storage layer.
 */

import AsyncStorage from '@react-native-async-storage/async-storage';

// ── Namespace ────────────────────────────────────────────────────────────────

const NAMESPACE = '@lockedinfit/health/';

/** All known cache sub-keys. Used by `invalidateAll` to enumerate. */
const KNOWN_TYPES = [
  'daily-snapshot',
  'weekly-snapshots',
  'external-workouts',
  'heart-rate',
  'resting-hr',
  'hrv',
  'steps',
  'active-energy',
  'sleep',
  'last-sync-time',
  'permission-status',
  'auto-sync-enabled',
] as const;

export type HealthCacheType = (typeof KNOWN_TYPES)[number];

// ── Default TTLs (ms) ────────────────────────────────────────────────────────

export const DEFAULT_TTLS: Record<string, number> = {
  'heart-rate':        5 * 60_000,         // 5 min
  'resting-hr':        5 * 60_000,         // 5 min
  'hrv':               5 * 60_000,         // 5 min
  'steps':            15 * 60_000,         // 15 min
  'active-energy':    15 * 60_000,         // 15 min
  'sleep':            60 * 60_000,         // 1 hour
  'daily-snapshot':   15 * 60_000,         // 15 min
  'weekly-snapshots': 15 * 60_000,         // 15 min
  'external-workouts': 30 * 60_000,        // 30 min
};

// ── Internal envelope ────────────────────────────────────────────────────────

type CacheEntry<T> = {
  data: T;
  storedAt: number;
  ttlMs: number;
};

// ── Helpers ──────────────────────────────────────────────────────────────────

function storageKey(type: string): string {
  return `${NAMESPACE}${type}`;
}

// ── Public API ───────────────────────────────────────────────────────────────

/**
 * Retrieve a cached value. Returns null if expired or missing.
 * Expired entries are cleaned up asynchronously.
 */
export async function getCached<T>(type: string): Promise<T | null> {
  try {
    const raw = await AsyncStorage.getItem(storageKey(type));
    if (!raw) return null;

    const entry: CacheEntry<T> = JSON.parse(raw);
    const age = Date.now() - entry.storedAt;

    if (age > entry.ttlMs) {
      // Expired — clean up in background
      AsyncStorage.removeItem(storageKey(type)).catch(() => {});
      return null;
    }

    return entry.data;
  } catch {
    return null;
  }
}

/**
 * Store a value in the cache with an optional TTL override.
 * Falls back to the default TTL for the given type, or 15 min.
 */
export async function setCached<T>(
  type: string,
  data: T,
  ttlMs?: number,
): Promise<void> {
  const effectiveTtl = ttlMs ?? DEFAULT_TTLS[type] ?? 15 * 60_000;
  const entry: CacheEntry<T> = {
    data,
    storedAt: Date.now(),
    ttlMs: effectiveTtl,
  };
  try {
    await AsyncStorage.setItem(storageKey(type), JSON.stringify(entry));
  } catch {
    // Cache is best-effort — swallow errors
  }
}

/** Remove a single cache entry by type. */
export async function invalidateType(type: string): Promise<void> {
  try {
    await AsyncStorage.removeItem(storageKey(type));
  } catch {
    // best-effort
  }
}

/** Remove all health-related cache entries. */
export async function invalidateAll(): Promise<void> {
  try {
    const keys = KNOWN_TYPES.map((t) => storageKey(t));
    await AsyncStorage.multiRemove([...keys]);
  } catch {
    // best-effort
  }
}
