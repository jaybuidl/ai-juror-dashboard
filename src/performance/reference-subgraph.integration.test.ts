import { describe, expect, it } from "vitest";
import { DEFAULT_CORE_SUBGRAPH_URL } from "../disputes/court-subgraph";
import { REFERENCE_COURT_ID, referenceReadingOf } from "./reference";
import { fetchReference } from "./reference-subgraph";

/**
 * Live against Goldsky, held out of `yarn test`. Run it with `yarn test:integration`.
 *
 * Two subgraph round trips and no chain read, so it spends none of the arb1 call budget. It pins
 * no median and no upper count: court 29 rules disputes continually, and a test pinned to "87
 * disputes, 3d 23h" would fail for being right.
 */
describe("fetchReference", () => {
  it("reads the comparison court's count and every dispute it holds", async () => {
    const raw = await fetchReference({ url: DEFAULT_CORE_SUBGRAPH_URL });

    expect(raw.court.id).toBe(REFERENCE_COURT_ID);
    expect(Number(raw.court.numberDisputes)).toBeGreaterThanOrEqual(87);
    // The guard's premise, checked against the endpoint rather than a fixture: the count is
    // read first, so an honest list is never shorter than it.
    expect(raw.disputes.length).toBeGreaterThanOrEqual(Number(raw.court.numberDisputes));
  }, 30_000);

  it("measures a band the axis can show, from single-round disputes only", async () => {
    const reading = referenceReadingOf(await fetchReference());

    if (reading.state !== "measured") throw new Error(`reading is ${reading.state}`);
    expect(reading.count).toBeGreaterThanOrEqual(87);
    // A day to a fortnight is the range `strip.ts` says the axis holds as a region.
    expect(reading.medianSeconds).toBeGreaterThan(24 * 60 * 60);
    expect(reading.medianSeconds).toBeLessThan(14 * 24 * 60 * 60);
  }, 30_000);

  it("fails loudly for a court that does not exist, rather than reading an empty one", async () => {
    await expect(fetchReference({ courtId: "99999" })).rejects.toThrow(/no court field/);
  }, 30_000);
});
