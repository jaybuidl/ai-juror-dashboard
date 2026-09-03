import { isFinalised } from "../disputes/liveness";
import type { AgentJuror } from "../roster/agent-jurors";
import type { Draw, MatrixRow } from "./performance";
import type { PeriodWindows } from "./windows";

/**
 * The aggregates: what the stat tiles, the latency strip and the matrix's column headers are
 * figures of.
 *
 * These live below the seam, computed once by `buildCourtPerformance`, for the same reason every
 * other derivation does: a tile that reduced the rows while rendering would be a second
 * definition of "how many draws" sitting beside this one, free to drift from the matrix it is
 * printed above. Ticket 06's per-agent-juror marginals are the same aggregates sliced by column
 * and live here for the same reason, over the same rows, reading the same median.
 *
 * Nothing here reads a clock or a window. Every count is a count of what was read.
 */

/**
 * Every latency measured, and the three durations quoted from it.
 *
 * `seconds` is the whole distribution, ascending — the strip plots one mark per entry, and the
 * median line and the three summary figures are read from this same array, so the plot and the
 * numbers beside it can never become two separately derived accounts of one set of draws.
 *
 * Used for both measures. They are never pooled into one summary: a reveal is measured from the
 * vote period and a commit from the commit period, and an aggregate over both would be ADR-0005's
 * mistake in another form. Two summaries, and each says which it is at the field that holds it.
 */
export type LatencySummary = {
  /** Ascending. One entry per draw that recorded this measure; the rest have no latency. */
  seconds: readonly number[];
  fastest: number;
  /** The lower of the two middle values on an even count — see `medianOf`. */
  median: number;
  slowest: number;
};

export type CourtTotals = {
  /** Disputes read. Never a claim about how many the court has held. */
  disputes: number;
  /**
   * Disputes the court has ruled on, and disputes it is still deciding — the matrix's caption.
   *
   * Read through `isFinalised` so that the caption, the row treatment, the refetch interval and
   * what may be persisted all keep one definition of the word between them (ADR-0007, keyed on
   * the ruling and never on the period). `Matrix.tsx` derived both from the rows while rendering
   * until this landed, which is a court-wide number computed in the view that prints it.
   *
   * Not filtered on `read`, unlike the draw counts: whether the court has ruled comes from the
   * dispute's own record, and a row whose draws were never read still has one.
   */
  finalised: number;
  live: number;
  /** Draws: one per agent juror per dispute, which is the unit (`CONTEXT.md`). */
  draws: number;
  /** The vote IDs those draws hold. Larger than `draws`, which is why both are printed. */
  votes: number;
  /** How many of the roster have ever been drawn. */
  agentJurorsDrawn: number;
  /** The roster's size, so the drawn count reads as a count against it. */
  agentJurors: number;
  /**
   * Reveal latency across every draw that has revealed, or `null` when none has.
   *
   * `null` rather than zeros: a `0` here would be a claim about the court that nobody measured.
   */
  revealLatency: LatencySummary | null;
  /**
   * Disputes decided by a panel of one, by id.
   *
   * Carried on the totals because any aggregate over coherence has to disclose them — a lone
   * agent juror is automatically the majority, so coherence there is tautological
   * (`CONTEXT.md`). None of today's four tiles is a coherence figure, which is why none of them
   * carries the marker; ticket 06's marginals are the first figures this qualifies.
   */
  lonePanelDisputes: readonly number[];
  /**
   * Disputes that ran under period durations the court has since changed, grouped by the
   * durations they ran under.
   *
   * Grouped rather than listed flat because the footnote has to name what the difference *was*
   * — "an 8h commit window against 45m now" — and one list of ids could not say that if the
   * court were ever reconfigured twice. Empty until the parameter history has been read, and
   * empty is not a claim: `CourtParameters.read` is what says whether it was looked for.
   *
   * Carried here for the same reason `lonePanelDisputes` is: any aggregate over latency has to
   * disclose them, and ticket 06's marginals are the first figures that will.
   */
  changedWindows: readonly WindowChange[];
  /**
   * Disputes the court's parameter history could not place, by id.
   *
   * Distinct from `changedWindows` being empty, and the distinction is the whole point: no
   * marked dispute can mean every dispute ran under the current windows, or it can mean the
   * history is too short to say. Only this count tells them apart, and without it a short scan
   * renders as a clean bill of health.
   */
  unplacedDisputes: readonly number[];
  /**
   * Disputes whose draws were never read, by id — see `MatrixRow.read`.
   *
   * Every count above is missing theirs, and none of them is zero as a result: an unread
   * dispute contributes no draws, no votes and no latency, so a total computed over them
   * understates the court by an amount nobody measured. Ticket 13's rule is that what could not
   * be read counts as unknown and never as zero, and a figure cannot say "unknown" — so the
   * figure stays what was actually counted and carries this list, which is what lets every
   * place that prints it label itself partial.
   */
  unreadDisputes: readonly number[];
  /**
   * What the empty positions in the record amount to — the figures the sparsity note quotes.
   *
   * Here rather than reduced by whichever view is printing it, and ticket 16 is what makes that
   * more than housekeeping: the matrix and the phone's card list are two renderings of one
   * record, and each of them has to say that a blank means "not drawn" rather than "missing".
   * Two reductions of one fact are two chances for a desktop and a phone to disagree about how
   * sparse this court is, on a page that may be cited.
   *
   * Every figure is over the rows that were **read**. An unread row's positions are all `null`
   * because nobody asked, and counting them as blank would fold a gap in this dashboard into the
   * one number whose whole job is to say that blank is a fact about the court (ticket 13).
   */
  sparsity: Sparsity;
};

