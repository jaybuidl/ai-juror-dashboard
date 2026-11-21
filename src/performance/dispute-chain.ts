import { type Hash, type PublicClient, parseAbiItem } from "viem";
import { createArbitrumClient, scanBlocks } from "./arbitrum";
import { type BlockTimes, browserBlockTimes } from "./block-times";
import { fetchCommitCasts } from "./commit-logs";
import type { RawCommitCast } from "./commitments";
import { KLEROS_CORE } from "./court-parameters";

/**
 * One dispute's record on Arbitrum: who opened each of its periods, and when each agent juror
 * committed (ADR-0012).
 *
 * The subgraph already says *when* each period opened (`Round.timeline`) and when each draw
 * revealed (the justification). It says nothing about who opened a period — `passPeriod` is
 * permissionless and any account can call it — and nothing about when a commitment was made.
 * Both are on chain: a period opens with a `NewPeriod` log from KlerosCore, sent by whoever
 * called `passPeriod`, and a commitment is a `CommitCast` log from the dispute kit.
 *
 * Scoped to one dispute and to its own block range, which is what keeps this one or two
 * `eth_getLogs` windows and a handful of block and transaction reads, however large the court
 * grows. The range comes from the subgraph (`DisputeDetail.blockRange`): from the block anyone in
 * it was first drawn in, since `passPeriod` cannot leave evidence until every vote ID is drawn, to
 * the block its execution period opened once it has, and to the head until then. That holds every
 * round's openings, so the timeline picks a round's by its place in order (`openingOf`).
 */

/**
 * The deployed signature, from `contracts/deployments/arbitrum/KlerosCoreNeo.json` and never
 * from the sources (the `_eligibility` trap in `court-parameters.ts`). `_disputeID` is indexed,
 * so the filter is one dispute wide.
 */
export const NEW_PERIOD = parseAbiItem(
  "event NewPeriod(uint256 indexed _disputeID, uint8 _period)",
);

/**
 * One period opening, as `NewPeriod` and the transaction carrying it say.
 *
 * Strings, like every raw shape here. `from` is the account that sent the transaction, which
 * for a direct `passPeriod` call is the account that called it. It is an address, in hand below
 * the seam, and it never reaches the page unless the roster names it: an opener off the roster
 * is whoever happened to call, and naming them is the personal data this dashboard does not
 * hold (`CLAUDE.md`). `openerOf` in `dispute-timeline.ts` is where that is decided.
 */
export type RawPeriodOpening = {
  /** KlerosCore's `Period`: 0 evidence, 1 commit, 2 vote, 3 appeal, 4 execution. */
  period: string;
  /** As the transaction carries it: lowercase from arb1, compared lowercased whatever its case. */
  from: string;
  /** Where the log sits, so two openings of one period in two rounds can be told apart. */
  blockNumber: string;
  logIndex: string;
};

/** Everything this read returns. */
export type RawDisputeChain = {
  openings: readonly RawPeriodOpening[];
  commits: readonly RawCommitCast[];
  /**
   * Who sent the transaction that created the dispute, as the chain returns it, or `null` where
   * no creation transaction was given to read. On court 34's dispute resolver that is the person
   * who asked the question: an appeal funder is called "the dispute creator" when it matches
   * (`appeal-funding.ts`, #32). An address, so it never reaches the page.
   */
  creator: string | null;
};

/** Which blocks hold this dispute's record. `toBlock` is `"latest"` while the dispute runs. */
export type DisputeBlockRange = { fromBlock: bigint; toBlock: bigint | "latest" };

export async function fetchDisputeChain({
  client = createArbitrumClient(),
  disputeId,
  range,
  creationTx = null,
  blockTimes = browserBlockTimes(),
}: {
  client?: PublicClient;
  disputeId: number;
  range: DisputeBlockRange;
  /** The transaction that created the dispute (`DisputeDetail.transactionHash`), if known. */
  creationTx?: Hash | null;
  blockTimes?: BlockTimes;
}): Promise<RawDisputeChain> {
  const [periodLogs, commits] = await Promise.all([
    scanBlocks(client, range.fromBlock, range.toBlock, (window) =>
      client.getLogs({
        address: KLEROS_CORE,
        event: NEW_PERIOD,
        args: { _disputeID: BigInt(disputeId) },
        ...window,
      }),
    ),
    fetchCommitCasts({
      client,
      disputeId,
      fromBlock: range.fromBlock,
      toBlock: range.toBlock,
      blockTimes,
    }),
  ]);

  // The sender is on the transaction and not on the log: one read per opening, four in a
  // dispute's life, and one for the creation. Deduplicated because one transaction could open
  // two periods, and a transaction's sender cannot change, so reading it twice would only spend
  // the rate limit.
  const hashes = [
    ...new Set([
      ...periodLogs.map((log) => log.transactionHash),
      ...(creationTx === null ? [] : [creationTx]),
    ]),
  ];
  const senders = new Map<Hash, string>();
  for (const transaction of await Promise.all(
    hashes.map((hash) => client.getTransaction({ hash })),
  )) {
    senders.set(transaction.hash, transaction.from);
  }

  const openings = periodLogs.map((log) => {
    const period = log.args._period;
    const from = senders.get(log.transactionHash);
    // A log that did not decode, or a transaction that came back without the hash it was asked
    // for, is an opening this read cannot attribute. Thrown rather than dropped: the view says
    // the read failed, which is true, rather than counting a short read that was a malformed one.
    if (period === undefined || from === undefined) {
      throw new Error(`Unreadable NewPeriod in ${log.transactionHash}`);
    }
    return {
      period: String(period),
      from,
      blockNumber: String(log.blockNumber),
      logIndex: String(log.logIndex),
    };
  });

  return {
    openings,
    commits,
    creator: creationTx === null ? null : (senders.get(creationTx) ?? null),
  };
}
