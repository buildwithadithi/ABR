export function decideStartupLevel(
  currentLevel: number,
  safeThroughputMbps: number,
  levelBitratesMbps: number[],
): number {
  const nextLevel = currentLevel + 1;

  // Already at highest quality
  if (nextLevel >= levelBitratesMbps.length) {
    return currentLevel;
  }

  // Move up one level only if throughput can safely support it
  if (safeThroughputMbps >= levelBitratesMbps[nextLevel]) {
    return nextLevel;
  }

  return currentLevel;
}