import { type Dispute, type DisputeRound, type RawDispute, toDisputes } from "../disputes/disputes";
import { isFinalised } from "../disputes/liveness";
import type { AgentJuror } from "../roster/agent-jurors";
import {
  type AgentJurorMarginals,
  agentJurorMarginalsOf,
  type CourtTotals,
  courtTotalsOf,
} from "./totals";
import {
  type ParameterRegime,
  type PeriodWindows,
  type RawCourtParameters,
  sameMeasuredWindows,
  toRegimes,
  windowsFor,
} from "./windows";

/**
 * The seam.
 *
 * `buildCourtPerformance` is the one function that turns everything fetched into everything
 * rendered. Above it: React, ENS, routing. Below it: every request. It touches no network and
 * reads no clock, which is what lets the whole of this dashboard's arithmetic be tested against
 * a captured payload with no mock anywhere — and what makes ADR-0003's eventual move of this
 * logic into agentkit mechanical rather than a rewrite.
 *
 * "No clock" is a real constraint and not a stylistic one. A draw's state is read from what the
 * chain recorded — whether the vote period has opened, whether a reveal exists — never from
 * comparing a deadline against `Date.now()`. A page that decided a juror had missed its window
 * by consulting the browser's clock would say different things in different timezones, and
 * would say them about an experiment whose court changed its period durations midway through.
 */

/**
 * agentkit's result envelope, restated rather than imported.
 *
 * agentkit is not a dependency here and only partly browser-safe if it were — `config-source`,
 * `sdk-lock`, `rate-limit` and `report-issue` are Node-only, and `getSubgraphUrl` reads
 * `process.env`. The shape is copied verbatim from its `core/types.ts` so that ADR-0003's
 * promotion into a `kleros juror performance` command is a move, not a translation.
 */
export type KlerosResult<T> =
  | { success: true; data: T }
  | { success: false; code: string; message: string; details: Record<string, unknown> };

/** One `ClassicVote`, as the core subgraph returns it. See ADR-0004 on what is missing. */
export type RawVote = {
  /** Whether a commitment was recorded. A boolean, never a moment — the timestamp is in the logs. */
  commited: boolean;
  voted: boolean;
  /** The choice voted for, once revealed. BigInt-as-string. */
  choice: string | null;
  /**
   * One per draw, not one per vote ID, and the only place the reveal's moment exists: the
   * core subgraph carries no timestamp on the vote itself.
   */
  justification: { timestamp: string; choice: string } | null;
};

/**
 * One drawn vote ID, as the core subgraph returns it — exactly the selection in
 * `draws-subgraph.ts`, no more.
 *
 * The subgraph's `Draw` is per vote ID. This dashboard's draw is per agent juror per dispute
 * (`CONTEXT.md`), so several of these collapse into one cell.
 */
export type RawDraw = {
  /** `"<disputeID>-<round>-<voteID>"`. Used to deduplicate, never to order. */
  id: string;
  juror: { id: string };
  dispute: { disputeID: string };
  round: { id: string };
  vote: RawVote | null;
};

/**
 * One `CommitCast` log, reduced to the three things a latency needs.
 *
 * The only value in this model that does not come from a subgraph: `ClassicVote.commited` is a
 * boolean and nothing in the schema records when a commitment was published, so the moment is
 * the timestamp of the block the log sits in (ADR-0004). Strings, like every other raw shape
 * here, so the seam validates them itself and a captured payload stays plain JSON.
 *
 * There is no round on the event. An agent juror drawn twice in one dispute has two of these
 * under one dispute-and-juror key, which is why `commitAt` selects by round rather than
 * looking one up.
 */
export type RawCommitCast = {
  disputeID: string;
  /** Checksummed, as the chain returns it — never as The Graph lowercases it. */
  juror: string;
  /** Unix seconds, from the block the commitment was mined in. */
  timestamp: string;
};

/**
 * One reward or penalty the court paid out, as `TokenAndETHShift` records it.
 *
 * Written when the court **executes** a dispute, which is a later and separate transaction from
 * ruling it: a dispute can be `ruled` with no shift yet, and the two figures built from these
 * are therefore always "what has been paid out so far" rather than "what every ruled draw came
 * to". That lag is stated in the provenance footer rather than being counted as a shortfall —
 * an absence with a legitimate cause is not a read that failed.
 *
 * One shift per juror per dispute **per round**, so a dispute that goes to appeal produces
 * several for one agent juror. `rewardsByDraw` sums them rather than picking the current
 * round's, because what these figures are is cumulative: the matrix cell shows the latest round
 * and the earnings are every round's.
 *
 * Amounts are decimal strings, signed — a penalty is a negative `pnkAmount`. They are parsed to
 * `bigint` and never to `number`: a penalty in this court is 1.87e20 wei, four orders of
 * magnitude past `Number.MAX_SAFE_INTEGER`. See `rewards.ts`.
 */
