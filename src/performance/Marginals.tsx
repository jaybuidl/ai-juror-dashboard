import { Link } from "react-router";
import styled from "styled-components";
import { VisuallyHidden } from "../styles/hidden";
import type { Figure } from "./cell";
import { type MarginalContext, marginalFiguresOf } from "./marginal-figures";
import type { RewardCoverage } from "./performance";
import type { AgentJurorMarginals } from "./totals";
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
 * grid below is drawn from. This module decides how they are *laid out* and reads none of them:
 * the arithmetic is in `totals.ts` and the gates, absences and markers are in
 * `marginal-figures.ts`, which ticket 11's agent juror view renders the same six figures from.
 * That split is why no `marginals.ts` exists beside this file to collide with it on a
 * case-insensitive filesystem (`CLAUDE.md`, TS1149).
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
  /** See `MarginalContext.scanned`. */
  scanned: boolean;
  /** See `MarginalContext.payouts`. */
  payouts: RewardCoverage;
  /** The windows the court is configured with today, against which an earlier one is named. */
  current: PeriodWindows | null;
};

export function Marginals({ marginals, scanned, payouts, current }: MarginalsProps) {
  const context: MarginalContext = { scanned, payouts, current };

  return (
    <Block>
      {marginalFiguresOf(marginals, context).map((slot) => (
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
