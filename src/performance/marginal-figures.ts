import { commitMedianFigureOf, type Figure, UNREAD_FIGURE } from "./cell";
import { formatLatencySeconds, formatWindowSeconds } from "./latency";
import type { RewardCoverage } from "./performance";
import { formatEthWei, formatPnkWei } from "./rewards";
import {
  type AgentJurorMarginals,
  type AgentJurorRewards,
  markedWindows,
  type WindowChange,
} from "./totals";
import type { PeriodWindows } from "./windows";

/**
 * How one agent juror's six figures are *read* — the gates, the absences and the markers.
 *
 * Lifted out of `Marginals.tsx` by ticket 11, which gave the same six figures a second
 * rendering: the matrix's column header prints them stacked in 148px, and the agent juror's own
 * view prints them across a stat card at `canvas/Juror.dc.html:70-82`. This is the ticket 16
 * move made again one level down — the matrix and the phone's card list were two renderings of
 * one record, and these are two renderings of one column.
 *
 * What that buys is exactly what it bought there. Four of these six are figures with three or
 * four absences behind them, and every one of those absences is a sentence about what this
 * dashboard did or did not read: a commit median missing before Arbitrum answers is a step not
 * reached, and the same absence after it refuses is a read that came up short. A second
 * implementation on the agent juror's page would be a second set of those judgements, free to
 * put "Not read" on a cold load or `0.0000` under a subgraph that returned nothing — on the one
 * page where an agent juror is named at the top and the figure is the largest thing under it.
 *
 * Nothing here computes an aggregate. `AgentJurorMarginals` is the arithmetic and it lives in
 * `totals.ts`, below the seam; this decides only how each of its fields is to be read out loud.
 *
 * The file is `marginal-figures.ts` and not `marginals.ts` because `Marginals.tsx` sits beside
 * it, and two files differing only in case are a hard TypeScript error on macOS (`CLAUDE.md`,
 * TS1149).
 */

/** A caveat riding one figure: the mark, why, and where the whole of it is written down. */
export type MarginalCaveat = {
  /** The same glyph the matrix's row flag and its footnote use for the same fact. */
  mark: string;
  /** One line, beside or below the number, saying how many of the counted draws are affected. */
  reason: string;
  href: string;
  /** The mark is a link, and one per column needs telling apart from the rest by ear. */
  about: string;
};

/**
 * One figure, and the three names it answers to.
 *
 * Three, because three renderings need three lengths and the alternative is each of them
 * inventing its own. `label` is what fits a 148px column; `caption` is what the stat card has
 * room for; `name` is what a reader hearing the page is told, and is the only one that has to
 * make sense with no figure beside it. Collapsing any pair would put "Med rev" in a screen
 * reader or "Draws, and the vote IDs they hold" under a 30px number.
 */
export type MarginalFigure = {
  key: string;
  /** The artboard's abbreviation, which is all a 148px column has room for. */
  label: string;
  /** The stat card's key, per `canvas/Juror.dc.html:70-82`. */
  caption: string;
  /** The same key spelled out, for a reader who is hearing the figure rather than scanning it. */
  name: string;
  figure: Figure;
  caveat?: MarginalCaveat;
  /** Whether this figure is a net loss, which takes amber on top of its own sign character. */
  loss?: boolean;
  /**
   * Whether this figure survives the matrix header's compact density.
   *
   * Three of the six do, per ticket 17: the median reveal, the coherence count and the draw
   * count. What goes is the median commit — which the compact grid moves onto the dispute row
   * rather than losing — and the two reward sums, which are supporting context beside the
   * measures rather than a dimension anyone is ranked on. A flag on the figure rather than a
   * second list, because a second list is a second order and the order is the artboard's.
   *
   * It lives here, beside the readings, rather than in `Marginals.tsx` which is the only caller
   * that filters on it: the agent juror view takes all six at `canvas/Juror.dc.html:70-82` and
   * has no density of its own, and a flag kept next to the figure it describes cannot drift from
   * the order the two renderings share.
   */
  dense: boolean;
};

/** What a figure needs to know about the reads behind it before it can be read out. */
export type MarginalContext = {
  /**
   * Whether the commit log scan has come back — `commitCoverage.read`.
   *
   * The same gate `commitFigureOf` takes, and for the same reason: the flag is false while
   * Arbitrum is being asked as well as after it refused, so a commit median missing before the
   * answer arrives is a step not reached rather than a read that came up short. Without it every
   * column would read "Not read" for the length of every cold load.
   */
  scanned: boolean;
  /**
   * What the court's payouts amount to — `CourtPerformance.rewards`.
   *
   * The whole coverage rather than a `read` flag, and it is the one gate here that needs two
   * fields, because these two figures are **sums**. Every other figure degrades to an em dash
   * when it cannot be taken; a sum degrades to `0.0000`, in the ink of a measurement. So both an
   * unstarted read and a *short* one have to be caught before the arithmetic, and `read` alone
   * catches only the first.
   */
  payouts: RewardCoverage;
  /** The windows the court is configured with today, against which an earlier one is named. */
  current: PeriodWindows | null;
};

