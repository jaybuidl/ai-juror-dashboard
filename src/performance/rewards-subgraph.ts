import { COURT_ID, coreSubgraphUrl } from "../disputes/court-subgraph";
import { postSubgraphQuery } from "../disputes/subgraph";
import { SOURCES } from "../read-failure";
import type { RawRewardShift } from "./performance";

/**
 * Every reward and penalty the court has paid out, from the same keyless Goldsky endpoint the
 * disputes and the draws come from.
 *
 * A subgraph read and not a log scan, which is the opposite of what ticket 07 had to do for the
 * commitments — `TokenAndETHShift` is one of the few things the deployed subgraph carries in
 * full, amounts included, so there is nothing here Arbitrum has to be asked for. That also
 * keeps this read off the endpoint whose rate limit `docs/knowledge/chain-and-subgraph.md` is mostly about.
 *
 * Scoped to court 34 through the dispute, exactly as the draws are: a shift has no `court` of
 * its own, and a juror's rewards elsewhere are not a fact about this experiment.
 */

/**
 * How many shifts to ask for per round trip. The court had produced 44 on 2026-08-25 — one per
 * agent juror per *executed* dispute, against 56 draws, the other twelve sitting in disputes
 * 164-166 which were still in appeal — so this is one request today; it pages because a shift is
 * written for every draw the court executes and an upper bound guessed here would silently
 * truncate the totals rather than fail, which is the one failure that would understate what an
 * agent juror earned.
 */
const PAGE_SIZE = 1000;

/**
 * Paged on `id` for the reason the draws are: The Graph caps `skip` at 5,000, and the ordering
 * is a cursor rather than anything displayed. Shift ids are `"<juror>-<disputeID>-<round>"`,
 * lowercase, so the sequence is by juror and then lexicographically by dispute — `"151"` above
 * `"1510"` were the court ever to reach one. Nothing depends on it; the model groups by juror
 * and dispute and never reads the order.
 *
 * **`isNativeCurrency` is deliberately not selected, and must not be.** It reads `false` on all
 * 44 shifts this court has produced — one per *executed* draw, not one per draw — while the raw
 * `TokenAndETHShift` logs carry `_feeToken = address(0)` — native ETH — and `ethAmount` carries
 * the full `feeForJuror` of 270000000000000 wei. The field is present, correctly typed and
 * wrong, exactly like the `blockTimestamp: "0x0"` that `docs/knowledge/chain-and-subgraph.md`
 * records against `eth_getLogs`. A reader that
 * believed it would take the fee-token branch, find `feeTokenAmount` of `0`, and report that
 * every agent juror has earned nothing — with no error anywhere. Not selecting it is the guard:
 * a field that is not in the query cannot be reached for by someone who has not read this.
 *
 * `feeTokenAmount` *is* selected, as the one usable half of that story. It is `0` throughout
 * today, and a non-zero one is value the ETH figure does not carry — disclosed rather than
 * silently dropped. It is a partial guard and worth saying so: the deployment that mislabels
 * `isNativeCurrency` gives no assurance about which field it would fill if court 34 were ever
 * switched to the WETH fee token it already has registered.
 */
const REWARDS_QUERY = `
  query($first: Int!, $court: String!, $idGt: ID!) {
    shifts: tokenAndETHShifts(
      first: $first
      where: { dispute_: { court: $court }, id_gt: $idGt }
      orderBy: id
      orderDirection: asc
    ) {
      id
      juror {
        id
      }
      dispute {
        disputeID
      }
      pnkAmount
      ethAmount
      feeTokenAmount
    }
  }
`;

export async function fetchCourtRewards({
  url = coreSubgraphUrl(),
  courtId = COURT_ID,
  signal,
}: {
  url?: string;
  courtId?: string;
  signal?: AbortSignal;
} = {}): Promise<RawRewardShift[]> {
  const all: RawRewardShift[] = [];
  // The empty string sorts below every id, so the first page needs no special case.
  let cursor = "";

  for (;;) {
    const page = await postSubgraphQuery<RawRewardShift[]>({
      url,
      query: REWARDS_QUERY,
      variables: { first: PAGE_SIZE, court: courtId, idGt: cursor },
      signal,
      source: SOURCES.core,
      field: "shifts",
    });

    all.push(...page);

    if (page.length < PAGE_SIZE) return all;

    const last = page[page.length - 1];
    if (last === undefined) return all;
    cursor = last.id;
  }
}
