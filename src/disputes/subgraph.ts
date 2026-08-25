/**
 * The one way this dashboard talks to a subgraph.
 *
 * Both endpoints it reads — the core subgraph for the court's disputes, the dispute
 * resolver template subgraph for their titles — are public, keyless and CORS-open, which
 * is what lets the dashboard have no backend at all. What they share beyond that is the
 * failure handling, and it is worth having in one place: a GraphQL error arrives inside
 * an HTTP 200, so a renamed field or a rejected query is invisible to a plain
 * `response.ok` check and would surface as an empty list rather than as a failure.
 */

type SubgraphResponse = {
  data?: Record<string, unknown>;
  errors?: { message: string }[];
};

/**
 * One GraphQL request, with every way it can quietly succeed turned into a throw.
 *
 * `source` and `field` only shape the error messages, but they are what make a failure
 * legible: "the template subgraph rejected the query" and "the core subgraph rejected
 * the query" send whoever reads it to different places.
 */
export async function postSubgraphQuery<T>({
  url,
  query,
  variables,
  signal,
  source,
  field,
}: {
  url: string;
  query: string;
  variables: Record<string, unknown>;
  signal?: AbortSignal;
  source: string;
  field: string;
}): Promise<T> {
  const response = await fetch(url, {
    method: "POST",
    headers: { "content-type": "application/json" },
    body: JSON.stringify({ query, variables }),
    signal,
  });

  if (!response.ok) {
    throw new Error(`${source} returned HTTP ${response.status} ${response.statusText}`);
  }

  const body = (await response.json()) as SubgraphResponse;

  // A GraphQL error arrives inside a 200, so this is the only place a bad query or a
  // renamed field shows up. Absorbing it would leave the page reporting an empty read.
  if (body.errors?.length) {
    throw new Error(`${source} rejected the query: ${body.errors[0]?.message}`);
  }

  // The optional chain covers a null `data` as well as an absent field: a gateway that answers
  // `{"data": null}` with no `errors` array is off-spec but real, and letting that through hands
  // the caller a null it then reads a field off — a TypeError in place of the message the page
  // was going to show.
  const selection = body.data?.[field];
  if (selection === undefined || selection === null) {
    throw new Error(`${source} returned no ${field} field`);
  }

  return selection as T;
}
