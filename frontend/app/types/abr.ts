export type ABRDecisionType =
  | "UPGRADE"
  | "DOWNGRADE"
  | "HOLD";

export type BufferState =
  | "LOW"
  | "HEALTHY"
  | "HIGH";

export interface ABRDecision {
  throughputMbps: number;
  smoothedThroughputMbps: number;
  safeThroughputMbps: number;

  currentLevel: number;
  idealLevel: number;
  nextLevel: number;

  startup: boolean;

  bufferSeconds?: number;
  bufferState?: BufferState;

  decision: ABRDecisionType;
}