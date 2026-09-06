export type BufferState =
    | "CRITICAL"
    | "LOW"
    | "HEALTHY";

const CRITICAL_BUFFER_SECONDS = 3;
const LOW_BUFFER_SECONDS = 10;


// ==================================================
// BUFFER STATE
// ==================================================

export function getBufferState(
    bufferSeconds: number,
): BufferState {

    if (bufferSeconds < CRITICAL_BUFFER_SECONDS) {
        return "CRITICAL";
    }

    if (bufferSeconds < LOW_BUFFER_SECONDS) {
        return "LOW";
    }

    return "HEALTHY";
}


// ==================================================
// MAXIMUM SAFE BITRATE
// ==================================================

export function getMaximumSafeBitrate(
    safeThroughputMbps: number,
    bufferSeconds: number,
    segmentDurationSeconds: number,
): number {

    if (
        safeThroughputMbps <= 0 ||
        bufferSeconds <= 0 ||
        segmentDurationSeconds <= 0
    ) {
        return 0;
    }

    return (
        safeThroughputMbps *
        bufferSeconds /
        segmentDurationSeconds
    );
}


// ==================================================
// BUFFER-AWARE QUALITY DECISION
// ==================================================
export function decideBufferAwareLevel(
  proposedLevel: number,
  safeThroughputMbps: number,
  bufferSeconds: number,
  segmentDurationSeconds: number,
  levelBitratesMbps: number[],
): number {
  const bufferState = getBufferState(bufferSeconds);

  // Critical buffer:
  // reduce quality by one level
  if (bufferState === "CRITICAL") {
    return Math.max(0, proposedLevel - 1);
  }

  const maximumSafeBitrate = getMaximumSafeBitrate(
    safeThroughputMbps,
    bufferSeconds,
    segmentDurationSeconds,
  );

  let maximumSafeLevel = 0;

  for (let level = 0; level < levelBitratesMbps.length; level++) {
    if (levelBitratesMbps[level] <= maximumSafeBitrate) {
      maximumSafeLevel = level;
    }
  }

  // Buffer controller can only LIMIT the proposed level.
  return Math.min(
    proposedLevel,
    maximumSafeLevel,
  );
}