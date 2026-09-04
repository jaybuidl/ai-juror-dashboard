import { beforeAll, describe, expect, it } from "vitest";
import { fetchCourtDisputes } from "../disputes/court-subgraph";
import { ROSTER } from "../roster/agent-jurors";
import { createArbitrumClient, DEFAULT_ARBITRUM_RPC_URL } from "./arbitrum";
import fixture from "./court-34-parameters.fixture.json" with { type: "json" };
import { fetchCourtParameters } from "./court-parameters";
import { fetchCourtDraws } from "./draws-subgraph";
import { buildCourtPerformance, type CourtPerformance } from "./performance";
import { measuredRegimes, type RawCourtParameters, toRegimes } from "./windows";

/**
 * Live against Arbitrum One, held out of `yarn test` — run with `yarn test:integration`.
 *
 * Three jobs, and a failure here answers which of them went wrong by its own name. Read the
 * red test names in this order and stop at the first:
 *
 * 1. **The read broke.** Two assertions, `reads the court's configurations…` and `reports no
 *    configuration that repeats…`, and neither failure is visible anywhere else. A renamed
 *    event or a redeployed core is the first: `KlerosCore.sol` has since gained an
 *    `_eligibility` argument on both events, and a signature carrying it hashes to a different
 *    topic, matches no log, and returns a court that was never configured — an empty history
 *    that marks no dispute and fails no other check by saying so. A log counted twice is the
 *    second, and it is the one that needs the ordering above: a duplicate leaves both
 *    assertions below green, because there are still three configurations and the fold in case
 *    2 swallows a repeat, so a reader who skipped to case 3 would recapture the fixture with
 *    the duplicate in it and write it into `/method`.
 * 2. **A figure moved.** `has moved no commit or vote window…` fires only when the court
 *    changed a window this dashboard measures from. Latencies either side of that change are
 *    not comparable, rows that carried no marker now carry one, and the fixture behind the
 *    offline suite is a snapshot of a court that no longer exists. This is the one worth
 *    waking up for.
 * 3. **An account went stale.** `still holds the three configurations…` and `returns what the
 *    captured fixture holds…` fire on *any* change to the history, including one that moves no
 *    figure a reader can see. `MethodPage`'s account of the configurations is prose — it has to
 *    answer a reader arriving from the matrix's footnote on a cold load, so it cannot wait on
 *    this read — and prose is free to drift. With everything above green, these two are
 *    documentation upkeep: recapture the fixture, rewrite the section, done.
 *
 * **It has fired once, and the rewrite was ticket 19.** The 2026-08-26 change moved the
 * evidence period alone: it was case 3 and nothing else, and working out that it was took a
 * maintainer reading a diff by hand — which is the whole reason for the split above. Court 34
 * is a live demo instrument and gets reconfigured to suit a demo, so case 3 is the common one
 * (`docs/knowledge/court-34.md`); a nightly job habitually red for it is a job nobody reads,
 * and the next thing it reports will be case 1.
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
    // Case 1, and the first thing to read when this file is red. The deployed event signatures
    // still matching is the thing being tested: a topic that matches no log returns a court
    // that was never configured, which is an absence and not an error.
    expect(
      history.length,
      "The court read back fewer configurations than it has held. Check the deployed event signatures in court-parameters.ts before reading anything else red in this file: a renamed event returns [] rather than failing.",
    ).toBeGreaterThanOrEqual(3);
  });

  it("dates every change from its block and never from the log's own zero", () => {
    for (const change of history) {
      expect(change.at).toMatch(/^\d+$/);
      expect(Number(change.at)).toBeGreaterThan(1_700_000_000);
      expect(change.timesPerPeriod).toHaveLength(4);
    }
  });

  it("reports no configuration that repeats the one before it", () => {
    // Also case 1, from the other side: a log counted twice, or the two scans interleaved
    // wrongly, shows up as a configuration that changed nothing. Written without presuming a
    // direction — asserting that any particular window got *shorter* would go red if the court
    // simply put 45 minutes back, which is not what this is about.
    const regimes = toRegimes(history);

    for (const [index, regime] of regimes.entries()) {
      if (index === 0) continue;
      expect(regime.windows, `configuration ${index} at ${regime.from}`).not.toEqual(
        regimes[index - 1]?.windows,
      );
    }
  });

  it("has moved no commit or vote window, which would make latencies either side incomparable", () => {
    // Case 2, and the assertion this file exists for. The commit and vote windows are the two
    // reveal and commit latency are measured from, so a change to either splits the court into
    // stretches whose figures cannot be read against each other and puts a marker on rows that
    // carried none.
    //
    // Over the whole history and not the last two configurations, which is what ticket 19 left
    // and what ticket 20 replaced: `measuredRegimes` folds away every configuration that left
    // both of these alone, so a fourth of those changes nothing here and a fourth that moved a
    // window arrives as an entry that was not expected. Fixed indices would have gone on
    // comparing 2026-08-20 against 2026-08-26 for ever.
    expect(
      measuredRegimes(toRegimes(history)),
      "A window this dashboard measures from has moved. Every latency either side of it is measured against a different allowance, so the two are not comparable and the matrix's marker now falls on a different set of rows: check CourtTotals.changedWindows and the footnote before recapturing anything.",
    ).toEqual([
      { from: 1_786_444_490, commitSeconds: 28_800, voteSeconds: 28_800 },
      { from: 1_787_230_320, commitSeconds: 2_700, voteSeconds: 1_800 },
    ]);
  });

  it("still holds the three configurations the fixture and /method describe, in full", () => {
    // Case 3. `MethodPage`'s window section states these in prose, in words, as the
    // destination of the † marker's link, and this is the assertion that keeps the page and
    // the chain one account. It fires on any change at all — including the evidence-only kind
    // the court has already made once, which reaches no figure on the page.
    expect(
      toRegimes(history),
      "The court's history no longer matches this file's account of it. If the comparability assertion above is green, this is upkeep: recapture court-34-parameters.fixture.json, update the literal here, and rewrite the regime strip in MethodPage's window section, which states all of this in prose and reads from no model.",
    ).toEqual([
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
      // The evidence period and nothing else, so this configuration reaches no figure on the
      // page. Written out in full anyway: a fourth that moved a commit or a vote window has to
      // be visible here as a changed number rather than as a new entry nobody reads.
      {
        from: 1_787_750_041,
        windows: {
          evidenceSeconds: 600,
          commitSeconds: 2_700,
          voteSeconds: 1_800,
          appealSeconds: 129_600,
        },
      },
    ]);
  });

  it("returns what the captured fixture holds, so the offline suite is reading this court", () => {
    // Case 3 again, and the half of it the offline suite depends on: 900-odd tests read this
    // fixture as though it were the court.
    expect(
      history,
      "The captured fixture is a snapshot of a court that has since been reconfigured. Recapture court-34-parameters.fixture.json — and if the comparability assertion above is also red, expect the offline suite to move with it.",
    ).toEqual(fixture as RawCourtParameters[]);
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