/**
 * The empty half of the record, counted.
 *
 * "Position" rather than "cell" or "slot": the matrix draws one as a table cell and the phone
 * draws it as a slot on a card, and the count is the same fact about the court either way. It is
 * the word the design uses for the thing that stays put whichever way the record is laid out.
 */
export type Sparsity = {
  /** Disputes whose draws were read. Every figure below is over these and no others. */
  disputes: number;
  /** One per agent juror per read dispute — what a full record would have filled. */
  positions: number;
  /** How many of those hold no draw. Sparsity is normal: the court draws at random. */
  blank: number;
  /**
   * Agent jurors with no draw in any read dispute the court has drawn a panel for.
   *
   * A claim about the whole record, so it is `0` where there is no such row to say it about
   * rather than six: `every` on an empty array is vacuously true, and without the guard a court
   * whose every row was unread would report all six agent jurors as never drawn on no evidence.
   *
   * The undrawn rows are held out of it for the same reason and not a weaker one. A dispute the
   * court has not drawn a panel for has no draw in *any* column, so a page whose read rows were
   * all of that kind — a court in its opening hours, or a matrix scrolled to nothing else —
   * would report all six agent jurors as blank end to end on the strength of a draw that has not
   * happened. That is exactly the misreading `undrawnDisputes` exists to close, in the one figure
   * that was not gated on it.
   */
  emptyColumns: number;
  /**
   * Disputes that were read and have no panel yet, by id — the second kind of blank.
   *
   * The distinction ticket 17 was handed by three tickets at once, and it is the difference
   * between two sentences a reader could act on. A blank position in a dispute with a panel means
   * *this agent juror was not selected*, which is the random sparsity the note beside the grid
   * exists to explain. A blank in a dispute with no panel means *no selection has happened yet* —
   * the court draws when a dispute leaves its evidence period, and 167, 168 and 169 were sitting
   * in theirs on the day this was written, contributing 18 blanks the note was calling sparsity.
   *
   * Counted here rather than beside the note for the reason every figure in this file is: the
   * matrix and the phone's card list are two renderings of one record, and each has to say the
   * same thing about how much of it is empty and why.
   *
   * Distinct again from `CourtTotals.unreadDisputes`, which is a dispute whose draws were never
   * *read*: that is a gap in this dashboard and is counted out of `positions` entirely, where
   * this is a fact about the court and is counted in.
   */
  undrawnDisputes: readonly number[];
  /**
   * How many of `blank` sit in those disputes.
   *
   * One per agent juror per undrawn dispute, since a dispute with no panel has no draw in any
   * column. Carried so the note can say what share of the blank it is quoting means "not drawn
   * yet" rather than leaving a reader to multiply two numbers.
   */
  undrawnPositions: number;
};

/**
 * The two windows every figure on this dashboard is measured from.
 *
 * Narrower than `PeriodWindows` on purpose. A group below is keyed on exactly these two, so
 * every dispute in it agrees about them — and about nothing else. Carrying the whole
 * `PeriodWindows` here would report one arbitrary member's evidence and appeal windows as
 * though they applied to the group, which is a wrong figure waiting for a caller.
 */
