import { BandwidthEstimator } from "./bandwidthEstimator";

import { chooseQuality } from "./qualitySelector";

import { decideStartupLevel } from "./startupRamp";

import { decideNextLevel } from "./hysteresis";

import { decideBufferAwareLevel } from "./bufferController";

import { ABRDecision, ABRDecisionType } from "../types/abr";

export class ABRController {
  private bandwidthEstimator = new BandwidthEstimator();

  private currentLevel = 0;

  private startup = true;

  // ==================================================
  // PROCESS FRAGMENT
  // ==================================================

  processFragment(
    bytesLoaded: number,
    downloadTimeSeconds: number,
    bufferSeconds: number,
    segmentDurationSeconds: number,
    levelBitratesMbps: number[],
  ): ABRDecision {
    // ==============================================
    // 1. BANDWIDTH ESTIMATION
    // ==============================================

    const estimate = this.bandwidthEstimator.addSample(
      bytesLoaded,
      downloadTimeSeconds,
    );

    const { throughputMbps, smoothedThroughputMbps, safeThroughputMbps } =
      estimate;

    const previousLevel = this.currentLevel;

    let nextLevel = previousLevel;

    // ==============================================
    // 2. BANDWIDTH → IDEAL QUALITY
    // ==============================================

    const idealLevel = chooseQuality(safeThroughputMbps, levelBitratesMbps);

    // ==============================================
    // 3. STARTUP / HYSTERESIS
    // ==============================================

    if (this.startup) {
      nextLevel = decideStartupLevel(
        previousLevel,
        safeThroughputMbps,
        levelBitratesMbps,
      );

      if (nextLevel > previousLevel) {
        this.currentLevel = nextLevel;
      }

      if (this.hasThreeSamples()) {
        this.startup = false;
      }
    } else {
      nextLevel = decideNextLevel(
        previousLevel,
        idealLevel,
        safeThroughputMbps,
        levelBitratesMbps,
      );

      this.currentLevel = nextLevel;
    }

    // ==============================================
    // 4. BUFFER-AWARE DECISION
    // ==============================================

    const bufferAwareLevel = decideBufferAwareLevel(
      this.currentLevel,
      safeThroughputMbps,
      bufferSeconds,
      segmentDurationSeconds,
      levelBitratesMbps,
    );

    // ==============================================
    // 5. FINAL LEVEL
    // ==============================================

    this.currentLevel = bufferAwareLevel;

    const finalLevel = this.currentLevel;

    // ==============================================
    // 6. DECISION TYPE
    // ==============================================

    let decision: ABRDecisionType;

    if (finalLevel > previousLevel) {
      decision = "UPGRADE";
    } else if (finalLevel < previousLevel) {
      decision = "DOWNGRADE";
    } else {
      decision = "HOLD";
    }

    // ==============================================
    // 7. RETURN DECISION
    // ==============================================

    return {
      throughputMbps,

      smoothedThroughputMbps,

      safeThroughputMbps,

      currentLevel: previousLevel,

      idealLevel,

      nextLevel: finalLevel,

      startup: this.startup,

      decision,
    };
  }

  // ==================================================
  // GET CURRENT LEVEL
  // ==================================================

  getCurrentLevel(): number {
    return this.currentLevel;
  }

  // ==================================================
  // STARTUP STATE
  // ==================================================

  isStartup(): boolean {
    return this.startup;
  }

  // ==================================================
  // SAMPLE CHECK
  // ==================================================

  private hasThreeSamples(): boolean {
    return this.bandwidthEstimator.getSampleCount() >= 3;
  }
}
