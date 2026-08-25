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
export function hasReadableDisputes(disputes: RawDisputesView): boolean {
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
    queryFn: ({ signal }) => fetchCourtDraws({ signal }),
    // The same minute the dispute list holds: the two are read together and there is nothing
    // to be gained from one of them being fresher than the other.
    staleTime: 60 * 1000,
  });

  const draws = query.data;

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

  const result = useMemo(() => {
    if (draws === undefined || !hasReadableDisputes(disputes)) return null;
    return buildCourtPerformance({
      disputes: disputes.raw,
      draws,
      // `null`, never `[]`: an unfinished read is not an empty one. `[]` here would have the
      // matrix announce that every commitment in the court failed to read, on every cold load,
      // for as long as the chain takes to answer — a failure stated before it has happened.
      commits: commits ?? null,
      roster: agentJurors,
    });
  }, [disputes, draws, commits, agentJurors]);

  return {
    performance: result?.success === true ? result.data : null,
    // The commit read is deliberately absent from `isLoading`: the matrix renders as soon as
    // the subgraph answers, and says separately that the commit column is not in yet.
    isLoading: query.isPending || disputes.isLoading,
    error:
      query.error ??
      disputes.error ??
      (result?.success === false ? new Error(`${result.code}: ${result.message}`) : null),
    commitError: commitQuery.error,
  };
}
