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

import { ReadFailure, type Source } from "../read-failure";

type SubgraphResponse = {
  data?: Record<string, unknown>;
  errors?: { message: string }[];
};

/**
 * One GraphQL request, with every way it can quietly succeed turned into a throw.
 *
 * Returns the whole `data` object rather than one selection, which is what a document with
 * several root fields needs — ticket 09's per-dispute read asks for the dispute, its evidence
 * group and its draws at once, and each of those can legitimately be absent on its own. Use
 * `postSubgraphQuery` for the ordinary single-selection case; it is this with the one check
 * that field is present.
 *
 * `source` shapes the error messages, and it is what makes a failure legible: "the template
 * subgraph rejected the query" and "the core subgraph rejected the query" send whoever reads
 * it to different places.
 *
 * Every throw here is a `ReadFailure` rather than a plain `Error`, because ticket 13's banner
 * has to print the source and the status separately from the sentence. The sentence stays
 * exactly what it was — the two are the same facts, said once for a console and once for a
 * reader who cannot open one.
 */
export async function postSubgraphDocument({
  url,
  query,
  variables,
  signal,
  source,
}: {
  url: string;
  query: string;
  variables: Record<string, unknown>;
  signal?: AbortSignal;
  source: Source;
}): Promise<Record<string, unknown>> {
  const response = await fetch(url, {
    method: "POST",
    headers: { "content-type": "application/json" },
    body: JSON.stringify({ query, variables }),
    signal,
  });

  if (!response.ok) {
    throw new ReadFailure(
      `${source.label} returned HTTP ${response.status} ${response.statusText}`,
      { source, status: `HTTP ${response.status}` },
    );
  }

  const body = (await response.json()) as SubgraphResponse;

  // A GraphQL error arrives inside a 200, so this is the only place a bad query or a
  // renamed field shows up. Absorbing it would leave the page reporting an empty read.
  if (body.errors?.length) {
    throw new ReadFailure(`${source.label} rejected the query: ${body.errors[0]?.message}`, {
      source,
      // An HTTP 200 carrying a GraphQL error has no status worth printing — 200 is what it
      // said, and printing it beside the words "could not be read" would read as a
      // contradiction rather than as the trap it is.
      status: "GraphQL error",
    });
  }

  // A gateway that answers `{"data": null}` with no `errors` array is off-spec but real, and
  // letting that through hands the caller a null it then reads a field off — a TypeError in
  // place of the message the page was going to show.
  if (body.data === undefined || body.data === null) {
    throw new ReadFailure(`${source.label} returned no data`, { source, status: "No data" });
  }

  return body.data;
}

/**
 * One GraphQL request whose answer is a single selection, which is every read but ticket 09's.
 *
 * `field` is both what to return and what to complain about: a selection that came back
 * `undefined` or `null` is a read that did not answer the question it was asked, and the
 * message names it so the console says which.
 */
export async function postSubgraphQuery<T>({
  field,
  ...request
}: {
  url: string;
  query: string;
  variables: Record<string, unknown>;
  signal?: AbortSignal;
  source: Source;
  field: string;
}): Promise<T> {
  const data = await postSubgraphDocument(request);

  const selection = data[field];
  if (selection === undefined || selection === null) {
    throw new ReadFailure(`${request.source.label} returned no ${field} field`, {
      source: request.source,
      status: `No ${field} field`,
    });
  }

  return selection as T;
}
