const SAFETY_FACTOR = 0.8;
const MAX_SAMPLES = 3;

export interface BandwidthEstimate {
  throughputMbps: number;
  smoothedThroughputMbps: number;
  safeThroughputMbps: number;
}

export class BandwidthEstimator {
  private samples: number[] = [];

  addSample(
    bytesLoaded: number,
    downloadTimeSeconds: number,
  ): BandwidthEstimate {
    if (bytesLoaded <= 0 || downloadTimeSeconds <= 0) {
      throw new Error("Invalid bandwidth measurement");
    }

    const throughputMbps = (bytesLoaded * 8) / downloadTimeSeconds / 1_000_000;

    this.samples.push(throughputMbps);

    if (this.samples.length > MAX_SAMPLES) {
      this.samples.shift();
    }

    const sum = this.samples.reduce((total, value) => total + value, 0);

    const smoothedThroughputMbps = sum / this.samples.length;

    const safeThroughputMbps = smoothedThroughputMbps * SAFETY_FACTOR;

    return {
      throughputMbps,
      smoothedThroughputMbps,
      safeThroughputMbps,
    };
  }
  getSampleCount(): number {
    return this.samples.length;
  }
}
