import type { RawDisputeTemplate } from "./dispute-templates";
import { postSubgraphQuery } from "./subgraph";

/**
 * The Kleros v2 dispute resolver template subgraph on Goldsky: keyless and CORS-open,
 * like the core one, and on the same host — so `api.goldsky.com` was already on
 * `connect-src` and adding this endpoint widened no policy.
 *
 * Overridable, but see netlify.toml: a host substituted here that is not on that list is
 * blocked by the browser before the request is ever sent, and Vite's dev server sends no
 * policy at all, so the mistake would surface only in production.
 */
export const DEFAULT_DRT_SUBGRAPH_URL =
  "https://api.goldsky.com/api/public/project_cmgx9all3003atlp2bqha1zif/subgraphs/kleros-v2-drt/v0.12.0/gn";

export function drtSubgraphUrl(): string {
  return import.meta.env.VITE_DRT_SUBGRAPH_URL ?? DEFAULT_DRT_SUBGRAPH_URL;
}

/** How many templates to ask for per round trip. Court 34 needs one batch today. */
const BATCH_SIZE = 100;

/**
 * Templates are fetched by exact id and never by range.
 *
 * `id` is a GraphQL `ID`, which The Graph sorts and compares as a string: asking for
 * `id_gte: "161"` returns templates 2 and 17 through 28 as well, because that is what
 * the string comparison says. It is the same trap that makes dispute lists order on
 * `disputeID`. `id_in` sidesteps it entirely — and an id with no template simply does
 * not come back, which is the tolerance the row rendering already assumes.
 */
const TEMPLATES_QUERY = `
  query($first: Int!, $ids: [ID!]!) {
    disputeTemplates(first: $first, where: { id_in: $ids }) {
      id
      templateData
    }
  }
`;

/**
 * The templates behind a set of disputes, in whatever order the endpoint returns them.
 *
 * Order does not matter here because the result is consumed as a map keyed by template
 * id; nothing downstream reads a position. Batches run one after another rather than at
 * once — today this is a single request, and a court large enough to need several is
 * also one where a burst of parallel requests is the wrong thing to point at a public
 * keyless endpoint.
 */
export async function fetchDisputeTemplates({
  ids,
  url = drtSubgraphUrl(),
  signal,
}: {
  ids: readonly number[];
  url?: string;
  signal?: AbortSignal;
}): Promise<RawDisputeTemplate[]> {
  const all: RawDisputeTemplate[] = [];

  for (let start = 0; start < ids.length; start += BATCH_SIZE) {
    const batch = ids.slice(start, start + BATCH_SIZE);

    const templates = await postSubgraphQuery<RawDisputeTemplate[]>({
      url,
      query: TEMPLATES_QUERY,
      variables: { first: batch.length, ids: batch.map(String) },
      signal,
      source: "Template subgraph",
      field: "disputeTemplates",
    });

    all.push(...templates);
  }

  return all;
}