export type RawRewardShift = {
  /** `"<juror>-<disputeID>-<round>"`, lowercase. The paging cursor and nothing else. */
  id: string;
  /** Lowercased, as The Graph stores it — never as the chain checksums it. */
  juror: { id: string };
  dispute: { disputeID: string };
  /** Signed: negative where the draw was penalised for diverging or for not revealing. */
  pnkAmount: string;
  /** The arbitration fee share, in wei. Native ETH in this court — see `rewards-subgraph.ts`. */
  ethAmount: string;
  /**
   * Value paid in a registered fee token rather than natively, in that token's own units.
   *
   * `"0"` throughout court 34's life. Read only so that a non-zero one can be disclosed instead
   * of dropped: it is value an agent juror earned that the ETH figure does not carry. Court 34
   * has a WETH fee token registered and unused, so this is a live possibility rather than a
   * hypothetical one.
   */
  feeTokenAmount: string;
};

/**
 * Everything fetched, in one value.
 *
 * Tickets 06, 10 and 12 add fields here rather than a second seam beside this one, exactly as
 * tickets 07 and 08 added `commits` and `parameters`.
 */
export type RawCourtData = {
  disputes: readonly RawDispute[];
  draws: readonly RawDraw[];
  /**
   * Every commitment the roster has published, from the logs — or `null` where that read has
   * not come back yet. See `RawCommitCast`.
   *
   * `null` and `[]` are emphatically not the same thing, which is why this is nullable rather
   * than defaulted. `[]` is a read that returned nothing, and the page says so in the loudest
   * terms it has. `null` is a read still in flight, and saying that would be announcing a
   * failure that has not happened — on every cold load, because the chain is slower than the
   * subgraph and the matrix deliberately does not wait for it.
   */
  commits: readonly RawCommitCast[] | null;
  /**
   * Every configuration the court has held, from `CourtCreated` and `CourtModified` — or
   * `null` where that read has not come back yet. See `windows.ts`.
   *
   * `null` and `[]` are different for the same reason they are on `commits`, and the
   * consequence here is quieter: an unread history leaves every row's windows unresolved and
   * nothing marked, which is a page saying less than it knows rather than one saying something
   * false. What it must never become is the court's *current* `timesPerPeriod` used as though
   * it had always held — the read exists precisely to make that impossible.
   */
  parameters: readonly RawCourtParameters[] | null;
  /**
   * Every reward and penalty the court has paid out, from the core subgraph — or `null` where
   * that read has not come back yet. See `RawRewardShift`.
   *
   * `null` and `[]` are different here in the way that matters most on this page, because the
   * figures built from these are **sums**. An empty read makes every column read `0.0000`, which
   * is a statement that six agent jurors earned nothing across sixteen disputes — where a median
   * that cannot be taken at least renders as a dash. A sum has no natural way to say "unknown",
   * so the distinction has to be carried here and gated in the view.
   */
  rewards: readonly RawRewardShift[] | null;
  /** The column set, and the only place all six agent jurors appear. */
  roster: readonly AgentJuror[];
  /**
   * When `draws` was read, in epoch milliseconds, or `null` where the caller cannot say.
   *
   * The one input here that is about a *read* rather than about the court, and it is load-bearing
   * for exactly one thing: telling a row whose draws were read from a row whose draws were never
   * asked for. The disputes and the draws are two queries, react-query keeps what it already
   * holds when a refetch fails, and a dispute created after the last successful draw read
   * therefore joins a fresh list to draws that could not have mentioned it. Its cells come back
   * empty — which this design defines as "not drawn", a positive claim about a court nobody read.
   * Comparing the dispute's own `createdAt` against this moment is what keeps that claim honest.
   *
   * Not a clock read: the moment arrives as data, the same way the commit timestamps do. The
   * seam still consults no clock of its own, and a fixture that supplies `null` gets exactly
   * today's behaviour — every row read — which is true of a fixture, because it is one payload.
   */
  drawsReadAt: number | null;
};

/**
 * How far a draw has got while its dispute is still running.
 *
 * The design words the live family once in the legend and words the stage inside the cell,
 * so a reader can tell a draw that has done nothing from one that has committed. `revealed`
 * is the third stage: the vote is in and the ruling is not, which is where disputes 164–166
 * sat when this was built. Coherence cannot be asserted there — a round majority before the
 * appeal period closes is a prediction, not a ruling (`CONTEXT.md`).
 */
export type LiveStage = "awaiting" | "committed" | "revealed";

/**
 * What one cell says, before it is a glyph, a word or a colour.
 *
 * Not drawn is deliberately absent: it is the *absence* of a draw, carried as a `null` cell.
 * Conflating it with `no-vote` is the one confusion the design exists to prevent, and a state
 * enum that held both would invite exactly that.
 */
export type DrawState =
  | { kind: "coherent" }
  | { kind: "diverged" }
  | { kind: "no-vote" }
  | { kind: "live"; stage: LiveStage };

/**
 * What one draw has been paid, net, across every round of its dispute.
 *
 * Held in wei as `bigint` because a PNK penalty in this court is 1.87e20 — see `rewards.ts` on
 * why a `number` is wrong here before anything is rounded. Nothing in this seam formats one;
 * `rewards.ts` is the only place wei becomes words.
 */
export type DrawReward = {
  /** The arbitration fee share, in wei. Zero for a draw that diverged or never revealed. */
  ethWei: bigint;
  /** Net PNK in wei — **negative** where the draw was penalised. */
  pnkWei: bigint;
  /**
   * Whether any part of this was paid in a registered fee token instead, which `ethWei` does
   * not carry. False throughout court 34's life; disclosed rather than dropped if it changes.
   */
  inFeeToken: boolean;
};

