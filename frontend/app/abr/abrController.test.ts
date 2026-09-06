import { describe, expect, it } from "vitest";
import { ABRController } from "./abrController";

describe("ABRController", () => {
  const bitrates = [0.5, 1.0, 2.5];

  it("starts at the lowest quality", () => {
    const abr = new ABRController();

    expect(abr.getCurrentLevel()).toBe(0);
    expect(abr.isStartup()).toBe(true);
  });

  it("upgrades during startup when bandwidth is sufficient", () => {
    const abr = new ABRController();

    const decision = abr.processFragment(500_000, 1, 10, 4, bitrates);

    expect(decision.nextLevel).toBe(1);
    expect(decision.decision).toBe("UPGRADE");
  });

  it("does not upgrade when bandwidth is insufficient", () => {
    const abr = new ABRController();

    const decision = abr.processFragment(100_000, 1, 10, 4, bitrates);

    expect(decision.nextLevel).toBe(0);
    expect(decision.decision).toBe("HOLD");
  });

  it("downgrades after sustained bandwidth drop", () => {
    const abr = new ABRController();

    // Good bandwidth → level 1
    abr.processFragment(500_000, 1, 15, 4, bitrates);

    // Bad sample 1
    abr.processFragment(50_000, 1, 15, 4, bitrates);

    // Bad sample 2
    abr.processFragment(50_000, 1, 15, 4, bitrates);

    // Bad sample 3 → estimator is now dominated by poor bandwidth
    const decision = abr.processFragment(50_000, 1, 15, 4, bitrates);

    expect(decision.nextLevel).toBe(0);
    expect(decision.decision).toBe("DOWNGRADE");
  });

  it("protects playback when buffer is critical", () => {
    const abr = new ABRController();

    // First reach level 1
    abr.processFragment(500_000, 1, 15, 4, bitrates);

    // Critical buffer
    const decision = abr.processFragment(1_500_000, 1, 2, 4, bitrates);

    expect(decision.nextLevel).toBe(1);
    expect(decision.decision).toBe("HOLD");
  });
});
