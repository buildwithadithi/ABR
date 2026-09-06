import { describe, expect, it } from "vitest";

import {
  getBufferState,
  getMaximumSafeBitrate,
  decideBufferAwareLevel,
} from "./bufferController";

describe("bufferController", () => {
  const bitrates = [0.5, 1.0, 2.5];

  it("detects critical buffer", () => {
    expect(getBufferState(2)).toBe("CRITICAL");
  });

  it("detects low buffer", () => {
    expect(getBufferState(5)).toBe("LOW");
  });

  it("detects healthy buffer", () => {
    expect(getBufferState(15)).toBe("HEALTHY");
  });

  it("calculates maximum safe bitrate", () => {
    expect(
      getMaximumSafeBitrate(4.5, 10, 4),
    ).toBe(11.25);
  });

  it("downgrades during critical buffer", () => {
    expect(
      decideBufferAwareLevel(
        2,      // proposed level
        5,      // safe throughput
        2,      // buffer
        4,      // segment duration
        bitrates,
      ),
    ).toBe(1);
  });

  it("does not upgrade during low buffer", () => {
    expect(
      decideBufferAwareLevel(
        0,      // proposed level
        5,      // safe throughput
        5,      // buffer
        4,      // segment duration
        bitrates,
      ),
    ).toBe(0);
  });

  it("allows proposed quality with healthy buffer", () => {
    expect(
      decideBufferAwareLevel(
        2,      // proposed level
        5,      // safe throughput
        15,     // buffer
        4,      // segment duration
        bitrates,
      ),
    ).toBe(2);
  });
});