/** One agent juror's involvement in one dispute: one cell of the matrix. */
export type Draw = {
  agentJuror: AgentJuror;
  state: DrawState;
  /**
   * Seconds from the moment the vote period opened to the moment the reveal was recorded,
   * per ADR-0001. `null` where it is not known: nothing was revealed, or a reveal exists
   * with no justification to date it. Never a fraction of a window — ADR-0005.
   */
  revealLatencySeconds: number | null;
  /**
   * Seconds from the moment the commit period opened to the moment the commitment was mined,
   * per ADR-0001 and on the same scale as the reveal. `null` where no log matched this draw's
   * round — which is either a draw that has not committed, or the shortfall `commitCoverage`
   * counts. Never a fraction of a window, and never negative — ADR-0005.
   */
  commitLatencySeconds: number | null;
  /**
   * Whether the subgraph recorded a commitment, whatever the log scan found.
   *
   * Kept beside the latency because the cell's wording turns on the difference the two of them
   * make together: committed with no moment is a *log* this dashboard failed to read, and not
   * committed with the window closed is an agent juror that failed to act. Collapsing them
   * would put "Missed" under a commitment that happened.
   */
  committed: boolean;
  /** How many vote IDs this one draw holds. `1` for most of them. */
  voteCount: number;
  /**
   * Every distinct choice this draw's vote IDs revealed, ascending. Empty until it reveals.
   *
   * A list and not a number, because the model has always had to reckon with a draw whose vote
   * IDs disagree — `choicesOf` computes exactly this to decide coherence, and collapsing it to
   * one value here would make the cell claim a choice the draw did not make. It has never
   * happened in this court and the classic kit's one-transaction reveal makes it unlikely; a
   * per-dispute column that printed "Choice 2" over a draw that voted 1 and 2 would be the
   * kind of quiet falsehood this seam exists to prevent.
   *
   * Read by ticket 09's panel columns. The matrix cell does not show it: coherence against the
   * ruling is what a matrix row is scanned for, and the choice itself is detail for one dispute.
   */
  choices: readonly number[];
  /**
   * What this draw was paid, or `null` where the court has paid nothing for it *yet*.
   *
   * Three things produce that `null` and only one of them is an absence of money: the reward
   * read has not come back, the court has ruled the dispute but not executed it, or the dispute
   * is still being decided. None is a failed read and none may render as a zero on its own —
   * `CourtPerformance.rewards.read` is the flag that tells the first from the other two, and it
   * is the fourth of the "has the read happened" gates `CLAUDE.md` records.
   *
   * Summed across rounds, so an appealed dispute's several shifts arrive here as one figure.
   * The cell shows the current round and this shows every round, which is what makes it
   * cumulative rather than a snapshot of the round on screen.
   */
  reward: DrawReward | null;
};

export type MatrixRow = {
  dispute: Dispute;
  /**
   * Everyone the court drew for this dispute, however many vote IDs each holds — not the number
   * of cells in the row. Coherence cannot be read without it, and it is a fact about the panel
   * rather than about the roster: a juror outside the roster gets no column, and still counts
   * here, because "decided by a panel of one" is a claim about the court.
   */
  panelSize: number;
  /** One entry per agent juror, in roster order. `null` means not drawn, which is the common case. */
  cells: readonly (Draw | null)[];
  /**
   * The period durations that were in force while this dispute ran, resolved period by period
   * from the court's own parameter history. `null` until that history has been read.
   *
   * Present so the window can be shown *beside* a latency as an absolute duration. Nothing may
   * divide one by the other — ADR-0005 — and this is the field that would make it easy to.
   */
  windows: PeriodWindows | null;
  /**
   * Whether this dispute's commit and vote windows differ from the ones the court holds now.
   *
   * The † marker. It is a fact about comparability rather than about the dispute: the figures
   * in this row were measured against different windows from the rows above it, so a reader
   * scanning the column is not comparing like with like. False while the history is unread —
   * an unknown is not a denial, and the provenance footer says which it is.
   */
  underEarlierWindows: boolean;
  /**
   * Whether the draw read this row was built from could have seen this dispute at all.
   *
   * False is not an error and not an empty panel: it is the absence of a read. The row's cells
   * are all `null` in that state and mean nothing — "not drawn" would be a claim about a court
   * nobody asked, so the matrix renders the whole row as Unknown instead (ticket 13, ADR-0006).
   * `panelSize` is `0` there for the same reason and must not be printed.
   *
   * Every row is read whenever `drawsReadAt` is `null`, which is every fixture: one captured
   * payload is one moment, and a dispute cannot post-date the read that returned it.
   */
  read: boolean;
};

/**
 * Whether the commit half of the speed dimension was read whole.
 *
 * A count and not an error, because the failure it exists for throws nothing: an endpoint that
 * caps `eth_getLogs` answers with fewer logs and no complaint, and every draw it dropped then
 * renders as a commitment that never happened (ADR-0004). Comparing what came back against the
 * known set — every draw the subgraph reports as committed — turns that silence into a number,
 * the same shape ticket 04 uses for dispute titles that did not resolve.
 *
 * It is deliberately not a reason to fail: reveal latency and coherence are read from the
 * subgraph and are unaffected by an Arbitrum outage, so a matrix that blanked itself over a
 * missing commitment would hide sixteen rows of measurements that are perfectly true. Ticket 13
 * lifts this count into the blocking banner it deserves.
 */
