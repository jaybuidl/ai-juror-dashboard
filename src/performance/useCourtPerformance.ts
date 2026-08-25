import { useQuery } from "@tanstack/react-query";
import { useMemo } from "react";
import { COURT_ID } from "../disputes/court-subgraph";
import type { RawDispute } from "../disputes/disputes";
import { type AgentJuror, ROSTER } from "../roster/agent-jurors";
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

  const result = useMemo(() => {
    if (draws === undefined || !hasReadableDisputes(disputes)) return null;
    return buildCourtPerformance({ disputes: disputes.raw, draws, roster: agentJurors });
  }, [disputes, draws, agentJurors]);

  return {
    performance: result?.success === true ? result.data : null,
    isLoading: query.isPending || disputes.isLoading,
    error:
      query.error ??
      disputes.error ??
      (result?.success === false ? new Error(`${result.code}: ${result.message}`) : null),
  };
}
