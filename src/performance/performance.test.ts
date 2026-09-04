import { describe, expect, it } from "vitest";
import disputeFixture from "../disputes/court-34.fixture.json" with { type: "json" };
import type { RawDispute } from "../disputes/disputes";
import { type AgentJuror, ROSTER } from "../roster/agent-jurors";
import commitFixture from "./court-34-commits.fixture.json" with { type: "json" };
import drawFixture from "./court-34-draws.fixture.json" with { type: "json" };
import parameterFixture from "./court-34-parameters.fixture.json" with { type: "json" };
import rewardFixture from "./court-34-rewards.fixture.json" with { type: "json" };
import {
  buildCourtPerformance,
  type CourtPerformance,
  type RawCommitCast,
  type RawCourtData,
  type RawDraw,
  type RawRewardShift,
} from "./performance";
import type { RawCourtParameters } from "./windows";

/**
 * The court as captured, read from Goldsky on 2026-08-25 beside the dispute payload
 * ticket 03 took the same day: 76 vote IDs across disputes 151–166, held by five of the agent
 * jurors the roster then named. Everything counted below is a fact about this payload rather
 * than about the court, which has since grown past it in both disputes and agent jurors.
 *
 * Everything asserted below about the finalised range — 61 votes collapsing to 44 draws, a
 * reveal latency of 7s to 552s with a median of 85s, dispute 155's panel of one — is the
 * measured record as `spec.md` § Further Notes states it. That is the point of capturing
 * rather than inventing: if a derivation drifts, it stops reproducing figures that were
 * established independently of this code.
 *
 * The commitments beside them came from Arbitrum the same day, through `fetchCommitCasts` and
 * not by hand: 56 `CommitCast` logs, one per committed draw, addresses checksummed as the chain
 * returns them rather than lowercased as The Graph does.
 */
const rawDisputes = disputeFixture as RawDispute[];
const rawDraws = drawFixture as RawDraw[];
const rawCommits = commitFixture as RawCommitCast[];
const rawParameters = parameterFixture as RawCourtParameters[];
/**
 * The 44 payouts the court had written on the same day, from `TokenAndETHShift`.
 *
 * One per agent juror per **executed** dispute, which is why there are 44 of them against 56
 * draws: disputes 164–166 were still in `appeal` when this was captured, so nothing has been
 * paid for their twelve draws. That is a lag and not a gap, and it is the state a live court
 * spends most of its time in.
 */
const rawRewards = rewardFixture as RawRewardShift[];

function courtData(overrides: Partial<RawCourtData> = {}): RawCourtData {
  return {
    disputes: rawDisputes,
    draws: rawDraws,
    commits: rawCommits,
    parameters: rawParameters,
    rewards: rawRewards,
    roster: ROSTER,
    drawsReadAt: null,
    ...overrides,
  };
}

/** The model, or a failure loud enough to read in the test output. */
function built(raw: RawCourtData = courtData()): CourtPerformance {
  const result = buildCourtPerformance(raw);
  if (!result.success) throw new Error(`${result.code}: ${result.message}`);
  return result.data;
}

function rowFor(id: number, performance = built()) {
  const row = performance.rows.find((candidate) => candidate.dispute.id === id);
  if (row === undefined) throw new Error(`No row for dispute ${id}`);
  return row;
}

function cellFor(disputeId: number, nickname: string, performance = built()) {
  const column = performance.agentJurors.findIndex(
    (agentJuror) => agentJuror.nickname === nickname,
  );
  return rowFor(disputeId, performance).cells[column] ?? null;
}

/** One agent juror's draw in one dispute, as the subgraph reports each of its vote IDs. */
function rawDraw(overrides: Partial<RawDraw> = {}): RawDraw {
  return {
    id: "163-0-0",
    juror: { id: "0x57eb05d4dffac43a0c52b42c47a4e7d1838725ea" },
    dispute: { disputeID: "163" },
    round: { id: "163-0" },
    vote: {
      commited: true,
      voted: true,
      choice: "2",
      justification: { timestamp: "1787343444", choice: "2" },
    },
    ...overrides,
  };
}

/** A dispute in each of the states the cell has to tell apart, with one round. */
function rawDispute(overrides: Partial<RawDispute> = {}): RawDispute {
  return {
    id: "163",
    disputeID: "163",
    period: "execution",
    ruled: true,
    currentRuling: "2",
    createdAt: "1787340123",
    lastPeriodChange: "1787409015",
    currentRoundIndex: "0",
    rounds: [{ id: "163-0", timeline: ["1787342856", "1787343398", "1787344095", "1787409015"] }],
    ...overrides,
  };
}

/**
 * One `CommitCast` log, as `fetchCommitCasts` hands it over: the dispute, the juror and the
 * moment the block carrying the commitment was mined. Checksummed, because the chain is.
 */
function rawCommit(overrides: Partial<RawCommitCast> = {}): RawCommitCast {
  return {
    disputeID: "163",
    juror: "0x57eb05d4dfFAc43A0C52B42C47a4E7d1838725Ea",
    timestamp: "1787342880",
    ...overrides,
  };
}

