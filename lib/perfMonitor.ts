/**
 * lib/perfMonitor.ts — Dev-only render performance warnings.
 *
 * Usage:
 *   const t = Date.now();
 *   // ... render work ...
 *   warnSlowRender('MyComponent', Date.now() - t);
 *
 * Only emits warnings in __DEV__ builds. Zero overhead in production.
 */

/** Warn if a render exceeds the 16ms frame budget (60 fps). */
export function warnSlowRender(componentName: string, renderTimeMs: number): void {
  if (__DEV__ && renderTimeMs > 16) {
    console.warn(
      `[Perf] ${componentName} render took ${renderTimeMs}ms (>16ms budget)`,
    );
  }
}
