import { describe, expect, it } from "vitest";
import { chooseQuality } from "./qualitySelector";

describe("chooseQuality", () => {
  const bitrates = [0.5, 1.0, 2.5];

  it("chooses lowest quality for poor bandwidth", () => {
    expect(
      chooseQuality(0.8, bitrates)
    ).toBe(0);
  });

  it("chooses level 1 for moderate bandwidth", () => {
    expect(
      chooseQuality(1.5, bitrates)
    ).toBe(1);
  });

  it("chooses highest quality for good bandwidth", () => {
    expect(
      chooseQuality(3.0, bitrates)
    ).toBe(2);
  });
});