export type CommitCoverage = {
  /**
   * Whether the log read has happened at all.
   *
   * False means the answer is not in yet, and nothing may be concluded from `resolved` — least
   * of all out loud. A shortfall is only a shortfall once there is a read to have fallen short.
   */
  read: boolean;
  /** Draws the subgraph reports as committed — what a whole read would account for. */
  expected: number;
  /** How many of those a log was found for. Equal to `expected` when the scan was whole. */
  resolved: number;
};

/**
 * What the court configured, and when.
 *
 * Carried on the model rather than looked up by whatever needs it, so the marker on a row, the
 * footnote under the matrix and the account on the method page are three readings of one
 * history instead of three chances to quote a different one.
 */
export type CourtParameters = {
  /**
   * Whether the parameter history has been read at all.
   *
   * False means the answer is not in yet, and nothing may be concluded from `regimes` — least
   * of all that the court has always been configured the way it is now.
   */
  read: boolean;
  /** Every configuration the court has held, oldest first. Empty until read. */
  regimes: readonly ParameterRegime[];
  /** What the court holds now — the windows an unmarked row ran under. `null` until read. */
  current: PeriodWindows | null;
};

/**
 * Whether the court's payouts were read, and what the figures built from them cover.
 *
 * Deliberately **not** the shape `CommitCoverage` has, and the difference is the point. That one
 * compares a read against a known set — every draw the subgraph says committed — because a log
 * scan that comes back short is indistinguishable from a court that never committed. This one
 * has no such set to compare against: a draw with no shift is most often a dispute the court has
 * ruled and not yet executed, which is an ordinary state lasting hours. Counting those as a
 * shortfall would put "could not be read" on a page where nothing failed — the false caveat
 * `CLAUDE.md` warns about four times over, and a reader who checks one and finds it baseless
 * stops checking.
 *
 * So this counts what *was* paid rather than what is missing, and the view says what the figure
 * covers rather than what it fell short of.
 */
export type RewardCoverage = {
  /**
   * Whether the reward read has happened at all.
   *
   * False means the answer is not in yet, and nothing may be concluded from the sums — least of
   * all a zero, which on this measure is the whole risk. Every other figure on this page
   * degrades to a dash when it cannot be taken; a sum degrades to `0.0000`, which reads as a
   * measurement.
   */
  read: boolean;
  /** Draws the court has paid out at all — what the two figures are summed over. */
  paidDraws: number;
  /**
   * Draws paid wholly or partly in a fee token, whose value no ETH figure here carries.
   *
   * `0` throughout, and the footer says so only when it is not: an agent juror that earned
   * something this page cannot express must not read as one that earned less.
   */
  feeTokenDraws: number;
  /**
   * Whether what came back cannot be a whole read of the court's payouts.
   *
   * The guard a **sum** needs and a count does not. A reindexing Goldsky answers HTTP 200 with
   * `[]` and a lagging one returns some of what it holds — neither throws, and both leave
   * `read: true` (`docs/knowledge/chain-and-subgraph.md`). Every column would then print `0.0000` and `0.00` in the
   * ink of a measurement: a public statement that six named agent jurors have earned nothing.
   *
   * Two tests, and both are deliberately **all-or-nothing** rather than the per-draw
   * `expected`/`resolved` cross-check `CommitCoverage` runs. That shape is unusable here,
   * because a dispute the court has ruled and not yet executed legitimately has no payout, and
   * a check counting those as missing would cry shortfall over an ordinary state lasting hours:
   *
   * - **No payout at all, for a court that has draws in disputes it has ruled.** The same shape
   *   as an empty parameter history for a court that has plainly been configured.
   * - **A ruled dispute where some draws were paid and others were not.** `execute()` writes a
   *   shift for every drawn juror in one transaction, so a dispute is all-paid or none-paid;
   *   partial is only ever a read that came back short. This is the per-dispute test that has
   *   no false positive, which is why it is the one that is made.
   *
   * It does not catch a read that lost whole disputes off the end — nothing here could, without
   * knowing what the court has executed. `totals.test.ts` pins the arithmetic that would
   * (`feeForJuror` × the vote-ID count), and this is the half that can be checked at runtime.
   */
  short: boolean;
};

export type CourtPerformance = {
  /** The matrix columns, in roster order. Nothing may read rank into it. */
  agentJurors: readonly AgentJuror[];
  /** The matrix rows, newest dispute first. */
  rows: readonly MatrixRow[];
  /**
   * What the rows amount to court-wide: the stat tiles' figures and the latency distribution.
   *
   * Computed here rather than reduced in a view, so the tiles above the matrix and the matrix
   * itself are two readings of one model. See `totals.ts`.
   *
   * Reveal latency only, and named so on `CourtTotals` itself: the rows carry a commit latency
   * too, and an aggregate that silently averaged both would be the fraction-of-a-window mistake
   * in another form. The commit median is per agent juror, on `marginals` below — a column of
   * one agent juror's draws is a set the median describes, where the court's whole commit
   * distribution pooled across two commit windows is one the reader cannot use.
   */
  totals: CourtTotals;
  /**
   * The same rows sliced down each column: one summary per agent juror, in roster order.
   *
   * Beside `totals` rather than inside it because the two are different shapes of the same
   * reduction — one number per court against one row per agent juror — and a marginal is not a
   * field of a court-wide total. Both are computed here for the same reason: a column header
   * that reduced the rows while rendering would be a second definition of "how many draws".
   */
  marginals: readonly AgentJurorMarginals[];
  /** Whether every commitment the subgraph knows of was found on chain. */
  commitCoverage: CommitCoverage;
  /** The court's own parameter history, and what it holds now. */
  parameters: CourtParameters;
  /** Whether the court's payouts were read, and what the column headers' two sums cover. */
  rewards: RewardCoverage;
};

