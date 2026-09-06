import Hls from "hls.js";

export interface FragmentMetrics {
  bytesLoaded: number;
  downloadTimeSeconds: number;
  segmentDurationSeconds: number;
  timestamp: number;
  levelBitratesMbps: number[];
}

export function getFragmentMetrics(
  data: any,
  hls: Hls,
): FragmentMetrics | null {
  const stats = data.frag.stats;

  const downloadTimeSeconds =
    (stats.loading.end - stats.loading.start) / 1000;

  const bytesLoaded = stats.loaded;

  const segmentDurationSeconds =
    data.frag.duration;

  const timestamp =
    data.frag.start;

  if (
    downloadTimeSeconds <= 0 ||
    bytesLoaded <= 0 ||
    segmentDurationSeconds <= 0
  ) {
    return null;
  }

  const levelBitratesMbps =
    hls.levels.map(
      (level) =>
        level.bitrate / 1_000_000,
    );

  return {
    bytesLoaded,
    downloadTimeSeconds,
    segmentDurationSeconds,
    timestamp,
    levelBitratesMbps,
  };
}