import { describe, expect, it } from "vitest";
import { CELL_HEIGHT_PX, COMPACT_CELL_HEIGHT_PX, COMPACT_FROM_ROWS, densityOf } from "./density";

describe("densityOf", () => {
  it("draws a court of thirteen disputes at the comfortable density", () => {
    expect(densityOf(13)).toBe("comfortable");
  });

  it("draws a court of sixty disputes at the compact density", () => {
    expect(densityOf(60)).toBe("compact");
  });

  // The two ends the ticket pins, stated against the constant rather than against 40: the
  // threshold is a guess about screen height and is meant to be movable, and a test that
  // hard-coded either side of it would fail the day someone moved it for a good reason.
  it("crosses over past the threshold and not at it, whatever value the threshold takes", () => {
    expect(densityOf(COMPACT_FROM_ROWS)).toBe("comfortable");
    expect(densityOf(COMPACT_FROM_ROWS + 1)).toBe("compact");
  });

  it("keeps the threshold in the region of forty rows, which is what the artboards say", () => {
    expect(COMPACT_FROM_ROWS).toBeGreaterThanOrEqual(30);
    expect(COMPACT_FROM_ROWS).toBeLessThanOrEqual(60);
  });

  it("draws an empty matrix comfortably rather than compacting nothing", () => {
    expect(densityOf(0)).toBe("comfortable");
  });
});

describe("the two cell heights", () => {
  // The ratio is the requirement and the pixel is not — the artboards disagree about the pixel.
  it("halves the cell, whatever the comfortable cell stands at", () => {
    expect(COMPACT_CELL_HEIGHT_PX * 2).toBe(CELL_HEIGHT_PX);
  });
});
