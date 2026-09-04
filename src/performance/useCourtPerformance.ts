import { useQuery } from "@tanstack/react-query";
import { useMemo } from "react";
import { COURT_ID } from "../disputes/court-subgraph";
import type { RawDispute } from "../disputes/disputes";
import { refetchIntervalFor } from "../disputes/liveness";
import { type AgentJuror, ROSTER } from "../roster/agent-jurors";
import { createArbitrumClient } from "./arbitrum";
import { fetchCommitCasts } from "./commit-logs";
import { fetchCourtParameters } from "./court-parameters";
import { fetchCourtDraws } from "./draws-subgraph";
import { buildCourtPerformance, type CourtPerformance } from "./performance";
import { fetchCourtRewards } from "./rewards-subgraph";

export type CourtPerformanceView = {
  /**
   * The matrix, or `null` when it cannot be built — the draws have not arrived, or the payload
   * was one the seam refused. Never a half-built model: a matrix missing its draws would render
   * a page of blank cells, and a blank cell means an agent juror was not drawn.
   */
  performance: CourtPerformance | null;
  isLoading: boolean;
  error: Error | null;
  /**
   * Why the commit log read failed, separately from `error`.
   *
   * Separate because `error` is the failure that leaves `performance` null, and this one must
   * never do that: commit latency is read from Arbitrum and everything else in the matrix is
   * not, so folding an outage there into the blocking channel would blank sixteen rows of
   * subgraph measurements that are entirely true. The matrix already states the shortfall in
   * words; this is the reason behind it, for the banner ticket 13 builds.
   *
   * It is also the half that tells a read still in flight from one that failed. Both leave
   * `commitCoverage.read` false, and a page that keyed its wording on that flag alone would
   * say "still being read" about a read that gave up minutes ago.
   */
  commitError: Error | null;
  /**
   * Why the court's parameter history could not be read, on the same terms.
   *
   * Non-blocking for the same reason: a history that never arrives costs the † marker and the
   * windows on each row, and nothing else. Every latency and every coherence on the page is
   * still true — what is missing is the note saying which of them are not comparable with which.
   *
   * A history that arrives *malformed* is a different path and does block, exactly as a
   * malformed commit payload does: `buildCourtPerformance` refuses a payload it cannot believe
   * rather than measuring against a fabricated window. This field is about the request failing,
   * not about what a successful one carried.
   */
  parametersError: Error | null;
  /**
   * Why the court's payouts could not be read, on the same terms again.
   *
   * Non-blocking for the reason the other two are: cumulative ETH and PNK are two of the six
   * figures in a column header and nothing else on the page reads them, so blanking a matrix of
   * true latencies over them would be the worse lie.
   *
   * It is read from the **core subgraph**, unlike the two above — the same deployment that
   * serves the disputes and the draws. So an outage there raises this alongside `error`, and
   * `MatrixPage` has to state one failure once: `coreFailureOf` ranks this last and returns a
   * single entry, exactly as `arbitrumFailureOf` does for the two reads that share Arbitrum.
   */
  rewardsError: Error | null;
  /**
   * The seam's own rejection, unflattened.
   *
   * `buildCourtPerformance` returns `{success: false, code, message, details}` and this hook used
   * to compress all of it into `new Error(code + ": " + message)`, because nothing above it could
   * show more than a sentence. The banner can: the code is what kind of failure it was and the
   * details name the draw that could not be read, and both are the difference between "the court
   * could not be read" and a payload this dashboard refused. `null` whenever the model built.
   */
  failure: { code: string; message: string; details: Record<string, unknown> } | null;
  /**
   * When the draws on screen were read, in epoch milliseconds, or `null` before any land.
   *
   * Exposed because the banner has to print how long ago the page was last read *whole*, and
   * this is the half a reader cannot otherwise see. `DisputesView.readAt` alone would be the
   * wrong figure in exactly the case the banner exists for: a successful dispute re-read beside
   * a failed draw re-read keeps that moment current while the page is incomplete, so the banner
   * would announce a partial page and date it to a minute ago.
   */
  readAt: number | null;
  /** Whether the reads are paused because the browser reports no connection. See `DisputesView`. */
  isPaused: boolean;
  /** Read the draws and the commitments again, for the banner's retry. */
  retry: () => void;
};

