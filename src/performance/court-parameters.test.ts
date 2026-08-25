import type { PublicClient } from "viem";
import { describe, expect, it } from "vitest";
import { COURT_CREATED, fetchCourtParameters, KLEROS_CORE } from "./court-parameters";

/**
 * The parameter reader, offline.
 *
 * The fixture beside this is one successful read of a court that has been configured twice, so
 * the cases worth writing here are the ones it cannot contain: two changes in one block, a log
 * that will not decode, and the endpoint's zero timestamp.
 */

type FakeLog = {
  blockNumber: bigint;
  logIndex: number;
  /** What Arbitrum's endpoint carries and the JSON-RPC spec does not require. */
  blockTimestamp?: bigint;
  transactionHash: string;
  args: { _timesPerPeriod?: readonly bigint[] };
};

/** What `getLogs` was asked for, so the request itself can be asserted. */
type Asked = {
  address?: string;
  event?: { name?: string };
  fromBlock?: bigint;
  toBlock?: string;
  args?: { _courtID?: bigint };
};

const OLD_TIMES = [43_200n, 28_800n, 28_800n, 129_600n] as const;
const NEW_TIMES = [2_700n, 2_700n, 1_800n, 129_600n] as const;

/**
 * A client whose two scans answer separately, keyed by event name.
 *
 * Separately because the interleaving is the thing being tested: `CourtCreated` and
 * `CourtModified` are two filters, and one list that happened to arrive in the right order
 * would prove nothing about the sort that puts them in it.
 */
function fakeClient(
  byEvent: { created?: FakeLog[]; modified?: FakeLog[] },
  timestamps: Record<string, bigint> = {},
) {
  const asked: Asked[] = [];
  const blocksRead: bigint[] = [];

  const client = {
    getLogs: async (request: Asked) => {
      asked.push(request);
      const key = request.event?.name === "CourtCreated" ? "created" : "modified";
      return byEvent[key] ?? [];
    },
    getBlock: async ({ blockNumber }: { blockNumber: bigint }) => {
      blocksRead.push(blockNumber);
      return { number: blockNumber, timestamp: timestamps[String(blockNumber)] ?? 1_000n };
    },
  } as unknown as PublicClient;

  return { client, asked, blocksRead };
}

function fakeLog(overrides: Partial<FakeLog> = {}): FakeLog {
  return {
    blockNumber: 493_394_990n,
    logIndex: 3,
    transactionHash: "0xabc",
    args: { _timesPerPeriod: OLD_TIMES },
    ...overrides,
  };
}

describe("fetchCourtParameters", () => {
  it("reads a configuration as its durations and the moment its block was mined", async () => {
    const { client } = fakeClient({ created: [fakeLog()] }, { "493394990": 1_786_444_490n });

    expect(await fetchCourtParameters({ client })).toEqual([
      { at: "1786444490", timesPerPeriod: ["43200", "28800", "28800", "129600"] },
    ]);
  });

  it("ignores the blockTimestamp the endpoint puts on the log, because it is always zero", async () => {
    // Quieter here than it is for a commitment, and worse: a configuration dated 1970 sorts
    // first and stays in force forever, so every dispute in the court would resolve to the
    // oldest windows and the marker would never appear on anything.
    const { client } = fakeClient(
      { created: [fakeLog({ blockTimestamp: 0n })] },
      { "493394990": 1_786_444_490n },
    );
    const [first] = await fetchCourtParameters({ client });

    expect(first?.at).toBe("1786444490");
  });

  it("interleaves the two scans by block and then by log index", async () => {
    // A court created and reconfigured in the same block is the case the moment alone cannot
    // order: both changes carry one timestamp, and the later log index is the later change.
    const { client } = fakeClient(
      {
        created: [fakeLog({ logIndex: 3 })],
        modified: [
          fakeLog({ logIndex: 14, args: { _timesPerPeriod: NEW_TIMES } }),
          fakeLog({ blockNumber: 496_518_927n, logIndex: 1, args: { _timesPerPeriod: OLD_TIMES } }),
        ],
      },
      { "493394990": 1_786_444_490n, "496518927": 1_787_230_320n },
    );

    expect(
      (await fetchCourtParameters({ client })).map((change) => change.timesPerPeriod[1]),
    ).toEqual(["28800", "2700", "28800"]);
  });

  it("scans the whole chain for one court rather than from a start block to maintain", async () => {
    const { client, asked } = fakeClient({});
    await fetchCourtParameters({ client, courtId: "34" });

    expect(asked).toHaveLength(2);
    for (const request of asked) {
      expect(request.fromBlock).toBe(0n);
      expect(request.toBlock).toBe("latest");
      expect(request.address).toBe(KLEROS_CORE);
      expect(request.args?._courtID).toBe(34n);
    }
  });

  it("asks for the deployed event signature, not the one in the contract sources", async () => {
    // `KlerosCore.sol` has since gained an `_eligibility` argument on both events. That
    // signature hashes to a different topic, matches no log, and returns a court that has
    // never been configured — an empty history rather than an error.
    expect(COURT_CREATED.inputs.map((input) => input.name)).not.toContain("_eligibility");
  });

  it("reads a block once however many changes it carries", async () => {
    const { client, blocksRead } = fakeClient(
      { created: [fakeLog({ logIndex: 3 })], modified: [fakeLog({ logIndex: 9 })] },
      { "493394990": 1_786_444_490n },
    );
    const changes = await fetchCourtParameters({ client });

    expect(changes).toHaveLength(2);
    expect(blocksRead).toEqual([493_394_990n]);
  });

  it("fails rather than carrying a configuration with no durations on it", async () => {
    // A log that will not decode has no `timesPerPeriod`, and a window invented to fill that
    // gap would be measured against for as long as the court runs.
    const { client } = fakeClient({ created: [fakeLog({ args: {} })] }, { "493394990": 1n });

    await expect(fetchCourtParameters({ client })).rejects.toThrow(/Undecodable/);
  });
});
