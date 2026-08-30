import { BandwidthEstimator } from "./bandwidthEstimator";
import { chooseQuality } from "./qualitySelector";
import { decideStartupLevel } from "./startupRamp";
import { decideNextLevel } from "./hysteresis";
import { ABRDecision, ABRDecisionType } from "../types/abr";

export class ABRController {
  private bandwidthEstimator =
    new BandwidthEstimator();

  private currentLevel = 0;

  private startup = true;

  processFragment(
    bytesLoaded: number,
    downloadTimeSeconds: number,
  ): ABRDecision {

    // -----------------------------------------
    // BANDWIDTH ESTIMATION
    // -----------------------------------------

    const estimate =
      this.bandwidthEstimator.addSample(
        bytesLoaded,
        downloadTimeSeconds,
      );

    const {
      throughputMbps,
      smoothedThroughputMbps,
      safeThroughputMbps,
    } = estimate;

    const previousLevel =
      this.currentLevel;

    let nextLevel = previousLevel;

    // -----------------------------------------
    // IDEAL QUALITY
    // -----------------------------------------

    const idealLevel =
      chooseQuality(
        safeThroughputMbps,
      );

    // -----------------------------------------
    // STARTUP
    // -----------------------------------------

    if (this.startup) {

      nextLevel =
        decideStartupLevel(
          previousLevel,
          safeThroughputMbps,
        );

      // Startup only moves upward.
      if (nextLevel > previousLevel) {
        this.currentLevel = nextLevel;
      }

      // Three measurements → normal ABR
      if (this.hasThreeSamples()) {
        this.startup = false;
      }
    }

    // -----------------------------------------
    // NORMAL ABR
    // -----------------------------------------

    else {

      nextLevel =
        decideNextLevel(
          previousLevel,
          idealLevel,
          safeThroughputMbps,
        );

      this.currentLevel = nextLevel;
    }

    // -----------------------------------------
    // FINAL LEVEL
    // -----------------------------------------

    const finalLevel =
      this.currentLevel;

    // -----------------------------------------
    // ABR DECISION
    // -----------------------------------------

    let decision: ABRDecisionType;

    if (finalLevel > previousLevel) {
      decision = "UPGRADE";
    }
    else if (finalLevel < previousLevel) {
      decision = "DOWNGRADE";
    }
    else {
      decision = "HOLD";
    }

    // -----------------------------------------
    // RETURN ABR STATE
    // -----------------------------------------

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

  getCurrentLevel(): number {
    return this.currentLevel;
  }

  isStartup(): boolean {
    return this.startup;
  }

  private hasThreeSamples(): boolean {
    return (
      this.bandwidthEstimator
        .getSampleCount() >= 3
    );
  }
}