/** The one failure code this seam returns. Everything it rejects is a payload it cannot believe. */
const MALFORMED = "MALFORMED_COURT_DATA";

/** Same canonical-decimal guard the dispute model uses, and for the same reason. */
const CANONICAL_DECIMAL = /^(0|[1-9]\d*)$/;

function toNumber(value: string, what: string): number {
  if (!CANONICAL_DECIMAL.test(value)) {
    throw new Error(`${what}: ${JSON.stringify(value)}`);
  }
  return Number(value);
}

/**
 * The same guard, signed, for an amount of money.
 *
 * Signed because a penalty is a negative `pnkAmount` and rejecting it would throw away every
 * loss this court has recorded — two of the five drawn agent jurors are net negative. `"-0"` is
 * refused along with `"01"` and `"1e18"`: it is not a form The Graph emits, and a payload
 * inventing one is a payload this seam has no reason to believe.
 */
const CANONICAL_SIGNED_DECIMAL = /^-?(0|[1-9]\d*)$/;

/**
 * An amount in wei, as `bigint` and never as `number`.
 *
 * `Number("187000000000000000000")` is finite, looks right and is already wrong — it is past
 * `Number.MAX_SAFE_INTEGER` by four orders of magnitude, so the low digits are gone before any
 * sum is taken. The whole reason these figures are held in `bigint` end to end is that the loss
 * would be invisible: no throw, no `NaN`, just a total that is not the total. See `rewards.ts`.
 */
function toWei(value: string, what: string): bigint {
  if (!CANONICAL_SIGNED_DECIMAL.test(value) || value === "-0") {
    throw new Error(`${what}: ${JSON.stringify(value)}`);
  }
  return BigInt(value);
}

/**
 * Round ids are `"<disputeID>-<n>"`, and the index is read from the suffix.
 *
 * Costless while every dispute in this court has one round, and the difference between
 * measuring a latency against the right round and against whichever one sorted first the day
 * a dispute is appealed.
 */
function roundIndexOf(id: string): number {
  return toNumber(id.slice(id.lastIndexOf("-") + 1), `Draw sits in a round with an unreadable id`);
}

type DrawGroup = {
  agentJuror: AgentJuror;
  /** The earliest round this agent juror was drawn in for the dispute — see `groupDraws`. */
  round: DisputeRound;
  votes: RawVote[];
  voteCount: number;
  /** For the failure message: which draw could not be read. */
  id: string;
};

/**
 * Every distinct choice a draw's vote IDs revealed.
 *
 * The justification is preferred because it is one per draw and carries the choice the agent
 * juror published; the vote entities are the fallback for a reveal whose justification is
 * missing. More than one choice would mean the draw voted its vote IDs differently — which the
 * classic kit's one-transaction reveal makes vanishingly unlikely, and which has never occurred
 * here — and a draw that did that has not voted the ruling, whatever the ruling turns out to be.
 */
function choicesOf(votes: readonly RawVote[]): number[] {
  const choices = new Set<number>();

  for (const vote of votes) {
    const raw = vote.justification?.choice ?? vote.choice;
    if (raw !== null && raw !== undefined) choices.add(toNumber(raw, "Vote carries a bad choice"));
  }

  return [...choices];
}

/** The moment the reveal was recorded, from the one entity that carries it. */
function revealedAt(votes: readonly RawVote[]): number | null {
  for (const vote of votes) {
    const timestamp = vote.justification?.timestamp;
    if (timestamp !== undefined)
      return toNumber(timestamp, "Justification carries a bad timestamp");
  }
  return null;
}

/**
 * The winning choice, or `null` while the court has not decided.
 *
 * Choice 0 is a ruling — refuse to arbitrate — and an agent juror that voted 0 in dispute 154
 * is coherent. Anything that tested the ruling for truthiness would mark that whole panel
 * incoherent without a word.
 */
function rulingChoiceOf(dispute: Dispute): number | null {
  switch (dispute.ruling.state) {
    case "pending":
      return null;
    case "refused":
      return 0;
    case "ruled":
      return dispute.ruling.choice;
  }
}

/**
 * Every commitment the roster published, keyed by dispute and lowercased address.
 *
 * The chain checksums an address and The Graph lowercases it, so the join is on the lowercased
 * form — the same join, and the same reason, as the roster's. Several timestamps can share one
 * key: the event carries no round, and an agent juror drawn again on appeal commits again.
 * They are sorted so `commitAt` can pick the one belonging to a round.
 */
