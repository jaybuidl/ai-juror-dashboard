import { describe, expect, it } from "vitest";
import fixture from "./court-34.fixture.json" with { type: "json" };
import { type RawDispute, toDisputes } from "./disputes";
import { isFinalised, LIVE_REFETCH_MS, periodOpenSeconds, refetchIntervalFor } from "./liveness";

const raw = fixture as RawDispute[];
const court = toDisputes(raw);

/** Dispute 163: the newest one the court has ruled on. */
const ruled = court.find((dispute) => dispute.id === 163);
/** Dispute 166: every draw revealed, sitting in its appeal period, and no ruling. */
const appealing = court.find((dispute) => dispute.id === 166);

describe("isFinalised", () => {
  it("treats a dispute the court has ruled on as finalised", () => {
    expect(ruled && isFinalised(ruled)).toBe(true);
  });

  it("treats a dispute in its appeal period as still live", () => {
    // The state ticket 05 found and the acceptance criterion did not: every vote is in, the
    // period is `appeal` rather than `execution`, and there is no ruling to compare a vote
    // against. Calling it finalised would stop reading a dispute still being decided.
    expect(appealing?.period).toBe("appeal");
    expect(appealing && isFinalised(appealing)).toBe(false);
  });

  it("treats a dispute in execution that has not been ruled as still live", () => {
    // The whole disagreement between the two definitions, in one dispute. The period
    // predicate calls this finished and would cache it; `ruled` is what actually says that
    // nothing about it can change again.
    const source = raw.find((dispute) => dispute.disputeID === "163") as RawDispute;
    const stalled = toDisputes([{ ...source, ruled: false }])[0];

    expect(stalled?.period).toBe("execution");
    expect(stalled && isFinalised(stalled)).toBe(false);
  });

  it("treats a refusal to arbitrate as finalised", () => {
    // Choice 0 is a decision the court reached, not an absence of one. A truthiness test on
    // the ruling would leave dispute 154 polling for ever.
    const refused = court.find((dispute) => dispute.id === 154);

    expect(refused?.ruling.state).toBe("refused");
    expect(refused && isFinalised(refused)).toBe(true);
  });

  it("counts the court the way the matrix caption already counts it", () => {
    expect(court.filter(isFinalised).length).toBe(13);
    expect(court.filter((dispute) => !isFinalised(dispute)).length).toBe(3);
  });
});

describe("refetchIntervalFor", () => {
  it("polls while any dispute is unfinalised", () => {
    expect(refetchIntervalFor(raw)).toBe(LIVE_REFETCH_MS);
  });

  it("stops polling once every dispute has been ruled on", () => {
    const settled = raw.map((dispute) => ({ ...dispute, ruled: true, currentRuling: "1" }));

    expect(refetchIntervalFor(settled)).toBe(false);
  });

  it("does not poll a court that has not been read yet", () => {
    // Nothing is known to be live, so nothing justifies a five-second interval. A first read
    // that failed is recovered by the query's own retry, not by polling on the chance of it.
    expect(refetchIntervalFor(undefined)).toBe(false);
    expect(refetchIntervalFor([])).toBe(false);
  });
});

describe("periodOpenSeconds", () => {
  const opened = 1787604932;

  it("counts from the moment the period last changed", () => {
    expect(appealing?.lastPeriodChange).toBe(opened);
    expect(appealing && periodOpenSeconds(appealing, (opened + 192) * 1000)).toBe(192);
  });

  it("clamps a browser clock running behind the chain to zero", () => {
    // Why this is not the seam's arithmetic: below the seam a negative latency is a payload
    // to reject, because both moments came from the chain. Here one of them is the reader's
    // own clock, and a machine thirty seconds slow is not evidence about the court.
    expect(appealing && periodOpenSeconds(appealing, (opened - 30) * 1000)).toBe(0);
  });

  it("refuses to date a period whose moment is the epoch", () => {
    // `0` is one subtraction away from claiming a period has been open for fifty-six years.
    // Unlike a round's timeline this field is not parsed to null at the edge, so it is
    // guarded here rather than trusted.
    const undated = { ...(appealing as NonNullable<typeof appealing>), lastPeriodChange: 0 };

    expect(periodOpenSeconds(undated, Date.UTC(2026, 7, 25))).toBe(null);
  });
});
