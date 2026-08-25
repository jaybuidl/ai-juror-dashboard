import type { RawDispute } from "./disputes";

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
        rounds {
          id
          timeline
        }
      }
    }
  `;
}

type DisputesResponse = {
  data?: { disputes?: RawDispute[] };
  errors?: { message: string }[];
};

async function postQuery(
  url: string,
  query: string,
  variables: Record<string, unknown>,
  signal?: AbortSignal,
): Promise<RawDispute[]> {
  const response = await fetch(url, {
    method: "POST",
    headers: { "content-type": "application/json" },
    body: JSON.stringify({ query, variables }),
    signal,
  });

  if (!response.ok) {
    throw new Error(`Core subgraph returned HTTP ${response.status} ${response.statusText}`);
  }

  const body = (await response.json()) as DisputesResponse;

  // A GraphQL error arrives inside a 200, so this is the only place a bad query or a
  // renamed field shows up. Absorbing it would leave the page reporting an empty court.
  if (body.errors?.length) {
    throw new Error(`Core subgraph rejected the query: ${body.errors[0]?.message}`);
  }
  if (!body.data?.disputes) {
    throw new Error("Core subgraph returned no disputes field");
  }

  return body.data.disputes;
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
    const page = await postQuery(
      url,
      disputesQuery(cursor !== undefined),
      cursor === undefined
        ? { first: PAGE_SIZE, court: courtId }
        : { first: PAGE_SIZE, court: courtId, disputeID_lt: cursor },
      signal,
    );

    all.push(...page);

    if (page.length < PAGE_SIZE) return all;

    cursor = page[page.length - 1]?.disputeID;
    if (cursor === undefined) return all;
  }
}
