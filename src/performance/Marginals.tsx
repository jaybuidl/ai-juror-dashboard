import { Link } from "react-router";
import styled from "styled-components";
import { VisuallyHidden } from "../styles/hidden";
import { type Figure, UNREAD_FIGURE } from "./cell";
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
 * One agent juror's summary, in the header of that agent juror's own column.
 *
 * Built against `canvas/Main.dc.html:136-152` — a hairline under the identity block, then one
 * line per figure with its key on the left and its value on the right — and
 * `canvas/JurorEmpty.dc.html:66-76` for what an agent juror that has never been drawn shows.
 * The markers come from `canvas/Errors.dc.html:201-217`: the mark on the number, the reason one
 * line below it, the full account one click away.
 *
 * Agent jurors are the columns of this matrix, so a column's summary belongs to the column. There
 * is no seventh column and no margin of its own, and nothing here is sorted or ranked: these are
 * marginals on a matrix, and the order is the roster's.
 *
 * Every figure comes from `AgentJurorMarginals`, which the seam computed over the same rows the
 * grid below is drawn from. This module decides how they are read and computes none of them —
 * the arithmetic lives in `totals.ts`, which is also why no `marginals.ts` exists beside this
 * file to collide with it on a case-insensitive filesystem (`CLAUDE.md`, TS1149).
 */

/** A caveat riding one figure: the mark, why, and where the whole of it is written down. */
type Caveat = {
  /** The same glyph the matrix's row flag and its footnote use for the same fact. */
  mark: string;
  /** One line, directly below the number, saying how many of the counted draws are affected. */
  reason: string;
  href: string;
  /** The mark is the link, and six columns of them need telling apart by ear. */
  about: string;
};

type Slot = {
  key: string;
  /** The artboard's abbreviation, which is all a 148px column has room for. */
  label: string;
  /** The same key spelled out, for a reader who is hearing the column rather than scanning it. */
  name: string;
  figure: Figure;
  caveat?: Caveat;
  /** Whether this figure is a net loss, which takes amber on top of its own sign character. */
  loss?: boolean;
};

/* The hairline the artboard puts between the identity block and the figures under it. */
const Block = styled.div`
  margin-top: ${({ theme }) => theme.space4};
  padding-top: ${({ theme }) => theme.space3};
  border-top: ${({ theme }) => theme.borderHairline};
`;

const Line = styled.div`
  display: flex;
  align-items: baseline;
  justify-content: space-between;
  gap: ${({ theme }) => theme.space3};
  padding: 2px 0;
`;

const Key = styled.span`
  flex: none;
  font: ${({ theme }) => theme.typeMonoSm};
  font-size: 9px;
  letter-spacing: ${({ theme }) => theme.trackingMono};
  text-transform: uppercase;
  color: ${({ theme }) => theme.textPending};
`;

const Value = styled.span<{ $tone: Figure["tone"]; $loss?: boolean }>`
  font: ${({ theme }) => theme.typeMonoSm};
  /* TRAP: the font shorthand above just reset font-feature-settings, and with it the tabular
     digits base.css puts on the body. Six of these sit one under another down a column and
     another six sit beside them in the next; without this line they stop aligning and nothing
     anywhere reports it. */
  font-feature-settings: ${({ theme }) => theme.featureMono};
  font-weight: 600;
  white-space: nowrap;
  color: ${({ theme, $tone, $loss }) => {
    if ($tone === "missed" || $tone === "unread") return theme.stateFail;
    if ($tone === "pending") return theme.textPending;
    /* Amber for a net PNK loss, exactly as canvas/Main.dc.html:259 inks it — and strictly the
       second signal. The sign is a character in the value itself, so the figure reads the same
       in greyscale and to someone who cannot separate amber from body ink (ADR-0006). This is
       a flag of its own rather than a fifth `Figure` tone because a loss is not a state a
       *cell* can be in: the shared type stays what a cell says. */
    return $loss === true ? theme.stateWork : theme.textBody;
  }};
`;

/* Amber, and the same amber the row flag and the stat tiles' mark carry: one caveat is one
   colour, or a reader meets what looks like a second kind of qualification. */
const Mark = styled(Link)`
  margin-left: ${({ theme }) => theme.space2};
  font: ${({ theme }) => theme.typeMonoSm};
  color: ${({ theme }) => theme.stateWork};
  text-decoration: none;

  &:hover,
  &:focus-visible {
    text-decoration: underline;
  }
`;

const Reason = styled.p`
  margin-top: ${({ theme }) => theme.space1};
  font: ${({ theme }) => theme.typeBodySm};
  font-size: 10px;
  line-height: 1.45;
  /* It counts draws, so the shorthand above has to be undone here too. */
  font-feature-settings: ${({ theme }) => theme.featureNumeric};
  font-weight: 400;
  color: ${({ theme }) => theme.textMeta};
  text-wrap: pretty;
`;

export type MarginalsProps = {
  marginals: AgentJurorMarginals;
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
   * fields, because these two figures are **sums**. Every other figure in this block degrades to
   * an em dash when it cannot be taken; a sum degrades to `0.0000`, in the ink of a measurement.
   * So both an unstarted read and a *short* one have to be caught before the arithmetic, and
   * `read` alone catches only the first.
   */
  payouts: RewardCoverage;
  /** The windows the court is configured with today, against which an earlier one is named. */
  current: PeriodWindows | null;
};

