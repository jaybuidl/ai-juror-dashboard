import { describe, expect, it } from "vitest";
import {
  COMFORTABLE_COLUMN_PX,
  ORDINARY_DESKTOP_PX,
  PAGE_CHROME_PX,
  ROW_HEADER_PX,
} from "../styles/breakpoints";
import {
  CELL_HEIGHT_PX,
  COMPACT_CELL_HEIGHT_PX,
  COMPACT_FROM_COLUMNS,
  COMPACT_FROM_ROWS,
  densityOf,
} from "./density";

/** A column count well inside the comfortable grid, so a row-axis test measures only the rows. */
const FEW_COLUMNS = 1;
/** A row count well inside the comfortable grid, so a column-axis test measures only the columns. */
const FEW_ROWS = 1;

describe("densityOf", () => {
  it("draws a court of thirteen disputes at the comfortable density", () => {
    expect(densityOf(13, FEW_COLUMNS)).toBe("comfortable");
  });

  it("draws a court of sixty disputes at the compact density", () => {
    expect(densityOf(60, FEW_COLUMNS)).toBe("compact");
  });

  // The two ends the ticket pins, stated against the constant rather than against 40: the
  // threshold is a guess about screen height and is meant to be movable, and a test that
  // hard-coded either side of it would fail the day someone moved it for a good reason.
  it("crosses over past the threshold and not at it, whatever value the threshold takes", () => {
    expect(densityOf(COMPACT_FROM_ROWS, FEW_COLUMNS)).toBe("comfortable");
    expect(densityOf(COMPACT_FROM_ROWS + 1, FEW_COLUMNS)).toBe("compact");
  });

  it("keeps the threshold in the region of forty rows, which is what the artboards say", () => {
    expect(COMPACT_FROM_ROWS).toBeGreaterThanOrEqual(30);
    expect(COMPACT_FROM_ROWS).toBeLessThanOrEqual(60);
  });

  it("draws an empty matrix comfortably rather than compacting nothing", () => {
    expect(densityOf(0, FEW_COLUMNS)).toBe("comfortable");
  });
});

/**
 * The second axis, which is the one ticket 25 added.
 *
 * A grid has two of them and only one was consulted: a roster of nine would have widened the
 * comfortable grid to 1772px of content and left `densityOf` reporting "comfortable" on a 1440px
 * desktop, which is not a density at all but a sideways scroll.
 */
describe("the column axis", () => {
  it("compacts a short matrix that has too many columns for a desktop", () => {
    expect(densityOf(FEW_ROWS, COMPACT_FROM_COLUMNS + 1)).toBe("compact");
  });

  it("crosses over past the threshold and not at it, as the row axis does", () => {
    expect(densityOf(FEW_ROWS, COMPACT_FROM_COLUMNS)).toBe("comfortable");
    expect(densityOf(FEW_ROWS, COMPACT_FROM_COLUMNS + 1)).toBe("compact");
  });

  // Either crossing is sufficient, which is the whole reason there are two: a court of five
  // disputes and nine agent jurors does not fit, and neither does one of two hundred and six.
  it("compacts on either axis alone", () => {
    expect(densityOf(COMPACT_FROM_ROWS + 1, COMPACT_FROM_COLUMNS)).toBe("compact");
    expect(densityOf(COMPACT_FROM_ROWS, COMPACT_FROM_COLUMNS + 1)).toBe("compact");
    expect(densityOf(COMPACT_FROM_ROWS, COMPACT_FROM_COLUMNS)).toBe("comfortable");
  });

  /**
   * Arithmetic and not a preference, which is what separates this threshold from the row one.
   *
   * Restated here from the measurements rather than pinned at six: the threshold has to move on
   * its own the day the row header, the column or the desktop it is measured against does, and a
   * test asserting a literal would be the second model of this grid that `breakpoints.ts` spent
   * a ticket removing.
   */
  it("holds exactly the columns a comfortable grid fits on an ordinary desktop", () => {
    const fits = (columns: number) =>
      ROW_HEADER_PX + columns * COMFORTABLE_COLUMN_PX + PAGE_CHROME_PX <= ORDINARY_DESKTOP_PX;

    expect(fits(COMPACT_FROM_COLUMNS)).toBe(true);
    expect(fits(COMPACT_FROM_COLUMNS + 1)).toBe(false);
  });
});

describe("the two cell heights", () => {
  // The ratio is the requirement and the pixel is not — the artboards disagree about the pixel.
  it("halves the cell, whatever the comfortable cell stands at", () => {
    expect(COMPACT_CELL_HEIGHT_PX * 2).toBe(CELL_HEIGHT_PX);
  });
});
