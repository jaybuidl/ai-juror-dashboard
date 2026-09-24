import { createPublicClient, http, type PublicClient } from "viem";
import { arbitrum } from "viem/chains";
import { hostOf } from "../host";
import type { Source } from "../read-failure";
import type { BlockTimes } from "./block-times";

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

/** Overridable at build time; see `coreSubgraphUrl` on testing an `import.meta.env` read both ways. */
export function arbitrumRpcUrl(): string {
  return import.meta.env.VITE_ARBITRUM_RPC_URL ?? DEFAULT_ARBITRUM_RPC_URL;
}

/**
 * This endpoint as the failure banner names it: the host of the URL actually in use.
 *
 * Derived and not a constant, which is the whole point. `SOURCES` in `read-failure.ts` holds a
 * literal for every other source, and the literal that used to sit there for this one said
 * `arb1.arbitrum.io` whatever the deploy was configured to read. A production deploy overrode
 * `VITE_ARBITRUM_RPC_URL`, forgot the `connect-src` entry, and the browser blocked every
 * request — and the banner reported an outage at an endpoint the page had never contacted. A
 * name that cannot be wrong about which endpoint failed is worth deriving.
 *
 * **The host, never the URL.** An override to a commercial provider carries its key in the
 * path, and this string is rendered into a public page. `hostOf` drops the path and the
 * userinfo, so `…/v2/<key>` and `…/v3/<key>` are both safe to derive from. The residual is a
 * provider that puts the credential in the *hostname*; nothing here can strip that without
 * destroying the checkability the name exists for, so `vite-env.d.ts` states it as a
 * constraint on what may be configured.
 *
 * The sentinel, rather than falling back to the default host, for the same reason the whole
 * function exists: an unparseable override is exactly when naming `arb1.arbitrum.io` would
 * mislead most. Falling back to the raw string is the other wrong answer — that is the key.
 * The branch is unreachable in the stock configuration, where the default is a literal that
 * parses; only a misconfigured override reaches it, which is the reader who needs telling.
 *
 * Takes the URL the way `createArbitrumClient` below does, so a caller that passes an explicit
 * URL to one can name it with the other, and so the tests need no environment.
 */
export function arbitrumSource(url: string = arbitrumRpcUrl()): Source {
  return { name: hostOf(url) ?? "Not a host this page can read", label: "The Arbitrum endpoint" };
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

/** How many block reads go out together, and what to wait between one group and the next. */
export type BlockReadPace = { chunk: number; pause: () => Promise<void> };

/** 50 calls every 2s: the pace measured against arb1 on 2026-09-24 that never drew a 429. */
export const BLOCK_READ_PACE: BlockReadPace = {
  chunk: 50,
  pause: () => new Promise((resolve) => setTimeout(resolve, 2000)),
};

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
 * rather than per request. A cold page load reached the ceiling on 2026-09-24 at 429 blocks,
 * which is why the reads below are paced; a live test suite that read per test reaches it
 * sooner (see `commit-logs.integration.test.ts`).
 *
 * Which is what `blockTimes` is for, and why it lives on the shared helper rather than in the
 * commit scan that first needed it: ticket 12 re-reads the court every five seconds while a
 * dispute is live, and re-dating every block each time is precisely that ceiling. A mined
 * block's timestamp cannot change, so the cache has nothing stale to serve — it remembers a
 * fact of the chain rather than a figure derived from one. Omit it and every block is read.
 */
export async function blockTimestamps(
  client: PublicClient,
  blockNumbers: readonly bigint[],
  blockTimes?: BlockTimes,
  pace: BlockReadPace = BLOCK_READ_PACE,
): Promise<Map<bigint, bigint>> {
  const distinct = [...new Set(blockNumbers)];
  const unread = distinct.filter((blockNumber) => blockTimes?.get(blockNumber) === undefined);

  // Paced rather than all at once. The batching transport folds every call made in one tick
  // into one request, and arb1 counts that request as its size: measured 2026-09-24, a cold
  // scan of 429 blocks in one burst returned HTTP 429 (surfacing in a browser as a CORS error,
  // since the refusal carries no allow-origin header), and every commit figure on the page read
  // "—". Bursts of 150-300 pass only when the budget is full; 50 calls every 2s sustained never
  // failed. Each chunk is cached as it lands, so a scan cut short by a 429 resumes where it
  // stopped instead of starting over and spending the same budget again.
  const blocks: { number: bigint; timestamp: bigint }[] = [];
  for (let start = 0; start < unread.length; start += pace.chunk) {
    if (start > 0) await pace.pause();
    const chunk = await Promise.all(
      unread
        .slice(start, start + pace.chunk)
        .map((blockNumber) => client.getBlock({ blockNumber })),
    );
    blocks.push(...chunk);
    if (blockTimes !== undefined) {
      for (const block of chunk) blockTimes.set(block.number, block.timestamp);
      // One write per chunk rather than one per block: the whole map is serialised each time.
      blockTimes.flush();
    }
  }

  if (blockTimes === undefined)
    return new Map(blocks.map((block) => [block.number, block.timestamp]));

  const timestampOf = new Map<bigint, bigint>();
  for (const blockNumber of distinct) {
    const timestamp = blockTimes.get(blockNumber);
    // A block the cache still does not know is one whose read failed, and it is left out
    // rather than defaulted: the seam drops a commitment with no moment, which is the
    // shortfall `commitCoverage` counts. A zero here would date it to 1970 instead.
    if (timestamp !== undefined) timestampOf.set(blockNumber, timestamp);
  }

  return timestampOf;
}
