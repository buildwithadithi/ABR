import { describe, expect, it } from "vitest";
import { decideNextLevel } from "./hysteresis";

describe("decideNextLevel", () => {
  const bitrates = [0.5, 1.0, 2.5];

  it("downgrades immediately", () => {
    expect(
      decideNextLevel(2, 1, 1.5, bitrates)
    ).toBe(1);
  });

  it("holds when upgrade headroom is insufficient", () => {
    expect(
      decideNextLevel(1, 2, 2.7, bitrates)
    ).toBe(1);
  });

  it("upgrades when enough headroom exists", () => {
    expect(
      decideNextLevel(1, 2, 3.5, bitrates)
    ).toBe(2);
  });

  it("holds when ideal level equals current level", () => {
    expect(
      decideNextLevel(1, 1, 2.0, bitrates)
    ).toBe(1);
  });
});