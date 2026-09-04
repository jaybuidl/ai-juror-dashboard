import { keepPreviousData, useQuery } from "@tanstack/react-query";
import { COURT_ID, fetchCourtDisputes } from "./court-subgraph";
import type { DisputeListView } from "./DisputeList";
import {
  type DisputeTemplate,
  templateFor,
  templateIdsOf,
  toDisputeTemplates,
} from "./dispute-templates";
import { type Dispute, type RawDispute, toDisputes } from "./disputes";
import { fetchDisputeTemplates } from "./drt-subgraph";
import { refetchIntervalFor } from "./liveness";

/**
 * The court's disputes, as the list reads them and as the matrix is built from them.
 *
 * `raw` is the payload exactly as the core subgraph returned it, kept because
 * `buildCourtPerformance` takes raw data and does every derivation itself — that is what the
 * seam is. Handing it the already-modelled list would put half the derivation above the seam
 * and half below it. One query feeds both, so the list and the matrix can never be looking at
 * different courts.
 *
 * Titles are deliberately not in it: they come from a second endpoint, they are a property of
 * a row rather than of a measurement, and nothing below the seam reads one.
 */
export type DisputesView = DisputeListView & {
  raw: readonly RawDispute[];
  /**
   * When the disputes on screen were read, in epoch milliseconds, or `null` before any land.
   *
   * The provenance footer prints it. It comes from react-query rather than from a clock read
   * during render, so it is the moment of the *read* and not the moment of the render — those
   * differ by however long a tab has been left open, which is exactly the gap a citing reader
   * needs to see.
   */
  readAt: number | null;
  /**
   * Whether the dispute read is paused rather than failing.
   *
   * react-query's default `networkMode: "online"` pauses a query when the browser reports no
   * connection: `isPending` stays true, `fetchStatus` becomes `paused`, and no error is ever
   * thrown. Every failure notice in this repository keys on the error channel, so without this
   * an offline visitor sees "Reading the court…" indefinitely — the one failure that is
   * indistinguishable from a slow success. Found while writing ticket 03, surfaced by ticket 13.
   */
  isPaused: boolean;
  /** Read the court again, for the banner's retry. Clears the notice by succeeding. */
  retry: () => void;
  /**
   * The whole template behind one dispute, or `undefined` where none resolved.
   *
   * Beside `slotsFor` rather than instead of it. `slotsFor` is the *row's* two fields and the
   * list has no use for the rest; ticket 09's view needs the question the panel was asked and
   * the names of the choices it could pick, and reconstructing a template from the two strings
   * a row uses would quietly drop both — which is what the first cut of that view did.
   */
  templateFor: (dispute: Dispute) => DisputeTemplate | undefined;
};

/** What every dispute looks up against until the titles arrive, or if they never do. */
const NO_TEMPLATES = new Map<number, DisputeTemplate>();
const NO_DISPUTES: readonly RawDispute[] = [];
const NO_MODEL: readonly Dispute[] = [];

/**
 * The court's disputes, newest first, with what each one is about.
 *
 * Two reads rather than one, and the second depends on the first: the core subgraph
 * holds the disputes and the template id each joins on, the dispute resolver template
 * subgraph holds the title and category behind that id. Keeping them separate is what
 * lets a title fail without taking a dispute with it — the row layout is pinned so that
 * a title arriving later moves nothing, and a title never arriving leaves a row that is
 * still identified by its core dispute ID.
 *
 * The fetches are the only things here that touch the network; ordering and every derived
 * value come from pure functions. `toDisputes` stays inside the query function rather than
 * moving into a memo, because it throws on a payload it cannot read — inside, that is an
 * error the page reports; outside, it is a render that fails.
 *
 * Liveness is ticket 12's, and it is here: the court is re-read every five seconds for as long
 * as it holds a dispute the court has not ruled on, and not at all once it does not. Which
 * disputes those are, and why the predicate is the ruling rather than the period, is in
 * `liveness.ts`.
 */