function commitsByDraw(raw: RawCourtData): Map<string, number[]> {
  const commits = new Map<string, number[]>();

  for (const commit of raw.commits ?? []) {
    const disputeId = toNumber(commit.disputeID, "Commitment names a bad dispute");
    const timestamp = toNumber(commit.timestamp, "Commitment carries a bad timestamp");
    const key = `${disputeId}/${commit.juror.toLowerCase()}`;

    const timestamps = commits.get(key);
    if (timestamps === undefined) commits.set(key, [timestamp]);
    else timestamps.push(timestamp);
  }

  for (const timestamps of commits.values()) timestamps.sort((a, b) => a - b);
  return commits;
}

/**
 * What the court paid each agent juror in each dispute, keyed exactly as the commitments are.
 *
 * Summed rather than indexed, because a shift is per round and a cell is per dispute: an
 * appealed dispute writes one shift per round for the same agent juror, and the figure the
 * column header prints is what that agent juror earned from the dispute, not from whichever
 * round the cell happens to show. Court 34 is single-round throughout, so this sums one entry
 * today and stays right the first time it does not — the same shape as `roundIndexOf` reading
 * the index from the id rather than from the position a round arrived in.
 *
 * Keyed on the lowercased address for the same reason `commitsByDraw` is: The Graph lowercases
 * and the roster checksums, and this is the only join between them.
 */
function rewardsByDraw(raw: RawCourtData): Map<string, DrawReward> {
  const rewards = new Map<string, DrawReward>();

  for (const shift of raw.rewards ?? []) {
    const disputeId = toNumber(shift.dispute.disputeID, "Reward names a bad dispute");
    const key = `${disputeId}/${shift.juror.id.toLowerCase()}`;

    const ethWei = toWei(shift.ethAmount, "Reward carries a bad ETH amount");
    const pnkWei = toWei(shift.pnkAmount, "Reward carries a bad PNK amount");
    const feeTokenWei = toWei(shift.feeTokenAmount, "Reward carries a bad fee token amount");

    const running = rewards.get(key);
    rewards.set(key, {
      ethWei: (running?.ethWei ?? 0n) + ethWei,
      pnkWei: (running?.pnkWei ?? 0n) + pnkWei,
      inFeeToken: (running?.inFeeToken ?? false) || feeTokenWei !== 0n,
    });
  }

  return rewards;
}

/**
 * When this draw committed, out of every commitment its agent juror published in the dispute.
 *
 * The earliest one at or after this round's commit period opened. A juror commits at most once
 * per round and a later round opens later, so that is this round's commitment and no other —
 * and choosing this way makes a negative latency structurally impossible rather than something
 * to detect afterwards. A commitment that predates the round is an earlier round's, which is
 * why this returns null instead of failing the way the reveal path does: the reveal has one
 * justification and no round to choose between, and this has neither of those luxuries.
 */
function commitAt(timestamps: readonly number[] | undefined, round: DisputeRound): number | null {
  if (timestamps === undefined || round.commitOpenedAt === null) return null;

  const opened = round.commitOpenedAt;
  return timestamps.find((timestamp) => timestamp >= opened) ?? null;
}

function drawOf(
  group: DrawGroup,
  dispute: Dispute,
  commits: Map<string, number[]>,
  rewards: Map<string, DrawReward>,
): Draw {
  const revealed = group.votes.some((vote) => vote.voted);
  const committed = group.votes.some((vote) => vote.commited);
  // Once, here, rather than again inside `stateOf`: the same list decides coherence and is
  // shown by ticket 09's column header, and computing it twice is two chances to disagree.
  const choices = revealed ? choicesOf(group.votes).sort((a, b) => a - b) : [];
  const revealedTimestamp = revealed ? revealedAt(group.votes) : null;
  const voteOpenedAt = group.round.voteOpenedAt;

  let revealLatencySeconds: number | null = null;
  if (revealedTimestamp !== null && voteOpenedAt !== null) {
    revealLatencySeconds = revealedTimestamp - voteOpenedAt;
    if (revealLatencySeconds < 0) {
      throw new Error(
        `Draw ${group.id} revealed ${-revealLatencySeconds}s before its vote period opened`,
      );
    }
  }

  // Read from the log whether or not the subgraph has caught up: a commitment that is on chain
  // and not yet indexed is a moment this page can state, and the *state* stays whatever the
  // subgraph supports — which keeps `NO VOTE` as conservative as ticket 05 left it.
  const committedAt = commitAt(
    commits.get(`${dispute.id}/${group.agentJuror.address.toLowerCase()}`),
    group.round,
  );
  const commitOpenedAt = group.round.commitOpenedAt;

  return {
    agentJuror: group.agentJuror,
    state: stateOf({ group, dispute, revealed, committed, choices }),
    revealLatencySeconds,
    commitLatencySeconds:
      committedAt === null || commitOpenedAt === null ? null : committedAt - commitOpenedAt,
    committed,
    voteCount: group.voteCount,
    choices,
    // The same key the commitments use, and `undefined` collapsed to `null` because the model
    // says "no reward" with a null everywhere else it says anything is absent.
    reward: rewards.get(`${dispute.id}/${group.agentJuror.address.toLowerCase()}`) ?? null,
  };
}

