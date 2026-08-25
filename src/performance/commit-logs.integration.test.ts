import { beforeAll, describe, expect, it } from "vitest";
import { fetchCourtDisputes } from "../disputes/court-subgraph";
import { ROSTER } from "../roster/agent-jurors";
import { createArbitrumClient, DEFAULT_ARBITRUM_RPC_URL } from "./arbitrum";
import { fetchCommitCasts } from "./commit-logs";
import { fetchCourtDraws } from "./draws-subgraph";
import { buildCourtPerformance, type CourtPerformance, type RawCommitCast } from "./performance";

/**
 * Live against Arbitrum One, held out of `yarn test` — run with `yarn test:integration`.
 *
 * The fixture beside this cannot notice a renamed event, a redeployed dispute kit, or an
 * endpoint that has started capping `eth_getLogs`. Those are exactly the changes that would
 * empty the commit line without emptying anything else, so they are what this asserts.
 *
 * Read once in `beforeAll` and shared, rather than once per test. Not tidiness: the commit read
 * costs one RPC call per commitment, and the public endpoint rate-limits per call — five tests
 * each doing their own read returns HTTP 429 partway through and fails for the endpoint's
 * reasons rather than the code's. Measured, in the session that wrote this file.
 *
 * No count is pinned: commitments accumulate with every dispute, and a test asserting "56"
 * would fail for being right.
 */
describe("fetchCommitCasts", () => {
  let commits: RawCommitCast[];
  let performance: CourtPerformance;

  beforeAll(async () => {
    const [disputes, draws, read] = await Promise.all([
      fetchCourtDisputes(),
      fetchCourtDraws(),
      fetchCommitCasts({ client: createArbitrumClient(DEFAULT_ARBITRUM_RPC_URL) }),
    ]);
    commits = read;

    // `parameters: null` on purpose: nothing this suite asserts is about a window, and reading
    // the court's history here would be four more RPC calls against an endpoint that
    // rate-limits per call. `court-parameters.integration.test.ts` is where it is read live.
    const result = buildCourtPerformance({
      disputes,
      draws,
      commits,
      parameters: null,
      // `rewards: null` on the same terms: nothing here is about a payout, and reading them
      // would be another subgraph round trip for a figure this suite never asserts on.
      rewards: null,
      roster: ROSTER,
      drawsReadAt: null,
    });
    if (!result.success) throw new Error(`${result.code}: ${result.message}`);
    performance = result.data;
  }, 120_000);

  it("reads the roster's commitments from the keyless default endpoint", () => {
    // The event signature still matching is the thing being tested: a renamed or re-typed
    // `CommitCast` returns an empty array rather than an error, and every commit latency on
    // the page would silently become Unknown.
    expect(commits.length).toBeGreaterThanOrEqual(56);
  });

  it("returns commitments carrying the fields a latency depends on", () => {
    for (const commit of commits) {
      expect(commit.disputeID).toMatch(/^\d+$/);
      expect(commit.juror).toMatch(/^0x[0-9a-fA-F]{40}$/);
      expect(commit.timestamp).toMatch(/^\d+$/);
    }
  });

  it("dates every commitment from the block and never from the log's own zero", () => {
    // The endpoint puts `blockTimestamp: "0x0"` on every log it returns. A reader that
    // believed it would produce exactly this shape of payload — well-formed, well-typed, and
    // stamped 1970 — so the assertion is that no commitment is anywhere near the epoch.
    for (const commit of commits) {
      expect(Number(commit.timestamp)).toBeGreaterThan(1_700_000_000);
    }
  });

  it("still answers an unchunked scan of the whole chain", () => {
    // ADR-0004: scans are unchunked, which this endpoint supports and many commercial ones do
    // not. One that had started capping the range would return fewer logs and no error at all,
    // so the tell is the oldest dispute still being in the answer.
    //
    // Presence, not the minimum: the scan filters on the juror and not on the court, so the day
    // a roster address is drawn in another court in a lower-numbered dispute, a `Math.min`
    // assertion would go red for a reason that has nothing to do with a capped range.
    expect(commits.some((commit) => commit.disputeID === "151")).toBe(true);
  });

  it("finds a commitment for every draw the subgraph reports as committed", () => {
    // The cross-check ADR-0004 exists for, run against the live reads rather than a snapshot
    // of them. A shortfall here is either a truncating endpoint or a subgraph reporting a
    // commitment that was never mined, and both are things this dashboard must never absorb.
    const { expected, resolved } = performance.commitCoverage;

    expect(expected).toBeGreaterThanOrEqual(56);
    expect(resolved).toBe(expected);
  });

  it("measures every commitment inside a plausible window, and none of them negative", () => {
    const latencies = performance.rows
      .flatMap((row) => row.cells)
      .map((cell) => cell?.commitLatencySeconds ?? null)
      .filter((seconds): seconds is number => seconds !== null);

    expect(latencies.length).toBeGreaterThanOrEqual(56);
    for (const seconds of latencies) {
      expect(seconds).toBeGreaterThanOrEqual(0);
      // Dispute 151's 8-hour commit window is the widest this court has ever had, and nothing
      // may be measured against the court's current 45 minutes — see CLAUDE.md § Traps.
      expect(seconds).toBeLessThanOrEqual(8 * 60 * 60);
    }
  });
});