export function Marginals({ marginals, scanned, payouts, current }: MarginalsProps) {
  return (
    <Block>
      {slotsOf(marginals, scanned, payouts, current).map((slot) => (
        <div key={slot.key}>
          <Line>
            <Key>
              <span aria-hidden="true">{slot.label}</span>
              <VisuallyHidden>{slot.name}</VisuallyHidden>
            </Key>
            <Value $tone={slot.figure.tone} $loss={slot.loss}>
              {slot.figure.text}
              {slot.caveat && (
                <Mark to={slot.caveat.href} aria-label={slot.caveat.about}>
                  <span aria-hidden="true">{slot.caveat.mark}</span>
                </Mark>
              )}
            </Value>
          </Line>
          {slot.caveat && <Reason>{slot.caveat.reason}</Reason>}
        </div>
      ))}
    </Block>
  );
}

/**
 * The six figures, in the artboard's order.
 *
 * A list rather than six hard-coded blocks because the block was designed to hold six and held
 * four until ticket 10: the last two entries are cumulative ETH and net PNK, under the same
 * hairline as the four above them and not in a summary column of their own
 * (`canvas/Main.dc.html:136-152`).
 *
 * Nothing here is ranked and nothing reorders: the order is the artboard's, and the rewards sit
 * last because they are supporting context beside the marginals rather than a dimension this
 * dashboard measures agent jurors on.
 */
function slotsOf(
  marginals: AgentJurorMarginals,
  scanned: boolean,
  payouts: RewardCoverage,
  current: PeriodWindows | null,
): Slot[] {
  const { nickname } = marginals.agentJuror;
  const { revealLatency, commitLatency, coherence, changedWindows } = marginals;

  return [
    {
      key: "reveal",
      label: "Med rev",
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
      label: "Med com",
      name: "Median commit latency",
      figure: commitFigure(marginals, scanned),
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
      label: "Coherent",
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
      label: "Draws",
      name: "Draws, and the vote IDs they hold",
      // The one figure that reads as a real zero: never having been drawn is a measurement of
      // the court's random selection, not an absence of one. The vote count sits beside it
      // because the two differ — 61 votes were 44 draws across the first thirteen disputes.
      figure: { text: `${marginals.draws} · ${marginals.votes}v`, tone: "value" },
    },
    {
      key: "eth",
      label: "Eth",
      name: "Cumulative ETH earned",
      figure: rewardFigure(marginals, payouts, (rewards) => formatEthWei(rewards.ethWei)),
    },
    {
      key: "pnk",
      label: "Pnk",
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
 * The same shape as `commitFigure` above and for a sharper version of the same reason. Every
 * other figure in this block degrades to an em dash when it cannot be taken; these two are sums,
 * and a sum's natural degradation is `0.0000` — a number, in the ink of a measurement, saying
 * an agent juror earned nothing. So every gate comes first and the arithmetic last:
 *
 * - **The read is not in.** Pending ink and a dash. `read` is false while the subgraph is being
 *   asked *and* after it refused, which is the fourth recurrence of that trap in `CLAUDE.md` —
 *   the failed half is the banner's to say, and this only has to not lie in the meantime.
 * - **Never drawn.** Pending ink and a dash, which is what `canvas/JurorEmpty.dc.html:66-76`
 *   draws and what the four figures above already do. baskerville has no on-chain presence at
 *   all; there is nothing here to have earned. Asked *before* the shortfall below, because a
 *   column with no draws has nothing that could have been read short.
 * - **The read came back short.** Ticket 13's Unknown — rose, and the word "Not read" beside it,
 *   exactly as the commit median states the same thing one gate up. This is the case the whole
 *   `short` flag exists for: without it a reindexing subgraph's `[]` renders as six columns of
 *   `0.0000`, and a wrong figure is worse than an absent one on a page that may be cited.
 * - **Drawn, read whole, and paid nothing.** A real zero, because that is a measurement: the
 *   court has executed nothing this agent juror was drawn in. The ticket asks for exactly this
 *   distinction — "a zero is a measurement and a dash is the absence of one".
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
 * The commit median, and the one place a missing log must not read as a missing commitment.
 *
 * Three absences, exactly as `commitFigureOf` tells them apart one level down. A median that has
 * not been read yet is a step not reached and takes pending ink; a median that could not be read
 * over commitments the subgraph says exist is ticket 13's Unknown, which is rose and says so in
 * words; and no commitments at all is nothing to measure, which is the em dash again.
 */
function commitFigure(marginals: AgentJurorMarginals, scanned: boolean): Figure {
  const median = marginals.commitLatency?.median;
  if (median !== undefined) return { text: formatLatencySeconds(median), tone: "value" };
  if (scanned && marginals.commitments > 0) return { text: "Not read", tone: "unread" };
  return { text: "—", tone: "pending" };
}

/**
 * The dagger, and which of the two windows it is actually about.
 *
 * Court 34 changed its commit window and its vote window at the same moment, so both medians
 * carry a marker today. A court that changed only one of them would put the marker on only the
 * median that window governs — which is why this compares against what the court holds now
 * rather than marking anything in a group. `windowFlagLabel` in `Matrix.tsx` makes the same
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
}): Caveat | undefined {
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
): Caveat | undefined {
  const lone = coherence.lonePanelDisputes.length;
  if (lone === 0) return undefined;

  return {
    mark: "‡",
    reason: `${lone} of ${coherence.resolved} draws sat on a panel of one, where coherence is tautological.`,
    href: "/method#caveats",
    about: `Why ${nickname}'s coherence count is marked`,
  };
}
