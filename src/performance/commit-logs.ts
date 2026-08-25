import { createPublicClient, http, type PublicClient, parseAbiItem } from "viem";
import { arbitrum } from "viem/chains";
import { type AgentJuror, ROSTER } from "../roster/agent-jurors";
import { type BlockTimes, browserBlockTimes } from "./block-times";
import type { RawCommitCast } from "./performance";

/**
 * The other half of the speed dimension, and the only thing this dashboard reads from a chain.
 *
 * `ClassicVote.commited` is a boolean and nothing in the core subgraph's schema records *when*
 * a commitment was published, so the moment is recovered from `CommitCast` logs and the block
 * timestamp they sit in (ADR-0004). Reveal timestamps need none of this — they are on the
 * justification — which is why ticket 05 shipped the matrix with no RPC at all.
 */

/**
 * Keyless, CORS-open, and the only endpoint verified to serve the scan this module needs.
 *
 * Overridable, but see netlify.toml: a host absent from `connect-src` is blocked by the browser
 * before the request leaves, and this one is already listed. See also ADR-0004 — many commercial
 * providers cap `eth_getLogs` at ~10,000 blocks, and substituting one here would not error. It
 * would return fewer logs, which is exactly the silent shortfall `commitCoverage` exists to name.
 */
export const DEFAULT_ARBITRUM_RPC_URL = "https://arb1.arbitrum.io/rpc";

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

export function arbitrumRpcUrl(): string {
  return import.meta.env.VITE_ARBITRUM_RPC_URL ?? DEFAULT_ARBITRUM_RPC_URL;
}

/**
 * A client for one read.
 *
 * `signal` is taken here rather than per action because viem's actions do not accept one — it
 * belongs to the transport's `fetchOptions`. Passing it matters more than usual: an abandoned
 * read of this shape is one `eth_getLogs` plus a block call per commitment against an endpoint
 * that rate-limits per call, so an unmount that let it run to completion would spend the budget
 * of the read that replaces it.
 */
export function createArbitrumClient(
  url: string = arbitrumRpcUrl(),
  signal?: AbortSignal,
): PublicClient {
  return createPublicClient({
    chain: arbitrum,
    // One commitment per block, so a court of n commitments costs n block reads. Batching folds
    // them into a single HTTP request; without it this is 56 round trips and counting.
    transport: http(url, { batch: true, fetchOptions: signal ? { signal } : undefined }),
  });
}

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
  blockTimes = browserBlockTimes(),
}: {
  client?: PublicClient;
  roster?: readonly AgentJuror[];
  /**
   * Blocks this browser has already dated, so a repeated scan pays only for the new ones.
   *
   * Ticket 12 is what makes this necessary: the court is re-read every five seconds while a
   * dispute is live, and dating every commitment in it each time is the per-call rate limit
   * ADR-0004 measured. A block's timestamp cannot change, so this cache has no staleness to
   * reason about — see `block-times.ts`.
   */
  blockTimes?: BlockTimes;
} = {}): Promise<RawCommitCast[]> {
  const logs = await client.getLogs({
    address: DISPUTE_KIT_CLASSIC,
    event: COMMIT_CAST,
    args: { _juror: roster.map((agentJuror) => agentJuror.address) },
    fromBlock: FROM_BLOCK,
    toBlock: "latest",
  });

  // TRAP: do not "optimise" this away with the `blockTimestamp` on the log. `eth_getLogs`
  // carries no timestamp in the JSON-RPC spec, and this endpoint returns the field anyway —
  // always as `"0x0"`, which viem dutifully formats to `0n`. It is present, well-typed and
  // wrong, so a reader that trusted it would date every commitment to 1970, measure every
  // latency as null, and report the whole court as an unread shortfall. The moment comes from
  // the block, which is the only source that has it.
  //
  // The cost is one call per commitment, and the public endpoint rate-limits per call rather
  // than per request: 62 blocks read three times over in a second returns HTTP 429. One page
  // load is nowhere near that, and react-query's minute of staleness keeps it that way — but
  // the ceiling is real and arrives with roughly 200 more disputes. The fix then is the one
  // ADR-0004 already prefers on merit: put the timestamp in the subgraph upstream.
  const blockNumbers = [...new Set(logs.map((log) => log.blockNumber))];
  const unread = blockNumbers.filter((blockNumber) => blockTimes.get(blockNumber) === undefined);
  const blocks = await Promise.all(unread.map((blockNumber) => client.getBlock({ blockNumber })));
  for (const block of blocks) blockTimes.set(block.number, block.timestamp);
  // One write per scan rather than one per commitment: the whole map is serialised each time.
  blockTimes.flush();

  return logs.map((log) => {
    const timestamp = blockTimes.get(log.blockNumber);
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
