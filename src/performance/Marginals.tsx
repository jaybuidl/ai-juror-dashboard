import { Link } from "react-router";
import styled from "styled-components";
import { VisuallyHidden } from "../styles/hidden";
import type { Figure } from "./cell";
import type { Density } from "./density";
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
 *
 * Ticket 17 then gave this block a second *density*, which is a third rendering of those same
 * six readings rather than a second set of them: the compact header keeps the three figures
 * `MarginalFigure.dense` marks and drops the other three, and it drops nothing else. Which three
 * survive is decided in `marginal-figures.ts` beside the figures themselves, so the order and
 * the arithmetic stay one thing and a compact header is the comfortable header with three lines
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

/* Amber, and the same amber the row flag and the stat tiles' mark carry: one caveat is one
   colour, or a reader meets what looks like a second kind of qualification. */
const Mark = styled(Link)`
  margin-left: ${({ theme }) => theme.space2};
  font: ${({ theme }) => theme.typeMonoSm};
  color: ${({ theme }) => theme.stateWork};
  text-decoration: none;

  &:hover {
    text-decoration: underline;
  }

  &:focus-visible {
    /* The house ring, not an underline. Underlining is a fine hover affordance and a poor focus
       one when the whole link is a single dagger: a 7px glyph gaining a 7px rule under it is not
       a discernible indicator, and it is the only thing marking where the keyboard is. */
    outline: 2px solid ${({ theme }) => theme.focusRing};
    outline-offset: 3px;
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
  /**
   * How tightly the matrix around this header is drawn — `densityOf(rows.length)`.
   *
   * The same flag the cell and the dispute row read, so the three cannot come to disagree about
   * which density the reader is in. At the compact density this block keeps three of its six
   * figures and every marker on the three it keeps: a caveat is never among what density drops,
   * and the reason line under a marked figure is the thing that makes the marker mean something.
   */
  density: Density;
};

export function Marginals({ marginals, scanned, payouts, current, density }: MarginalsProps) {
  const context: MarginalContext = { scanned, payouts, current };
  const compact = density === "compact";
  /* Built at either density and filtered, rather than branched on inside `marginalFiguresOf`:
     the agent juror view takes all six and this header takes three of them, and both are reading
     one list in one order. */
  const slots = marginalFiguresOf(marginals, context).filter((slot) => !compact || slot.dense);

  return (
    <Block>
      {slots.map((slot) => (
        <div key={slot.key}>
          <Line>
            <Key>
              <span aria-hidden="true">{slot.label}</span>
              <VisuallyHidden>{slot.name}</VisuallyHidden>
            </Key>
            <Value $tone={slot.figure.tone} $loss={slot.loss}>
              {slot.figure.text}
              {slot.caveat && (
                <Mark
                  to={slot.caveat.href}
                  // The reason joins the mark's own name at the compact density, where it is no
                  // longer drawn below the figure. Nothing is lost to a reader who is hearing
                  // this page; what changes is how many pixels of a frozen header it costs one
                  // who is looking at it.
                  aria-label={
                    compact ? `${slot.caveat.about}: ${slot.caveat.reason}` : slot.caveat.about
                  }
                >
                  <span aria-hidden="true">{slot.caveat.mark}</span>
                </Mark>
              )}
            </Value>
          </Line>
          {/*
            The trade ticket 06 pointed this ticket at, taken.

            Its hand-off: "a sticky header that is a third of a viewport on the widest column",
            answered "by a compact density that trades the reason lines for the footnotes below
            the grid, by a header that collapses on scroll, or by something else". Measured in a
            browser at this density the header was 295px of a 900px viewport, frozen, over rows
            43px tall — seven rows of matrix behind a header that never moves. Eight of those
            lines were columbo's three reasons.

            **The marker is what survives, and it is not the caveat's only voice.** It stays on
            the figure, it stays a link to the full account at `/method`, its reason is in its
            accessible name, and the ‡ and † footnotes below the grid state both facts in full
            at either density. What density drops here is the fourth telling.
          */}
          {slot.caveat && !compact && <Reason>{slot.caveat.reason}</Reason>}
        </div>
      ))}
    </Block>
  );
}
