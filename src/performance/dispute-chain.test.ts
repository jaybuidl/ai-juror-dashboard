import type { PublicClient } from "viem";
import { beforeEach, describe, expect, it } from "vitest";
import { createBlockTimes } from "./block-times";
import { DISPUTE_KIT_CLASSIC } from "./commit-logs";
import { KLEROS_CORE } from "./court-parameters";
import { fetchDisputeChain } from "./dispute-chain";

/**
 * One dispute's record, offline. The captured fixture is one successful read of a finished
 * dispute, so what is hand-written here is what it cannot hold: a transaction opening two
 * periods, a log that will not decode, and the scan's own bounds.
 */

type FakeLog = {
  address: string;
  blockNumber: bigint;
  logIndex: number;
  transactionHash: `0x${string}`;
  args: Record<string, unknown>;
};

type Asked = { address: string; fromBlock: bigint; toBlock: bigint; args: Record<string, unknown> };

const HEAD = 525_842_400n;

function fakeClient(logs: FakeLog[], senders: Record<string, string>) {
  const asked: Asked[] = [];
  const transactionsRead: string[] = [];

  const client = {
    getBlockNumber: async () => HEAD,
    getLogs: async (request: Asked) => {
      asked.push(request);
      return logs.filter(
        (log) =>
          log.address === request.address &&
          log.blockNumber >= request.fromBlock &&
          log.blockNumber <= request.toBlock,
      );
    },
    getBlock: async ({ blockNumber }: { blockNumber: bigint }) => ({
      number: blockNumber,
      timestamp: 1_787_298_000n + (blockNumber % 1000n),
    }),
    getTransaction: async ({ hash }: { hash: string }) => {
      transactionsRead.push(hash);
      return { hash, from: senders[hash] };
    },
  } as unknown as PublicClient;

  return { client, asked, transactionsRead };
}

function opening(period: number, overrides: Partial<FakeLog> = {}): FakeLog {
  return {
    address: KLEROS_CORE,
    blockNumber: 496_789_983n + BigInt(period),
    logIndex: 6,
    transactionHash: `0x${String(period).repeat(64)}`,
    args: { _disputeID: 156n, _period: period },
    ...overrides,
  };
}

const OFF_ROSTER = "0x1111111111111111111111111111111111111111";
const RANGE = { fromBlock: 496_780_897n, toBlock: 497_058_149n };

beforeEach(() => {
  localStorage.clear();
});

describe("fetchDisputeChain", () => {
  it("reads each opening with the account that sent it", async () => {
    const logs = [opening(1), opening(2)];
    const { client } = fakeClient(logs, {
      [`0x${"1".repeat(64)}`]: OFF_ROSTER,
      [`0x${"2".repeat(64)}`]: "0xc05e109f24cbe59301272fe8e7a908f67a1af539",
    });

    const chain = await fetchDisputeChain({
      client,
      disputeId: 156,
      range: RANGE,
      blockTimes: createBlockTimes(null),
    });

    expect(chain.openings).toEqual([
      { period: "1", from: OFF_ROSTER, blockNumber: "496789984", logIndex: "6" },
      {
        period: "2",
        from: "0xc05e109f24cbe59301272fe8e7a908f67a1af539",
        blockNumber: "496789985",
        logIndex: "6",
      },
    ]);
    expect(chain.commits).toEqual([]);
  });

  it("reads one transaction once, however many periods it opened", async () => {
    const shared = `0x${"a".repeat(64)}` as const;
    const { client, transactionsRead } = fakeClient(
      [
        opening(3, { transactionHash: shared }),
        opening(4, { transactionHash: shared, logIndex: 7 }),
      ],
      { [shared]: OFF_ROSTER },
    );

    const chain = await fetchDisputeChain({ client, disputeId: 156, range: RANGE });

    expect(chain.openings).toHaveLength(2);
    expect(transactionsRead).toEqual([shared]);
  });

  it("asks for one dispute on both contracts, inside the dispute's own blocks", async () => {
    const { client, asked } = fakeClient([], {});
    await fetchDisputeChain({ client, disputeId: 156, range: RANGE });

    expect(asked.map((request) => request.address).sort()).toEqual(
      [DISPUTE_KIT_CLASSIC, KLEROS_CORE].sort(),
    );
    for (const request of asked) {
      expect(request.fromBlock).toBe(RANGE.fromBlock);
      expect(request.toBlock).toBe(RANGE.toBlock);
      expect(Object.values(request.args)).toEqual([156n]);
    }
  });

  it("runs to the head while the dispute is still running", async () => {
    const { client, asked } = fakeClient([], {});
    await fetchDisputeChain({
      client,
      disputeId: 366,
      range: { fromBlock: 525_680_025n, toBlock: "latest" },
    });

    for (const request of asked) expect(request.toBlock).toBe(HEAD);
  });

  it("fails rather than attributing an opening it cannot read", async () => {
    // An undecodable log has no period on it, and guessing one would name an opener for the
    // wrong period. The page then says the read failed, which is true.
    const { client } = fakeClient([opening(1, { args: { _disputeID: 156n } })], {
      [`0x${"1".repeat(64)}`]: OFF_ROSTER,
    });

    await expect(fetchDisputeChain({ client, disputeId: 156, range: RANGE })).rejects.toThrow(
      /NewPeriod/,
    );
  });
});
