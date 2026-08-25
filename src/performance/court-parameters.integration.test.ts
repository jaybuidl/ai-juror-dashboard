import { beforeAll, describe, expect, it } from "vitest";
import { fetchCourtDisputes } from "../disputes/court-subgraph";
import { ROSTER } from "../roster/agent-jurors";
import { createArbitrumClient, DEFAULT_ARBITRUM_RPC_URL } from "./arbitrum";
import fixture from "./court-34-parameters.fixture.json" with { type: "json" };
import { fetchCourtParameters } from "./court-parameters";
import { fetchCourtDraws } from "./draws-subgraph";
import { buildCourtPerformance, type CourtPerformance } from "./performance";
import { type RawCourtParameters, toRegimes } from "./windows";

/**
 * Live against Arbitrum One, held out of `yarn test` — run with `yarn test:integration`.
 *
 * Two jobs, and the second is the one that matters most. The first is what every live suite
 * here does: notice a renamed event or a redeployed core, which would return an empty history
 * and quietly leave every dispute unmarked. The second is that `MethodPage`'s account of the
 * two configurations is prose — it has to answer a reader arriving from the matrix's footnote
 * on a cold load, so it cannot wait on this read — and prose is free to drift from the chain.
 * These assertions are what stops it: a third configuration, or a change to either of the two,
 * fails here and the account gets rewritten. CI runs this nightly.
 *
 * Read once in `beforeAll` and shared: the public endpoint rate-limits per RPC call, and this
 * is two `eth_getLogs` plus a block read each.
 */
describe("fetchCourtParameters", () => {
  let history: RawCourtParameters[];
  let performance: CourtPerformance;

  beforeAll(async () => {
    const [disputes, draws, read] = await Promise.all([
      fetchCourtDisputes(),
      fetchCourtDraws(),
      fetchCourtParameters({ client: createArbitrumClient(DEFAULT_ARBITRUM_RPC_URL) }),
    ]);
    history = read;

    const result = buildCourtPerformance({
      disputes,
      draws,
      // Not read here: nothing below is about a commitment, and the commit scan is one RPC
      // call per commitment against an endpoint that counts them.
      commits: null,
      parameters: history,
      // Not read here either, and for the plainer reason: nothing below is about a payout.
      rewards: null,
      // `drawsReadAt: null` — one live payload is one moment, so every row counts as read.
      roster: ROSTER,
      drawsReadAt: null,
    });
    if (!result.success) throw new Error(`${result.code}: ${result.message}`);
    performance = result.data;
  }, 120_000);

  it("reads the court's configurations from the keyless default endpoint", () => {
    // The deployed event signatures still matching is the thing being tested. `KlerosCore.sol`
    // has since gained an `_eligibility` argument on both events, and that signature hashes to
    // a different topic — which matches no log and returns a court that was never configured.
    expect(history.length).toBeGreaterThanOrEqual(2);
  });

  it("dates every change from its block and never from the log's own zero", () => {
    for (const change of history) {
      expect(change.at).toMatch(/^\d+$/);
      expect(Number(change.at)).toBeGreaterThan(1_700_000_000);
      expect(change.timesPerPeriod).toHaveLength(4);
    }
  });

  it("still reports exactly the two configurations the method page describes", () => {
    // `MethodPage`'s window section states these in prose, in words, as the destination of the
    // † marker's link. This is the assertion that keeps the two the same account. A third
    // configuration fails here first, before a reader ever reads a stale one.
    expect(toRegimes(history)).toEqual([
      {
        from: 1_786_444_490,
        windows: {
          evidenceSeconds: 43_200,
          commitSeconds: 28_800,
          voteSeconds: 28_800,
          appealSeconds: 129_600,
        },
      },
      {
        from: 1_787_230_320,
        windows: {
          evidenceSeconds: 2_700,
          commitSeconds: 2_700,
          voteSeconds: 1_800,
          appealSeconds: 129_600,
        },
      },
    ]);
  });

  it("returns what the captured fixture holds, so the offline suite is reading this court", () => {
    expect(history).toEqual(fixture as RawCourtParameters[]);
  });

  it("still resolves dispute 151 to the eight-hour commit window against the live court", () => {
    // The trap, run against the live chain rather than a snapshot of it: court 34's *current*
    // configuration is 45 minutes, and reading that back over dispute 151 would be wrong by a
    // factor of ten with nothing to show for it.
    const first = performance.rows.find((row) => row.dispute.id === 151);

    expect(first?.windows?.commitSeconds).toBe(28_800);
    expect(first?.underEarlierWindows).toBe(true);
  });

  it("marks dispute 151 alone, however many disputes the court has since held", () => {
    // Not a count and not a range: disputes arrive continually, and every one of them runs
    // under the current configuration until the court is reconfigured again.
    const marked = performance.rows
      .filter((row) => row.underEarlierWindows)
      .map((row) => row.dispute.id);

    expect(marked).toEqual([151]);
  });

  it("gives every dispute in the court a window it can name", () => {
    // A dispute older than every configuration read would resolve to null, which is how a
    // capped or chunked scan would show up here — the oldest change dropped, and the earliest
    // disputes unplaceable.
    for (const row of performance.rows) {
      expect(row.windows, `dispute ${row.dispute.id}`).not.toBeNull();
    }
  });
});
