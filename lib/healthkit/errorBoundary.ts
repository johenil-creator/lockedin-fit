/**
 * lib/healthkit/errorBoundary.ts — Error handling utilities for HealthKit operations.
 *
 * Provides graceful fallbacks so HealthKit failures never crash the app
 * or block the UI.
 */

import { HealthKitError } from './types';

// ── Type Guard ───────────────────────────────────────────────────────────────

/**
 * Check if an error is a HealthKitError.
 */
export function isHealthKitError(error: unknown): error is HealthKitError {
  return error instanceof HealthKitError;
}

// ── Fallback Wrapper ─────────────────────────────────────────────────────────

/**
 * Wrap any async HealthKit call with a graceful fallback.
 *
 * On success, returns the result. On failure, logs the error and
 * returns the fallback value. Never throws.
 *
 * @param fn       - Async function that calls HealthKit
 * @param fallback - Value to return if the call fails
 * @param label    - Optional label for logging
 */
export async function withHealthKitFallback<T>(
  fn: () => Promise<T>,
  fallback: T,
  label?: string,
): Promise<T> {
  try {
    return await fn();
  } catch (error) {
    logHealthKitEvent({
      type: 'error',
      message: `${label ?? 'HealthKit call'} failed`,
      error,
    });
    return fallback;
  }
}

/**
 * Synchronous version for wrapping non-async HealthKit operations.
 */
export function withHealthKitFallbackSync<T>(
  fn: () => T,
  fallback: T,
  label?: string,
): T {
  try {
    return fn();
  } catch (error) {
    logHealthKitEvent({
      type: 'error',
      message: `${label ?? 'HealthKit call'} failed`,
      error,
    });
    return fallback;
  }
}

// ── User-Friendly Error Messages ─────────────────────────────────────────────

/**
 * Convert a HealthKit error into a user-friendly message.
 */
export function formatHealthError(error: unknown): string {
  if (isHealthKitError(error)) {
    switch (error.code) {
      case 'not_available':
        return 'Apple Health is not available on this device.';
      case 'permission_denied':
        return 'Health access was denied. You can enable it in Settings > Privacy & Security > Health.';
      case 'not_linked':
        return 'Health module not ready. Please rebuild the app.';
      case 'fetch_failed':
        return 'Unable to read health data. Please try again.';
      case 'write_failed':
        return 'Unable to save workout to Apple Health.';
    }
  }

  if (error instanceof Error) {
    if (error.message.includes('denied')) {
      return 'Health access denied. Enable it in Settings > Privacy & Security > Health.';
    }
    return error.message;
  }

  return 'An unexpected error occurred with Apple Health.';
}

// ── Event Logging ────────────────────────────────────────────────────────────

type HealthKitEvent = {
  type: 'info' | 'warning' | 'error';
  message: string;
  error?: unknown;
  metadata?: Record<string, unknown>;
};

/**
 * Log a HealthKit event for debugging.
 * Console-only — never sends data externally.
 */
export function logHealthKitEvent(event: HealthKitEvent): void {
  const prefix = `[HealthKit:${event.type}]`;

  switch (event.type) {
    case 'error':
      console.error(prefix, event.message, event.error ?? '');
      break;
    case 'warning':
      console.warn(prefix, event.message);
      break;
    default:
      if (__DEV__) {
        console.log(prefix, event.message, event.metadata ?? '');
      }
  }
}
