import { coreSubgraphUrl } from "../disputes/court-subgraph";
import { postSubgraphDocument } from "../disputes/subgraph";
import { SOURCES } from "../read-failure";
import type { RawDisputeDetail } from "./dispute-detail";

/**
 * One dispute's ballot, evidence and published prose, from the core subgraph.
 *
 * The only read in this dashboard that is scoped to a single dispute, and the only one the
 * per-dispute view makes on its own — the row, the dispute and the template it renders are
 * already held for the matrix and the index, and moving between views must not re-read them.
 *
 * One document with three root fields rather than three requests. They are one answer about one
 * dispute and there is nothing to be gained by letting them arrive at different moments: two
 * reads that landed apart render as one page read at the later one, which is the trap
 * `CLAUDE.md` records against the dispute and draw queries.
 */

/**
 * How many drawn vote IDs to ask for.
 *
 * A ceiling rather than a page, because this is one dispute: the largest panel court 34 has
 * held is five draws over five vote IDs, and a round large enough to pass a hundred would be a
 * different court. It is still a bound and not a promise — a payload that reached it would
 * silently drop draws — which is why `dispute-detail.integration.test.ts` asserts the live
 * court stays far below it.
 */
const DRAW_LIMIT = 100;

/**
 * `evidenceGroup` is asked for under the dispute's own id, which is an assumption about court
 * 34's one arbitrable rather than a fact about the schema — the deployed subgraph carries no
 * link from a dispute to its evidence at all. `externalDisputeId` is selected so the model can
 * check it before believing the count; see `evidenceCountOf`.
 *
 * `disputeKitDispute` is a list on the core `Dispute` and its inline fragment is what reaches
 * `numberOfChoices`: without it the selection would take whichever kit sorted first, which in a
 * court running one kit is right by accident.
 *
 * `justification { reference }` is the prose, and the one thing here no other read carries.
 * It is deliberately *not* on the court-wide draws query: it is 124 KB across the court today,
 * grows with every draw, and `courtDraws` is persisted to `localStorage`.
 */
const DETAIL_QUERY = `
  query($id: ID!, $first: Int!) {
    dispute(id: $id) {
      id
      disputeID
      externalDisputeId
      transactionHash
      disputeKitDispute {
        ... on ClassicDispute {
          numberOfChoices
          localRounds {
            id
            ... on ClassicRound {
              answers {
                answerId
                count
              }
            }
          }
        }
      }
    }
    evidenceGroup: classicEvidenceGroup(id: $id) {
      id
      nextEvidenceIndex
    }
    draws(first: $first, where: { dispute: $id }) {
      id
      juror {
        id
      }
      round {
        id
      }
      vote {
        ... on ClassicVote {
          choice
          justification {
            reference
          }
        }
      }
    }
  }
`;

/**
 * The read, or a throw.
 *
 * A dispute id that names nothing is **not** a throw: the endpoint answers `dispute: null` with
 * no error, which is exactly what `/disputes/9999` should produce — a real route with an id
 * that names no dispute. The view says that itself, and `namesADispute` is the test. Only a
 * failure to reach the endpoint at all reaches the banner.
 */
export async function fetchDisputeDetail({
  disputeId,
  url = coreSubgraphUrl(),
  signal,
}: {
  disputeId: number;
  url?: string;
  signal?: AbortSignal;
}): Promise<RawDisputeDetail> {
  const data = await postSubgraphDocument({
    url,
    query: DETAIL_QUERY,
    variables: { id: String(disputeId), first: DRAW_LIMIT },
    signal,
    source: SOURCES.core,
  });

  return data as RawDisputeDetail;
}
