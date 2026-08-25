import { COURT_ID, coreSubgraphUrl, postCoreQuery } from "../disputes/court-subgraph";
import type { RawDraw } from "./performance";

/**
 * Every drawn vote ID in the court, from the same keyless Goldsky endpoint the dispute list
 * reads. No RPC: everything ticket 05 measures is in the subgraph, and the one thing that is
 * not — the moment a commitment was mined — is ticket 07's.
 */

/**
 * How many vote IDs to ask for per round trip. The court had produced 76 on 2026-08-25, so
 * this is one request today; it pages because draws accumulate with every dispute and an
 * upper bound guessed here would silently truncate the matrix once it was passed — which is
 * the one failure that would render as an agent juror that did nothing.
 */
const PAGE_SIZE = 1000;

/**
 * Paged on `id` rather than on `skip`, which The Graph caps at 5,000.
 *
 * The ordering is lexicographic and the ids are `"<disputeID>-<round>-<voteID>"`, so the
 * sequence is not the order anything is displayed in — it is a cursor and nothing else. Every
 * order this dashboard shows is established in the model.
 *
 * `vote` is the `Vote` interface, and `ClassicVote` is its only implementation today; the
 * inline fragment is what lets the selection reach the fields on it. `commited` is the
 * subgraph's spelling.
 */
const DRAWS_QUERY = `
  query($first: Int!, $court: String!, $idGt: ID!) {
    draws(
      first: $first
      where: { dispute_: { court: $court }, id_gt: $idGt }
      orderBy: id
      orderDirection: asc
    ) {
      id
      juror {
        id
      }
      dispute {
        disputeID
      }
      round {
        id
      }
      vote {
        ... on ClassicVote {
          commited
          voted
          choice
          justification {
            timestamp
            choice
          }
        }
      }
    }
  }
`;

export async function fetchCourtDraws({
  url = coreSubgraphUrl(),
  courtId = COURT_ID,
  signal,
}: {
  url?: string;
  courtId?: string;
  signal?: AbortSignal;
} = {}): Promise<RawDraw[]> {
  const all: RawDraw[] = [];
  // The empty string sorts below every id, so the first page needs no special case.
  let cursor = "";

  for (;;) {
    const body = await postCoreQuery<{ draws?: RawDraw[] }>(
      url,
      DRAWS_QUERY,
      { first: PAGE_SIZE, court: courtId, idGt: cursor },
      signal,
    );

    if (!body.draws) {
      throw new Error("Core subgraph returned no draws field");
    }

    all.push(...body.draws);

    if (body.draws.length < PAGE_SIZE) return all;

    const last = body.draws[body.draws.length - 1];
    if (last === undefined) return all;
    cursor = last.id;
  }
}
