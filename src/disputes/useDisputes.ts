import { useQuery } from "@tanstack/react-query";
import { COURT_ID, fetchCourtDisputes } from "./court-subgraph";
import type { DisputeListView } from "./DisputeList";
import { type Dispute, type RawDispute, toDisputes } from "./disputes";

/**
 * The court's disputes, as the list reads them and as the matrix is built from them.
 *
 * `raw` is the payload exactly as the subgraph returned it, kept because
 * `buildCourtPerformance` takes raw data and does every derivation itself — that is what the
 * seam is. Handing it the already-modelled list would put half the derivation above the seam
 * and half below it. One query feeds both, so the list and the matrix can never be looking at
 * different courts.
 */
export type DisputesView = DisputeListView & {
  raw: readonly RawDispute[];
};

const NO_DISPUTES: readonly RawDispute[] = [];
const NO_MODEL: readonly Dispute[] = [];

/**
 * The court's disputes, newest first.
 *
 * The fetch is the only thing here that touches the network; ordering and every derived
 * value come from `toDisputes`, which is pure. It stays inside the query function rather than
 * moving into a memo, because it throws on a payload it cannot read — inside, that is an error
 * the page reports; outside, it is a render that fails.
 *
 * Liveness — the 5s refetch and the persistence of finalised disputes — is ticket 12's, so
 * this holds a plain staleTime and no interval.
 */
export function useDisputes(): DisputesView {
  const query = useQuery({
    queryKey: ["courtDisputes", COURT_ID],
    queryFn: async ({ signal }) => {
      const raw = await fetchCourtDisputes({ signal });
      return { raw, disputes: toDisputes(raw) };
    },
    // New disputes arrive continually, but a minute-old list is not misleading — and
    // every row it holds carries its own period, so nothing here silently ages into a
    // claim that a dispute is finished.
    staleTime: 60 * 1000,
  });

  return {
    raw: query.data?.raw ?? NO_DISPUTES,
    disputes: query.data?.disputes ?? NO_MODEL,
    isLoading: query.isPending,
    // Kept alongside whatever rows are already held: a failed refetch must not blank the
    // list, and an incomplete list must not read as the whole court. Ticket 13 replaces
    // the plain notice this feeds with the designed failure state.
    error: query.error,
  };
}