describe("buildCourtPerformance", () => {
  it("reads the captured court without a network or a clock", () => {
    expect(buildCourtPerformance(courtData()).success).toBe(true);
  });

  it("puts one row on the matrix per dispute, newest first", () => {
    const performance = built();

    expect(performance.rows.map((row) => row.dispute.id)).toEqual([
      166, 165, 164, 163, 162, 161, 160, 159, 158, 157, 156, 155, 154, 153, 152, 151,
    ]);
  });

  it("puts one column on the matrix per agent juror, in roster order", () => {
    const performance = built();

    // Written out by hand rather than derived from `ROSTER`, and it has to stay that way: this
    // array *is* the join, so a test that reads the order off the thing it is checking would
    // agree with any reordering, including one that silently reattributes every figure on the
    // page to the wrong agent juror. Adding an agent juror is meant to fail here once, loudly,
    // and be updated deliberately.
    //
    // Two departures from nickname order, neither an alphabetisation that slipped and neither a
    // ranking. `aletheia` sits near the end because its column is the one dense with missed
    // votes, and a full-height rose column near the left outshouts a grid whose subject is
    // latency. `baskerville` follows it because that is where it was appended while the court
    // had not drawn it — the court has since drawn it 14 times, and a column does not move for
    // that. `grokleros` is appended right of both under the same rule. See `ROSTER`.
    expect(performance.agentJurors.map((agentJuror) => agentJuror.nickname)).toEqual([
      "007",
      "blaise",
      "columbo",
      "daemonhill",
      "aletheia",
      "baskerville",
      "grokleros",
    ]);
    for (const row of performance.rows) {
      expect(row.cells).toHaveLength(ROSTER.length);
    }
  });

  it("collapses the 61 votes of the finalised disputes into 44 draws", () => {
    const finalised = built().rows.filter((row) => row.dispute.id <= 163);
    const drawn = finalised.flatMap((row) => row.cells.filter((cell) => cell !== null));

    expect(drawn).toHaveLength(44);
    expect(drawn.reduce((total, draw) => total + draw.voteCount, 0)).toBe(61);
  });

  it("collapses several vote IDs held by one agent juror into a single draw", () => {
    // Dispute 155's whole panel was columbo, holding all three vote IDs.
    const row = rowFor(155);

    expect(row.cells.filter((cell) => cell !== null)).toHaveLength(1);
    expect(cellFor(155, "columbo")?.voteCount).toBe(3);
  });

  it("counts panel size in agent jurors drawn, never in vote IDs", () => {
    expect(rowFor(155).panelSize).toBe(1);
    expect(rowFor(163).panelSize).toBe(5);
    expect(rowFor(151).panelSize).toBe(2);
  });

  it("leaves the column of an agent juror the record does not draw empty end to end", () => {
    // baskerville in this fixture, which was captured before the court first drew it. The
    // claim under test is about the shape — an undrawn column is null end to end rather than
    // absent — and not about which agent juror happens to be in that state.
    const performance = built();
    const column = performance.agentJurors.findIndex(
      (agentJuror) => agentJuror.nickname === "baskerville",
    );

    expect(performance.rows.every((row) => row.cells[column] === null)).toBe(true);
  });

  describe("reveal latency", () => {
    it("measures from the moment the vote period opened to the moment the reveal was recorded", () => {
      // Dispute 163's vote period opened at 1787343398; blaise's justification landed at
      // 1787343444. Not from `createdAt`, not from a deadline, and not from a clock.
      expect(cellFor(163, "blaise")?.revealLatencySeconds).toBe(46);
    });

    it("reproduces the measured range across the finalised disputes", () => {
      const latencies = built()
        .rows.filter((row) => row.dispute.id <= 163)
        .flatMap((row) => row.cells)
        .map((cell) => cell?.revealLatencySeconds ?? null)
        .filter((seconds): seconds is number => seconds !== null)
        .sort((a, b) => a - b);
      const median = ((latencies[21] ?? 0) + (latencies[22] ?? 0)) / 2;

      expect(latencies).toHaveLength(44);
      expect(latencies[0]).toBe(7);
      expect(latencies[latencies.length - 1]).toBe(552);
      expect(median).toBe(85);
    });

    it("measures against the round the draw belongs to, not the dispute's first round", () => {
      const raw = courtData({
        disputes: [
          rawDispute({
            rounds: [
              { id: "163-0", timeline: ["1", "100", "500", "900"] },
              { id: "163-1", timeline: ["500", "1000", "1500", "1900"] },
            ],
          }),
        ],
        draws: [
          rawDraw({
            round: { id: "163-1" },
            vote: {
              commited: true,
              voted: true,
              choice: "2",
              justification: { timestamp: "1042", choice: "2" },
            },
          }),
        ],
      });

      expect(cellFor(163, "blaise", built(raw))?.revealLatencySeconds).toBe(42);
    });

    it("never measures one round's reveal against another round's clock", () => {
      // Appeal rounds are out of scope, and one cell per agent juror per dispute is the whole
      // shape of the matrix, so an appealed dispute has to pick a round. Picking wrongly is not
      // cosmetic: merging two rounds' vote IDs into one group dates a round-0 reveal against
      // round 1's vote period — negative by hundreds of seconds, which fails the entire matrix —
      // and judges a juror still committing in round 1 against round 0's closed vote period,
      // which renders as `NO VOTE`, the one state that attributes a failure.
      const disputes = [
        rawDispute({
          period: "vote",
          ruled: false,
          currentRuling: "0",
          rounds: [
            { id: "163-0", timeline: ["1", "100", "500", "900"] },
            { id: "163-1", timeline: ["1000", "1100", "0", "0"] },
          ],
        }),
      ];
      const firstRound = rawDraw({
        vote: {
          commited: true,
          voted: true,
          choice: "2",
          justification: { timestamp: "142", choice: "2" },
        },
      });
      const secondRound = rawDraw({
        id: "163-1-0",
        round: { id: "163-1" },
        vote: { commited: true, voted: false, choice: null, justification: null },
      });

      for (const draws of [
        [firstRound, secondRound],
        [secondRound, firstRound],
      ]) {
        const cell = cellFor(163, "blaise", built(courtData({ disputes, draws })));

        // The round still running is the one the cell reports, whatever order it arrived in.
        expect(cell?.state).toEqual({ kind: "live", stage: "committed" });
        expect(cell?.revealLatencySeconds).toBeNull();
        expect(cell?.voteCount).toBe(1);
      }
    });

    it("reports an unknown latency rather than a wrong one when the reveal was not recorded", () => {
      const raw = courtData({
        disputes: [rawDispute()],
        draws: [
          rawDraw({
            vote: { commited: true, voted: true, choice: "2", justification: null },
          }),
        ],
      });
      const cell = cellFor(163, "blaise", built(raw));

      expect(cell?.revealLatencySeconds).toBeNull();
      // The draw still voted, and still voted with the ruling. Only the moment is missing.
      expect(cell?.state).toEqual({ kind: "coherent" });
    });
  });

  describe("commit latency", () => {
    it("measures from the moment the commit period opened to the moment the block was mined", () => {
      // Dispute 163's commit period opened at 1787342856; blaise's CommitCast landed in a
      // block stamped 1787342880. Measured against the period that actually opened, never
      // against a deadline and never as a fraction of the window (ADR-0005).
      expect(cellFor(163, "blaise")?.commitLatencySeconds).toBe(24);
    });

    it("reproduces the range the design was drawn against", () => {
      // The canvas quotes commit latency running 2m 06s to 53m 56s, and dispute 151 holds
      // both ends of it. Those two figures were established before any of this code existed.
      expect(cellFor(151, "columbo")?.commitLatencySeconds).toBe(126);
      expect(cellFor(151, "daemonhill")?.commitLatencySeconds).toBe(3236);
    });

    it("reproduces the measured spread across the finalised disputes", () => {
      const latencies = built()
        .rows.filter((row) => row.dispute.id <= 163)
        .flatMap((row) => row.cells)
        .map((cell) => cell?.commitLatencySeconds ?? null)
        .filter((seconds): seconds is number => seconds !== null)
        .sort((a, b) => a - b);
      const median = ((latencies[21] ?? 0) + (latencies[22] ?? 0)) / 2;

      expect(latencies).toHaveLength(44);
      expect(latencies[0]).toBe(24);
      expect(latencies[latencies.length - 1]).toBe(3236);
      expect(median).toBe(256);
    });

    it("joins the chain's checksummed address to the subgraph's lowercased one", () => {
      // The Graph lowercases; `eth_getLogs` does not. Joining on the raw strings would match
      // nothing at all and render every commit slot as Unknown, with nothing in the console.
      const raw = courtData({
        disputes: [rawDispute()],
        draws: [rawDraw()],
        commits: [rawCommit({ juror: "0x57EB05D4DFFAC43A0C52B42C47A4E7D1838725EA" })],
      });

      expect(cellFor(163, "blaise", built(raw))?.commitLatencySeconds).toBe(24);
    });

    it("measures against the round the draw belongs to, not the dispute's first round", () => {
      const raw = courtData({
        disputes: [
          rawDispute({
            rounds: [
              { id: "163-0", timeline: ["1", "100", "500", "900"] },
              { id: "163-1", timeline: ["1000", "1100", "1500", "1900"] },
            ],
          }),
        ],
        draws: [
          rawDraw({
            round: { id: "163-1" },
            vote: {
              commited: true,
              voted: true,
              choice: "2",
              justification: { timestamp: "1142", choice: "2" },
            },
          }),
        ],
        commits: [rawCommit({ timestamp: "1030" })],
      });

      expect(cellFor(163, "blaise", built(raw))?.commitLatencySeconds).toBe(30);
    });

    it("reports an unknown latency rather than a wrong one when no log matched the draw", () => {
      const raw = courtData({ disputes: [rawDispute()], draws: [rawDraw()], commits: [] });
      const cell = cellFor(163, "blaise", built(raw));

      expect(cell?.commitLatencySeconds).toBeNull();
      // The draw still committed, still revealed, and still voted with the ruling. Only the
      // moment is missing — a truncated scan must never cost a draw its verdict.
      expect(cell?.state).toEqual({ kind: "coherent" });
      expect(cell?.revealLatencySeconds).toBe(46);
    });

    it("reports an unknown latency for a commit period that has not opened", () => {
      const raw = courtData({
        disputes: [
          rawDispute({
            period: "evidence",
            ruled: false,
            currentRuling: "0",
            rounds: [{ id: "163-0", timeline: ["0", "0", "0", "0"] }],
          }),
        ],
        draws: [rawDraw({ vote: null })],
        commits: [rawCommit()],
      });

      expect(cellFor(163, "blaise", built(raw))?.commitLatencySeconds).toBeNull();
    });

    it("never reports a negative latency from a commitment that predates the round", () => {
      // Unlike a reveal, a commitment has a round to belong to and the log does not say which:
      // one that predates this round's commit period is an earlier round's, not a corrupt
      // payload. So it is not selected, and the draw counts as a shortfall instead — which
      // says the same thing without ever putting a negative duration on the page.
      const raw = courtData({
        disputes: [rawDispute()],
        draws: [rawDraw()],
        commits: [rawCommit({ timestamp: "1787342000" })],
      });
      const performance = built(raw);

      expect(cellFor(163, "blaise", performance)?.commitLatencySeconds).toBeNull();
      expect(performance.commitCoverage).toEqual({ read: true, expected: 1, resolved: 0 });
    });

    it("takes the commitment belonging to the round the cell reports, not an earlier one", () => {
      // The log carries a dispute and a juror and no round at all, so an agent juror drawn
      // twice has two commitments under one key. Taking the wrong one dates a round-1 cell
      // against round 0 and reports a latency wrong by the length of a whole dispute.
      const raw = courtData({
        disputes: [
          rawDispute({
            rounds: [
              { id: "163-0", timeline: ["1", "100", "500", "900"] },
              { id: "163-1", timeline: ["1000", "1100", "1500", "1900"] },
            ],
          }),
        ],
        draws: [
          rawDraw({
            round: { id: "163-1" },
            vote: {
              commited: true,
              voted: true,
              choice: "2",
              justification: { timestamp: "1142", choice: "2" },
            },
          }),
        ],
        commits: [rawCommit({ timestamp: "40" }), rawCommit({ timestamp: "1030" })],
      });

      expect(cellFor(163, "blaise", built(raw))?.commitLatencySeconds).toBe(30);
    });
  });

  describe("the commit cross-check", () => {
    it("finds a log for every draw the subgraph reports as committed", () => {
      // 56 committed draws, 56 CommitCast logs, on the day both were captured. The whole
      // point of the count is that this is the number a truncating endpoint would change.
      expect(built().commitCoverage).toEqual({ read: true, expected: 56, resolved: 56 });
    });

    it("tells a read that has not come back from one that came back empty", () => {
      // The difference between the two is a sentence on a public page. `[]` is a read that
      // found nothing, and the matrix says every commitment went unread; `null` is a read
      // still in flight, and saying that would announce a failure that has not happened — on
      // every cold load, because the chain is slower than the subgraph and the matrix does
      // not wait for it. The resolved count is identical in both, which is the trap.
      const pending = built(courtData({ commits: null }));
      const empty = built(courtData({ commits: [] }));

      expect(pending.commitCoverage).toEqual({ read: false, expected: 56, resolved: 0 });
      expect(empty.commitCoverage).toEqual({ read: true, expected: 56, resolved: 0 });
    });

    it("still builds every other measurement while the commitments are unread", () => {
      const pending = built(courtData({ commits: null }));

      expect(cellFor(163, "blaise", pending)?.revealLatencySeconds).toBe(46);
      expect(cellFor(163, "blaise", pending)?.state).toEqual({ kind: "coherent" });
      expect(cellFor(163, "blaise", pending)?.commitLatencySeconds).toBeNull();
    });

    it("carries the subgraph's own boolean beside the moment, not in place of it", () => {
      // The cell's wording needs both: committed with no moment is a log this dashboard
      // failed to read, and not committed with the window closed is an agent juror that
      // failed to act. One flag cannot say both.
      const raw = courtData({
        disputes: [rawDispute()],
        draws: [
          rawDraw({ vote: { commited: false, voted: false, choice: null, justification: null } }),
        ],
        commits: [],
      });

      expect(cellFor(163, "blaise")?.committed).toBe(true);
      expect(cellFor(163, "blaise", built(raw))?.committed).toBe(false);
    });

    it("counts a committed draw with no log as a shortfall rather than absorbing it", () => {
      const raw = courtData({ disputes: [rawDispute()], draws: [rawDraw()], commits: [] });

      expect(built(raw).commitCoverage).toEqual({ read: true, expected: 1, resolved: 0 });
    });

    it("never lets a missing log become a missed vote", () => {
      // The failure ADR-0004 exists for: a provider that caps `eth_getLogs` returns fewer
      // logs rather than an error, and blaming an agent juror that committed on time is the
      // one outcome that must be impossible.
      const raw = courtData({
        disputes: [rawDispute()],
        draws: [
          rawDraw({ vote: { commited: true, voted: false, choice: null, justification: null } }),
        ],
        commits: [],
      });
      const cell = cellFor(163, "blaise", built(raw));

      expect(cell?.state).toEqual({ kind: "no-vote" });
      expect(built(raw).commitCoverage).toEqual({ read: true, expected: 1, resolved: 0 });
    });

    it("expects nothing of a draw that never committed", () => {
      const raw = courtData({
        disputes: [
          rawDispute({
            period: "commit",
            ruled: false,
            currentRuling: "0",
            rounds: [{ id: "163-0", timeline: ["1787342856", "0", "0", "0"] }],
          }),
        ],
        draws: [
          rawDraw({ vote: { commited: false, voted: false, choice: null, justification: null } }),
        ],
        commits: [],
      });

      expect(built(raw).commitCoverage).toEqual({ read: true, expected: 0, resolved: 0 });
    });

    it("ignores a log for a dispute the payload does not carry", () => {
      // The roster commits in whatever court it is drawn in, and the filter is on the juror
      // rather than on the court. A log with no row is dropped exactly as a draw with no row is.
      const raw = courtData({
        disputes: [rawDispute()],
        draws: [rawDraw()],
        commits: [rawCommit(), rawCommit({ disputeID: "999" })],
      });

      expect(built(raw).commitCoverage).toEqual({ read: true, expected: 1, resolved: 1 });
    });
  });

  describe("what the court paid", () => {
    it("joins each payout to the draw it belongs to", () => {
      // The join is the dispute and the lowercased address, exactly as the commitments join.
      // 007 diverged in dispute 156 and was penalised a whole vote ID's stake — `minStake ×
      // alpha` is 187 PNK — and earned no fee for it. A model that dropped the sign would
      // render that as a reward.
      expect(cellFor(156, "007", built())?.reward).toEqual({
        ethWei: 0n,
        pnkWei: -187_000_000_000_000_000_000n,
        inFeeToken: false,
      });
    });

    it("carries no payout for a draw in a dispute the court has not executed", () => {
      // Disputes 164–166 were in `appeal` when this was captured: every vote in, no ruling,
      // and nothing paid. That is not a failed read and not an empty payout — it is the state
      // every dispute passes through, and the commonest thing a `null` here means.
      expect(cellFor(165, "blaise", built())?.reward).toBeNull();
    });

    it("tells a read that has not come back from one that came back empty", () => {
      // The same trap as the commitments above, and materially worse here, because these two
      // figures are **sums**. A median that cannot be taken renders as a dash; a sum that was
      // never read renders as `0.0000` — a number, in the ink of a measurement, saying six
      // agent jurors earned nothing across sixteen disputes. `read` is the only thing that
      // separates the two states, and `paidDraws` is 0 in both.
      const pending = built(courtData({ rewards: null }));
      const empty = built(courtData({ rewards: [] }));

      expect(pending.rewards).toEqual({
        read: false,
        paidDraws: 0,
        feeTokenDraws: 0,
        // An unstarted read is not a short one, whatever it returned. Without this gate the
        // page would announce a shortfall on every cold load and then retract it.
        short: false,
      });
      // And the empty one *is* short: this fixture's court has ruled thirteen disputes with
      // draws in them, so a read that found no payout for any of them cannot be a whole read. It is the
      // shape a reindexing Goldsky produces, and nothing throws anywhere along the way.
      expect(empty.rewards).toEqual({
        read: true,
        paidDraws: 0,
        feeTokenDraws: 0,
        short: true,
      });
    });

    it("calls a whole read of a court that has paid out exactly that", () => {
      expect(built().rewards).toEqual({
        read: true,
        paidDraws: 44,
        feeTokenDraws: 0,
        short: false,
      });
    });

    it("calls a ruled dispute paid for some of its draws and not others a short read", () => {
      // The one per-dispute test here that a ruled-but-unexecuted dispute cannot trip.
      // `execute()` writes a shift for every drawn juror in one transaction, so a dispute is
      // all-paid or none-paid; partial is only ever a read that lost something.
      const [first, ...rest] = rawRewards;
      if (first === undefined) throw new Error("the captured court has payouts");

      expect(built(courtData({ rewards: rest })).rewards.short).toBe(true);
    });

    it("does not call a court that has simply not executed anything short", () => {
      // The false positive this shape exists to avoid, and the reason there is no
      // `expected`/`resolved` cross-check here. Disputes 164–166 were ruled after the fixture
      // was captured and paid nothing for hours; a check that counted those as missing would
      // put "could not be read" on a page where nothing failed.
      const unruled = built(
        courtData({
          disputes: rawDisputes.filter((dispute) => dispute.ruled === false),
          rewards: [],
        }),
      );

      expect(unruled.rewards).toMatchObject({ read: true, paidDraws: 0, short: false });
    });

    it("still builds every other measurement while the payouts are unread", () => {
      const pending = built(courtData({ rewards: null }));

      expect(cellFor(163, "blaise", pending)?.revealLatencySeconds).toBe(46);
      expect(cellFor(163, "blaise", pending)?.state).toEqual({ kind: "coherent" });
      expect(cellFor(163, "blaise", pending)?.reward).toBeNull();
    });

    it("counts a payout in a fee token so that it can be disclosed rather than dropped", () => {
      // `ethAmount` is what the ETH figure carries, and a shift paid in a registered fee token
      // puts its value somewhere the figure does not reach. Court 34 has a WETH fee token
      // registered and has never paid in it, so nothing in the captured payload exercises
      // this — and an agent juror that reads as having earned less than it did is exactly the
      // failure a public page cannot afford.
      const [first, ...rest] = rewardFixture as RawRewardShift[];
      if (first === undefined) throw new Error("The captured court has payouts");

      const model = built(
        courtData({ rewards: [{ ...first, feeTokenAmount: "1000000000000000000" }, ...rest] }),
      );

      expect(model.rewards.feeTokenDraws).toBe(1);
    });

    it("refuses an amount it cannot believe rather than summing a wrong one", () => {
      // Every rejection in this seam is a payload that would otherwise produce a confident
      // wrong number, and money is where that matters most. A float, an exponent or a leading
      // zero is not a form The Graph emits, and `BigInt("1e18")` throws where `Number("1e18")`
      // would quietly succeed at a thousand times the value.
      for (const amount of ["1e18", "0.5", "01", "", "-0"]) {
        const [first, ...rest] = rewardFixture as RawRewardShift[];
        if (first === undefined) throw new Error("The captured court has payouts");

        const result = buildCourtPerformance(
          courtData({ rewards: [{ ...first, pnkAmount: amount }, ...rest] }),
        );

        expect(result.success).toBe(false);
      }
    });

    it("keeps a negative amount, because a penalty is the point of the figure", () => {
      // The one form that must *not* be rejected. Two of the five drawn agent jurors are net
      // down on this experiment, and a guard that only accepted unsigned decimals would have
      // thrown away every loss the court has recorded.
      const model = built();
      const penalised = model.rows
        .flatMap((row) => row.cells)
        .filter((cell) => cell !== null && (cell.reward?.pnkWei ?? 0n) < 0n);

      expect(penalised.length).toBeGreaterThan(0);
    });
  });

  describe("coherence", () => {
    it("is computed against the dispute's own final ruling", () => {
      // Dispute 154 refused to arbitrate. Three of its four agent jurors voted 0 with it;
      // aletheia voted 1 across both of its vote IDs and is the diverged one.
      expect(cellFor(154, "blaise")?.state).toEqual({ kind: "coherent" });
      expect(cellFor(154, "aletheia")?.state).toEqual({ kind: "diverged" });
      expect(cellFor(154, "aletheia")?.voteCount).toBe(2);
    });

    it("treats a refusal to arbitrate as a ruling an agent juror can be coherent with", () => {
      // Dispute 154 is genuinely currentRuling 0 with ruled true, so a draw that voted 0 is
      // coherent. Testing the ruling for truthiness would mark the whole panel incoherent.
      expect(rowFor(154).dispute.ruling).toEqual({ state: "refused" });
      expect(cellFor(154, "columbo")?.state).toEqual({ kind: "coherent" });
      expect(cellFor(154, "daemonhill")?.state).toEqual({ kind: "coherent" });
    });

    it("asserts nothing about a dispute the court has not ruled on", () => {
      // 164–166 were still in their appeal period: every vote is in, and the ruling is not.
      for (const id of [164, 165, 166]) {
        const drawn = rowFor(id).cells.filter((cell) => cell !== null);

        expect(drawn.length).toBeGreaterThan(0);
        for (const draw of drawn) {
          expect(draw.state).toEqual({ kind: "live", stage: "revealed" });
        }
      }
    });

    it("reads a majority the subgraph reports before the appeal closes as no ruling at all", () => {
      const raw = courtData({
        disputes: [rawDispute({ period: "appeal", ruled: false, currentRuling: "1" })],
        draws: [rawDraw()],
      });

      // The vote says 2 and the subgraph's current ruling says 1, which would read as
      // diverged if the prediction were taken for a ruling.
      expect(cellFor(163, "blaise", built(raw))?.state).toEqual({
        kind: "live",
        stage: "revealed",
      });
    });
  });

  describe("the choice a draw voted", () => {
    it("carries what each draw revealed, for the per-dispute view to name", () => {
      // Dispute 154 refused to arbitrate: three voted 0 with it, aletheia voted 1.
      expect(cellFor(154, "blaise")?.choices).toEqual([0]);
      expect(cellFor(154, "aletheia")?.choices).toEqual([1]);
    });

    it("collapses a draw's several vote IDs into the one choice they voted", () => {
      // aletheia held two vote IDs in dispute 154 and voted them together, which is what the
      // classic kit's one-transaction reveal makes the ordinary case.
      expect(cellFor(154, "aletheia")?.voteCount).toBe(2);
      expect(cellFor(154, "aletheia")?.choices).toEqual([1]);
    });

    it("keeps both where a draw's vote IDs disagree, rather than reporting the first", () => {
      // Never seen in this court, and the reason the field is a list: a column printing
      // "Choice 2" over a draw that voted 1 and 2 would state something that did not happen.
      // The draw has not voted the ruling either way, whatever the ruling turns out to be.
      const raw = courtData({
        disputes: [rawDispute({ period: "execution", ruled: true, currentRuling: "2" })],
        draws: [
          rawDraw({
            id: "163-0-0",
            vote: {
              commited: true,
              voted: true,
              choice: "1",
              justification: { timestamp: "1787343444", choice: "1" },
            },
          }),
          rawDraw({ id: "163-0-1" }),
        ],
      });

      expect(cellFor(163, "blaise", built(raw))?.choices).toEqual([1, 2]);
      expect(cellFor(163, "blaise", built(raw))?.state).toEqual({ kind: "diverged" });
    });

    it("says nothing about a draw that has not revealed", () => {
      // Empty and not `[0]`: choice 0 is a real choice, and defaulting to it would report
      // every awaiting draw as having refused to arbitrate.
      const raw = courtData({
        disputes: [
          rawDispute({
            period: "commit",
            ruled: false,
            currentRuling: "0",
            // `0` in a timeline is a period that has not opened, not midnight in 1970. The
            // helper's default has all four filled, which is a dispute that finished.
            rounds: [{ id: "163-0", timeline: ["1787342856", "0", "0", "0"] }],
          }),
        ],
        draws: [
          rawDraw({
            vote: { commited: false, voted: false, choice: null, justification: null },
          }),
        ],
      });

      const draw = cellFor(163, "blaise", built(raw));
      expect(draw?.state).toEqual({ kind: "live", stage: "awaiting" });
      expect(draw?.choices).toEqual([]);
    });
  });

  describe("the states a draw can be in", () => {
    it("reports a draw whose vote period closed with nothing revealed as a missed vote", () => {
      const raw = courtData({
        disputes: [rawDispute()],
        draws: [
          rawDraw({ vote: { commited: true, voted: false, choice: null, justification: null } }),
        ],
      });
      const cell = cellFor(163, "blaise", built(raw));

      expect(cell?.state).toEqual({ kind: "no-vote" });
      expect(cell?.revealLatencySeconds).toBeNull();
    });

    it("reports a draw that has committed inside an open vote period as still acting", () => {
      const raw = courtData({
        disputes: [
          rawDispute({
            period: "vote",
            ruled: false,
            currentRuling: "0",
            rounds: [{ id: "163-0", timeline: ["1787342856", "1787343398", "0", "0"] }],
          }),
        ],
        draws: [
          rawDraw({ vote: { commited: true, voted: false, choice: null, justification: null } }),
        ],
      });

      expect(cellFor(163, "blaise", built(raw))?.state).toEqual({
        kind: "live",
        stage: "committed",
      });
    });

    it("reports a draw that has done nothing yet as awaiting, not as a missed vote", () => {
      const raw = courtData({
        disputes: [
          rawDispute({
            period: "commit",
            ruled: false,
            currentRuling: "0",
            rounds: [{ id: "163-0", timeline: ["1787342856", "0", "0", "0"] }],
          }),
        ],
        draws: [
          rawDraw({ vote: { commited: false, voted: false, choice: null, justification: null } }),
        ],
      });

      expect(cellFor(163, "blaise", built(raw))?.state).toEqual({
        kind: "live",
        stage: "awaiting",
      });
    });

    it("reports a draw the subgraph has no vote entity for as awaiting", () => {
      const raw = courtData({
        disputes: [
          rawDispute({
            period: "commit",
            ruled: false,
            currentRuling: "0",
            rounds: [{ id: "163-0", timeline: ["1787342856", "0", "0", "0"] }],
          }),
        ],
        draws: [rawDraw({ vote: null })],
      });

      expect(cellFor(163, "blaise", built(raw))?.state).toEqual({
        kind: "live",
        stage: "awaiting",
      });
    });
  });

  describe("a payload it cannot believe", () => {
    it("fails rather than reporting a reveal that predates the vote period", () => {
      const raw = courtData({
        disputes: [rawDispute()],
        draws: [
          rawDraw({
            vote: {
              commited: true,
              voted: true,
              choice: "2",
              justification: { timestamp: "1787342000", choice: "2" },
            },
          }),
        ],
      });
      const result = buildCourtPerformance(raw);

      expect(result.success).toBe(false);
    });

    it("fails rather than guessing the choice of a draw that revealed without one", () => {
      const raw = courtData({
        disputes: [rawDispute()],
        draws: [
          rawDraw({ vote: { commited: true, voted: true, choice: null, justification: null } }),
        ],
      });

      expect(buildCourtPerformance(raw).success).toBe(false);
    });

    it("fails rather than dropping a draw whose round the dispute does not hold", () => {
      const raw = courtData({
        disputes: [rawDispute()],
        draws: [rawDraw({ round: { id: "163-3" } })],
      });

      expect(buildCourtPerformance(raw).success).toBe(false);
    });

    it("names what it could not read, so the failure can be reported rather than absorbed", () => {
      const raw = courtData({
        disputes: [rawDispute()],
        draws: [rawDraw({ round: { id: "163-3" } })],
      });
      const result = buildCourtPerformance(raw);

      if (result.success) throw new Error("expected a failure");
      expect(result.code).toBe("MALFORMED_COURT_DATA");
      expect(result.message).toContain("163-0-0");
    });
  });

  describe("what it leaves out", () => {
    it("ignores a draw for a dispute the payload does not carry", () => {
      // The two reads are separate requests: a dispute created between them arrives with
      // draws and no row. Dropping it shows one dispute late, which the next read fixes;
      // failing would blank a matrix that is otherwise entirely readable.
      const raw = courtData({
        disputes: [rawDispute()],
        draws: [rawDraw(), rawDraw({ id: "999-0-0", dispute: { disputeID: "999" } })],
      });

      expect(built(raw).rows).toHaveLength(1);
    });

    it("gives a drawn address outside the roster no column, and still counts it in the panel", () => {
      // The roster is the only place agent jurors are enumerated and it is the column set, so
      // an address outside it gets no cell. It was still on the panel, and panel size is a fact
      // about the court: counting it in roster matches would let one non-agent juror turn a
      // panel of two into this page's claim that the dispute was "decided by a panel of one".
      const stranger: RawDraw = rawDraw({
        id: "163-0-9",
        juror: { id: "0x1111111111111111111111111111111111111111" },
      });
      const raw = courtData({ disputes: [rawDispute()], draws: [rawDraw(), stranger] });
      const row = rowFor(163, built(raw));

      expect(row.panelSize).toBe(2);
      expect(row.cells.filter((cell) => cell !== null)).toHaveLength(1);
    });

    it("keys the roster on address rather than on the case the subgraph returns", () => {
      const shouting: AgentJuror[] = ROSTER.map((agentJuror) => ({
        ...agentJuror,
        address: agentJuror.address.toUpperCase() as AgentJuror["address"],
      }));

      expect(rowFor(163, built(courtData({ roster: shouting }))).panelSize).toBe(5);
    });
  });

  describe("the windows each dispute ran under", () => {
    it("resolves dispute 151 to the eight-hour commit window and 152 onward to 45 minutes", () => {
      // The court's whole parameter history, against the court's own captured disputes. This
      // is the trap `CLAUDE.md` names first, in the one place it could still be made: reading
      // the current 45 minutes back over dispute 151 would be wrong by a factor of ten.
      expect(rowFor(151).windows).toEqual({
        evidenceSeconds: 43_200,
        commitSeconds: 28_800,
        voteSeconds: 28_800,
        appealSeconds: 129_600,
      });

      expect(rowFor(152).windows).toEqual({
        evidenceSeconds: 2_700,
        commitSeconds: 2_700,
        voteSeconds: 1_800,
        appealSeconds: 129_600,
      });
    });

    it("marks dispute 151 and nothing else", () => {
      const marked = built()
        .rows.filter((row) => row.underEarlierWindows)
        .map((row) => row.dispute.id);

      expect(marked).toEqual([151]);
    });

    it("carries the court's history and what it holds now", () => {
      const { parameters } = built();

      expect(parameters.read).toBe(true);
      expect(parameters.regimes).toHaveLength(2);
      expect(parameters.current?.commitSeconds).toBe(2_700);
    });

    it("marks nothing at all while the history has not been read", () => {
      // Every cold load, and the distinction that matters: not knowing which disputes ran
      // under different rules is not the same as knowing that none did. An unread history
      // resolves no window and marks no row, and `read` is what says which of those it is.
      const unread = built(courtData({ parameters: null }));

      expect(unread.parameters.read).toBe(false);
      expect(unread.parameters.current).toBeNull();
      expect(unread.rows.every((row) => row.windows === null)).toBe(true);
      expect(unread.rows.some((row) => row.underEarlierWindows)).toBe(false);
    });

    it("marks nothing when a read comes back empty, and says the read happened", () => {
      // `[]` and `null` are different states with the same consequence for the marker, and
      // only `read` tells them apart. A court that has plainly been configured at least once
      // returning no history is a read that came back short, which ticket 13's banner needs.
      const empty = built(courtData({ parameters: [] }));

      expect(empty.parameters.read).toBe(true);
      expect(empty.parameters.regimes).toEqual([]);
      expect(empty.rows.every((row) => !row.underEarlierWindows)).toBe(true);
    });

    it("refuses a history it cannot read rather than measuring against a fabricated window", () => {
      const result = buildCourtPerformance(
        courtData({ parameters: [{ at: "not-a-moment", timesPerPeriod: ["1", "2", "3", "4"] }] }),
      );

      expect(result.success).toBe(false);
    });

    it("marks a dispute whose commit window changed, and not one whose evidence window did", () => {
      // The marker is about comparability: nothing on this page is measured from the evidence
      // period, so a court that changed only that would mark every older dispute for a
      // difference no figure reflects. A marker with no visible cause teaches a reader to
      // ignore markers.
      const evidenceOnly = built(
        courtData({
          disputes: [rawDispute()],
          draws: [rawDraw()],
          parameters: [
            { at: "1000", timesPerPeriod: ["43200", "2700", "1800", "129600"] },
            { at: "1787342000", timesPerPeriod: ["600", "2700", "1800", "129600"] },
          ],
        }),
      );

      expect(evidenceOnly.rows[0]?.underEarlierWindows).toBe(false);
    });
  });

  describe("a row the draw read could not have seen", () => {
    /**
     * The drift `CLAUDE.md` records, at the level of one row.
     *
     * The disputes and the draws are two queries, and react-query keeps the draws it already
     * holds when a refetch fails. A dispute created after that read then joins a fresh list to
     * draws that could not have mentioned it, and arrives with no cells — which this design
     * otherwise defines as "not drawn", a positive claim about a court nobody asked.
     *
     * No fixture can produce it: every one of them is a single successful read, and a payload
     * captured in one moment cannot hold a dispute that post-dates it. Both halves are built by
     * hand here — the newcomer with no draws, and the moment the draws were read.
     */
    const READ_AT_163 = 1787340123 * 1000;

    /** A dispute created after the draw read, with no draws anywhere in the payload. */
    const newcomer = rawDispute({
      id: "170",
      disputeID: "170",
      period: "evidence",
      ruled: false,
      currentRuling: "0",
      createdAt: String(READ_AT_163 / 1000 + 600),
      rounds: [{ id: "170-0", timeline: ["0", "0", "0", "0"] }],
    });

    const drifted = () =>
      built(courtData({ disputes: [newcomer, rawDispute()], drawsReadAt: READ_AT_163 }));

    it("reads every row when the caller cannot say when the draws were read", () => {
      // Which is every fixture, and the reason nothing else in this suite had to change: one
      // captured payload is one moment, and a dispute cannot post-date the read that returned it.
      expect(built(courtData({ drawsReadAt: null })).rows.every((row) => row.read)).toBe(true);
    });

    it("marks a dispute with no draws that post-dates the read as unread, not as undrawn", () => {
      expect(rowFor(170, drifted()).read).toBe(false);
      expect(rowFor(163, drifted()).read).toBe(true);
    });

    it("believes the payload over the moment when the two disagree", () => {
      // The draws mention dispute 163, so the read plainly saw it however the timestamps
      // compare. Anything else would let a skewed clock or an approximate read moment blank
      // measurements that are actually in hand — losing true figures to protect against a
      // claim that the payload itself already refutes.
      const early = built(courtData({ disputes: [rawDispute()], drawsReadAt: 1 }));

      expect(rowFor(163, early).read).toBe(true);
    });

    it("counts the boundary second as read, so a healthy load flags nothing", () => {
      // The two queries go out together, so a dispute created in the same second as the read
      // that returned it is what a healthy cold load looks like. Treating the boundary as unread
      // would put a rose row on the newest dispute of every page load.
      const born = { ...newcomer, createdAt: String(READ_AT_163 / 1000) };
      const model = built(courtData({ disputes: [born, rawDispute()], drawsReadAt: READ_AT_163 }));

      expect(rowFor(170, model).read).toBe(true);
    });

    it("keeps an unread dispute out of every total rather than counting it as zero", () => {
      const model = drifted();

      expect(model.totals.unreadDisputes).toEqual([170]);
      // The dispute count is unchanged: dispute 170 *was* read, it is its draws that were not,
      // and reporting a smaller court would be a second untruth on top of the first.
      expect(model.totals.disputes).toBe(2);
      expect(model.totals.draws).toBe(rowFor(163, model).cells.filter((c) => c !== null).length);
    });

    it("never calls an unread row a panel of one", () => {
      // Its panel size is 0 because nobody asked, not because the court drew one juror — and the
      // lone-panel list is the one aggregate where that gap would become a published claim about
      // coherence being tautological.
      const model = drifted();

      expect(rowFor(170, model).panelSize).toBe(0);
      expect(model.totals.lonePanelDisputes).not.toContain(170);
    });
  });
});