/**
 * The six figures, in the artboard's order.
 *
 * A list rather than six hard-coded blocks because the block was designed to hold six and held
 * four until ticket 10: the last two entries are cumulative ETH and net PNK, under the same
 * hairline as the four above them and not in a summary column of their own
 * (`canvas/Main.dc.html:136-152`, `canvas/Juror.dc.html:70-82`).
 *
 * Nothing here is ranked and nothing reorders: the order is the artboard's, and the rewards sit
 * last because they are supporting context beside the marginals rather than a dimension this
 * dashboard measures agent jurors on.
 */
export function marginalFiguresOf(
  marginals: AgentJurorMarginals,
  { scanned, payouts, current }: MarginalContext,
): MarginalFigure[] {
  const { nickname } = marginals.agentJuror;
  const { revealLatency, commitLatency, coherence, changedWindows } = marginals;

  return [
    {
      key: "reveal",
      dense: true,
      label: "Med rev",
      caption: "Median reveal",
      name: "Median reveal latency",
      figure: latencyFigure(revealLatency?.median),
      // Marked on the same terms the court-wide median reveal tile is marked on, and it has to
      // be: a column median left unqualified beneath a qualified court median would have the
      // page declining to compare and comparing at once — which is the defect the canvas's own
      // readme records against `Juror.dc.html:73`.
      caveat: windowCaveat({
        changes: changedWindows,
        current,
        measure: "reveal",
        counted: revealLatency?.seconds.length ?? 0,
        nickname,
      }),
    },
    {
      key: "commit",
      // The one figure the header loses at the compact density that is not lost to the page:
      // the grid moves it onto the dispute row, over that row's own draws, per the corner cell
      // at `MatrixDense.dc.html:64`. The reveal median stays because reveal latency is the
      // figure the experiment is about, and dispute 151's 8-hour commit window makes the commit
      // the least comparable measure here — the same trade ADR-0005 records being made once
      // already.
      dense: false,
      label: "Med com",
      caption: "Median commit",
      name: "Median commit latency",
      figure: commitMedianFigureOf(marginals.commitLatency?.median, marginals.commitments, scanned),
      caveat: windowCaveat({
        changes: changedWindows,
        current,
        measure: "commit",
        counted: commitLatency?.seconds.length ?? 0,
        nickname,
      }),
    },
    {
      key: "coherence",
      dense: true,
      label: "Coherent",
      caption: "Coherent",
      name: "Coherent draws, of the draws the court has ruled on",
      // A count and never a rate, and a dash where there is no ruled draw to count over —
      // "0/0" would be a figure, and there is nothing here to have a figure about.
      figure:
        coherence.resolved === 0
          ? { text: "—", tone: "pending" }
          : { text: `${coherence.coherent}/${coherence.resolved}`, tone: "value" },
      caveat: lonePanelCaveat(coherence, nickname),
    },
    {
      key: "draws",
      dense: true,
      label: "Draws",
      caption: "Draws · votes",
      name: "Draws, and the vote IDs they hold",
      // The one figure that reads as a real zero: never having been drawn is a measurement of
      // the court's random selection, not an absence of one. The vote count sits beside it
      // because the two differ — 61 votes were 44 draws across the first thirteen disputes.
      figure: { text: `${marginals.draws} · ${marginals.votes}v`, tone: "value" },
    },
    {
      key: "eth",
      dense: false,
      label: "Eth",
      caption: "ETH earned",
      name: "Cumulative ETH earned",
      figure: rewardFigure(marginals, payouts, (rewards) => formatEthWei(rewards.ethWei)),
    },
    {
      key: "pnk",
      dense: false,
      label: "Pnk",
      caption: "PNK net",
      name: "Net PNK gained or lost",
      figure: rewardFigure(marginals, payouts, (rewards) => formatPnkWei(rewards.pnkWei)),
      // Amber on top of the sign character the value already carries, never instead of it.
      loss: (marginals.rewards?.pnkWei ?? 0n) < 0n,
    },
  ];
}

/** Drawn and paid nothing: a real zero, at the same precision as a real amount. */
const EMPTY_REWARDS: AgentJurorRewards = {
  ethWei: 0n,
  pnkWei: 0n,
  paidDraws: 0,
  feeTokenDraws: 0,
};

