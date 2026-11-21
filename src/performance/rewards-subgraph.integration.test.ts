import { describe, expect, it } from "vitest";
import {
  COURT_ID,
  DEFAULT_CORE_SUBGRAPH_URL,
  fetchCourtDisputes,
} from "../disputes/court-subgraph";
import { ROSTER } from "../roster/agent-jurors";
import { fetchCourtDraws } from "./draws-subgraph";
import { buildCourtPerformance } from "./performance";
import { fetchCourtRewards } from "./rewards-subgraph";

/**
 * Live against Goldsky, held out of `yarn test` — run with `yarn test:integration`.
 *
 * A subgraph read and not a chain read, so it spends none of the arb1 call budget
 * `docs/knowledge/chain-and-subgraph.md` records: the whole file is three Goldsky round trips, and the reason it
 * can build a model at all without a fourth is that neither the commitments nor the parameter
 * history is needed to check a payout.
 *
 * It asserts no shift count and no upper dispute ID. The court executes disputes continually,
 * and a test pinned to "44 payouts" would fail for being right.
 */
describe("fetchCourtRewards", () => {
  it("reads the court's payouts from the keyless default endpoint", async () => {
    const rewards = await fetchCourtRewards({
      url: DEFAULT_CORE_SUBGRAPH_URL,
      courtId: COURT_ID,
    });

    expect(rewards.length).toBeGreaterThanOrEqual(44);
  }, 30_000);

  it("returns rows carrying the fields both figures depend on", async () => {
    const rewards = await fetchCourtRewards();

    for (const shift of rewards) {
      expect(shift.id).toMatch(/^0x[0-9a-f]{40}-\d+-\d+$/);
      expect(shift.juror.id).toMatch(/^0x[0-9a-f]{40}$/);
      expect(shift.dispute.disputeID).toMatch(/^\d+$/);
      // Signed, and the sign is the whole point: a penalty is a negative `pnkAmount`, and a
      // guard that only accepted unsigned decimals would throw away every loss on the page.
      expect(shift.pnkAmount).toMatch(/^-?\d+$/);
      expect(shift.ethAmount).toMatch(/^-?\d+$/);
      expect(shift.feeTokenAmount).toMatch(/^-?\d+$/);
    }
  }, 30_000);

  it("still pays natively, whatever `isNativeCurrency` says about it", async () => {
    // The trap this read is shaped around, checked against the endpoint rather than against a
    // fixture, because it is a property of the *deployment*. The v0.17.2 mapping reports
    // `isNativeCurrency: false` on every shift court 34 has produced while the raw
    // `TokenAndETHShift` logs carry `_feeToken = address(0)` — native ETH — and `ethAmount`
    // carries the fee in full. Believing the flag would send a reader to `feeTokenAmount`,
    // find `0`, and report that every agent juror has earned nothing.
    //
    // What this asserts is the half that would actually break the page: value arrives in
    // `ethAmount` and not in `feeTokenAmount`. If court 34 is ever switched to the WETH fee
    // token it already has registered, this fails — and the ETH figures on the page would
    // then be understating what was earned, which is exactly when someone should be told.
    const rewards = await fetchCourtRewards();
    const paid = rewards.filter((shift) => shift.ethAmount !== "0");

    expect(paid.length).toBeGreaterThan(0);
    expect(rewards.every((shift) => shift.feeTokenAmount === "0")).toBe(true);
  }, 30_000);

  it("scopes to court 34 through the dispute, since a shift carries no court of its own", async () => {
    const [rewards, disputes] = await Promise.all([fetchCourtRewards(), fetchCourtDisputes()]);
    const held = new Set(disputes.map((dispute) => dispute.disputeID));

    // A dispute ID is global across every court on this subgraph (`docs/knowledge/chain-and-subgraph.md`), so a
    // filter that missed would return other courts' payouts and this dashboard would add them
    // to an agent juror's column without a word.
    for (const shift of rewards) {
      expect(held).toContain(shift.dispute.disputeID);
    }
  }, 30_000);

  it("builds a model whose payouts still balance against the court's own fee", async () => {
    const [disputes, draws, rewards] = await Promise.all([
      fetchCourtDisputes(),
      fetchCourtDraws(),
      fetchCourtRewards(),
    ]);

    const result = buildCourtPerformance({
      disputes,
      draws,
      // No parameter history: nothing here is about a window, and it costs calls against the
      // endpoint whose rate limit the live suite as a whole has to live within.
      // `court-parameters.integration.test.ts` reads it.
      parameters: null,
      rewards,
      roster: ROSTER,
      drawsReadAt: null,
    });
    if (!result.success) throw new Error(`${result.code}: ${result.message}`);

    // The live form of the arithmetic `totals.test.ts` pins against the captured court, and
    // the reason it is worth repeating here: these two figures are **sums**, so a read that
    // came back short renders as an agent juror that earned less rather than as an error.
    // Nothing about a shorter list would look wrong on its own.
    //
    // PNK is a redistribution — taken from the incoherent, handed to the coherent — so a
    // dispute's net is zero to within the dust integer division leaves behind. A single missing
    // payout moves it by of the order of 1e20, which is fifteen orders of magnitude past the
    // tolerance. Checked per dispute rather than over the court, because of the one case where
    // it is not a redistribution at all.
    //
    // **A round with no coherent juror pays nobody.** KlerosCore sends its penalties and its fee
    // to the governor, out of the court (`LeftoverRewardSent`). Dispute 282 is the first: all five
    // votes were for 2, only the appeal side for 0 was funded, so the ruling became 0 and every
    // draw was wrong. It was executed on 2026-09-20 and its 935 PNK left the court; the old
    // court-wide sum read -935 PNK from then on.
    //
    // Summed from the raw shifts and not from the cells, so neither an off-roster juror (who has
    // no cell) nor a draw the draw read dropped can take a payout out of the sum. A dispute counts
    // as a forfeit only if **both** reads say nobody was paid: no shift is positive in PNK or ETH,
    // and no cell is coherent or tied. A lost payout to the lone coherent juror leaves that juror's
    // cell coherent, so the dispute still has to balance and goes red.
    expect(result.data.rewards.read).toBe(true);
    expect(result.data.rewards.short).toBe(false);
    expect(result.data.rewards.paidDraws).toBeGreaterThan(0);

    const byDispute = new Map<string, typeof rewards>();
    for (const shift of rewards) {
      const id = shift.dispute.disputeID;
      byDispute.set(id, [...(byDispute.get(id) ?? []), shift]);
    }
    const rows = new Map(result.data.rows.map((row) => [String(row.dispute.id), row]));

    let balanced = 0;
    for (const [id, shifts] of byDispute) {
      const net = shifts.reduce((total, shift) => total + BigInt(shift.pnkAmount), 0n);
      const anyShiftPaid = shifts.some(
        (shift) => BigInt(shift.pnkAmount) > 0n || BigInt(shift.ethAmount) > 0n,
      );
      const anyCellPaid = (rows.get(id)?.cells ?? []).some(
        (cell) => cell?.state.kind === "coherent" || cell?.state.kind === "tied",
      );

      if (anyShiftPaid || anyCellPaid) {
        expect(net > -1_000_000n && net < 1_000_000n, `dispute ${id}: ${net}`).toBe(true);
        balanced += 1;
      } else {
        // The forfeit: nobody gained anything, in PNK or ETH, and every draw lost its stake.
        for (const shift of shifts) {
          expect(BigInt(shift.pnkAmount), `dispute ${id}`).toBeLessThan(0n);
        }
      }
    }

    expect(balanced).toBeGreaterThan(0);
  }, 30_000);
});
