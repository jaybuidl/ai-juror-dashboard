import { type PublicClient, parseAbiItem } from "viem";
import { blockTimestamps, createArbitrumClient, scanBlocks } from "./arbitrum";
import { type BlockTimes, browserBlockTimes } from "./block-times";
import type { RawCommitCast } from "./commitments";

/**
 * The commit half of the per-draw record: when each commitment was published.
 *
 * `ClassicVote.commited` is a boolean and nothing in the core subgraph's schema records *when*
 * a commitment was published, so the moment is recovered from `CommitCast` logs and the block
 * timestamp they sit in (ADR-0004). Reveal timestamps need none of this — they are on the
 * justification — which is why ticket 05 shipped the matrix with no RPC at all.
 *
 * Read for one dispute at a time, for its timeline, and never for the court (ADR-0012). Until then
 * this read every commitment the whole roster had published, on every page including the matrix,
 * which showed none of them.
 *
 * The endpoint, the client and the block-timestamp trap are `arbitrum.ts`'s: this was the only
 * thing read from a chain until ticket 08 read the court's own parameter history from it.
 */

/** The dispute kit that emits the event. The deployed address, not the source's — see
 * `docs/knowledge/chain-and-subgraph.md`. */
export const DISPUTE_KIT_CLASSIC = "0x70B464be85A547144C72485eBa2577E5D3A45421";

/**
 * Both the dispute and the juror are indexed. The filter is on the dispute, one value in one
 * topic, so the response is bounded by one panel rather than by how large Kleros v2 grows.
 *
 * `_voteIDs` and `_commit` are decoded and discarded: the draw is the unit here, the vote IDs
 * it holds are already counted from the subgraph, and the commitment hash is of no interest
 * once the moment it was published is known.
 */
export const COMMIT_CAST = parseAbiItem(
  "event CommitCast(uint256 indexed _coreDisputeID, address indexed _juror, uint256[] _voteIDs, bytes32 _commit)",
);

/**
 * Every commitment one dispute's panel has published, as moments.
 *
 * One value in one topic, and never a list: arb1 allows a list-valued topic a hundredth of the
 * block range it allows a single value (#25), which is one reason this read stopped being the
 * roster's — the roster as one list of jurors is refused across anything wider than 100,000
 * blocks, about seven hours of Arbitrum. Every juror on the panel is returned, on the roster or
 * not; the timeline joins only the drawn agent jurors' and leaves the rest. Returned as strings
 * so the shape is the subgraph's — canonical decimals the join validates for itself — and so a
 * captured payload is plain JSON.
 */
export async function fetchCommitCasts({
  client = createArbitrumClient(),
  disputeId,
  fromBlock,
  toBlock,
  blockTimes = browserBlockTimes(),
}: {
  client?: PublicClient;
  disputeId: number;
  /** The dispute's first draw: no commitment in it can sit earlier. */
  fromBlock: bigint;
  /** Where it ends: `"latest"` while anything can still be committed, a block once nothing can. */
  toBlock: bigint | "latest";
  /**
   * Blocks this browser has already dated, so a repeated scan pays only for the new ones.
   *
   * Ticket 12 is what makes this necessary: the court is re-read every five seconds while a
   * dispute is live, and dating every commitment in it each time is the per-call rate limit
   * ADR-0004 measured. A block's timestamp cannot change, so this cache has no staleness to
   * reason about — see `block-times.ts`.
   */
  blockTimes?: BlockTimes;
}): Promise<RawCommitCast[]> {
  // A window at a time, because arb1 refuses one wider than `LOG_RANGE_LIMIT` (#25). A dispute
  // is one window unless it sat in a period for a month.
  const logs = await scanBlocks(client, fromBlock, toBlock, (range) =>
    client.getLogs({
      address: DISPUTE_KIT_CLASSIC,
      event: COMMIT_CAST,
      args: { _coreDisputeID: BigInt(disputeId) },
      ...range,
    }),
  );

  // From the block and never from the log's own `blockTimestamp`, which this endpoint sends on
  // every log and always as zero — see `blockTimestamps`, which carries the trap in full.
  //
  // The cost is one call per commitment, and the public endpoint rate-limits per call rather
  // than per request: 62 blocks read three times over in a second returns HTTP 429. The
  // ceiling arrived on 2026-09-24, when a cold load of the whole roster's 429 blocks in one
  // burst was refused and every commit figure read "—". Scoping the read to one dispute
  // (ADR-0012) keeps a cold load to a panel's few commitments, and `blockTimestamps` still paces
  // them. The fix that removes the cost is the one ADR-0004 prefers on merit: put the timestamp
  // in the subgraph upstream.
  const timestampOf = await blockTimestamps(
    client,
    logs.map((log) => log.blockNumber),
    blockTimes,
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
