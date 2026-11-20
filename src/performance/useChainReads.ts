import { useQuery } from "@tanstack/react-query";
import { createArbitrumClient } from "./arbitrum";
import { type DisputeBlockRange, fetchDisputeChain, type RawDisputeChain } from "./dispute-chain";

/**
 * The Arbitrum read a view makes for itself (ADR-0012): one dispute's record, for its timeline.
 *
 * Called from the dispute page and from nowhere else, which is the whole of the decision: no
 * other view shows a commit moment or an opener, so none reads them. Keyed on what the court
 * read says has happened, and read again when that moves — never on a clock, because the
 * endpoint rate-limits per call (`arbitrum.ts`).
 */

export type ChainRead<T> = {
  /**
   * What was read, or `null` before anything has landed.
   *
   * While a re-read is in flight this is the previous read, standing in: a timeline that blanked
   * every moment it already had whenever an agent juror committed would flicker for whoever is
   * watching. `answered` says which it is.
   */
  data: T | null;
  /**
   * Whether `data` answers for what the court read now says, rather than standing in from an
   * earlier read while the one asked for since is in flight.
   *
   * What is missing from an answered read is a finding. What is missing from one standing in is
   * not, yet: the court saw a commitment this read predates.
   */
  answered: boolean;
  error: Error | null;
  /** Whether the read is paused because the browser reports no connection. See `DisputesView`. */
  isPaused: boolean;
  retry: () => void;
};

/**
 * One dispute's period openings and commitments, for its timeline.
 *
 * @param range Where its record sits on chain (`DisputeDetail.blockRange`), or `null` where
 *   nothing can be read yet: before the dispute's own read lands, or before anyone is drawn.
 * @param progress What the court read says the dispute has reached (`progressOf`), or `null`
 *   where it holds no row for the dispute. A change is what makes a new opening or commitment
 *   possible, so it is what asks for a re-read; `null` asks for nothing.
 */
export function useDisputeChain(
  disputeId: number | null,
  range: DisputeBlockRange | null,
  progress: string | null,
): ChainRead<RawDisputeChain> {
  const enabled = disputeId !== null && range !== null && progress !== null;
  const query = useQuery({
    queryKey: [
      "disputeChain",
      disputeId,
      range?.fromBlock.toString() ?? null,
      range?.toBlock.toString() ?? null,
      progress,
    ],
    queryFn: ({ signal }) =>
      fetchDisputeChain({
        client: createArbitrumClient(undefined, signal),
        disputeId: disputeId as number,
        range: range as DisputeBlockRange,
      }),
    enabled,
    // A finished dispute's record is fixed for ever; a running one's is re-read when `progress`
    // moves, which is a new key. The minute is about the rate limit, not about freshness.
    staleTime: 60 * 1000,
    // The previous read stands in while the next one runs — but only for the same dispute. A
    // period opening carries no dispute id, so another dispute's openings would be attributed
    // to this one's periods.
    placeholderData: (previous, previousQuery) =>
      previousQuery?.queryKey[1] === disputeId ? previous : undefined,
  });

  return {
    data: query.data ?? null,
    answered: query.data !== undefined && !query.isPlaceholderData,
    error: query.error,
    isPaused: query.fetchStatus === "paused",
    // Only a read that can run. react-query's `refetch` runs a *disabled* query's function all
    // the same, and with no range this one throws — so the banner's Retry, pressed over a failed
    // dispute read, would add an Arbitrum failure for an endpoint nobody had asked anything.
    retry: () => {
      if (enabled) void query.refetch();
    },
  };
}
