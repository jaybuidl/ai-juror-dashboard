import { describe, expect, it } from "vitest";
import referenceFixture from "./court-29-reference.fixture.json" with { type: "json" };
import { type RawReference, referenceReadingOf } from "./reference";
import {
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
 * The scale behind both latency plots, and where the comparison band lands on it.
 *
 * Ticket 22 moved the band from an hour to five days and widened the axis to a month to hold it.
 * Ticket 23 replaced the five days with a reading: court 29's median time to ruling. So the
 * band's boundary is no longer this module's to state. These assertions are about whether the
 * axis holds the *captured* reading as a region, and they are stated against the reading and
 * the constant, not against either as a literal. A later capture that moved the band would still
 * pass, as long as the axis can still show it.
 */

const reading = referenceReadingOf(referenceFixture as RawReference);
if (reading.state !== "measured") throw new Error(`reading is ${reading.state}`);
const boundary = reading.medianSeconds;

describe("the comparison band, where the reading puts it", () => {
  it("is on the axis at all", () => {
    expect(STRIP_MAX_SECONDS).toBeGreaterThan(boundary);
  });

  // The wall ticket 22 avoided: a band beginning past about 97% is a sliver against the right
  // edge, which reads as the axis ending rather than as a region an ordinary court occupies.
  it("reads as a region rather than as the right-hand edge", () => {
    expect(1 - stripFraction(boundary)).toBeGreaterThanOrEqual(0.1);
  });

  // And it has to leave room to the left for its own label, which is right-aligned against the
  // boundary and must not reach the median value printed at the top of the plot.
  it("leaves the left of the axis for its label, past where court 34's record ends", () => {
    expect(stripFraction(boundary)).toBeGreaterThan(stripFraction(3236));
  });

  // The other side of the trade. Compress far enough and court 34's whole record is the blob at
  // the left a log scale exists to prevent. 14s to 3,236s is the range the live court has held
  // since ticket 07 read it.
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

  // A tick at the old five days under a band beginning at four would read as a second claim about
  // where it begins. The band carries its own measured value in its label, and no tick names a
  // duration an ordinary court was *said* to take.
  it("puts no tick where the old illustrative boundary was", () => {
    expect(STRIP_TICKS.some((tick) => tick.seconds === 5 * DAY)).toBe(false);
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
