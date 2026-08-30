export function chooseQuality(
  safeThroughputMbps: number,
): number {
  if (safeThroughputMbps >= 2.5) {
    return 2;
  }

  if (safeThroughputMbps >= 1.0) {
    return 1;
  }

  return 0;
}