export function useDisputes(): DisputesView {
  const disputes = useQuery({
    queryKey: ["courtDisputes", COURT_ID],
    queryFn: async ({ signal }) => {
      const raw = await fetchCourtDisputes({ signal });
      return { raw, disputes: toDisputes(raw) };
    },
    // New disputes arrive continually, but a minute-old list is not misleading — and
    // every row it holds carries its own period, so nothing here silently ages into a
    // claim that a dispute is finished.
    staleTime: 60 * 1000,
    /**
     * Five seconds while anything in the court is still being decided, and never otherwise.
     *
     * Read from what the last read returned rather than held in state, so the interval stops
     * on its own the moment the last live dispute is ruled — that is the whole of "a dispute
     * that finalises while the page is open loses its live treatment on the next refresh".
     * There is no effect and no timer of this dashboard's own anywhere in it.
     *
     * react-query does not poll a hidden tab (`refetchIntervalInBackground` defaults to
     * false), which is what makes the cost of the stricter finalised predicate acceptable:
     * a dispute nobody ever executes is polled only while someone is actually looking at it.
     */
    refetchInterval: (query) => refetchIntervalFor(query.state.data?.raw),
  });

  const rows = disputes.data?.disputes ?? NO_MODEL;
  const templateIds = templateIdsOf(rows);

  const templates = useQuery({
    // Keyed on the whole set of ids, so a new dispute refetches every title rather than
    // only its own. That is one extra request against a keyless endpoint for a court
    // holding a few dozen disputes, and it keeps the cache entry a straightforward
    // function of what is on screen.
    queryKey: ["disputeTemplates", templateIds],
    queryFn: async ({ signal }) =>
      toDisputeTemplates(await fetchDisputeTemplates({ ids: templateIds, signal })),
    // A template is written when its dispute is created, and this list never needs a
    // fresher read of one it already holds. New disputes arrive through a new key.
    staleTime: 60 * 60 * 1000,
    // Nothing to ask for before the disputes land, and asking for an empty set would be
    // a round trip whose answer is known.
    enabled: templateIds.length > 0,
    // The key is the whole set of ids, so one new dispute changes it and the cache entry
    // starts empty. Without this, every title on screen would blank for a round trip each
    // time the court grew — and under ticket 12's 5s refetch, repeatedly.
    placeholderData: keepPreviousData,
  });

  // A dispute with no template id has no title to be missing; it is not counted as a gap.
  const expectedTitles = rows.filter((dispute) => dispute.templateId !== null).length;
  const resolvedTitles = rows.filter(
    (dispute) => templateFor(templates.data ?? NO_TEMPLATES, dispute) !== undefined,
  ).length;

  return {
    raw: disputes.data?.raw ?? NO_DISPUTES,
    disputes: rows,
    isLoading: disputes.isPending,
    // react-query reports 0 for a query that has never resolved; that is not the epoch, it is
    // an absence, and the footer must not print 1970 as the moment the court was read.
    readAt: disputes.dataUpdatedAt === 0 ? null : disputes.dataUpdatedAt,
    // Both queries, because either can be the paused one and the visitor is offline for both.
    isPaused: disputes.fetchStatus === "paused" || templates.fetchStatus === "paused",
    retry: () => {
      void disputes.refetch();
      void templates.refetch();
    },
    // Kept alongside whatever rows are already held: a failed refetch must not blank the
    // list, and an incomplete list must not read as the whole court. Ticket 13 replaces
    // the plain notice this feeds with the designed failure state.
    error: disputes.error,
    // Counted rather than caught, because the likeliest way this read goes wrong throws
    // nothing at all: a reindexing DRT subgraph answers HTTP 200 with `[]` and no GraphQL
    // error, and a lagging one returns some of the ids and not the rest. Both would leave
    // rows silently untitled, which is indistinguishable from disputes that never had a
    // title — the exact reclassification the notice exists to prevent. A thrown error is
    // then just the case where the count is zero, and needs no separate channel.
    titles: {
      expected: expectedTitles,
      // "Resolved" means the template came back, not that it carried a title. A template
      // that genuinely holds none is a fact about the record; one that never arrived is a
      // gap in the read, and only the second is worth telling a visitor about.
      resolved: resolvedTitles,
      // Nothing is missing while the answer is still in flight — including the round trip
      // after a new dispute changes the key, where the placeholder above is what is on
      // screen and the newcomer's title has legitimately not arrived yet.
      isLoading: templates.isPending || templates.isFetching,
      // When the titles on screen landed, so a view whose failing half is the template read can
      // date itself by that read rather than by the dispute read that worked. `null` where there
      // was nothing to ask for: with no template ids the query never runs, and a zero here is an
      // absence rather than 1970.
      readAt: templates.dataUpdatedAt === 0 ? null : templates.dataUpdatedAt,
    },
    slotsFor: (dispute) => {
      const template = templateFor(templates.data ?? NO_TEMPLATES, dispute);

      return { title: template?.title, category: template?.category };
    },
    templateFor: (dispute) => templateFor(templates.data ?? NO_TEMPLATES, dispute),
  };
}
