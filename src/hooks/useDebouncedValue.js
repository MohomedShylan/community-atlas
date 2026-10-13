
import { useEffect, useState } from "react";

/**
 * Returns a debounced version of a value.
 *
 * Example:
 * const delayedSearch = useDebouncedValue(
 *   search,
 *   300
 * );
 *
 * @param {*} value
 * @param {number} delay
 * @returns {*}
 */
export default function useDebouncedValue(
  value,
  delay = 300
) {
  const [debouncedValue, setDebouncedValue] =
    useState(value);

  useEffect(() => {
    const timeoutId = window.setTimeout(() => {
      setDebouncedValue(value);
    }, delay);

    return () => {
      window.clearTimeout(timeoutId);
    };
  }, [value, delay]);

  return debouncedValue;
}
