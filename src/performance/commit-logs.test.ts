import type { PublicClient } from "viem";
import { beforeEach, describe, expect, it } from "vitest";
import { LOG_RANGE_LIMIT } from "./arbitrum";
import { createBlockTimes } from "./block-times";
import { type CommitFilter, DISPUTE_KIT_CLASSIC, fetchCommitCasts } from "./commit-logs";
import { COURT_CREATED_BLOCK } from "./court-parameters";

/**
 * The reader, offline.
 *
 * Every fixture in this repo is one successful read of a working court, so the cases that
 * matter here are hand-written: a scan that came back short, a log that will not decode, one
 * block carrying two commitments. None of them can be captured from an endpoint that is working.
 */

type FakeLog = {
  blockNumber: bigint;
  /** What Arbitrum's endpoint carries and the JSON-RPC spec does not require. */
  blockTimestamp?: bigint;
  transactionHash: string;
  args: { _coreDisputeID?: bigint; _juror?: string };
};

/** What `getLogs` was asked for, so the request itself can be asserted. */
type Asked = {
  address?: string;
  fromBlock: bigint;
  toBlock: bigint;
  args?: Record<string, unknown>;
};

/** Where the fake chain's head is: court 34's creation plus a little over three windows. */
const HEAD = 525_842_400n;

/** Columbo's commitments, which is what an agent juror page asks for. */
const COLUMBO: CommitFilter = { _juror: "0x70239816581Afff150814B46C831e2e5F9E3bF4C" };

/**
 * A chain that answers each window with the logs inside it, as arb1 does. A fake that handed every
 * window every log would return each commitment once per window.
 */
function fakeClient(logs: FakeLog[], timestamps: Record<string, bigint> = {}) {
  const asked: Asked[] = [];
  const blocksRead: bigint[] = [];

  const client = {
    getBlockNumber: async () => HEAD,
    getLogs: async (request: Asked) => {
      asked.push(request);
      return logs.filter(
        (log) => log.blockNumber >= request.fromBlock && log.blockNumber <= request.toBlock,
      );
    },
    getBlock: async ({ blockNumber }: { blockNumber: bigint }) => {
      blocksRead.push(blockNumber);
      return {
        number: blockNumber,
        timestamp: timestamps[String(blockNumber)] ?? 1_000n,
      };
    },
  } as unknown as PublicClient;

  return { client, asked, blocksRead };
}

/**
 * The default `blockTimes` is the browser's, which outlives a test.
 *
 * Without this, a case that reads block 496,351,385 leaves it dated for every case after it,
 * and the next assertion about which blocks were read passes or fails on file order. The cache
 * working is exactly what makes that happen, so the isolation belongs here rather than in a
 * cache that forgets on purpose.
 */
beforeEach(() => {
  localStorage.clear();
});

function fakeLog(overrides: Partial<FakeLog> = {}): FakeLog {
  return {
    blockNumber: 496_351_385n,
    blockTimestamp: 1_787_188_232n,
    transactionHash: "0xabc",
    args: { _coreDisputeID: 151n, _juror: "0x70239816581Afff150814B46C831e2e5F9E3bF4C" },
    ...overrides,
  };
}

/** The same log from an endpoint that sends only what the JSON-RPC spec requires. */
function unstampedLog(overrides: Partial<FakeLog> = {}): FakeLog {
  const { blockTimestamp: _dropped, ...log } = fakeLog(overrides);
  return log;
}