/**
 * A reward figure, and the four absences it has to tell apart before it prints a zero.
 *
 * The same shape as `commitMedianFigureOf` in `cell.ts` and for a sharper version of the same
 * reason. Every
 * other figure here degrades to an em dash when it cannot be taken; these two are sums, and a
 * sum's natural degradation is `0.0000` — a number, in the ink of a measurement, saying an agent
 * juror earned nothing. So every gate comes first and the arithmetic last:
 *
 * - **The read is not in.** Pending ink and a dash. `read` is false while the subgraph is being
 *   asked *and* after it refused, which is the fourth recurrence of that trap in `CLAUDE.md` —
 *   the failed half is the banner's to say, and this only has to not lie in the meantime.
 * - **Never drawn.** Pending ink and a dash, which is what `canvas/JurorEmpty.dc.html:66-76`
 *   draws and what the four figures above already do. An agent juror the court has not drawn
 *   has nothing on chain to have earned from. Asked *before* the shortfall below, because a
 *   column with no draws has nothing that could have been read short.
 * - **The read came back short.** Ticket 13's Unknown — rose, and the word "Not read" beside it,
 *   exactly as the commit median states the same thing one gate up. This is the case the whole
 *   `short` flag exists for: without it a reindexing subgraph's `[]` renders as every column
 *   reading `0.0000`, and a wrong figure is worse than an absent one on a page that may be cited.
 * - **Drawn, read whole, and paid nothing.** A real zero, because that is a measurement: the
 *   court has executed nothing this agent juror was drawn in.
 */
function rewardFigure(
  marginals: AgentJurorMarginals,
  payouts: RewardCoverage,
  format: (rewards: AgentJurorRewards) => string,
): Figure {
  if (!payouts.read || marginals.draws === 0) return { text: "—", tone: "pending" };
  if (payouts.short) return UNREAD_FIGURE;

  // `format` is given a zero rather than being skipped, so that the zero is written to the same
  // precision as every figure beside it — "0.0000" lines up under "0.0026" and "0" would not.
  return { text: format(marginals.rewards ?? EMPTY_REWARDS), tone: "value" };
}

/** A duration, or the em dash that means there were no draws to measure. */
function latencyFigure(median: number | undefined): Figure {
  return median === undefined
    ? { text: "—", tone: "pending" }
    : { text: formatLatencySeconds(median), tone: "value" };
}

/**
 * The dagger, and which of the two windows it is actually about.
 *
 * Court 34 changed its commit window and its vote window at the same moment, so both medians
 * carry a marker today. A court that changed only one of them would put the marker on only the
 * median that window governs — which is why this compares against what the court holds now
 * rather than marking anything in a group. `windowFlagLabel` in `row-flags.ts` makes the same
 * comparison for the same reason: a marker naming a duration identical to the current one reads
 * as a marker placed in error.
 *
 * `counted` is the size of the distribution the median was taken over, so the reason names how
 * many of *the counted draws* are affected rather than only that some are. Absent when none of
 * them is, which includes every load before the parameter history comes back.
 */
function windowCaveat({
  changes,
  current,
  measure,
  counted,
  nickname,
}: {
  changes: readonly WindowChange[];
  current: PeriodWindows | null;
  measure: "reveal" | "commit";
  counted: number;
  nickname: string;
}): MarginalCaveat | undefined {
  const period = measure === "reveal" ? "vote" : "commit";
  const seconds = measure === "reveal" ? "voteSeconds" : "commitSeconds";

  const marked = markedWindows(changes, current, measure);
  const draws = marked.draws;
  if (draws === 0 || counted === 0) return undefined;

  const only = marked.changes.length === 1 ? marked.changes[0] : undefined;

  return {
    mark: "†",
    reason:
      only === undefined
        ? `${draws} of ${counted} draws ran under ${period} windows the court has since changed.`
        : `${draws} of ${counted} draws ran under a ${period} window of ${formatWindowSeconds(only.windows[seconds])}, which the court has since changed.`,
    href: "/method#window",
    about: `Why ${nickname}'s median ${measure} is marked`,
  };
}

/**
 * The double dagger: a draw on a panel of one, where being the majority took no agreement.
 *
 * It rides the coherence count and nothing else. A lone panel says nothing about how quickly the
 * agent juror acted, so marking a latency with it would be a caveat about the wrong figure — and
 * a caveat a reader can see is misplaced is one they stop reading.
 */
function lonePanelCaveat(
  coherence: AgentJurorMarginals["coherence"],
  nickname: string,
): MarginalCaveat | undefined {
  const lone = coherence.lonePanelDisputes.length;
  if (lone === 0) return undefined;

  return {
    mark: "‡",
    reason: `${lone} of ${coherence.resolved} draws sat on a panel of one, where coherence is tautological.`,
    href: "/method#caveats",
    about: `Why ${nickname}'s coherence count is marked`,
  };
}
