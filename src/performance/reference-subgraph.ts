import { coreSubgraphUrl, fetchCourtDisputes } from "../disputes/court-subgraph";
import { postSubgraphQuery } from "../disputes/subgraph";
import { ReadFailure, SOURCES } from "../read-failure";
import { type RawReference, type RawReferenceCourt, REFERENCE_COURT_ID } from "./reference";

/**
 * The comparison court's record, from the same core subgraph as every other figure (ticket 23).
 *
 * The same deployment and not a second one. A dispute id is global across every court on it,
 * which `docs/knowledge/chain-and-subgraph.md` records as a hazard for `/disputes/:id`. Here it
 * is what makes the read possible: the deployment holds every dispute in every court, with the
 * same `Round.timeline` this dashboard already parses.
 */
const COURT_QUERY = `
  query($court: ID!) {
    court(id: $court) {
      id
      name
      numberDisputes
    }
  }
`;

/**
 * The court's own count, then its disputes. **The order is the guard's premise.**
 *
 * `referenceReadingOf` treats fewer disputes than the count as a short read, and more as a
 * dispute created between the two requests. That holds only if the count is read first. A court
 * only gains disputes, so a count read first can never be larger than an honest list read after
 * it.
 *
 * A court that does not exist comes back as `court: null` inside an HTTP 200, and
 * `postSubgraphQuery` turns that into a `ReadFailure` naming the missing field. Without that, a
 * mistyped court id would read as a court with no disputes.
 */
export async function fetchReference({
  url = coreSubgraphUrl(),
  courtId = REFERENCE_COURT_ID,
  signal,
}: {
  url?: string;
  courtId?: string;
  signal?: AbortSignal;
} = {}): Promise<RawReference> {
  const court = await postSubgraphQuery<RawReferenceCourt>({
    url,
    query: COURT_QUERY,
    variables: { court: courtId },
    signal,
    source: SOURCES.core,
    field: "court",
  });

  if (court.id !== courtId) {
    throw new ReadFailure(`${SOURCES.core.label} answered for court ${court.id}, not ${courtId}`, {
      source: SOURCES.core,
      status: "Wrong court",
    });
  }

  const disputes = await fetchCourtDisputes({ url, courtId, signal });
  return { court, disputes };
}
