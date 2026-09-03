import { type PublicClient, parseAbiItem } from "viem";
import { COURT_ID } from "../disputes/court-subgraph";
import { blockTimestamps, createArbitrumClient } from "./arbitrum";
import type { RawCourtParameters } from "./windows";

/**
 * The court's own parameter history, read from the events that changed it.
 *
 * Read from chain and never from `KlerosCore.getTimesPerPeriod`, which answers with what the
 * court holds *now*. Court 34 was reconfigured between dispute 151 and dispute 152, so the
 * current value is not a historical fact about any dispute before that — using it as one is
 * the first trap `CLAUDE.md` names, and it is silent: every figure would still render, and
 * dispute 151's would be measured against a window ten times too short.
 *
 * Two events carry it, and both carry `timesPerPeriod` in full. That is what makes this a log
 * scan rather than an archive call: reconstructing the history from state would mean
 * `eth_call` at a historical block, which the public endpoint does not reliably serve.
 */

/** KlerosCore on Arbitrum One. The deployed address, not the source's — see `docs/knowledge/court-34.md`. */
export const KLEROS_CORE = "0x991d2df165670b9cac3B022f4B68D65b664222ea";

/**
 * The court's first configuration, emitted when it was created.
 *
 * Both event signatures are the *deployed* ones, taken from `contracts/deployments/arbitrum`
 * rather than from the contract sources: `KlerosCore.sol` has since gained an `_eligibility`
 * argument on both, and a signature with it hashes to a different topic. A mismatched topic
 * matches no log, returns `[]`, and reports a court that has never been configured — which
 * would blank the marker rather than fail.
 */
export const COURT_CREATED = parseAbiItem(
  "event CourtCreated(uint96 indexed _courtID, uint96 indexed _parent, bool _hiddenVotes, uint256 _minStake, uint256 _alpha, uint256 _feeForJuror, uint256 _jurorsForCourtJump, uint256[4] _timesPerPeriod, uint256[] _supportedDisputeKits)",
);

/** Every later change. `_courtID` is indexed, so the filter is one court wide. */
export const COURT_MODIFIED = parseAbiItem(
  "event CourtModified(uint96 indexed _courtID, bool _hiddenVotes, uint256 _minStake, uint256 _alpha, uint256 _feeForJuror, uint256 _jurorsForCourtJump, uint256[4] _timesPerPeriod)",
);

/**
 * The whole chain, unchunked, exactly as the commit scan reads it.
 *
 * The court has been configured twice in its life and the filter is on an indexed topic, so
 * this is two logs and answers in ~320ms from `fromBlock: 0`. A deployment block held here
 * would be one more number to keep true, and getting it wrong would drop the court's *first*
 * configuration — the one dispute 151 ran under, and the only one the marker is about.
 */
const FROM_BLOCK = 0n;

/**
 * Every configuration court 34 has held, as moments and durations.
 *
 * Unsorted here beyond block order; `toRegimes` establishes the ordering the model depends on,
 * so it is a property of the model rather than of two `getLogs` calls that happen to be
 * concatenated in this order.
 */
export async function fetchCourtParameters({
  client = createArbitrumClient(),
  courtId = COURT_ID,
}: {
  client?: PublicClient;
  courtId?: string;
} = {}): Promise<RawCourtParameters[]> {
  const args = { _courtID: BigInt(courtId) };

  const [created, modified] = await Promise.all([
    client.getLogs({
      address: KLEROS_CORE,
      event: COURT_CREATED,
      args,
      fromBlock: FROM_BLOCK,
      toBlock: "latest",
    }),
    client.getLogs({
      address: KLEROS_CORE,
      event: COURT_MODIFIED,
      args,
      fromBlock: FROM_BLOCK,
      toBlock: "latest",
    }),
  ]);

  // Two scans, so two sequences that have to be interleaved. By block and then by log index,
  // because a court could in principle be created and reconfigured in one block, and the
  // moment alone could not tell those apart.
  const logs = [...created, ...modified].sort(
    (a, b) => Number(a.blockNumber - b.blockNumber) || a.logIndex - b.logIndex,
  );

  // From the block, never from the log's own `blockTimestamp` — see `blockTimestamps`. Here
  // the trap would be quieter than it is for a commitment: a configuration dated 1970 sorts
  // first and stays in force forever, so every dispute in the court would be measured against
  // the oldest windows and nothing would be marked.
  const timestampOf = await blockTimestamps(
    client,
    logs.map((log) => log.blockNumber),
  );

  return logs.map((log) => {
    const timestamp = timestampOf.get(log.blockNumber);
    if (timestamp === undefined) {
      throw new Error(`No block ${log.blockNumber} for the court change in ${log.transactionHash}`);
    }

    // viem types the decoded arguments as optional because a log can fail to decode against
    // the event. One that did would be a configuration with no durations on it, and a window
    // this dashboard invented to fill the gap would be worse than not marking anything.
    const timesPerPeriod = log.args._timesPerPeriod;
    if (timesPerPeriod === undefined) {
      throw new Error(`Undecodable court change in ${log.transactionHash}`);
    }

    return { at: String(timestamp), timesPerPeriod: timesPerPeriod.map(String) };
  });
}