export type MeasuredWindows = Pick<PeriodWindows, "commitSeconds" | "voteSeconds">;

/** One group of disputes that share a superseded pair of windows. */
export type WindowChange = {
  /** Ascending. The ids the marker sits on. */
  disputes: readonly number[];
  /** What those disputes ran under. Compare against `CourtParameters.current`. */
  windows: MeasuredWindows;
  /**
   * How many of those disputes' draws put a reveal latency into `revealLatency`.
   *
   * The figure the marker's own line needs: "1 of 67 draws ran under a vote window of 8h" is
   * what makes a dagger on a median mean something. Counted here rather than in the tile that
   * prints it, for the reason every count in this file is.
   */
  revealedDraws: number;
  /**
   * The same count for the commit median, which is measured from a different period.
   *
   * Two counts and not one because they are two distributions: a draw that committed and never
   * revealed is in one and not the other, and a marker saying "1 of 8" over a median of seven
   * would be a figure quoting the wrong denominator. Court 34 changed both windows at once, so
   * both medians take a marker today; a court that changed only one would mark only the median
   * that window governs, which is why the view compares against `CourtParameters.current`.
   */
  committedDraws: number;
};

/**
 * Coherence as a count, and what qualifies it.
 *
 * A count and never a rate: `8/9` says how many draws are behind it, where `89%` does not, and
 * the difference matters most exactly where the panel is small enough for one draw to move the
 * figure ten points. Nobody is ranked on it — these are marginals on a matrix.
 *
 * `resolved` is the denominator, and it is the draws whose dispute the court has **ruled** on —
 * ADR-0007, not `period === "execution"`. Disputes 164–166 sat in `appeal` with every vote in
 * and no ruling, and counting those draws as incoherent would report a prediction as a result.
 *
 * A draw that let the vote period close without revealing stays in the denominator. It was given
 * the chance to vote with the ruling and did not, and taking it out would hand an agent juror
 * that never voted a perfect coherence figure — the flattering-by-omission this page cannot
 * afford. The matrix says which those are; this figure only says how many were coherent.
 */
export type Coherence = {
  /** Draws that voted with the dispute's final ruling. */
  coherent: number;
  /** Draws with a ruling to be compared against at all. */
  resolved: number;
  /**
   * Which of `resolved` sat on a panel of one, by dispute id — the ‡.
   *
   * A lone agent juror is automatically the majority, so its coherence is tautological
   * (`CONTEXT.md`). One dispute is one draw here, since a panel of one holds exactly one.
   * The marker rides this figure and no other: a lone panel says nothing about a latency.
   */
  lonePanelDisputes: readonly number[];
};

/**
 * What one agent juror's column has been paid, summed down it.
 *
 * `null` on `AgentJurorMarginals` where this column has no paid draw at all, which is three
 * different things and only the view can tell them apart: the reward read has not come back,
 * this agent juror has never been drawn, or every dispute it was drawn in is still unexecuted.
 * `CourtPerformance.rewards.read` and `draws` are the two flags that separate them, exactly as
 * `commitCoverage.read` and `commitments` separate the three absences of a commit median.
 *
 * A `bigint` because a PNK penalty in this court is 1.87e20 wei. See `rewards.ts`.
 */
export type AgentJurorRewards = {
  /** Cumulative arbitration fees, in wei. Never negative: the court's penalty is taken in PNK. */
  ethWei: bigint;
  /** Net PNK in wei — **negative** for an agent juror that has lost more than it has won. */
  pnkWei: bigint;
  /** How many of this column's draws these two are summed over. */
  paidDraws: number;
  /** How many were paid wholly or partly in a fee token, which `ethWei` does not carry. */
  feeTokenDraws: number;
};

/**
 * One agent juror's column, summarised: the marginals in the matrix's column header.
 *
 * The same rows as `CourtTotals`, sliced down one column, so a marginal and the total above it
 * can never become two accounts of one set of draws — `totals.test.ts` pins that they sum. Six
 * figures are designed for and six are now filled: ticket 10 added cumulative ETH and net PNK
 * to the four ticket 06 built the block to hold.
 *
 * Every figure that cannot be measured is `null` rather than `0`, because the view draws it as
 * an em dash and a zero would be a measurement nobody took (`canvas/JurorEmpty.dc.html:66-76`).
 * `draws` is the one exception and is a real zero: never having been drawn is a fact about the
 * court's random selection, which is baskerville's whole entry in this experiment.
 *
 * An unread row contributes nothing here, because its cells are null. That understates every
 * count by an amount nobody measured, and the disclosure is `CourtTotals.unreadDisputes` — said
 * once in the banner and once beside the grid, rather than a third time in each of six columns.
 */
