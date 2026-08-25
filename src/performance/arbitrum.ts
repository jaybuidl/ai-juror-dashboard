import { createPublicClient, http, type PublicClient } from "viem";
import { arbitrum } from "viem/chains";

/**
 * The chain this dashboard reads, and the one client both of its chain readers share.
 *
 * Two things come from Arbitrum rather than from a subgraph: the `CommitCast` logs that date
 * every commitment (ADR-0004, `commit-logs.ts`) and the court's parameter history (ticket 08,
 * `court-parameters.ts`). This module was the top of the first of those until the second
 * arrived; it is here so that neither reader owns the other's transport.
 */

/**
 * Keyless, CORS-open, and the only endpoint verified to serve the scans these readers need.
 *
 * Overridable, but see netlify.toml: a host absent from `connect-src` is blocked by the browser
 * before the request leaves, and this one is already listed. See also ADR-0004 — many commercial
 * providers cap `eth_getLogs` at ~10,000 blocks, and substituting one here would not error. It
 * would return fewer logs, which is exactly the silent shortfall `commitCoverage` exists to name.
 */
export const DEFAULT_ARBITRUM_RPC_URL = "https://arb1.arbitrum.io/rpc";

export function arbitrumRpcUrl(): string {
  return import.meta.env.VITE_ARBITRUM_RPC_URL ?? DEFAULT_ARBITRUM_RPC_URL;
}

/**
 * A client for one read.
 *
 * `signal` is taken here rather than per action because viem's actions do not accept one — it
 * belongs to the transport's `fetchOptions`. Passing it matters more than usual: an abandoned
 * read of this shape is one `eth_getLogs` plus a block call per result against an endpoint
 * that rate-limits per call, so an unmount that let it run to completion would spend the budget
 * of the read that replaces it.
 */
export function createArbitrumClient(
  url: string = arbitrumRpcUrl(),
  signal?: AbortSignal,
): PublicClient {
  return createPublicClient({
    chain: arbitrum,
    // One event per block, so a read of n events costs n block reads. Batching folds them into
    // a single HTTP request; without it the commit scan alone is 56 round trips and counting.
    transport: http(url, { batch: true, fetchOptions: signal ? { signal } : undefined }),
  });
}

/**
 * When each of a set of logs was mined, keyed by block number.
 *
 * TRAP, and the reason this is a function rather than a line in each reader: `eth_getLogs` on
 * arb1 returns a `blockTimestamp` on every log, the field is not in the JSON-RPC spec, it is
 * always `"0x0"`, and viem dutifully formats it to a well-typed `0n`. It is present, correctly
 * typed and wrong. A reader that trusted it would date everything to 1970 — every commit
 * latency null and the whole court reported as an unread shortfall, with no error and nothing
 * in the console. `eth_getBlockByNumber` is the only source that has the moment.
 *
 * The cost is one call per distinct block, and the public endpoint rate-limits per RPC *call*
 * rather than per request. One page load is nowhere near the ceiling; a live test suite that
 * read per test is not (see `commit-logs.integration.test.ts`).
 */
export async function blockTimestamps(
  client: PublicClient,
  blockNumbers: readonly bigint[],
): Promise<Map<bigint, bigint>> {
  const distinct = [...new Set(blockNumbers)];
  const blocks = await Promise.all(distinct.map((blockNumber) => client.getBlock({ blockNumber })));

  return new Map(blocks.map((block) => [block.number, block.timestamp]));
}