/**
 * The disputes half of the model, as `useDisputes` already holds it.
 *
 * Taken as an argument rather than fetched again so that one request feeds both the list and
 * the matrix, and so that both are always looking at the same court.
 *
 * `error` is here because a failed dispute read is not the same as an empty court, and without
 * it the two are indistinguishable: `raw` is `[]` either way, and a matrix built from `[]` is a
 * successful model with no rows — which the page would then render as "the subgraph returned no
 * disputes", a positive claim about a read that failed.
 */
export type RawDisputesView = {
  raw: readonly RawDispute[];
  isLoading: boolean;
  error: Error | null;
  /** Whether the browser reports no connection, so this read is paused rather than failing. */
  isPaused: boolean;
  /** Read the disputes again. The banner's retry has to reach both halves, not one. */
  retry: () => void;
};

/**
 * Whether the dispute read produced something a matrix can honestly be built from.
 *
 * The case this exists for: the first read fails. `raw` is then `[]` with no error to be seen
 * inside the seam, and `buildCourtPerformance([])` is a perfectly *successful* model with no
 * rows — which the matrix renders as "the subgraph returned no disputes for court 34", a
 * positive claim about a read that failed.
 *
 * A failed *refetch* is deliberately not this case: react-query keeps the rows already held, so
 * the matrix rebuilds from them and the page says separately that it may be out of date. Showing
 * a stale court and saying so beats showing nothing.
 */
export function hasReadableDisputes(
  // The three fields it actually reads, rather than the whole view. Ticket 13 added a retry
  // callback and a paused flag to `RawDisputesView`, neither of which this decision consults,
  // and taking the wide type would have made every caller and every test hand over a function
  // to answer a question about a payload.
  disputes: Pick<RawDisputesView, "raw" | "isLoading" | "error">,
): boolean {
  if (disputes.isLoading) return false;
  return disputes.raw.length > 0 || disputes.error === null;
}

/**
 * The dashboard model, assembled above the seam.
 *
 * Everything derived happens inside `buildCourtPerformance`; this hook only fetches, waits for
 * both halves, and hands the failure up as something the page can say. The roster it passes is
 * the checked-in one — the ENS identities belong to the column headers, and joining on a
 * resolved nickname would key the matrix on a display name.
 *
 * Liveness is ticket 12's, and it is here: the draws are re-read on the same five-second
 * interval as the disputes while the court has anything still being decided. The commitments
 * deliberately are not — see the commit query below.
 */