export type AgentJurorMarginals = {
  agentJuror: AgentJuror;
  /** Draws: this agent juror's cells in the matrix. `0` is a measurement. */
  draws: number;
  /** The vote IDs those draws hold. Larger than `draws`, which is why both are printed. */
  votes: number;
  /** Reveal latency across this column's revealed draws, or `null` when none has revealed. */
  revealLatency: LatencySummary | null;
  /**
   * Commit latency across this column's dated commitments, or `null` when none is dated.
   *
   * `null` on every load until the log scan comes back, which is not the same as a column with
   * nothing to measure — the view tells them apart with `commitCoverage.read`, exactly as the
   * cell does with `commitFigureOf`'s `scanned`.
   */
  commitLatency: LatencySummary | null;
  /**
   * How many of this column's draws the subgraph records as having committed, whatever the log
   * scan found on chain.
   *
   * Kept beside the latency for the reason `Draw.committed` is: the difference between the two
   * is what a missing commit median means. No commitments and no median is an agent juror that
   * has not committed; commitments with no median is a read of Arbitrum that came back short,
   * and wording that as the first would blame an agent juror that committed on time.
   */
  commitments: number;
  coherence: Coherence;
  /**
   * The window changes that touch *this* column's draws — the †.
   *
   * Sliced rather than shared: the marker is a claim about the draws behind this number, and a
   * column never drawn under the earlier windows is comparable with the court as it stands.
   */
  changedWindows: readonly WindowChange[];
  /**
   * Cumulative ETH and net PNK for this column, or `null` where nothing has been paid.
   *
   * **The † does not ride these two, and that is a measured fact rather than an assumption.**
   * The marker is about the commit and vote windows, and a reward depends on none of them: it
   * is `feeForJuror` per coherent **vote ID** and `minStake × alpha / 10000` (187 PNK) at risk
   * per vote ID — not per draw, which is why nine of the 44 shifts are fractions of a fee and
   * nothing here may assume a payout divides evenly. Court 34's one
   * reconfiguration, on 2026-08-20, carried `minStake`, `alpha`, `feeForJuror` and
   * `jurorsForCourtJump` **unchanged** and moved only `timesPerPeriod` — decoded from the
   * `CourtModified` log against the `CourtCreated` before it. So every figure summed here was
   * earned under one set of reward parameters, and a dagger claiming otherwise would be a
   * marker placed in error. The ‡ does not ride them either: a panel of one makes coherence
   * tautological and the fee it earned real.
   */
  rewards: AgentJurorRewards | null;
};

/**
 * The median, taken as the lower of the two middle values rather than their mean.
 *
 * An even count has no middle, and averaging the two invents a latency no draw recorded — half
 * a second that never happened, on a page that may be cited. The lower middle keeps the figure
 * a duration something actually took. It is also what the canvas quotes: 44 draws whose middles
 * are 85s and 86s are labelled 85s there (`canvas/Main.dc.html:73`).
 */
function medianOf(ascending: readonly number[]): number {
  const middle = ascending[Math.ceil(ascending.length / 2) - 1];
  if (middle === undefined) throw new Error("Median of an empty distribution");
  return middle;
}

/**
 * The distribution and the three durations quoted from it, or `null` when nothing was measured.
 *
 * One implementation for both measures and for every column, so a marginal median and the
 * court-wide median beside it are the same convention applied to different draws rather than
 * two conventions that happen to agree today.
 */
function summaryOf(seconds: number[]): LatencySummary | null {
  seconds.sort((a, b) => a - b);
  const fastest = seconds[0];
  const slowest = seconds[seconds.length - 1];

  // Null rather than zeros: a `0` here would be a claim about the court that nobody measured.
  if (fastest === undefined || slowest === undefined) return null;
  return { seconds, fastest, median: medianOf(seconds), slowest };
}

/**
 * The marked disputes, gathered under the windows they ran under.
 *
 * Keyed on the commit and vote windows and not on all four, because those are the two the
 * marker is about: they are the periods the figures are measured from, and grouping on a
 * difference no figure reflects would split one footnote into two saying the same thing.
 *
 * `drawsOf` is how one column takes its own slice. The default is the whole row, which is the
 * court-wide reading; a marginal passes the one cell that is its own, so that a column never
 * drawn in dispute 151 carries no marker rather than inheriting the court's.
 */
