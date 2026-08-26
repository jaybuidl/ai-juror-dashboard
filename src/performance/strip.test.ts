import { describe, expect, it } from "vitest";
import {
  ORDINARY_COURT_FROM_SECONDS,
  ORDINARY_COURT_LABEL,
  ORDINARY_COURT_PROSE,
  STRIP_MAX_SECONDS,
  STRIP_RANGE_LABEL,
  STRIP_TICKS,
  stripFraction,
  stripMarks,
} from "./strip";

const MINUTE = 60;
const HOUR = 60 * MINUTE;
const DAY = 24 * HOUR;

/**
 * The scale behind both latency plots, and the one number on either of them that is not a read.
 *
 * Ticket 22 moved the comparison band from an hour to five days, which is where an ordinary
 * Kleros court finishes a single-round dispute. The axis had to move with it — five days was off
 * the end of a one-day axis entirely — so every assertion here is about the pair rather than
 * about either alone, and the ones that matter are stated against the constants: the boundary is
 * a fact about arbitration and the maximum is a judgement, and a test that hard-coded either
 * would fail the day ticket 23 measures the first or someone re-argues the second.
 */

describe("the comparison band", () => {
  it("begins where an ordinary Kleros court finishes a single-round dispute, at five days", () => {
    expect(ORDINARY_COURT_FROM_SECONDS).toBe(5 * DAY);
  });

  it("is on the axis at all, which is what ticket 22 had to move the maximum for", () => {
    expect(STRIP_MAX_SECONDS).toBeGreaterThan(ORDINARY_COURT_FROM_SECONDS);
  });

  // The wall this ticket exists to avoid: at a seven-day maximum the band begins at 97.5% and is
  // a sliver against the right edge, which reads as the axis ending rather than as a region an
  // ordinary court occupies.
  it("reads as a region rather than as the right-hand edge", () => {
    expect(1 - stripFraction(ORDINARY_COURT_FROM_SECONDS)).toBeGreaterThanOrEqual(0.1);
  });

  // And the other side of that trade. Compressing the axis is the point, but compress far enough
  // and court 34's whole record is the blob at the left that a log scale exists to prevent —
  // 14s to 3,236s is the range the live court has held since ticket 07 read it.
  it("leaves court 34's own record a distribution rather than a blob at the origin", () => {
    const width = stripFraction(3236) - stripFraction(14);
    expect(width).toBeGreaterThanOrEqual(0.3);
  });
});

describe("the axis ticks", () => {
  it("runs from a second to the axis maximum, so no tick is off the plot", () => {
    expect(STRIP_TICKS[0]?.seconds).toBe(1);
    expect(STRIP_TICKS.at(-1)?.seconds).toBe(STRIP_MAX_SECONDS);
  });

  it("names the marks a reader thinks in past a day", () => {
    const pastADay = STRIP_TICKS.filter((tick) => tick.seconds > DAY);
    expect(pastADay.length).toBeGreaterThanOrEqual(2);
  });

  it("rises strictly, because two ticks at one position is one tick a reader cannot read", () => {
    for (let i = 1; i < STRIP_TICKS.length; i += 1) {
      expect(STRIP_TICKS[i]?.seconds).toBeGreaterThan(STRIP_TICKS[i - 1]?.seconds ?? 0);
    }
  });

  // Legibility is a layout and jsdom lays nothing out, so this pins the arithmetic underneath it
  // rather than the pixel: two labels closer together than a twentieth of the axis overprint at
  // the width the agent juror plot is drawn at on a phone.
  it("keeps every pair of ticks far enough apart to be read", () => {
    for (let i = 1; i < STRIP_TICKS.length; i += 1) {
      const gap =
        stripFraction(STRIP_TICKS[i]?.seconds ?? 0) -
        stripFraction(STRIP_TICKS[i - 1]?.seconds ?? 0);
      expect(gap).toBeGreaterThanOrEqual(0.05);
    }
  });

  // The boundary has three faces — a number, a tick label and a sentence — and ticket 23 will
  // move all three at once if it measures the band. They are one object in `strip.ts` for that
  // reason, and this is the assertion that none of them is a stray literal somewhere else.
  it("spells the boundary for prose as well, so a footer need not transcribe it", () => {
    expect(ORDINARY_COURT_PROSE).toBe("five days");
  });

  it("puts a tick under the band's own boundary, so the axis names where it begins", () => {
    const boundary = STRIP_TICKS.find((tick) => tick.seconds === ORDINARY_COURT_FROM_SECONDS);
    expect(boundary).toBeDefined();
    expect(ORDINARY_COURT_LABEL).toBe(boundary?.label);
  });
});

describe("the range label", () => {
  /**
   * The agent juror view printed "Log scale · 1s to 1d" as a copied string, so it stated a range
   * the axis no longer had the moment the maximum moved — a sentence contradicting the picture
   * directly beneath it. Pinned against the ends of the axis rather than against the words.
   */
  it("names the axis's real ends rather than a transcription of them", () => {
    expect(STRIP_RANGE_LABEL).toBe(`${STRIP_TICKS[0]?.label} to ${STRIP_TICKS.at(-1)?.label}`);
  });

  it("ends where the axis ends", () => {
    expect(STRIP_TICKS.at(-1)?.seconds).toBe(STRIP_MAX_SECONDS);
  });
});

describe("stripFraction", () => {
  it("puts the axis maximum at the far end and a second at the origin", () => {
    expect(stripFraction(STRIP_MAX_SECONDS)).toBe(1);
    expect(stripFraction(1)).toBe(0);
  });

  it("sits a zero-second reveal at the origin rather than off the axis", () => {
    // `log10(0)` is `-Infinity`, and a reveal in under a second is a reading and not an error.
    expect(stripFraction(0)).toBe(0);
  });

  it("clamps a latency past the axis to the far end, where a reader can still see a mark", () => {
    expect(stripFraction(STRIP_MAX_SECONDS * 10)).toBe(1);
  });

  it("rises with the latency", () => {
    expect(stripFraction(HOUR)).toBeGreaterThan(stripFraction(MINUTE));
    expect(stripFraction(DAY)).toBeGreaterThan(stripFraction(HOUR));
  });
});

describe("stripMarks", () => {
  it("stacks two draws that took the same time rather than overprinting one on the other", () => {
    const marks = stripMarks([85, 85, 85]);

    expect(marks.map((mark) => mark.stack)).toEqual([0, 1, 2]);
    expect(new Set(marks.map((mark) => mark.x)).size).toBe(1);
  });

  it("draws one mark per draw, so the count matches what the heading claims", () => {
    expect(stripMarks([7, 85, 85, 552]).length).toBe(4);
  });
});