export function useCourtPerformance(
  disputes: RawDisputesView,
  agentJurors: readonly AgentJuror[] = ROSTER,
): CourtPerformanceView {
  const query = useQuery({
    queryKey: ["courtDraws", COURT_ID],
    queryFn: async ({ signal }) => {
      // Stamped before the request goes out, not after it comes back, and this is the whole
      // reason the query function is not a one-liner. What the moment has to answer is "could
      // this read have seen that dispute?", and the answer for anything created while the
      // request was in flight is no — the subgraph had already served it. Dating the read by
      // react-query's `dataUpdatedAt`, which is when the answer *arrived*, would classify such
      // a dispute as read, and it would then render as six blank "not drawn" cells: exactly the
      // unread-state-as-fact misclassification `MatrixRow.read` exists to prevent, in the window
      // of one subgraph round trip against Arbitrum's quarter-second blocks.
      const requestedAt = Date.now();
      return { draws: await fetchCourtDraws({ signal }), requestedAt };
    },
    // The same minute the dispute list holds: the two are read together and there is nothing
    // to be gained from one of them being fresher than the other.
    staleTime: 60 * 1000,
    /**
     * And the same interval, for the same reason.
     *
     * Watching a live dispute is watching *this* query: the disputes say a period is open and
     * the draws say who has acted in it. A five-second dispute list beside a minute-old draw
     * list would render a commit period unfolding above cells that had not moved — the pair
     * ticket 15's provenance footer already had to learn to talk about.
     *
     * Keyed on the disputes rather than on what this query itself returned, because the draws
     * carry no period: whether anything is still being decided is a fact about the court, and
     * the court is what the dispute read holds.
     */
    refetchInterval: () => refetchIntervalFor(disputes.raw),
  });

  const draws = query.data?.draws;

  /**
   * The commitments, read from Arbitrum rather than from the subgraph (ADR-0004).
   *
   * A separate query on purpose, and one the matrix does not wait on: reveal latency and
   * coherence come from the subgraph and are unaffected by an Arbitrum outage, so a failure
   * here costs the commit line and nothing else. Blanking sixteen rows of true measurements
   * over an endpoint that carries half of one of them would be the worse lie.
   *
   * Keyed on the draws it has to explain, which is what keeps the cross-check honest. The count
   * compares two reads, so it is only meaningful when both have seen the same court: were this
   * keyed on the court alone, a draws refetch that picked up a newly committed draw would raise
   * `expected` against a commit list read before it existed, and the page would report a
   * shortfall that is an artefact of which request returned first. A changed draw set retires
   * this read instead, and until the replacement lands the model is told the commits are not in.
   */
  const commitQuery = useQuery({
    queryKey: [
      "commitCasts",
      COURT_ID,
      agentJurors.map((agentJuror) => agentJuror.address),
      draws?.length ?? 0,
    ],
    queryFn: ({ signal }) =>
      fetchCommitCasts({ client: createArbitrumClient(undefined, signal), roster: agentJurors }),
    // Nothing to read against until the draws are in, and a first read keyed on zero draws would
    // be retired by the very next render.
    enabled: draws !== undefined,
    staleTime: 60 * 1000,
    /**
     * No interval here, and that is the deliberate exception to the pair above.
     *
     * This read costs one `eth_getLogs` and then one `eth_getBlockByNumber` per commitment,
     * against an endpoint that rate-limits per RPC *call* and counts a batch as its size.
     * ADR-0004 measured it: 62 blocks read three times over inside a second returns HTTP 429,
     * surfacing through viem as an unrecognisable `UnknownRpcError`. A five-second interval
     * here would take the commit line down for exactly the person watching a commit period.
     *
     * It is gated on the draw set instead, which is the other half of ticket 07's advice: a
     * newly committed draw changes the key and retires this read, so the commitments refresh
     * when there is something new to explain and not on a clock. `block-times.ts` is what
     * makes that re-read cheap — a block's timestamp cannot change, so a repeated scan pays
     * only for blocks it has never seen.
     */
  });

  const commits = commitQuery.data;

  /**
   * The court's parameter history, from the same chain and a different contract (ticket 08).
   *
   * Keyed on the court alone and on nothing else, because unlike the commit scan this read is
   * not a cross-check against anything: it is the court's own configuration, three logs deep,
   * and it answers the same way whichever disputes have been read beside it.
   *
   * Not waited on, exactly like the commitments. An unread history costs the marker saying
   * which rows are not comparable with which — worth stating, never worth a blank page.
   */
  const parametersQuery = useQuery({
    queryKey: ["courtParameters", COURT_ID],
    queryFn: ({ signal }) =>
      fetchCourtParameters({ client: createArbitrumClient(undefined, signal) }),
    // The same minute as everything else. Court 34 is retimed to suit a demo and has been
    // reconfigured twice in a fortnight (`docs/knowledge/court-34.md`), but a minute is short
    // against even that — so this is about the endpoint's rate limit rather than about
    // freshness: it counts a batch as its size, and this read is four calls on top of the
    // commit scan's fifty-odd.
    staleTime: 60 * 1000,
  });

  const parameters = parametersQuery.data;

  /**
   * What the court has paid out, from the core subgraph (ticket 10).
   *
   * Keyed on the court alone, like the parameter history and unlike the commit scan: it is not
   * a cross-check against the draws, so it answers the same way whichever of them are on
   * screen, and keying it on the draw set would retire a perfectly good read every time a new
   * commitment landed.
   *
   * **No interval, and the reason is not the one the commit scan has.** That read is throttled
   * because arb1 rate-limits per call; this one shares an endpoint with the disputes and the
   * draws, which already poll every five seconds while the court is live. What decides it is
   * the figure's own cadence: a shift is written when a dispute is *executed*, hours after the
   * commit and vote periods a live viewer is watching unfold, so a five-second poll would add
   * half again to this endpoint's load to catch a number that moves twice a day. It refetches
   * on mount and holds the same minute of staleness as everything else.
   *
   * Not waited on, exactly like the two Arbitrum reads. What an unread payout costs is two of
   * the six figures in each column header, and the header says which.
   */
  const rewardsQuery = useQuery({
    queryKey: ["courtRewards", COURT_ID],
    queryFn: ({ signal }) => fetchCourtRewards({ signal }),
    staleTime: 60 * 1000,
  });

  const rewards = rewardsQuery.data;
  // The moment the draws on screen were *asked for*. This is what tells a row whose draws were
  // read from a row created after the last read that could have seen it. react-query keeps what
  // it holds when a refetch fails, so it can be an hour older than the dispute list beside it —
  // which is exactly the drift it exists to make visible rather than to hide.
  const drawsReadAt = query.data?.requestedAt ?? null;

  const result = useMemo(() => {
    if (draws === undefined || !hasReadableDisputes(disputes)) return null;
    return buildCourtPerformance({
      disputes: disputes.raw,
      draws,
      drawsReadAt,
      // `null`, never `[]`: an unfinished read is not an empty one. `[]` here would have the
      // matrix announce that every commitment in the court failed to read, on every cold load,
      // for as long as the chain takes to answer — a failure stated before it has happened.
      commits: commits ?? null,
      // `null` for the same reason, and with a quieter consequence: an unread history marks
      // nothing, where `[]` would assert that a court which has plainly been configured at
      // least once never was.
      parameters: parameters ?? null,
      // `null` again, and here the consequence is the loudest of the three, because these two
      // figures are sums. `[]` would put `0.0000` and `0.00` in all six column headers on every
      // cold load — a statement that nobody has earned anything, in the ordinary ink of a
      // measurement, retracting itself a moment later.
      rewards: rewards ?? null,
      roster: agentJurors,
    });
  }, [disputes, draws, commits, parameters, rewards, agentJurors, drawsReadAt]);

  const failure = result?.success === false ? result : null;

  return {
    performance: result?.success === true ? result.data : null,
    // Both Arbitrum reads are deliberately absent from `isLoading`: the matrix renders as soon
    // as the subgraph answers, and says separately that the commit column and the window
    // marker are not in yet.
    isLoading: query.isPending || disputes.isLoading,
    error:
      query.error ??
      disputes.error ??
      (failure !== null ? new Error(`${failure.code}: ${failure.message}`) : null),
    commitError: commitQuery.error,
    parametersError: parametersQuery.error,
    rewardsError: rewardsQuery.error,
    readAt: drawsReadAt,
    failure:
      failure === null
        ? null
        : { code: failure.code, message: failure.message, details: failure.details },
    // The commit query is deliberately not counted: it is the one read this page does not wait
    // for, and an offline browser pauses it alongside the others anyway through the two below.
    isPaused: query.fetchStatus === "paused" || disputes.isPaused,
    retry: () => {
      void query.refetch();
      void commitQuery.refetch();
      void rewardsQuery.refetch();
      disputes.retry();
    },
  };
}