function changedWindowsOf(
  rows: readonly MatrixRow[],
  drawsOf: (row: MatrixRow) => readonly (Draw | null)[] = (row) => row.cells,
): WindowChange[] {
  const groups = new Map<string, WindowChange & { disputes: number[] }>();

  for (const row of rows) {
    if (!row.underEarlierWindows || row.windows === null) continue;

    const draws = drawsOf(row);
    const revealed = draws.filter(
      (cell) => cell !== null && cell.revealLatencySeconds !== null,
    ).length;
    const committed = draws.filter(
      (cell) => cell !== null && cell.commitLatencySeconds !== null,
    ).length;

    const { commitSeconds, voteSeconds } = row.windows;
    const key = `${commitSeconds}/${voteSeconds}`;
    const group = groups.get(key);
    if (group === undefined) {
      groups.set(key, {
        disputes: [row.dispute.id],
        windows: { commitSeconds, voteSeconds },
        revealedDraws: revealed,
        committedDraws: committed,
      });
    } else {
      group.disputes.push(row.dispute.id);
      group.revealedDraws += revealed;
      group.committedDraws += committed;
    }
  }

  // Rows arrive newest first, and a footnote naming "disputes 151 and 152" reads forwards — so
  // the ids inside a group are sorted, and so are the groups themselves. Insertion order here
  // is row order, which would print the *newer* superseded configuration first and read as a
  // history running backwards.
  const changes = [...groups.values()];
  for (const group of changes) group.disputes.sort((a, b) => a - b);
  return changes.sort((a, b) => (a.disputes[0] ?? 0) - (b.disputes[0] ?? 0));
}

/**
 * Disputes the parameter history could not place, by id.
 *
 * The absence that would otherwise pass for a finding. A row whose windows are `null` is one
 * the court's history says nothing about — a scan that dropped the oldest `CourtCreated`, say,
 * which is exactly what a provider capping `eth_getLogs` produces (ADR-0004). It is *not*
 * marked, because nothing is known to compare it against, and without this count the page would
 * fold it in with the rows that genuinely ran under the current windows and state as much.
 *
 * Every row is here while the history is unread, which is why the view gates on
 * `CourtParameters.current` before saying anything: an unread history is already announced, and
 * saying it twice in different words is worse than saying it once.
 */
function unplacedDisputesOf(rows: readonly MatrixRow[]): number[] {
  return rows
    .filter((row) => row.windows === null)
    .map((row) => row.dispute.id)
    .sort((a, b) => a - b);
}

/**
 * Which superseded windows actually qualify one median, and how many draws they cost it.
 *
 * The filter every `†` on this page has to pass, in one place because there are now three
 * figures wearing one: the court-wide median reveal tile, and each column's two medians. Two
 * implementations of "does this change qualify this figure" is two chances for the tile above
 * the grid and the header inside it to mark different things over the same court.
 *
 * **A change only marks the median the window it names governs.** A reveal is measured from the
 * vote period and a commit from the commit period, so a group whose vote window matches what the
 * court holds now says nothing about a reveal median, however different its commit window is.
 * Court 34 changed both at once and every group qualifies both today, which is exactly why this
 * had to be written down rather than left to hold by coincidence: the next reconfiguration that
 * moves one window would otherwise print "ran under a vote window of 30m, which the court has
 * since changed" against a court whose vote window is 30m. `windowFlagLabel` in `Matrix.tsx`
 * makes the same comparison on the row for the same reason.
 *
 * An unread parameter history is `current === null`, and everything qualifies: nothing is known
 * to compare against, and the view says the history is unread in its own words.
 */
export function markedWindows(
  changes: readonly WindowChange[],
  current: PeriodWindows | null,
  measure: "reveal" | "commit",
): { changes: readonly WindowChange[]; draws: number } {
  const window = measure === "reveal" ? "voteSeconds" : "commitSeconds";
  const counted = measure === "reveal" ? "revealedDraws" : "committedDraws";

  const marked = changes.filter(
    (change) =>
      change[counted] > 0 && (current === null || change.windows[window] !== current[window]),
  );

  return { changes: marked, draws: marked.reduce((total, change) => total + change[counted], 0) };
}

