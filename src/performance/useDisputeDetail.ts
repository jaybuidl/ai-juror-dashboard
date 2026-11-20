import { useQuery } from "@tanstack/react-query";
import { useEffect, useRef } from "react";
import { type DisputeDetail, NO_DETAIL, namesADispute, toDisputeDetail } from "./dispute-detail";
import { fetchDisputeDetail } from "./dispute-detail-subgraph";

/**
 * One dispute's own read, for the view that shows it.
 *
 * The only hook in this dashboard keyed on a route parameter, and the only one that is not
 * called from `App`. That is deliberate rather than an exception to the composition root: the
 * three court-wide reads feed every view and must not be repeated when a visitor moves between
 * them, whereas this one is about the dispute in front of the reader and is useless anywhere
 * else. It is called from the view, which is where the dispute id is known.
 */

export type DisputeDetailView = {
  /**
   * What was read, or `NO_DETAIL` before anything lands.
   *
   * Never a half-built value: every field of `NO_DETAIL` is the absence the view already knows
   * how to draw, so a page rendered mid-read shows unread slots rather than zeros. A ballot of
   * `[]` is "not read"; a ballot with `votes: 0` in it is "nobody voted for that choice", and
   * the difference is the whole reason this is not defaulted field by field.
   */
  detail: DisputeDetail;
  /**
   * Whether the read came back and found no such dispute.
   *
   * False while the read is in flight, which is the distinction three separate bugs in this
   * repository have turned on: an absence is only a finding once there has been an answer to
   * fall short of. Without it every dispute would announce itself as nonexistent for the length
   * of a cold load and then retract it.
   */
  isUnknownDispute: boolean;
  /**
   * Whether a read is actually in flight.
   *
   * **Not** `isPending`. react-query leaves a *disabled* query pending for ever — it has no
   * data and never will — so a flag keyed on that alone is true for the whole life of a page
   * whose read was never started. The caveat it feeds then says "still being read" about a
   * dispute nobody asked for, under a view that says the address names nothing, and never
   * retracts it. That is the `RosterView.isResolving` trap `CLAUDE.md` records, and this is
   * the fourth time it has been reached for: an absence is only a finding once there has been
   * an answer to fall short of, and "no answer yet" is only true once something was asked.
   */
  isLoading: boolean;
  error: Error | null;
  /** Whether the read is paused because the browser reports no connection. See `DisputesView`. */
  isPaused: boolean;
  /** When it landed, in epoch milliseconds, or `null` before it has. */
  readAt: number | null;
  /** Read it again, for the banner's retry. */
  retry: () => void;
  /**
   * Whether the court read has since seen more reveals than this read did, so a revealed
   * draw's missing justification may be one this read predates. A re-read is already asked
   * for whenever this is true. See `PanelColumn.justificationUnread` (#21).
   */
  isBehindReveals: boolean;
};

/**
 * @param revealed How many of the dispute's agent juror draws the court read says have revealed
 *   (`revealedCountOf`), or `null` before it says. The court read polls and this one does not,
 *   so a rise in this count is what tells this read a justification may have appeared since it
 *   landed (#21). It is recorded beside the payload rather than put in the key, because a new key
 *   would blank the page for the length of the re-read.
 */
export function useDisputeDetail(
  disputeId: number | null,
  revealed: number | null,
): DisputeDetailView {
  const detail = useQuery({
    queryKey: ["disputeDetail", disputeId],
    queryFn: async ({ signal }) => ({
      // Captured as the read starts, so a reveal landing mid-read still counts as unseen.
      revealed,
      raw: await fetchDisputeDetail({ disputeId: disputeId as number, signal }),
    }),
    // Nothing to ask for until the URL names a dispute. A path segment that is not a number is
    // not a dispute that could not be read — it is an address that names nothing, and asking
    // the endpoint about it would turn a bad URL into a network round trip and a banner.
    enabled: disputeId !== null,
    // The same minute the court's own list holds. A ruled dispute's ballot, evidence and prose
    // are fixed for ever; an unruled one gains prose as its panel reveals, and the five-second
    // poll on the court is what brings a reader back here with fresh cells around it.
    staleTime: 60 * 1000,
  });

  // A read that predates the court's own does not know what the court has since seen revealed.
  // Behind whenever the counts differ, not only when the court's is higher: a read that started
  // before the court read landed recorded `null` and knows nothing (a cold deep link, which costs
  // one extra read), and an appeal round restarts the count from zero.
  const seen = detail.data === undefined ? undefined : detail.data.revealed;
  const isBehindReveals = revealed !== null && seen !== undefined && revealed !== seen;
  // One re-read per count, and never a second for the same one: a re-read that fails keeps the
  // old payload and so stays behind, and asking again the moment it settles would loop against
  // a failing endpoint. Recovery from that is the banner's retry, or the next reveal.
  const asked = useRef<number | null>(null);
  const { refetch, isFetching } = detail;
  useEffect(() => {
    if (!isBehindReveals || isFetching || asked.current === revealed) return;
    asked.current = revealed;
    void refetch();
  }, [isBehindReveals, isFetching, revealed, refetch]);

  return {
    // `toDisputeDetail` is applied here rather than inside the query function, which is the
    // opposite of what `useDisputes` does — and for the reason that made `useDisputes` do it
    // the other way. That one *throws* on a payload it cannot read, so it must run where a
    // failure is an error the page reports rather than a render that fails. This one is
    // tolerant by construction: every malformed field degrades to an absence, so there is
    // nothing to catch, and keeping the raw payload in the cache means `namesADispute` can
    // still tell "no such dispute" from "not read yet".
    detail: detail.data === undefined ? NO_DETAIL : toDisputeDetail(detail.data.raw),
    isUnknownDispute: detail.data !== undefined && !namesADispute(detail.data.raw),
    // `fetchStatus` is what tells a query that has not answered from one that was never asked:
    // it is `"idle"` for a disabled query and `"fetching"` for one in flight. `isPending` is
    // true for both.
    isLoading: detail.isPending && detail.fetchStatus !== "idle",
    error: detail.error,
    isPaused: detail.fetchStatus === "paused",
    // react-query reports 0 for a query that has never resolved; that is an absence and not
    // the epoch, and nothing may print 1970 as the moment this was read.
    readAt: detail.dataUpdatedAt === 0 ? null : detail.dataUpdatedAt,
    retry: () => {
      void detail.refetch();
    },
    isBehindReveals,
  };
}
