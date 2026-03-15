import { TelemetryPoint } from "../types/schema";

/**
 * Frame-indexed telemetry for O(1) lookup by frame number.
 */
export interface FrameIndexedTelemetry {
  fps: number;
  totalFrames: number;
  channels: string[];
  /** frames[frameIndex][channelIndex] = interpolated value */
  frames: Float64Array[];
}

/**
 * Parse telemetry points into a frame-indexed array via linear interpolation.
 * Returns O(1) lookup by frame index.
 */
export function interpolateTelemetry(
  points: TelemetryPoint[],
  fps: number,
  duration: number,
): FrameIndexedTelemetry {
  if (points.length === 0) {
    return { fps, totalFrames: 0, channels: [], frames: [] };
  }

  const channels = Object.keys(points[0].values);
  const totalFrames = Math.ceil(duration * fps);
  const frames: Float64Array[] = [];

  for (let f = 0; f < totalFrames; f++) {
    const t = f / fps;
    const interpolated = new Float64Array(channels.length);

    for (let c = 0; c < channels.length; c++) {
      interpolated[c] = interpolateAt(points, channels[c], t);
    }

    frames.push(interpolated);
  }

  return { fps, totalFrames, channels, frames };
}

/**
 * Linear interpolation of a single channel value at a given timestamp.
 */
function interpolateAt(
  points: TelemetryPoint[],
  channel: string,
  t: number,
): number {
  if (points.length === 0) return 0;
  if (t <= points[0].timestamp) return points[0].values[channel] ?? 0;
  if (t >= points[points.length - 1].timestamp) {
    return points[points.length - 1].values[channel] ?? 0;
  }

  // Binary search for surrounding points
  let lo = 0;
  let hi = points.length - 1;

  while (hi - lo > 1) {
    const mid = (lo + hi) >>> 1;
    if (points[mid].timestamp <= t) {
      lo = mid;
    } else {
      hi = mid;
    }
  }

  const p0 = points[lo];
  const p1 = points[hi];
  const v0 = p0.values[channel] ?? 0;
  const v1 = p1.values[channel] ?? 0;

  const frac = (t - p0.timestamp) / (p1.timestamp - p0.timestamp);
  return v0 + (v1 - v0) * frac;
}

/**
 * Get the value for a specific frame and channel from pre-computed data.
 */
export function getFrameValue(
  indexed: FrameIndexedTelemetry,
  frameIndex: number,
  channelIndex: number,
): number {
  if (frameIndex < 0 || frameIndex >= indexed.frames.length) return 0;
  return indexed.frames[frameIndex][channelIndex];
}
