import { SOURCES } from "../read-failure";
import type { RawDispute } from "./disputes";
import { postSubgraphQuery } from "./subgraph";

/**
 * The Kleros v2 core subgraph on Goldsky: keyless, CORS-open and reachable from a
 * browser, which is what lets this dashboard have no backend at all.
 *
 * Overridable, but see netlify.toml — `api.goldsky.com` is already in `connect-src`, and
 * a host substituted here that is not on that list is blocked by the browser before the
 * request is ever sent.
 */
export const DEFAULT_CORE_SUBGRAPH_URL =
  "https://api.goldsky.com/api/public/project_cmgx9all3003atlp2bqha1zif/subgraphs/kleros-v2-coreneo/v0.17.2/gn";

/**
 * The endpoint, overridable at build time.
 *
 * **Anything reading `import.meta.env` has to be tested twice.** Netlify runs the suite through
 * `build:ci`, inside the deploy environment, so `VITE_` variables set on the site are present
 * there and absent on your machine. A default that works locally can therefore be overridden in
 * production by a variable you never see, and the reverse. This applies equally to
 * `arbitrumRpcUrl`, `templatesSubgraphUrl` and `mainnetRpcUrl`.
 */
export function coreSubgraphUrl(): string {
  return import.meta.env.VITE_CORE_SUBGRAPH_URL ?? DEFAULT_CORE_SUBGRAPH_URL;
}

/** Court 34, "Agentic Commerce Court" — the only court this dashboard measures. */
export const COURT_ID = "34";

/**
 * How many disputes to ask for per round trip. The court held 16 on 2026-08-25, so this
 * is one request today; it pages because new disputes arrive continually and an upper
 * bound guessed here would silently truncate the page once it was passed.
 */
const PAGE_SIZE = 100;

/**
 * Ordered by `disputeID` rather than by `id`: both are the core dispute ID, but `id` is
 * an `ID` the subgraph sorts as a string, which puts dispute 99 above dispute 100.
 *
 * `period` is deliberately absent from the ordering. The Graph rejects ordering by that
 * enum on `Dispute` outright, as agentkit's readers record.
 *
 * The `rounds` selection is what makes every later latency measurement possible: the
 * timeline holds the observed moment each period opened, which exists nowhere else.
 *
 * `templateId` is the join to the dispute resolver template subgraph, where the title
 * and the category live. It is nullable on this type, and a dispute without one has no
 * title to resolve.
 */
function disputesQuery(hasCursor: boolean): string {
  const params = ["$first: Int!", "$court: String!"];
  const where = ["court: $court"];

  if (hasCursor) {
    params.push("$disputeID_lt: BigInt!");
    where.push("disputeID_lt: $disputeID_lt");
  }

  return `
    query(${params.join(", ")}) {
      disputes(
        first: $first
        where: { ${where.join(", ")} }
        orderBy: disputeID
        orderDirection: desc
      ) {
        id
        disputeID
        period
        ruled
        currentRuling
        createdAt
        lastPeriodChange
        currentRoundIndex
        templateId
        rounds {
          id
          timeline
        }
      }
    }
  `;
}

/**
 * Every dispute in the court, in the order the endpoint happened to return them.
 *
 * Ordering for display is not done here: `toDisputes` establishes it, so that it is a
 * property of the model rather than of a query someone could later change.
 */
export async function fetchCourtDisputes({
  url = coreSubgraphUrl(),
  courtId = COURT_ID,
  signal,
}: {
  url?: string;
  courtId?: string;
  signal?: AbortSignal;
} = {}): Promise<RawDispute[]> {
  const all: RawDispute[] = [];
  let cursor: string | undefined;

  // Cursor paging on disputeID, not `skip`: the cursor is strictly decreasing, so this
  // terminates even while new disputes are being created underneath it.
  for (;;) {
    const page = await postSubgraphQuery<RawDispute[]>({
      url,
      query: disputesQuery(cursor !== undefined),
      variables:
        cursor === undefined
          ? { first: PAGE_SIZE, court: courtId }
          : { first: PAGE_SIZE, court: courtId, disputeID_lt: cursor },
      signal,
      source: SOURCES.core,
      field: "disputes",
    });

    all.push(...page);

    if (page.length < PAGE_SIZE) return all;

    cursor = page[page.length - 1]?.disputeID;
    if (cursor === undefined) return all;
  }
}
