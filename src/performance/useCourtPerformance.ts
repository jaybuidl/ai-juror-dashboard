import { useQuery } from "@tanstack/react-query";
import { useMemo } from "react";
import { COURT_ID } from "../disputes/court-subgraph";
import type { RawDispute } from "../disputes/disputes";
import { type AgentJuror, ROSTER } from "../roster/agent-jurors";
import { createArbitrumClient, fetchCommitCasts } from "./commit-logs";
import { fetchCourtDraws } from "./draws-subgraph";
import { buildCourtPerformance, type CourtPerformance } from "./performance";

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
   * never do that: commit latency is the only figure read from Arbitrum, and folding an outage
   * there into the blocking channel would blank sixteen rows of subgraph measurements that are
   * entirely true. The matrix already states the shortfall in words; this is the reason behind
   * it, for the banner ticket 13 builds.
   */
  commitError: Error | null;
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
 * Liveness is ticket 12's: no refetch interval here, and no persistence of finalised rows.
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
  });

  const commits = commitQuery.data;

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
      roster: agentJurors,
    });
  }, [disputes, draws, commits, agentJurors, drawsReadAt]);

  const failure = result?.success === false ? result : null;

  return {
    performance: result?.success === true ? result.data : null,
    // The commit read is deliberately absent from `isLoading`: the matrix renders as soon as
    // the subgraph answers, and says separately that the commit column is not in yet.
    isLoading: query.isPending || disputes.isLoading,
    error:
      query.error ??
      disputes.error ??
      (failure !== null ? new Error(`${failure.code}: ${failure.message}`) : null),
    commitError: commitQuery.error,
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
      disputes.retry();
    },
  };
}
