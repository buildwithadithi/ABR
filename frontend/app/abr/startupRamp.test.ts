import { describe, expect, it } from "vitest";
import { decideStartupLevel } from "./startupRamp";

describe("decideStartupLevel", () => {
  const bitrates = [0.5, 1.0, 2.5];

  it("upgrades from level 0 to 1", () => {
    expect(
      decideStartupLevel(0, 1.2, bitrates)
    ).toBe(1);
  });

  it("holds level 0 when bandwidth is insufficient", () => {
    expect(
      decideStartupLevel(0, 0.8, bitrates)
    ).toBe(0);
  });

  it("upgrades from level 1 to 2", () => {
    expect(
      decideStartupLevel(1, 2.5, bitrates)
    ).toBe(2);
  });

  it("does not go above highest level", () => {
    expect(
      decideStartupLevel(2, 10, bitrates)
    ).toBe(2);
  });
});