function stateOf({
  group,
  dispute,
  revealed,
  committed,
  choices,
}: {
  group: DrawGroup;
  dispute: Dispute;
  revealed: boolean;
  committed: boolean;
  /** What the draw revealed, computed once by `drawOf` and shown by ticket 09's columns. */
  choices: readonly number[];
}): DrawState {
  if (revealed) {
    const ruling = rulingChoiceOf(dispute);
    if (ruling === null) return { kind: "live", stage: "revealed" };

    if (choices.length === 0) {
      throw new Error(`Draw ${group.id} is recorded as revealed but carries no choice`);
    }
    return choices.every((choice) => choice === ruling)
      ? { kind: "coherent" }
      : { kind: "diverged" };
  }

  // The loudest state on the page, so it is asserted only once acting has become impossible:
  // the vote period has closed and nothing was revealed. A draw that let the *commit* period
  // close without committing can no longer reveal either, but it reads as still awaiting until
  // the vote period closes, because until then the record cannot distinguish it from a
  // commitment the subgraph has not indexed yet — and `NO VOTE` attributes a failure.
  if (group.round.appealOpenedAt !== null) return { kind: "no-vote" };

  return { kind: "live", stage: committed ? "committed" : "awaiting" };
}

/** Everything one dispute's draws amount to: the cells, and the panel they were drawn from. */
type DisputeDraws = {
  /** Keyed by lowercased address, then by round index. */
  byAgentJuror: Map<string, Map<number, DrawGroup>>;
  /**
   * Every distinct address drawn, agent juror or not.
   *
   * The panel is who the court drew, and the roster is who this dashboard measures — the two
   * are the same in court 34 today and are not the same thing. Counting the panel in roster
   * matches would let one non-agent juror turn a panel of two into the page's claim that the
   * dispute "was decided by a panel of one", which is a sentence about the court and not about
   * the roster.
   */
  panel: Set<string>;
};

/**
 * Every draw in the court, keyed by dispute, agent juror and round.
 *
 * The subgraph's rows are per vote ID; this is where 61 of them become 44 draws. Addresses
 * arrive lowercased from The Graph and are checksummed in the roster, so the join is on the
 * lowercased form — and on the address, never on a nickname, because the ENS name an agent
 * juror displays is a display name and not a key.
 *
 * The round is part of the key even though appeal rounds are out of scope and every dispute in
 * this court has exactly one. Merging across rounds would put vote IDs from two different
 * periods in one group, and every derivation below reads that group as a single involvement: a
 * juror still committing in round 1 would be judged against round 0's closed vote period and
 * render as `NO VOTE`, and a reveal from one round would be dated against the other's clock,
 * far enough out to fail the whole matrix. `cellFor` picks one round; nothing mixes two.
 */
function groupDraws(raw: RawCourtData, disputes: readonly Dispute[]): Map<number, DisputeDraws> {
  const byAddress = new Map(
    raw.roster.map((agentJuror) => [agentJuror.address.toLowerCase(), agentJuror]),
  );
  const byDisputeId = new Map(disputes.map((dispute) => [dispute.id, dispute]));
  const grouped = new Map<number, DisputeDraws>();
  const seen = new Set<string>();

  for (const drawn of raw.draws) {
    // A draw arriving with no row is a dispute created between the two reads. It shows up one
    // refetch later; failing here would blank a matrix that is otherwise entirely readable.
    const disputeId = toNumber(drawn.dispute.disputeID, "Draw names a bad dispute");
    const dispute = byDisputeId.get(disputeId);
    if (dispute === undefined) continue;

    // The same vote ID twice would inflate the vote count a cell annotates itself with.
    if (seen.has(drawn.id)) continue;
    seen.add(drawn.id);

    let rows = grouped.get(disputeId);
    if (rows === undefined) {
      rows = { byAgentJuror: new Map(), panel: new Set() };
      grouped.set(disputeId, rows);
    }

    const address = drawn.juror.id.toLowerCase();
    rows.panel.add(address);

    // Not every address in a panel is an agent juror. The roster is the column set, and an
    // address outside it has no column to sit in — but it was still on the panel, counted above.
    const agentJuror = byAddress.get(address);
    if (agentJuror === undefined) continue;

    const index = roundIndexOf(drawn.round.id);
    const round = dispute.rounds.find((candidate) => candidate.index === index);
    if (round === undefined) {
      throw new Error(`Draw ${drawn.id} sits in round ${index}, which dispute ${disputeId} lacks`);
    }

    let rounds = rows.byAgentJuror.get(address);
    if (rounds === undefined) {
      rounds = new Map();
      rows.byAgentJuror.set(address, rounds);
    }

    const group = rounds.get(index);
    if (group === undefined) {
      rounds.set(index, {
        agentJuror,
        round,
        votes: drawn.vote === null ? [] : [drawn.vote],
        voteCount: 1,
        id: drawn.id,
      });
      continue;
    }

    group.voteCount += 1;
    if (drawn.vote !== null) group.votes.push(drawn.vote);
  }

  return grouped;
}

/**
 * The one draw a cell shows: the agent juror's most recent involvement in the dispute.
 *
 * One cell per agent juror per dispute is the matrix's whole shape, so an appealed dispute has
 * to choose. It chooses the latest round, because that is the one still running — showing an
 * earlier round would report a juror as finished while it is acting, and the earlier round's
 * outcome is not the dispute's. Read from the round index rather than from arrival order: `Draw`
 * ids sort lexicographically, so `151-10-0` precedes `151-9-0`.
 */
function currentDraw(rounds: Map<number, DrawGroup> | undefined): DrawGroup | undefined {
  if (rounds === undefined) return undefined;

  let current: DrawGroup | undefined;
  for (const group of rounds.values()) {
    if (current === undefined || group.round.index > current.round.index) current = group;
  }
  return current;
}

