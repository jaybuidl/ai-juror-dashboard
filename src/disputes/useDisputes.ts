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
 * Liveness — the 5s refetch and the persistence of finalised disputes — is ticket 12's, so
 * this holds plain staleTimes and no interval.
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
  });

  const rows = disputes.data?.disputes ?? NO_MODEL;
  const templateIds = templateIdsOf(rows);

  const templates = useQuery({
    // Keyed on the whole set of ids, so a new dispute refetches every title rather than
    // only its own. That is one extra request against a keyless endpoint for a court
    // holding sixteen disputes, and it keeps the cache entry a straightforward function
    // of what is on screen.
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
    },
    slotsFor: (dispute) => {
      const template = templateFor(templates.data ?? NO_TEMPLATES, dispute);

      return { title: template?.title, category: template?.category };
    },
  };
}
