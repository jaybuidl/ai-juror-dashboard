import { useQuery } from "@tanstack/react-query";
import { COURT_ID, fetchCourtDisputes } from "./court-subgraph";
import type { DisputeListView } from "./DisputeList";
import { type Dispute, toDisputes } from "./disputes";

/**
 * The court's disputes, newest first.
 *
 * The fetch is the only thing here that touches the network; ordering and every derived
 * value come from `toDisputes`, which is pure. Liveness — the 5s refetch and the
 * persistence of finalised disputes — is ticket 12's, so this holds a plain staleTime
 * and no interval.
 */
export function useDisputes(): DisputeListView {
  const query = useQuery({
    queryKey: ["courtDisputes", COURT_ID],
    queryFn: async ({ signal }): Promise<Dispute[]> =>
      toDisputes(await fetchCourtDisputes({ signal })),
    // New disputes arrive continually, but a minute-old list is not misleading — and
    // every row it holds carries its own period, so nothing here silently ages into a
    // claim that a dispute is finished.
    staleTime: 60 * 1000,
  });

  return {
    disputes: query.data ?? [],
    isLoading: query.isPending,
    // Kept alongside whatever rows are already held: a failed refetch must not blank the
    // list, and an incomplete list must not read as the whole court. Ticket 13 replaces
    // the plain notice this feeds with the designed failure state.
    error: query.error,
  };
}
