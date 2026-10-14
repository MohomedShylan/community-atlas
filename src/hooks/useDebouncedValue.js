
import { useEffect, useState } from "react";

// ==========================================
// COMMUNITY ATLAS
// STEP 11.4 - DEBOUNCED VALUE HOOK
// ==========================================

/**
 * Returns a value after a specified delay.
 *
 * Used by:
 * - People Directory
 * - Map Explorer
 *
 * @param {*} value
 * @param {number} delay
 * @returns {*}
 */

export function useDebouncedValue(
  value,
  delay = 350
) {
  const [debouncedValue, setDebouncedValue] =
    useState(value);

  useEffect(() => {
    const timer = setTimeout(() => {
      setDebouncedValue(value);
    }, delay);

    return () => {
      clearTimeout(timer);
    };
  }, [value, delay]);

  return debouncedValue;
}

// ==========================================
// DEFAULT EXPORT
// Required by People.jsx and MapExplorer.jsx
// ==========================================

export default useDebouncedValue;
