import { describe, expect, it } from "vitest";
import { COURT_ID, DEFAULT_CORE_SUBGRAPH_URL, fetchCourtDisputes } from "./court-subgraph";
import { PERIODS, toDisputes } from "./disputes";

/**
 * Live against Goldsky, held out of `yarn test` — run with `yarn test:integration`.
 *
 * What it is for: the fixture in `disputes.test.ts` is a snapshot, so it cannot notice a
 * renamed field or a changed enum. This asserts that what the endpoint returns today is
 * still shaped the way the model expects, and nothing here is stubbed.
 *
 * It deliberately asserts no dispute count and no upper dispute ID. New disputes arrive
 * continually, and a test pinned to "16 disputes" would fail for being right.
 */
describe("fetchCourtDisputes", () => {
  it("reads the court's disputes from the keyless default endpoint", async () => {
    const raw = await fetchCourtDisputes({ url: DEFAULT_CORE_SUBGRAPH_URL, courtId: COURT_ID });

    expect(raw.length).toBeGreaterThanOrEqual(16);
  }, 30_000);

  it("returns rows the model can read, with the fields it depends on", async () => {
    const disputes = toDisputes(await fetchCourtDisputes());

    expect(disputes.length).toBeGreaterThanOrEqual(16);

    for (const dispute of disputes) {
      expect(Number.isInteger(dispute.id)).toBe(true);
      expect(PERIODS).toContain(dispute.period);
      expect(dispute.rounds.length).toBeGreaterThanOrEqual(1);
      // A dispute past the evidence period has an observed commit opening, and everything
      // measured later is offset from one of these. A dispute still *in* evidence has not
      // opened one, and its whole timeline is zeros the model parses to null — which is the
      // assertion this makes, rather than skipping the row. Written as a live drift check,
      // this test asserted `> 0` for every dispute until disputes 167, 168 and 169 arrived in
      // `evidence` on 2026-08-25 and made it false. `null` is not a lax expectation here: it
      // is the parse that keeps a zero from becoming a latency of fifty-six years.
      const commitOpenedAt = dispute.rounds[0]?.commitOpenedAt;
      if (dispute.period === "evidence") {
        expect(commitOpenedAt).toBeNull();
      } else {
        expect(commitOpenedAt).toBeGreaterThan(0);
      }
    }
  }, 30_000);

  it("still contains the disputes the design and the docs were written against", async () => {
    const ids = toDisputes(await fetchCourtDisputes()).map((dispute) => dispute.id);

    // 151 is the dispute with the 8-hour commit window, and 155 the panel of one. Both
    // are quoted throughout the docs and the canvas; their disappearance would mean the
    // court, the subgraph or the deployment had changed under us.
    expect(ids).toContain(151);
    expect(ids).toContain(155);
  }, 30_000);

  it("orders newest first regardless of the court's current size", async () => {
    const ids = toDisputes(await fetchCourtDisputes()).map((dispute) => dispute.id);

    expect(ids).toEqual([...ids].sort((a, b) => b - a));
  }, 30_000);
});
