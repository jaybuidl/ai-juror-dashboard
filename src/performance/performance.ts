import { type Dispute, type DisputeRound, type RawDispute, toDisputes } from "../disputes/disputes";
import type { AgentJuror } from "../roster/agent-jurors";
import { type CourtTotals, courtTotalsOf } from "./totals";

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
 * Everything fetched, in one value.
 *
 * Tickets 07 and 08 add fields here — `CommitCast` logs and the `CourtModified` parameter
 * history — rather than a second seam beside this one.
 */
export type RawCourtData = {
  disputes: readonly RawDispute[];
  draws: readonly RawDraw[];
  /** The column set, and the only place all six agent jurors appear. */
  roster: readonly AgentJuror[];
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
  /** How many vote IDs this one draw holds. `1` for most of them. */
  voteCount: number;
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
   */
  totals: CourtTotals;
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

function drawOf(group: DrawGroup, dispute: Dispute): Draw {
  const revealed = group.votes.some((vote) => vote.voted);
  const committed = group.votes.some((vote) => vote.commited);
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

  return {
    agentJuror: group.agentJuror,
    state: stateOf({ group, dispute, revealed, committed }),
    revealLatencySeconds,
    voteCount: group.voteCount,
  };
}

function stateOf({
  group,
  dispute,
  revealed,
  committed,
}: {
  group: DrawGroup;
  dispute: Dispute;
  revealed: boolean;
  committed: boolean;
}): DrawState {
  if (revealed) {
    const ruling = rulingChoiceOf(dispute);
    if (ruling === null) return { kind: "live", stage: "revealed" };

    const choices = choicesOf(group.votes);
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

    const rows = disputes.map((dispute) => {
      const drawn = grouped.get(dispute.id);
      const cells = raw.roster.map((agentJuror) => {
        const group = currentDraw(drawn?.byAgentJuror.get(agentJuror.address.toLowerCase()));
        return group === undefined ? null : drawOf(group, dispute);
      });

      return {
        dispute,
        panelSize: drawn?.panel.size ?? 0,
        cells,
      };
    });

    return {
      success: true,
      data: { agentJurors: raw.roster, rows, totals: courtTotalsOf(rows, raw.roster) },
    };
  } catch (cause) {
    const message = cause instanceof Error ? cause.message : String(cause);
    return { success: false, code: MALFORMED, message, details: { cause } };
  }
}