/** Everything the rows amount to, in one pass. */
export function courtTotalsOf(
  rows: readonly MatrixRow[],
  agentJurors: readonly AgentJuror[],
): CourtTotals {
  let draws = 0;
  let votes = 0;
  const seconds: number[] = [];
  const drawn = new Set<string>();

  for (const row of rows) {
    for (const cell of row.cells) {
      if (cell === null) continue;
      draws += 1;
      votes += cell.voteCount;
      drawn.add(cell.agentJuror.address);
      if (cell.revealLatencySeconds !== null) seconds.push(cell.revealLatencySeconds);
    }
  }

  const finalised = rows.filter((row) => isFinalised(row.dispute)).length;

  return {
    disputes: rows.length,
    finalised,
    live: rows.length - finalised,
    draws,
    votes,
    agentJurorsDrawn: drawn.size,
    agentJurors: agentJurors.length,
    revealLatency: summaryOf(seconds),
    // A panel of one is a fact about a dispute that *was* read, so an unread row is not counted
    // among them — its panel size is 0 because nobody asked, not because the court drew one
    // juror. Filtering on `read` first is what keeps a gap out of a coherence caveat.
    lonePanelDisputes: rows
      .filter((row) => row.read && row.panelSize === 1)
      .map((row) => row.dispute.id),
    unreadDisputes: rows.filter((row) => !row.read).map((row) => row.dispute.id),
    // Deliberately *not* filtered on `read`, unlike the panel above, because these two are
    // facts about the dispute rather than about its draws. Which windows a dispute ran under
    // comes from its own timeline and the court's parameter history — both read from sources
    // that have nothing to do with the draw query — so an unread row still ran under what it
    // ran under. What it contributes to `revealedDraws` is 0, which is the honest count of
    // draws in hand for it.
    changedWindows: changedWindowsOf(rows),
    unplacedDisputes: unplacedDisputesOf(rows),
    sparsity: sparsityOf(rows, agentJurors),
  };
}

/** The empty positions, over the rows that were read. See `Sparsity`. */
function sparsityOf(rows: readonly MatrixRow[], agentJurors: readonly AgentJuror[]): Sparsity {
  const read = rows.filter((row) => row.read);
  const positions = read.length * agentJurors.length;
  const drawn = read.reduce(
    (total, row) => total + row.cells.filter((cell) => cell !== null).length,
    0,
  );
  // Read, and nobody drawn — the second kind of blank. `panelSize` is the whole panel and not
  // this roster's share of it, so a dispute drawn entirely outside the roster is *not* one of
  // these: it has a panel, and its blanks are the ordinary kind.
  const undrawn = read.filter((row) => row.panelSize === 0);
  // The rows a "never drawn" claim can rest on: read, and with a panel to have been left out of.
  const panelled = read.filter((row) => row.panelSize > 0);

  return {
    disputes: read.length,
    positions,
    blank: positions - drawn,
    emptyColumns:
      panelled.length === 0
        ? 0
        : agentJurors.filter((_, column) => panelled.every((row) => row.cells[column] === null))
            .length,
    // Ascending, because rows arrive newest first and a note naming "disputes 167, 168 and 169"
    // reads forwards — the same reason every other list of ids in this file is sorted.
    undrawnDisputes: undrawn.map((row) => row.dispute.id).sort((a, b) => a - b),
    undrawnPositions: undrawn.length * agentJurors.length,
  };
}

/**
 * One dispute's commit latencies, and how many commitments it holds.
 *
 * Ticket 17 moves the commit figure out of the compact cell and onto the row it belongs to
 * (`MatrixDense.dc.html:64`, "commit latency moves to the row"), and this is the reduction behind
 * it. Here rather than in the component that prints it for the reason every figure in this file
 * is here: a median computed while rendering is a second definition of the word sitting one
 * import away from the first, free to disagree with the column medians above it.
 *
 * A row's draws all ran under one set of windows — a dispute passes each period once — so unlike
 * the column medians this one needs no `†` of its own. The row already carries the marker where
 * the whole dispute ran under superseded durations, which is the same fact at the same grain.
 *
 * `commitments` is what separates the three absences a missing median can mean, exactly as it
 * does on `AgentJurorMarginals`: no commitments at all is nothing to measure, commitments with no
 * median is a read of Arbitrum that came back short, and neither may be worded as the other.
 */
export type RowCommitLatency = {
  /** Commit latency across this row's dated commitments, or `null` where none is dated. */
  latency: LatencySummary | null;
  /** How many of this row's draws the subgraph records as committed, whatever the scan found. */
  commitments: number;
};

