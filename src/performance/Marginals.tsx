import styled from "styled-components";
import { VisuallyHidden } from "../styles/hidden";
import type { Figure } from "./cell";
import type { Density } from "./density";
import { type MarginalContext, marginalFiguresOf } from "./marginal-figures";
import type { RewardCoverage } from "./performance";
import type { AgentJurorMarginals } from "./totals";

/**
 * One agent juror's summary, in the header of that agent juror's own column.
 *
 * Built against `canvas/Main.dc.html:136-152` — a hairline under the identity block, then one
 * line per figure with its key on the left and its value on the right — and
 * `canvas/JurorEmpty.dc.html:66-76` for what an agent juror that has never been drawn shows.
 * The caveat marks that rode these figures were removed on 2026-09-24 (maintainer's ruling);
 * /method carries the prose.
 *
 * Agent jurors are the columns of this matrix, so a column's summary belongs to the column. There
 * is no extra column and no margin of its own, and nothing here is sorted or ranked: these are
 * marginals on a matrix, and the order is the roster's.
 *
 * Every figure comes from `AgentJurorMarginals`, which the seam computed over the same rows the
 * grid below is drawn from. This module decides how they are *laid out* and reads none of them:
 * the arithmetic is in `totals.ts` and the gates and absences are in
 * `marginal-figures.ts`, which ticket 11's agent juror view renders the same six figures from.
 * That split is why no `marginals.ts` exists beside this file to collide with it on a
 * case-insensitive filesystem (`CLAUDE.md`, TS1149).
 *
 * Ticket 17 then gave this block a second *density*, which is a third rendering of those same
 * six readings rather than a second set of them: the compact header keeps the four figures
 * `MarginalFigure.dense` marks and drops the other two, and it drops nothing else. Which four
 * survive is decided in `marginal-figures.ts` beside the figures themselves, so the order and
 * the arithmetic stay one thing and a compact header is the comfortable header with two lines
 * removed — never a second block that happens to agree with it.
 */

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

export type MarginalsProps = {
  marginals: AgentJurorMarginals;
  /** See `MarginalContext.scanned`. */
  scanned: boolean;
  /** See `MarginalContext.payouts`. */
  payouts: RewardCoverage;
  /**
   * How tightly the matrix around this header is drawn — `densityOf(rows.length)`.
   *
   * The same flag the cell and the dispute row read, so the three cannot come to disagree about
   * which density the reader is in. At the compact density this block keeps four of its six
   * figures.
   */
  density: Density;
};

export function Marginals({ marginals, scanned, payouts, density }: MarginalsProps) {
  const context: MarginalContext = { scanned, payouts };
  const compact = density === "compact";
  /* Built at either density and filtered, rather than branched on inside `marginalFiguresOf`:
     the agent juror view takes all six and this header takes four of them, and both are reading
     one list in one order. */
  const slots = marginalFiguresOf(marginals, context).filter((slot) => !compact || slot.dense);

  return (
    <Block>
      {slots.map((slot) => (
        <Line key={slot.key}>
          <Key>
            <span aria-hidden="true">{slot.label}</span>
            <VisuallyHidden>{slot.name}</VisuallyHidden>
          </Key>
          <Value $tone={slot.figure.tone} $loss={slot.loss}>
            {slot.figure.text}
          </Value>
        </Line>
      ))}
    </Block>
  );
}
