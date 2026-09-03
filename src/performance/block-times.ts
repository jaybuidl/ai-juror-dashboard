/**
 * When a block was mined, remembered.
 *
 * The commit scan costs one `eth_getLogs` and then one `eth_getBlockByNumber` per commitment,
 * because the log's own `blockTimestamp` is `"0x0"` on this endpoint and the block is the only
 * source of the moment (ADR-0004, and `docs/knowledge/chain-and-subgraph.md`). That per-commitment call is what
 * rate-limits: 62 blocks read three times over inside a second returns HTTP 429, and the court
 * grows a commitment at a time.
 *
 * This is the cache that makes the scan cheap to repeat, which is what ticket 12 needs before
 * it can watch a live dispute at all — a five-second poll that re-dated every commitment in the
 * court would take the commit line down for whoever was watching.
 *
 * It is safe in a way almost nothing else here would be: **a mined block's timestamp cannot
 * change.** There is no staleness to reason about, no invalidation to get wrong, and nothing
 * derived — it caches a fact of the chain, not a figure computed from one. That is why the
 * cache is here and not around the commitments, the draws or the latencies.
 */

import { browserStorage } from "../storage";

/** Namespaced and versioned: a change to the shape below must not be read as the old one. */
export const BLOCK_TIMES_KEY = "kleros-ai-juror-dashboard:block-times:v1";

/**
 * How many blocks to remember. One entry per commitment ever published by the roster, so this
 * is roughly ten years of this court at its current rate, and about 150KB of a 5MB quota.
 */
export const MAX_REMEMBERED_BLOCKS = 5_000;

export type BlockTimes = {
  /** The moment that block was mined, if it has been read before. */
  get(blockNumber: bigint): bigint | undefined;
  set(blockNumber: bigint, timestamp: bigint): void;
  /**
   * Write what has accumulated back to storage.
   *
   * Explicit rather than on every `set` so that one scan is one write: the alternative is a
   * synchronous serialisation of the whole map per commitment, on the main thread.
   */
  flush(): void;
};

/** Canonical non-negative decimal, as everywhere else a string becomes a number here. */
const CANONICAL_DECIMAL = /^(0|[1-9]\d*)$/;

/**
 * What was stored, or nothing.
 *
 * Every failure lands in the same place and means the same thing — this cache knows nothing —
 * because every one of them costs a round of block reads and none of them costs a wrong figure.
 * A `localStorage` that throws on access rather than returning null is not hypothetical: that
 * is what a browser set to block site data does, and what Safari's private mode used to do.
 */
function read(storage: Storage | null): Map<bigint, bigint> {
  const times = new Map<bigint, bigint>();
  if (storage === null) return times;

  let raw: string | null;
  try {
    raw = storage.getItem(BLOCK_TIMES_KEY);
  } catch {
    return times;
  }
  if (raw === null) return times;

  let parsed: unknown;
  try {
    parsed = JSON.parse(raw);
  } catch {
    return times;
  }
  if (typeof parsed !== "object" || parsed === null) return times;

  for (const [block, timestamp] of Object.entries(parsed)) {
    // Checked rather than trusted, for the reason the model checks every other string it turns
    // into a number: `BigInt("")` throws and `Number("1e2")` does not, and this value ends up
    // one subtraction away from a published latency. Anything unreadable is simply not known.
    if (!CANONICAL_DECIMAL.test(block)) continue;
    if (typeof timestamp !== "string" || !CANONICAL_DECIMAL.test(timestamp)) continue;
    times.set(BigInt(block), BigInt(timestamp));
  }

  return times;
}

/**
 * The blocks this browser has already dated, backed by `localStorage` where there is one.
 *
 * Storage is a parameter so the whole of this is testable without a DOM, and nullable because
 * there are contexts with no `localStorage` at all. In every degraded case it still works — it
 * just forgets at the end of the page's life, which costs a round of block reads and nothing
 * else.
 */
export function createBlockTimes(storage: Storage | null): BlockTimes {
  const times = read(storage);

  return {
    get: (blockNumber) => times.get(blockNumber),
    set: (blockNumber, timestamp) => {
      times.set(blockNumber, timestamp);
    },
    flush: () => {
      if (storage === null) return;

      // Oldest first when there is more than there is room for: the newest blocks are the ones
      // a live dispute is about to ask about again, and the oldest belong to disputes that have
      // been finalised for months.
      const kept = [...times.entries()]
        .sort(([a], [b]) => (a < b ? -1 : a > b ? 1 : 0))
        .slice(-MAX_REMEMBERED_BLOCKS);

      try {
        storage.setItem(
          BLOCK_TIMES_KEY,
          JSON.stringify(Object.fromEntries(kept.map(([b, t]) => [String(b), String(t)]))),
        );
      } catch {
        // A full quota is not a reason to stop showing a court. The next load pays for the
        // block reads again, which is exactly what happened before this cache existed.
      }
    },
  };
}

/** The one this app uses, where the document has a `localStorage` to give it. */
export function browserBlockTimes(): BlockTimes {
  return createBlockTimes(browserStorage());
}
