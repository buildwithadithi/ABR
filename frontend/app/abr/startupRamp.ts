export function decideStartupLevel(
  currentLevel: number,
  safeThroughputMbps: number,
): number {
  if (
    currentLevel === 0 &&
    safeThroughputMbps >= 1.0
  ) {
    return 1;
  }

  if (
    currentLevel === 1 &&
    safeThroughputMbps >= 2.5
  ) {
    return 2;
  }

  return currentLevel;
}