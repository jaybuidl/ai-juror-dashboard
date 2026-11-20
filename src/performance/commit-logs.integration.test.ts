import { beforeAll, describe, expect, it } from "vitest";
import { fetchCourtDisputes } from "../disputes/court-subgraph";
import { ROSTER } from "../roster/agent-jurors";
import { buildAgentJurorReading } from "./agent-juror-detail";
import { createArbitrumClient, DEFAULT_ARBITRUM_RPC_URL } from "./arbitrum";
import { createBlockTimes } from "./block-times";
import { fetchCommitCasts } from "./commit-logs";
import type { RawCommitCast } from "./commitments";
import disputeChainFixture from "./dispute-156-chain.fixture.json" with { type: "json" };
import { fetchDisputeChain, type RawDisputeChain } from "./dispute-chain";
import { fetchCourtDraws } from "./draws-subgraph";
import { buildCourtPerformance, type CourtPerformance } from "./performance";

/**
 * Live against Arbitrum One, held out of `yarn test` — run with `yarn test:integration`.
 *
 * The fixtures beside this cannot notice a renamed event, a redeployed contract, or an endpoint
 * that has started capping `eth_getLogs` — the last of which happened on or before 2026-11-20,
 * when arb1 began refusing any scan wider than ten million blocks and every scan here, which
 * started at block 0, went dark at once (#25). Those are exactly the changes that would empty a
 * timeline or a commit column without emptying anything else, so they are what this asserts.
 *
 * The two reads the views make (ADR-0012), each once in `beforeAll` and shared. Not tidiness: a
 * scan costs one RPC call per window and per commitment, and the public endpoint rate-limits
 * per call — tests each doing their own read return HTTP 429 partway through and fail for the
 * endpoint's reasons rather than the code's.
 *
 * No count is pinned for the agent juror: commitments accumulate with every dispute, and a test
 * asserting one would fail for being right. Dispute 156 is finished, so its record is pinned.
 */

/**
 * Columbo, because it sat on dispute 151's panel: the court's first dispute, at the far end of the
 * oldest window. Finding it is what proves the windows reach back to the court's creation.
 */
const COLUMBO = ROSTER.find((agentJuror) => agentJuror.nickname === "Columbo");

describe("one agent juror's commitments, as its page reads them", () => {
  let commits: RawCommitCast[];
  let performance: CourtPerformance;

  beforeAll(async () => {
    if (COLUMBO === undefined) throw new Error("Columbo is not on the roster");
    const [disputes, draws, read] = await Promise.all([
      fetchCourtDisputes(),
      fetchCourtDraws(),
      fetchCommitCasts({
        client: createArbitrumClient(DEFAULT_ARBITRUM_RPC_URL),
        filter: { _juror: COLUMBO.address },
        // A cache of its own, so this run reads every block it reports on.
        blockTimes: createBlockTimes(null),
      }),
    ]);
    commits = read;

    // Neither the parameter history nor the payouts: nothing here is about a window or a
    // payout, and both cost reads against endpoints the live suite as a whole has to share.
    const result = buildCourtPerformance({
      disputes,
      draws,
      parameters: null,
      rewards: null,
      roster: ROSTER,
      drawsReadAt: null,
    });
    if (!result.success) throw new Error(`${result.code}: ${result.message}`);
    performance = result.data;
  }, 120_000);

  it("reads it from the keyless default endpoint, one agent juror and nothing else", () => {
    // The event signature still matching is the thing being tested: a renamed or re-typed
    // `CommitCast` returns an empty array rather than an error.
    expect(commits.length).toBeGreaterThan(0);
    for (const commit of commits) {
      expect(commit.juror.toLowerCase()).toBe(COLUMBO?.address.toLowerCase());
      expect(commit.disputeID).toMatch(/^\d+$/);
      // From the block and never from the log's own zero, which would date it to 1970.
      expect(Number(commit.timestamp)).toBeGreaterThan(1_700_000_000);
    }
  });

  it("reaches back to the court's first dispute, across every window", () => {
    // A scan cut short — a window too wide and refused, or a start block past the court's
    // creation — loses the oldest commitments first and says nothing. Presence, not a minimum:
    // the filter is on the juror and not the court.
    expect(commits.some((commit) => commit.disputeID === "151")).toBe(true);
  });

  it("finds a commitment for every draw of its the subgraph reports as committed", () => {
    // The cross-check ADR-0004 exists for, against the live reads. A shortfall here is either
    // a truncating endpoint or a subgraph reporting a commitment that was never mined, and
    // both are things this dashboard must never absorb.
    const reading = buildAgentJurorReading(performance, "Columbo", commits);
    const coverage = reading?.commitCoverage;

    expect(coverage?.expected).toBeGreaterThan(0);
    expect(coverage?.resolved).toBe(coverage?.expected);

    for (const { commitLatencySeconds } of reading?.draws ?? []) {
      if (commitLatencySeconds === null) continue;
      expect(commitLatencySeconds).toBeGreaterThanOrEqual(0);
      // Dispute 151's 8-hour commit window is the widest this court has ever had.
      expect(commitLatencySeconds).toBeLessThanOrEqual(8 * 60 * 60);
    }
  });
});

describe("one dispute's record, as its timeline reads it", () => {
  let chain: RawDisputeChain;

  beforeAll(async () => {
    chain = await fetchDisputeChain({
      client: createArbitrumClient(DEFAULT_ARBITRUM_RPC_URL),
      disputeId: 156,
      // Its first draw to its execution period, as `blockRangeOf` reads them from the subgraph.
      range: { fromBlock: 496_780_897n, toBlock: 497_058_149n },
      blockTimes: createBlockTimes(null),
    });
  }, 60_000);

  it("finds every period opening, and who sent each", () => {
    expect(chain.openings.map((opening) => opening.period).sort()).toEqual(["1", "2", "3", "4"]);
    for (const opening of chain.openings) {
      expect(opening.from).toMatch(/^0x[0-9a-fA-F]{40}$/);
    }
  });

  it("still reads what the captured fixture holds, sender aside", () => {
    // The fixture replaces the off-roster sender with a synthetic address (`test/court.tsx`),
    // so that is the one field not compared. Everything else of a finished dispute is fixed.
    const fixture = disputeChainFixture as RawDisputeChain;
    const withoutSender = (record: RawDisputeChain) =>
      record.openings.map(({ from: _from, ...rest }) => rest);

    expect(withoutSender(chain)).toEqual(withoutSender(fixture));
    expect(chain.commits).toEqual(fixture.commits);
  });

  it("names no rostered agent juror as an opener of dispute 156", () => {
    // Every opening was sent by one account off the roster. If one ever reads as an agent
    // juror, the join or the read has changed, not the history.
    const roster = new Set(ROSTER.map((agentJuror) => agentJuror.address.toLowerCase()));
    for (const opening of chain.openings) {
      expect(roster.has(opening.from.toLowerCase())).toBe(false);
    }
  });
});
