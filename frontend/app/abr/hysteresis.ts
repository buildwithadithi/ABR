export function decideNextLevel(
  currentLevel: number,
  idealLevel: number,
  safeThroughputMbps: number,
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

    // Level 0 → Level 1
    if (
      currentLevel === 0 &&
      safeThroughputMbps < 1.5
    ) {
      return currentLevel;
    }

    // Level 1 → Level 2
    if (
      currentLevel === 1 &&
      safeThroughputMbps < 3.0
    ) {
      return currentLevel;
    }

    return idealLevel;
  }

  return currentLevel;
}