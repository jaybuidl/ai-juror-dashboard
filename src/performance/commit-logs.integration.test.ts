import { beforeAll, describe, expect, it } from "vitest";
import { ROSTER } from "../roster/agent-jurors";
import { createArbitrumClient, DEFAULT_ARBITRUM_RPC_URL } from "./arbitrum";
import { createBlockTimes } from "./block-times";
import disputeChainFixture from "./dispute-156-chain.fixture.json" with { type: "json" };
import { fetchDisputeChain, type RawDisputeChain } from "./dispute-chain";

/**
 * Live against Arbitrum One, held out of `yarn test` — run with `yarn test:integration`.
 *
 * The fixtures beside this cannot notice a renamed event, a redeployed contract, or an endpoint
 * that has started capping `eth_getLogs` — the last of which happened on or before 2026-11-20,
 * when arb1 began refusing any scan wider than ten million blocks and every scan here, which
 * started at block 0, went dark at once (#25). Those are exactly the changes that would empty a
 * timeline without emptying anything else, so they are what this asserts.
 *
 * The one read a view makes (ADR-0012), once in `beforeAll` and shared. Not tidiness: a scan
 * costs one RPC call per window and per commitment, and the public endpoint rate-limits per call
 * — tests each doing their own read return HTTP 429 partway through and fail for the endpoint's
 * reasons rather than the code's. Dispute 156 is finished, so its record is pinned exactly.
 */

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