/**
 * The dashboard model: the matrix, and everything in it.
 *
 * Returns a result rather than throwing, so that a payload this cannot believe becomes a
 * failure the page can *say* — the alternative is an exception somewhere above the seam and a
 * matrix that renders as though nothing were wrong. Every rejection here is data that would
 * otherwise produce a confident wrong number: a reveal before its own vote period, a vote with
 * no choice, a round the dispute does not hold.
 */
export function buildCourtPerformance(raw: RawCourtData): KlerosResult<CourtPerformance> {
  try {
    const disputes = toDisputes(raw.disputes);
    const grouped = groupDraws(raw, disputes);
    const commits = commitsByDraw(raw);
    const rewards = rewardsByDraw(raw);

    // The court's own history, never its current configuration: what the court holds today is
    // not a fact about a dispute that ran before it was reconfigured (`windows.ts`).
    const regimes = toRegimes(raw.parameters ?? []);
    const current = regimes[regimes.length - 1]?.windows ?? null;

    // The cross-check ADR-0004 requires, counted where every draw is already in hand rather
    // than by walking the model a second time.
    let expected = 0;
    let resolved = 0;

    // What the reward figures cover, counted in the same pass and for the same reason. Not a
    // per-draw cross-check and deliberately not shaped like one — see `RewardCoverage`.
    let paidDraws = 0;
    let feeTokenDraws = 0;
    // Draws in disputes the court has ruled: what a whole payout read would have *something* to
    // say about. Only ever compared against zero — see `RewardCoverage.short`.
    let payableDraws = 0;
    // Ruled disputes where some draws were paid and others were not, which `execute()` cannot
    // produce and a short read can.
    let partlyPaidDisputes = 0;

    const rows = disputes.map((dispute) => {
      const drawn = grouped.get(dispute.id);

      // Whether the draw read could have seen this dispute at all.
      //
      // The payload is the primary evidence and the moment only settles what the payload leaves
      // ambiguous. If the draws mention this dispute then the read plainly saw it, whatever the
      // timestamps say — so a skewed clock or an approximate read moment can never blank
      // measurements that are actually in hand. Only a dispute with *no* draws is ambiguous, and
      // there the moment is what separates "nobody was drawn yet" from "nobody asked".
      //
      // `createdAt` is unix seconds against a read moment in milliseconds. The boundary second
      // counts as read: the two queries go out together, so a dispute created in the same second
      // as the read that returned it is what a healthy cold load looks like, and treating it as
      // unread would put a rose row on the newest dispute of every page load.
      const read =
        raw.drawsReadAt === null ||
        drawn !== undefined ||
        dispute.createdAt * 1000 <= raw.drawsReadAt;
      const cells = raw.roster.map((agentJuror) => {
        const group = currentDraw(drawn?.byAgentJuror.get(agentJuror.address.toLowerCase()));
        if (group === undefined) return null;

        const draw = drawOf(group, dispute, commits, rewards);
        if (group.votes.some((vote) => vote.commited)) {
          expected += 1;
          if (draw.commitLatencySeconds !== null) resolved += 1;
        }
        if (draw.reward !== null) {
          paidDraws += 1;
          if (draw.reward.inFeeToken) feeTokenDraws += 1;
        }
        return draw;
      });

      // Whether this dispute's payouts can be a whole read of it. Asked per dispute because
      // `execute()` pays every drawn juror in one transaction, so a ruled dispute is all-paid
      // or none-paid and a partial one is only ever a read that came back short — the one
      // per-dispute test here that a ruled-but-unexecuted dispute cannot trip.
      if (isFinalised(dispute)) {
        const drawnCells = cells.filter((cell) => cell !== null);
        const paid = drawnCells.filter((cell) => cell.reward !== null).length;

        payableDraws += drawnCells.length;
        if (paid > 0 && paid < drawnCells.length) partlyPaidDisputes += 1;
      }

      const windows = windowsFor(regimes, dispute);

      return {
        dispute,
        panelSize: drawn?.panel.size ?? 0,
        cells,
        windows,
        // Both halves have to be known before anything is marked. An unresolved dispute is one
        // this dashboard cannot place, not one that ran under the current rules.
        underEarlierWindows:
          windows !== null && current !== null && !sameMeasuredWindows(windows, current),
        read,
      };
    });

    return {
      success: true,
      data: {
        agentJurors: raw.roster,
        rows,
        totals: courtTotalsOf(rows, raw.roster),
        marginals: agentJurorMarginalsOf(rows, raw.roster),
        commitCoverage: { read: raw.commits !== null, expected, resolved },
        parameters: { read: raw.parameters !== null, regimes, current },
        rewards: {
          read: raw.rewards !== null,
          paidDraws,
          feeTokenDraws,
          // Only ever true of a read that happened: an unstarted read is not a short one, which
          // is the "has the read happened" gate `CLAUDE.md` records four recurrences of.
          short:
            raw.rewards !== null &&
            (partlyPaidDisputes > 0 || (payableDraws > 0 && paidDraws === 0)),
        },
      },
    };
  } catch (cause) {
    const message = cause instanceof Error ? cause.message : String(cause);
    return { success: false, code: MALFORMED, message, details: { cause } };
  }
}
