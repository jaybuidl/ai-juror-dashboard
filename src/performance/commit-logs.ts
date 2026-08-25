import { type PublicClient, parseAbiItem } from "viem";
import { type AgentJuror, ROSTER } from "../roster/agent-jurors";
import { blockTimestamps, createArbitrumClient } from "./arbitrum";
import type { RawCommitCast } from "./performance";

/**
 * The other half of the speed dimension: when each commitment was published.
 *
 * `ClassicVote.commited` is a boolean and nothing in the core subgraph's schema records *when*
 * a commitment was published, so the moment is recovered from `CommitCast` logs and the block
 * timestamp they sit in (ADR-0004). Reveal timestamps need none of this — they are on the
 * justification — which is why ticket 05 shipped the matrix with no RPC at all.
 *
 * The endpoint, the client and the block-timestamp trap are `arbitrum.ts`'s: this was the only
 * thing read from a chain until ticket 08 read the court's own parameter history from it.
 */

/** The dispute kit that emits the event. Verified in CLAUDE.md § Verified constants. */
export const DISPUTE_KIT_CLASSIC = "0x70B464be85A547144C72485eBa2577E5D3A45421";

/**
 * Both the dispute and the juror are indexed, so the filter is narrow and the response is
 * bounded by the roster rather than by how large Kleros v2 grows.
 *
 * `_voteIDs` and `_commit` are decoded and discarded: the draw is the unit here, the vote IDs
 * it holds are already counted from the subgraph, and the commitment hash is of no interest
 * once the moment it was published is known.
 */
export const COMMIT_CAST = parseAbiItem(
  "event CommitCast(uint256 indexed _coreDisputeID, address indexed _juror, uint256[] _voteIDs, bytes32 _commit)",
);

/**
 * The whole chain, in one unchunked request.
 *
 * Not a deployment block and not a constant to be maintained: `arb1.arbitrum.io` answers
 * `fromBlock: 0` to `latest` for this filter in ~230ms, because the filter is on an indexed
 * topic and the kit has emitted 62 of these events in its lifetime. A start block guessed here
 * would be one more number to keep true, and getting it wrong would drop the oldest disputes
 * from the matrix without saying anything.
 */
const FROM_BLOCK = 0n;

/**
 * Every commitment the roster has ever published, as moments.
 *
 * Filtered by juror rather than by court, because the court is not in the event and the roster
 * is: a log for a dispute this dashboard does not hold is dropped by the join in the seam,
 * exactly as a draw for one is. Returned as strings so the shape is the subgraph's — canonical
 * decimals the seam validates for itself — and so a captured payload is plain JSON.
 */
export async function fetchCommitCasts({
  client = createArbitrumClient(),
  roster = ROSTER,
}: {
  client?: PublicClient;
  roster?: readonly AgentJuror[];
} = {}): Promise<RawCommitCast[]> {
  const logs = await client.getLogs({
    address: DISPUTE_KIT_CLASSIC,
    event: COMMIT_CAST,
    args: { _juror: roster.map((agentJuror) => agentJuror.address) },
    fromBlock: FROM_BLOCK,
    toBlock: "latest",
  });

  // From the block and never from the log's own `blockTimestamp`, which this endpoint sends on
  // every log and always as zero — see `blockTimestamps`, which carries the trap in full.
  //
  // The cost is one call per commitment, and the public endpoint rate-limits per call rather
  // than per request: 62 blocks read three times over in a second returns HTTP 429. One page
  // load is nowhere near that, and react-query's minute of staleness keeps it that way — but
  // the ceiling is real and arrives with roughly 200 more disputes. The fix then is the one
  // ADR-0004 already prefers on merit: put the timestamp in the subgraph upstream.
  const timestampOf = await blockTimestamps(
    client,
    logs.map((log) => log.blockNumber),
  );

  return logs.map((log) => {
    const timestamp = timestampOf.get(log.blockNumber);
    if (timestamp === undefined) {
      throw new Error(`No block ${log.blockNumber} for the commitment in ${log.transactionHash}`);
    }

    // viem types both as optional because a log can fail to decode against the event. One that
    // did would be a commitment with no juror or no dispute on it, which is not something to
    // carry half of: without the pair there is nothing to join a draw to.
    const { _coreDisputeID: disputeID, _juror: juror } = log.args;
    if (disputeID === undefined || juror === undefined) {
      throw new Error(`Undecodable CommitCast in ${log.transactionHash}`);
    }

    return { disputeID: String(disputeID), juror, timestamp: String(timestamp) };
  });
}
