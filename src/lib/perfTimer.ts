/**
 * Lightweight dev-only performance measurement.
 * Wraps a function with performance.now() timing and logs to console.
 * No-ops in production builds (tree-shaken by bundler when import.meta.env.DEV is false).
 */

const IS_DEV = import.meta.env.DEV;

/**
 * Time a synchronous function and log its duration.
 * Returns the function's result unchanged.
 *
 * Usage:
 *   const result = perfTime('handleSelectionDragEnd', { objects: 200, frames: 10 }, () => {
 *     // ... expensive work ...
 *     return updates;
 *   });
 */
export function perfTime<T>(label: string, meta: Record<string, number | string>, fn: () => T): T {
  if (!IS_DEV) return fn();

  const start = performance.now();
  const result = fn();
  const elapsed = performance.now() - start;

  const metaStr = Object.entries(meta)
    .map(([k, v]) => `${k}=${v}`)
    .join(', ');

  // eslint-disable-next-line no-console
  console.log(`[perf] ${label}: ${elapsed.toFixed(2)}ms (${metaStr})`);

  return result;
}
