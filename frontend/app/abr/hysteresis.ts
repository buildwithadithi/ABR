const UPGRADE_MARGIN = 1.2;

export function decideNextLevel(
  currentLevel: number,
  idealLevel: number,
  safeThroughputMbps: number,
  levelBitratesMbps: number[],
): number {

  // -----------------------------------------
  // DOWNGRADE
  // -----------------------------------------

  if (idealLevel < currentLevel) {
    return idealLevel;
  }

  // -----------------------------------------
  // UPGRADE
  // -----------------------------------------

  if (idealLevel > currentLevel) {

    const targetBitrate = levelBitratesMbps[idealLevel];

    // Require some extra headroom before upgrading
    if (
      safeThroughputMbps <
      targetBitrate * UPGRADE_MARGIN
    ) {
      return currentLevel;
    }

    return idealLevel;
  }

  return currentLevel;
}