export function rowCommitLatencyOf(row: MatrixRow): RowCommitLatency {
  const seconds: number[] = [];
  let commitments = 0;

  for (const cell of row.cells) {
    if (cell === null) continue;
    if (cell.committed) commitments += 1;
    if (cell.commitLatencySeconds !== null) seconds.push(cell.commitLatencySeconds);
  }

  return { latency: summaryOf(seconds), commitments };
}

/**
 * The same rows, sliced down each column: one summary per agent juror, in roster order.
 *
 * In **roster order and over the roster**, not over the draws — `agentJurors` is the authority
 * on who exists here. baskerville has never been drawn and has no on-chain presence at all, so a
 * list built by walking the cells would quietly show five columns where the matrix shows six,
 * and the one agent juror whose record is "never asked" would vanish from the page that exists
 * to say so.
 *
 * Nobody is ranked and nothing is sorted: the order is the matrix's own column order, and these
 * figures sit in the headers of the columns they describe.
 */
export function agentJurorMarginalsOf(
  rows: readonly MatrixRow[],
  agentJurors: readonly AgentJuror[],
): AgentJurorMarginals[] {
  return agentJurors.map((agentJuror, column) => {
    let draws = 0;
    let votes = 0;
    let commitments = 0;
    let coherent = 0;
    let resolved = 0;
    const lonePanelDisputes: number[] = [];
    const revealSeconds: number[] = [];
    const commitSeconds: number[] = [];
    let ethWei = 0n;
    let pnkWei = 0n;
    let paidDraws = 0;
    let feeTokenDraws = 0;

    for (const row of rows) {
      const cell = row.cells[column];
      if (cell === undefined || cell === null) continue;

      draws += 1;
      votes += cell.voteCount;
      if (cell.committed) commitments += 1;

      // Summed over the cells rather than over the shifts themselves, so that these two figures
      // are over exactly the draws the five figures beside them are over. An unread row
      // contributes nothing here for the same reason it contributes no draws — and in practice
      // the two readings coincide, because a dispute new enough to be unread is far too new to
      // have been executed.
      if (cell.reward !== null) {
        ethWei += cell.reward.ethWei;
        pnkWei += cell.reward.pnkWei;
        paidDraws += 1;
        if (cell.reward.inFeeToken) feeTokenDraws += 1;
      }
      if (cell.revealLatencySeconds !== null) revealSeconds.push(cell.revealLatencySeconds);
      if (cell.commitLatencySeconds !== null) commitSeconds.push(cell.commitLatencySeconds);

      // The denominator is a fact about the dispute rather than about the draw, which is why it
      // is asked of the row: a draw's own state says `live` for both "no ruling yet" and "the
      // vote period is still open", and only one of those is a dispute the court has finished.
      if (!isFinalised(row.dispute)) continue;
      resolved += 1;
      if (cell.state.kind === "coherent") coherent += 1;
      // Counted only among the resolved, for the same reason: a lone panel still being decided
      // has no coherence figure yet to qualify.
      if (row.panelSize === 1) lonePanelDisputes.push(row.dispute.id);
    }

    return {
      agentJuror,
      draws,
      votes,
      revealLatency: summaryOf(revealSeconds),
      commitLatency: summaryOf(commitSeconds),
      commitments,
      // Ascending, because rows arrive newest first and a list of ids reads forwards — the same
      // reason `changedWindowsOf` sorts the ids inside a group.
      coherence: { coherent, resolved, lonePanelDisputes: lonePanelDisputes.sort((a, b) => a - b) },
      // Over the rows this agent juror was actually drawn in, and not over every marked row.
      // Court-wide the group is a fact about the disputes and an unread row belongs in it with
      // a count of zero; here it is a claim about *this* number, and a column never drawn in
      // dispute 151 would otherwise carry a marker over a median that dispute did not touch.
      changedWindows: changedWindowsOf(
        rows.filter((row) => row.cells[column] != null),
        (row) => [row.cells[column] ?? null],
      ),
      // `null` and not a pair of zeros: a zero here is a measurement — "drawn, and paid
      // nothing" — and this is its absence. The view is what turns the absence into either a
      // real zero or a dash, because only it knows whether the read has happened.
      rewards: paidDraws === 0 ? null : { ethWei, pnkWei, paidDraws, feeTokenDraws },
    };
  });
}
