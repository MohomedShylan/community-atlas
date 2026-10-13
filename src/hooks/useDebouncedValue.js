
/**
 * Measure a request without logging
 * personally identifiable data.
 *
 * Timings appear in development only.
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
