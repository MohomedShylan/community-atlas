
/**
 * COMMUNITY ATLAS
 * STEP 11.4 - REQUEST PERFORMANCE TIMER
 *
 * Usage:
 *
 * const result = await measureRequest(
 *   "Dashboard statistics",
 *   () => getDashboardStats()
 * );
 *
 * Only logs timings in development.
 */

export async function measureRequest(
  label,
  operation
) {
  if (typeof operation !== "function") {
    throw new TypeError(
      "measureRequest requires an operation function."
    );
  }

  const startedAt = performance.now();

  try {
    return await operation();
  } finally {
    const duration =
      performance.now() - startedAt;

    if (import.meta.env.DEV) {
      console.info(
        `[Community Atlas Performance] ${label}: ${duration.toFixed(1)} ms`
      );
    }
  }
}
