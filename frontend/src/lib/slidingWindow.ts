/**
 * Sliding window for efficient rendering of large telemetry datasets.
 * Only returns ~windowSize data points around the current position.
 */

export interface WindowedData<T> {
  data: T[];
  startIndex: number;
  endIndex: number;
}

/**
 * Compute a sliding window around the current index.
 * Returns at most `windowSize` items centered on `currentIndex`.
 */
export function slidingWindow<T>(
  items: T[],
  currentIndex: number,
  windowSize: number = 2000,
): WindowedData<T> {
  if (items.length === 0) {
    return { data: [], startIndex: 0, endIndex: 0 };
  }

  const half = Math.floor(windowSize / 2);
  let startIndex = Math.max(0, currentIndex - half);
  let endIndex = Math.min(items.length, startIndex + windowSize);

  // Adjust start if we're near the end
  if (endIndex === items.length) {
    startIndex = Math.max(0, endIndex - windowSize);
  }

  return {
    data: items.slice(startIndex, endIndex),
    startIndex,
    endIndex,
  };
}

/**
 * Convert a timestamp to the nearest index in a sorted array.
 */
export function timestampToIndex(
  timestamps: number[],
  t: number,
): number {
  if (timestamps.length === 0) return 0;
  if (t <= timestamps[0]) return 0;
  if (t >= timestamps[timestamps.length - 1]) return timestamps.length - 1;

  let lo = 0;
  let hi = timestamps.length - 1;

  while (hi - lo > 1) {
    const mid = (lo + hi) >>> 1;
    if (timestamps[mid] <= t) {
      lo = mid;
    } else {
      hi = mid;
    }
  }

  // Return whichever is closer
  return t - timestamps[lo] <= timestamps[hi] - t ? lo : hi;
}
