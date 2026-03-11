/**
 * hooks/useHealthPermissions.ts — Apple Health permission lifecycle.
 *
 * HealthKit does NOT let you query whether permissions were granted —
 * only whether they were *requested*. So we persist the grant status
 * ourselves in AsyncStorage via the health cache layer.
 *
 * Three permission tiers:
 *   minimum  — weight, workouts, steps (MVP)
 *   enhanced — + HR, resting HR, active energy
 *   full     — + HRV, sleep
 * Plus a separate write tier for pushing workouts back to Health.
 */

import { useState, useCallback, useEffect, useRef } from 'react';
import { Platform } from 'react-native';
import { getCached, setCached } from '../lib/healthkit/cache';
import {
  initializeHealthKit,
  checkAvailability,
} from '../lib/healthkit/HealthKitService';
import {
  MINIMUM_READ_PERMISSIONS,
  ENHANCED_READ_PERMISSIONS,
  FULL_READ_PERMISSIONS,
  WRITE_PERMISSIONS,
} from '../lib/healthkit/constants';

// ── Types ────────────────────────────────────────────────────────────────────

export type PermissionStatus =
  | 'not_requested'
  | 'partial'
  | 'full'
  | 'denied';

type PermissionGrant = {
  status: PermissionStatus;
  /** Which tiers have been successfully requested. */
  tiers: {
    minimum: boolean;
    enhanced: boolean;
    full: boolean;
    write: boolean;
  };
  updatedAt: string;
};

const DEFAULT_GRANT: PermissionGrant = {
  status: 'not_requested',
  tiers: { minimum: false, enhanced: false, full: false, write: false },
  updatedAt: '',
};

const CACHE_KEY = 'permission-status';
// Permissions don't expire — use a very long TTL (30 days)
const PERMISSION_TTL = 30 * 24 * 60 * 60_000;

// ── Helpers ──────────────────────────────────────────────────────────────────

function deriveStatus(tiers: PermissionGrant['tiers']): PermissionStatus {
  if (tiers.minimum && tiers.enhanced && tiers.full) return 'full';
  if (tiers.minimum || tiers.enhanced) return 'partial';
  return 'not_requested';
}

// ── Hook ─────────────────────────────────────────────────────────────────────

export function useHealthPermissions() {
  const [permissionStatus, setPermissionStatus] =
    useState<PermissionStatus>('not_requested');
  const [isAvailable, setIsAvailable] = useState(Platform.OS === 'ios');
  const grantRef = useRef<PermissionGrant>(DEFAULT_GRANT);
  const loadedRef = useRef(false);

  // Hydrate persisted grant on mount
  useEffect(() => {
    if (Platform.OS !== 'ios') {
      setIsAvailable(false);
      return;
    }

    (async () => {
      try {
        const available = checkAvailability();
        setIsAvailable(available);
        if (!available) return;

        const cached = await getCached<PermissionGrant>(CACHE_KEY);
        if (cached) {
          grantRef.current = cached;
          setPermissionStatus(cached.status);
        }
      } catch {
        // Swallow — defaults are safe
      } finally {
        loadedRef.current = true;
      }
    })();
  }, []);

  const persistGrant = useCallback(async (grant: PermissionGrant) => {
    grantRef.current = grant;
    setPermissionStatus(grant.status);
    await setCached(CACHE_KEY, grant, PERMISSION_TTL);
  }, []);

  const requestMinimumPermissions = useCallback(async (): Promise<boolean> => {
    if (!isAvailable) return false;
    try {
      await initializeHealthKit({
        permissions: {
          read: MINIMUM_READ_PERMISSIONS,
          write: [],
        },
      });
      const tiers = { ...grantRef.current.tiers, minimum: true };
      await persistGrant({
        status: deriveStatus(tiers),
        tiers,
        updatedAt: new Date().toISOString(),
      });
      return true;
    } catch {
      await persistGrant({
        ...grantRef.current,
        status: 'denied',
        updatedAt: new Date().toISOString(),
      });
      return false;
    }
  }, [isAvailable, persistGrant]);

  const requestEnhancedPermissions = useCallback(async (): Promise<boolean> => {
    if (!isAvailable) return false;
    try {
      await initializeHealthKit({
        permissions: {
          read: [...MINIMUM_READ_PERMISSIONS, ...ENHANCED_READ_PERMISSIONS],
          write: WRITE_PERMISSIONS,
        },
      });
      // Auto-enable workout sync when enhanced permissions are granted
      setCached('auto-sync-enabled', true, 365 * 24 * 60 * 60_000).catch(() => {});
      const tiers = {
        ...grantRef.current.tiers,
        minimum: true,
        enhanced: true,
        write: true,
      };
      await persistGrant({
        status: deriveStatus(tiers),
        tiers,
        updatedAt: new Date().toISOString(),
      });
      return true;
    } catch {
      return false;
    }
  }, [isAvailable, persistGrant]);

  const requestFullPermissions = useCallback(async (): Promise<boolean> => {
    if (!isAvailable) return false;
    try {
      await initializeHealthKit({
        permissions: {
          read: [
            ...MINIMUM_READ_PERMISSIONS,
            ...ENHANCED_READ_PERMISSIONS,
            ...FULL_READ_PERMISSIONS,
          ],
          write: [],
        },
      });
      const tiers = {
        ...grantRef.current.tiers,
        minimum: true,
        enhanced: true,
        full: true,
      };
      await persistGrant({
        status: deriveStatus(tiers),
        tiers,
        updatedAt: new Date().toISOString(),
      });
      return true;
    } catch {
      return false;
    }
  }, [isAvailable, persistGrant]);

  const requestWritePermissions = useCallback(async (): Promise<boolean> => {
    if (!isAvailable) return false;
    try {
      await initializeHealthKit({
        permissions: {
          read: MINIMUM_READ_PERMISSIONS,
          write: WRITE_PERMISSIONS,
        },
      });
      const tiers = {
        ...grantRef.current.tiers,
        minimum: true,
        write: true,
      };
      await persistGrant({
        status: deriveStatus(tiers),
        tiers,
        updatedAt: new Date().toISOString(),
      });
      return true;
    } catch {
      return false;
    }
  }, [isAvailable, persistGrant]);

  return {
    permissionStatus,
    isAvailable,
    requestMinimumPermissions,
    requestEnhancedPermissions,
    requestFullPermissions,
    requestWritePermissions,
    /** Whether the write tier has been granted. */
    hasWriteAccess: grantRef.current.tiers.write,
  };
}
