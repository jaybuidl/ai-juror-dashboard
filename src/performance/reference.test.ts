import { describe, expect, it } from "vitest";
import type { RawDispute } from "../disputes/disputes";
import referenceFixture from "./court-29-reference.fixture.json" with { type: "json" };
import {
  comparisonOf,
  type RawReference,
  REFERENCE_COURT_ID,
  referenceCourtName,
  referenceReadingOf,
} from "./reference";

const DAY = 24 * 60 * 60;

const payload = referenceFixture as RawReference;

/** One dispute from the captured court, as a template a case below alters. */
const sample = payload.disputes[0] as RawDispute;

function withDisputes(disputes: readonly RawDispute[], numberDisputes = disputes.length) {
  return referenceReadingOf({
    court: { ...payload.court, numberDisputes: String(numberDisputes) },
    disputes,
  });
}

/**
 * Ticket 23's reading: what court 29 takes to rule, over single-round disputes.
 *
 * Against a payload captured from Goldsky on 2026-09-23. The figures pinned below are that
 * capture's, and they are pinned so that a change to how the reading is taken fails here and
 * not in a screenshot.
 */
describe("referenceReadingOf, over the captured court", () => {
  const reading = referenceReadingOf(payload);

  it("reads the court the constant names", () => {
    expect(reading.court).toEqual({
      id: Number(REFERENCE_COURT_ID),
      name: "Corte de Disputas de Consumo y Vecindad",
    });
  });

  it("measures every one of the court's 87 disputes, which are all single-round and ruled", () => {
    if (reading.state !== "measured") throw new Error(`reading is ${reading.state}`);
    expect(reading.count).toBe(87);
    expect(reading.excluded).toEqual({ appealed: 0, undecided: 0 });
  });

  it("takes the lower-middle median, as every median on this dashboard does", () => {
    if (reading.state !== "measured") throw new Error(`reading is ${reading.state}`);
    // 3d 23h. A day short of the five days this band was drawn at while it was a constant.
    expect(reading.medianSeconds).toBe(343396);
  });

  it("states the period the disputes span, by when they were created", () => {
    if (reading.state !== "measured") throw new Error(`reading is ${reading.state}`);
    expect(new Date(reading.firstCreatedAt * 1000).toISOString().slice(0, 10)).toBe("2024-11-14");
    expect(new Date(reading.lastCreatedAt * 1000).toISOString().slice(0, 10)).toBe("2026-09-09");
  });

  it("names the court with its own name", () => {
    expect(referenceCourtName(reading.court)).toBe(
      "court 29 (Corte de Disputas de Consumo y Vecindad)",
    );
  });
});

describe("the short-read guard", () => {
  // The failure this read inherits from every read before it: HTTP 200, fewer rows, no error.
  // Without the count the band would move to the median of what came back and say nothing.
  it("reports fewer disputes than the court holds as a shortfall, in numbers and with no median", () => {
    const reading = withDisputes(payload.disputes.slice(0, 50), 87);
    expect(reading).toEqual({
      state: "short",
      court: expect.objectContaining({ id: 29 }),
      expected: 87,
      returned: 50,
    });
    expect(reading).not.toHaveProperty("medianSeconds");
  });

  it("treats an empty answer for a court that holds disputes as short, not as an empty court", () => {
    expect(withDisputes([], 87)).toMatchObject({ state: "short", expected: 87, returned: 0 });
  });

  // The count is read before the list, and a court only gains disputes. So more is a dispute
  // created between the two requests, not a fault.
  it("measures a list longer than the count read before it", () => {
    expect(withDisputes(payload.disputes, 80).state).toBe("measured");
  });

  it("throws on a count it cannot believe, rather than comparing against a guess", () => {
    expect(() => withDisputes(payload.disputes, Number.NaN)).toThrow(/numberDisputes/);
  });
});

describe("what the reading leaves out", () => {
  // The exclusion that makes the comparison like-for-like. An appealed dispute takes far longer,
  // and folding one in moves the band right: in the experiment's favour.
  it("leaves out an appealed dispute and counts it, however fast its first round was", () => {
    const appealed: RawDispute = {
      ...sample,
      disputeID: "9999",
      id: "9999",
      createdAt: "1000",
      rounds: [
        { id: "9999-0", timeline: ["2000", "0", "3000", "4000"] },
        { id: "9999-1", timeline: ["5000", "0", "6000", "7000"] },
      ],
    };
    const reading = withDisputes([appealed, ...payload.disputes]);

    if (reading.state !== "measured") throw new Error(`reading is ${reading.state}`);
    expect(reading.count).toBe(87);
    expect(reading.excluded.appealed).toBe(1);
    expect(reading.medianSeconds).toBe(343396);
  });

  it("leaves out a dispute not yet ruled, which has no time to ruling to measure", () => {
    const undecided: RawDispute = {
      ...sample,
      disputeID: "9998",
      id: "9998",
      ruled: false,
      period: "appeal",
      rounds: [{ id: "9998-0", timeline: ["2000", "0", "3000", "0"] }],
    };
    const reading = withDisputes([undecided, ...payload.disputes]);

    if (reading.state !== "measured") throw new Error(`reading is ${reading.state}`);
    expect(reading.count).toBe(87);
    expect(reading.excluded.undecided).toBe(1);
  });

  // A whole read of a court with nothing to measure is a fact about that court. It must not
  // come out as a band at zero or as a failure.
  it("says there is nothing to measure where no single-round dispute has been ruled", () => {
    const pending: RawDispute = {
      ...sample,
      ruled: false,
      rounds: [{ id: `${sample.disputeID}-0`, timeline: ["2000", "0", "3000", "0"] }],
    };
    expect(withDisputes([pending])).toEqual({
      state: "unmeasured",
      court: expect.objectContaining({ id: 29 }),
      excluded: { appealed: 0, undecided: 1 },
    });
  });

  it("measures from creation to the execution period opening, and from nothing else", () => {
    const one: RawDispute = {
      ...sample,
      createdAt: "1000",
      rounds: [
        { id: `${sample.disputeID}-0`, timeline: ["2000", "0", "3000", String(1000 + DAY)] },
      ],
    };
    expect(withDisputes([one])).toMatchObject({ state: "measured", medianSeconds: DAY });
  });
});

describe("comparisonOf", () => {
  const reading = referenceReadingOf(payload);

  it("draws a measured reading, whatever became of a later re-read", () => {
    expect(comparisonOf(reading, null).state).toBe("measured");
    expect(comparisonOf(reading, new Error("HTTP 502")).state).toBe("measured");
  });

  // The pair every read here has needed split. `reading` is null in flight and after a failure,
  // and a plot that said "not read" on every cold load would announce a failure that has not
  // happened.
  it("tells a read in flight from one that failed, by the error and not by the reading", () => {
    expect(comparisonOf(null, null)).toEqual({ state: "pending" });
    expect(comparisonOf(null, new Error("HTTP 502"))).toEqual({ state: "missing", reading: null });
  });

  it("draws no band for a short read or for a court with nothing to measure", () => {
    const short = withDisputes([], 87);
    expect(comparisonOf(short, null)).toEqual({ state: "missing", reading: short });
  });
});