describe("fetchCommitCasts", () => {
  it("reads a commitment as the dispute, the juror and the moment its block was mined", async () => {
    const { client } = fakeClient([unstampedLog()], { "496351385": 1_787_188_232n });

    expect(await fetchCommitCasts({ client, filter: COLUMBO })).toEqual([
      {
        disputeID: "151",
        juror: "0x70239816581Afff150814B46C831e2e5F9E3bF4C",
        timestamp: "1787188232",
      },
    ]);
  });

  it("ignores the blockTimestamp the endpoint puts on the log, because it is always zero", async () => {
    // The trap this reader exists around. `eth_getLogs` carries no timestamp in the spec, and
    // Arbitrum's endpoint sends the field anyway as "0x0", which viem formats to a
    // well-typed `0n`. Reading it would date every commitment to 1970 — and because a
    // commitment before its own commit period is dropped rather than shown, the whole court
    // would render as an unread shortfall with nothing in the console.
    const { client } = fakeClient([fakeLog({ blockTimestamp: 0n })], {
      "496351385": 1_787_188_232n,
    });
    const [commit] = await fetchCommitCasts({ client, filter: COLUMBO });

    expect(commit?.timestamp).toBe("1787188232");
  });

  it("scans an agent juror's record from the court's creation, in windows the endpoint accepts", async () => {
    // arb1 refuses a scan wider than ten million blocks (#25), and this one ran from block 0
    // until it did. No commitment in court 34 can predate the court.
    const { client, asked } = fakeClient([]);
    await fetchCommitCasts({ client, filter: COLUMBO });

    expect(asked[0]?.fromBlock).toBe(COURT_CREATED_BLOCK);
    expect(asked.at(-1)?.toBlock).toBe(HEAD);
    for (const [index, request] of asked.entries()) {
      expect(request.address).toBe(DISPUTE_KIT_CLASSIC);
      expect(request.toBlock - request.fromBlock + 1n).toBeLessThanOrEqual(LOG_RANGE_LIMIT);
      const next = asked[index + 1];
      if (next !== undefined) expect(next.fromBlock).toBe(request.toBlock + 1n);
    }
  });

  it("finds a commitment in whichever window holds it, once", async () => {
    const { client } = fakeClient([unstampedLog({ blockNumber: 515_000_000n })], {
      "515000000": 1_792_000_000n,
    });

    expect(await fetchCommitCasts({ client, filter: COLUMBO })).toHaveLength(1);
  });

  it("asks for one agent juror or one dispute, and never a list", async () => {
    // A list-valued topic is allowed a hundredth of the range a single value is (#25), which
    // is why this stopped reading the roster as one list. The event carries no court, so a log
    // for a dispute outside court 34 is dropped by the join, exactly as a draw for one is.
    const byJuror = fakeClient([]);
    await fetchCommitCasts({ client: byJuror.client, filter: COLUMBO });
    const byDispute = fakeClient([]);
    await fetchCommitCasts({
      client: byDispute.client,
      filter: { _coreDisputeID: 156n },
      fromBlock: 496_780_897n,
      toBlock: 497_058_149n,
    });

    expect(byJuror.asked[0]?.args).toEqual(COLUMBO);
    expect(byDispute.asked).toEqual([
      {
        address: DISPUTE_KIT_CLASSIC,
        event: expect.anything(),
        args: { _coreDisputeID: 156n },
        fromBlock: 496_780_897n,
        toBlock: 497_058_149n,
      },
    ]);
  });

  it("reads a block once however many commitments it carries", async () => {
    const { client, blocksRead } = fakeClient(
      [
        unstampedLog(),
        unstampedLog({
          args: { _coreDisputeID: 151n, _juror: "0xAC237740772093Fcc812A463050c43A275dd01E5" },
        }),
        unstampedLog({ blockNumber: 496_363_761n }),
      ],
      { "496351385": 1_787_188_232n, "496363761": 1_787_191_342n },
    );
    const commits = await fetchCommitCasts({ client, filter: COLUMBO });

    expect(commits).toHaveLength(3);
    expect(blocksRead).toEqual([496_351_385n, 496_363_761n]);
  });

  it("does not read a block it has already dated", async () => {
    // The read ticket 12 needs to be cheap enough to repeat: a five-second poll that re-dated
    // every commitment in the court is one page hitting the endpoint's per-call rate limit.
    const blockTimes = createBlockTimes(null);
    const first = fakeClient([unstampedLog(), unstampedLog({ blockNumber: 496_363_761n })], {
      "496351385": 1_787_188_232n,
      "496363761": 1_787_191_342n,
    });
    await fetchCommitCasts({ client: first.client, filter: COLUMBO, blockTimes });

    const second = fakeClient(
      [
        unstampedLog(),
        unstampedLog({ blockNumber: 496_363_761n }),
        unstampedLog({ blockNumber: 496_400_000n }),
      ],
      { "496400000": 1_787_200_000n },
    );
    const commits = await fetchCommitCasts({ client: second.client, filter: COLUMBO, blockTimes });

    // Only the block it had never seen, and every commitment still carries its moment.
    expect(second.blocksRead).toEqual([496_400_000n]);
    expect(commits.map((commit) => commit.timestamp)).toEqual([
      "1787188232",
      "1787191342",
      "1787200000",
    ]);
  });

  it("reads every block again when nothing was remembered", async () => {
    // The cache is an optimisation and never a source: with an empty one the scan is exactly
    // what it was before this existed.
    const { client, blocksRead } = fakeClient([unstampedLog()], { "496351385": 1_787_188_232n });
    await fetchCommitCasts({ client, filter: COLUMBO, blockTimes: createBlockTimes(null) });

    expect(blocksRead).toEqual([496_351_385n]);
  });

  it("fails rather than carrying half a commitment", async () => {
    // A log that will not decode against the event has no juror or no dispute on it, and
    // without the pair there is nothing for a draw to join to. Returning it with a blank
    // address would match no draw and quietly become a shortfall of one.
    const { client } = fakeClient([unstampedLog({ args: { _coreDisputeID: 151n } })], {
      "496351385": 1_787_188_232n,
    });

    await expect(fetchCommitCasts({ client, filter: COLUMBO })).rejects.toThrow(/CommitCast/);
  });
});
