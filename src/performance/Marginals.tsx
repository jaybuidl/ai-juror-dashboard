import { Link } from "react-router";
import styled from "styled-components";
import { VisuallyHidden } from "../styles/hidden";
import type { Figure } from "./cell";
import { formatLatencySeconds, formatWindowSeconds } from "./latency";
import { type AgentJurorMarginals, markedWindows, type WindowChange } from "./totals";
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

const Value = styled.span<{ $tone: Figure["tone"] }>`
  font: ${({ theme }) => theme.typeMonoSm};
  /* TRAP: the font shorthand above just reset font-feature-settings, and with it the tabular
     digits base.css puts on the body. Six of these sit one under another down a column and
     another six sit beside them in the next; without this line they stop aligning and nothing
     anywhere reports it. */
  font-feature-settings: ${({ theme }) => theme.featureMono};
  font-weight: 600;
  white-space: nowrap;
  color: ${({ theme, $tone }) => {
    if ($tone === "missed" || $tone === "unread") return theme.stateFail;
    return $tone === "pending" ? theme.textPending : theme.textBody;
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
  /** The windows the court is configured with today, against which an earlier one is named. */
  current: PeriodWindows | null;
};

export function Marginals({ marginals, scanned, current }: MarginalsProps) {
  return (
    <Block>
      {slotsOf(marginals, scanned, current).map((slot) => (
        <div key={slot.key}>
          <Line>
            <Key>
              <span aria-hidden="true">{slot.label}</span>
              <VisuallyHidden>{slot.name}</VisuallyHidden>
            </Key>
            <Value $tone={slot.figure.tone}>
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
 * The four figures this ticket fills, in the artboard's order.
 *
 * A list rather than four hard-coded blocks because the block is designed to hold six: ticket 10's
 * cumulative ETH and PNK join it here, as two more entries. They are deliberately *not* rendered
 * yet as em dashes — a dash on this page means "no draws to measure", and printing one against a
 * reward figure nobody has read would state a measurement where there has been no read at all.
 * What has not been read is said in words, in the provenance footer.
 */
function slotsOf(
  marginals: AgentJurorMarginals,
  scanned: boolean,
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
  ];
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
