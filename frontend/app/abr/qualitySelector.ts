export function chooseQuality(
  safeThroughputMbps: number,
  levelBitratesMbps: number[],
): number {
  let idealLevel = 0;

  for (let level = 0; level < levelBitratesMbps.length; level++) {
    if (levelBitratesMbps[level] <= safeThroughputMbps) {
      idealLevel = level;
    }
  }

  return idealLevel;
}