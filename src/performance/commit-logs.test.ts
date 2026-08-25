import type { PublicClient } from "viem";
import { describe, expect, it } from "vitest";
import { ROSTER } from "../roster/agent-jurors";
import { DISPUTE_KIT_CLASSIC, fetchCommitCasts } from "./commit-logs";

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
  fromBlock?: bigint;
  toBlock?: string;
  args?: { _juror?: string[] };
};

function fakeClient(logs: FakeLog[], timestamps: Record<string, bigint> = {}) {
  const asked: Asked[] = [];
  const blocksRead: bigint[] = [];

  const client = {
    getLogs: async (request: Asked) => {
      asked.push(request);
      return logs;
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

    expect(await fetchCommitCasts({ client })).toEqual([
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
    const [commit] = await fetchCommitCasts({ client });

    expect(commit?.timestamp).toBe("1787188232");
  });

  it("scans the whole chain in one request rather than from a start block to maintain", async () => {
    const { client, asked } = fakeClient([]);
    await fetchCommitCasts({ client });

    expect(asked).toHaveLength(1);
    expect(asked[0]?.fromBlock).toBe(0n);
    expect(asked[0]?.toBlock).toBe("latest");
    expect(asked[0]?.address).toBe(DISPUTE_KIT_CLASSIC);
  });

  it("narrows the scan to the roster, because the event carries no court", async () => {
    // `CommitCast` names a dispute and a juror and never a court, so the filter is on the six
    // addresses this dashboard has columns for. A log for a dispute outside court 34 is dropped
    // by the join in the seam, exactly as a draw for one is.
    const { client, asked } = fakeClient([]);
    await fetchCommitCasts({ client, roster: ROSTER });

    expect(asked[0]?.args?._juror).toEqual(ROSTER.map((agentJuror) => agentJuror.address));
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
    const commits = await fetchCommitCasts({ client });

    expect(commits).toHaveLength(3);
    expect(blocksRead).toEqual([496_351_385n, 496_363_761n]);
  });

  it("fails rather than carrying half a commitment", async () => {
    // A log that will not decode against the event has no juror or no dispute on it, and
    // without the pair there is nothing for a draw to join to. Returning it with a blank
    // address would match no draw and quietly become a shortfall of one.
    const { client } = fakeClient([unstampedLog({ args: { _coreDisputeID: 151n } })], {
      "496351385": 1_787_188_232n,
    });

    await expect(fetchCommitCasts({ client })).rejects.toThrow(/CommitCast/);
  });
});
