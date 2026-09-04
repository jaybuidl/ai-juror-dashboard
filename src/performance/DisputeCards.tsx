import { Link } from "react-router";
import styled from "styled-components";
import { Notice } from "../chrome/Failure";
import { type DisputeRowSlots, Pill, rulingLabel } from "../disputes/DisputeList";
import type { Dispute } from "../disputes/disputes";
import { isFinalised } from "../disputes/liveness";
import type { AgentJuror } from "../roster/agent-jurors";
import type { AgentJurorIdentity } from "../roster/ens";
import type { RosterView } from "../roster/useRoster";
import { VisuallyHidden } from "../styles/hidden";
import { type Tone, toneInk, toneLine, toneWash } from "../styles/tones";
import {
  type Figure,
  type Presentation,
  presentationOf,
  slotFigureOf,
  UNREAD_FIGURE,
  UNREAD_PRESENTATION,
} from "./cell";
import {
  Footnotes,
  LonePanelFootnote,
  OffRosterFootnote,
  SparsityNote,
  WindowFootnote,
} from "./Footnotes";
import { Legend, StateLegend } from "./Legend";
import { panelPillOf } from "./panel";
import type { CourtPerformance, Draw, MatrixRow } from "./performance";
import { type RowFlagContext, rowFlagOf } from "./row-flags";

/**
 * The same record as the matrix, folded to one card per dispute for a phone.
 *
 * Built against `canvas/Mobile.dc.html` — the hero at `:44-52`, the live card at `:63-78`, a
 * finalised card and its strip at `:81-95` — drawn with six slots, which is what the roster held
 * when the artboard was drawn and is now what one *line* of the strip holds — and the rule the
 * whole layout rests on at
 * `:129`. `MatrixPage` decides which of the two renders, at the one breakpoint
 * `styles/breakpoints.ts` declares, and only one of them is ever in the DOM.
 *
 * **This is not a narrower matrix.** Below the breakpoint the grid is gone entirely — not
 * scaled, not scrolled sideways, not transposed into fewer columns. What has to survive the
 * fold is the matrix's central property, and it is the only thing here that is not negotiable:
 * *column position is the agent juror*. The nth slot is the same agent juror on every card, so
 * one agent juror can still be scanned down the page the way a column is scanned across a
 * grid. That only holds if the strip is always one slot per agent juror, always in roster
 * order, always the same width and always in the same position card to card — which is why the
 * slot width is fixed and the gaps absorb the remaining width, rather than the other way round.
 *
 * Position, not line. A roster longer than one line's worth wraps (see `SLOTS_PER_LINE`), and
 * the property survives that intact: the nth agent juror is at the same x and the same line on
 * every card, because every card wraps at the same count.
 *
 * Everything rendered here comes from `buildCourtPerformance`, exactly as the matrix does. The
 * two layouts share their vocabulary through `cell.ts`, their flag precedence through
 * `row-flags.ts`, and every caveat through `Legend.tsx` and `Footnotes.tsx`, so a reader cannot
 * be told different things about one court by holding a different device.
 */

/* ─── the strip's arithmetic ───────────────────────────────────────────────────────────── */

/**
 * How many slots a line of the strip holds — the one number the phone layout is sized against.
 *
 * Six, and it is no longer the roster's length: the court drew a seventh agent juror and the two
 * quantities parted company for good (ticket 24). It stays six because six 52px slots is what a
 * 350px card at the artboard's 390pt has room for, and because a per-line count that tracked the
 * roster would re-space every card each time an agent juror joined — the third agent juror would
 * sit at a different x this week than last, which is the one property this file calls
 * non-negotiable.
 *
 * So the strip wraps instead: slot *k* is on line ⌊k / 6⌋ at position *k* mod 6, on every card, at
 * every width. Seven is a line of six and a line of one; nine is six and three. The strip grew
 * downward rather than narrower deliberately — narrower is the change that has no floor, and two
 * more agent jurors are expected within the week.
 */
export const SLOTS_PER_LINE = 6;

/**
 * One width for every slot on the page, and the reason the layout works at all.
 *
 * Six at 52px is 312px. At the artboard's 390pt the page gutter takes 20px a side and the card is
 * 350px wide, so a full-bleed strip has 38px left over for five gaps — about 7.6px each. Fixed
 * slots with elastic gaps is what keeps an agent juror in the same position on every card
 * whatever height the cards take; elastic slots would let a card with a long title and a card
 * with a short one disagree about where an agent juror sits.
 *
 * The `min()` is the floor under that, and review is what found it needed one. Below about 354pt
 * of viewport a line of six no longer fits, and because the card clips its own overflow to keep
 * its corners the sixth slot simply *vanished* — silently, with nothing in the console, breaking
 * the one property this file calls non-negotiable. The second term is the width a line of slots
 * may have once the page and the card have taken theirs, so from 354pt up this resolves to a flat
 * 52px and the artboard is met exactly; below it every slot narrows by the same amount, which
 * keeps them aligned card to card and keeps every line whole. Shrinking in unison is a smaller
 * loss than losing one.
 *
 * **`SUBTRACTED_PX` is measured against the strip's box, not the viewport's**, and the two are
 * not the same by 2px. Ticket 24 read this in a browser at 320pt and found the sixth slot
 * overhanging its card by 0.94px and being clipped by it: the term said the page's 20px gutters
 * were all that stood between the viewport and the strip, and the card's own 1px border either
 * side was missing from it. One pixel of one slot is not the vanishing this floor exists to
 * prevent, but it is the same arithmetic being wrong, and it was wrong for six slots before it
 * was wrong for seven. `getComputedStyle` could not have found it — the declared width was
 * honoured exactly, and what was short was the box it was declared against.
 *
 * **The divisor is the per-line count and not the roster's length**, which is what makes the
 * floor survive the roster growing. Divide by the roster and a seventh agent juror narrows every
 * slot on every phone to hold a line that was never going to be one line; divide by six and the
 * seventh simply starts a second line at the same width as the first.
 */
const SUBTRACTED_PX = 20 * 2 + 1 * 2;
const SLOT_WIDTH = `min(52px, calc((100vw - ${SUBTRACTED_PX}px) / ${SLOTS_PER_LINE}))`;

const SLOT_AVATAR = "36px";

/* ─── layout ───────────────────────────────────────────────────────────────────────────── */

const Section = styled.section`
  display: flex;
  flex-direction: column;
  gap: ${({ theme }) => theme.space7};
`;

const Heading = styled.h2`
  font: ${({ theme }) => theme.typeTitle1};
  letter-spacing: ${({ theme }) => theme.trackingTitle};
  color: ${({ theme }) => theme.textHeading};
`;

const Lede = styled.p`
  color: ${({ theme }) => theme.textBody};
`;

/* The caption the grid puts in its first column header: what the record amounts to, and the
   order it is in. Both are read off the model, never counted here. */
const Caption = styled.div`
  display: flex;
  flex-direction: column;
  gap: ${({ theme }) => theme.space3};
  padding-bottom: ${({ theme }) => theme.space5};
  border-bottom: 1px solid ${({ theme }) => theme.lineStrongColor};
`;

const CaptionCount = styled.div`
  font: ${({ theme }) => theme.typeMonoSm};
  font-feature-settings: ${({ theme }) => theme.featureMono};
  letter-spacing: ${({ theme }) => theme.trackingMono};
  text-transform: uppercase;
  color: ${({ theme }) => theme.textHeading};
`;

const CaptionBody = styled.div`
  font: ${({ theme }) => theme.typeBodySm};
  color: ${({ theme }) => theme.textMeta};
`;

/* The padding is load-bearing, not tidiness. A UA stylesheet gives every ul a 40px
   padding-inline-start, and there is no reset here that removes it — so without this the whole
   card stack is indented 40px and overflows the viewport by 40px to the right, which is the one
   thing this layout must never do. It looks perfect in jsdom, which lays nothing out. */
const Cards = styled.ul`
  display: flex;
  flex-direction: column;
  gap: ${({ theme }) => theme.space5};
  margin: 0;
  padding: 0;
  list-style: none;
`;

/**
 * One dispute, and the whole of it is the tap target.
 *
 * Live is marked here rather than on the slots — the ticket is explicit about it, and it is the
 * right call for a reason the artboard shows: a row of mint-tinted slots inside a mint-tinted
 * card would say one thing once per agent juror and leave nothing for the states to say. The flag rail is the
 * matrix row's, carried over unchanged, and it is painted from the flag rather than from
 * liveness so the highest-precedence mark keeps its own colour.
 */
const Card = styled.li<{ $live: boolean; $rail?: Tone }>`
  position: relative;
  display: flex;
  flex-direction: column;
  gap: ${({ theme }) => theme.space5};
  padding: ${({ theme }) => theme.space6};
  border: 1px solid
    ${({ theme, $live }) => ($live ? theme.lineMint : theme.borderCardColor)};
  border-radius: ${({ theme }) => theme.radiusCard};
  overflow: hidden;
  background-color: ${({ theme, $live }) =>
    $live ? `color-mix(in srgb, ${theme.washMint} 55%, ${theme.surfaceCard})` : theme.surfaceCard};
  box-shadow: ${({ theme, $rail }) =>
    $rail === undefined
      ? theme.shadowCard
      : `${theme.shadowCard}, inset 2px 0 0 ${toneInk(theme, $rail)}`};
`;

const CardHead = styled.div`
  display: flex;
  align-items: center;
  flex-wrap: wrap;
  gap: ${({ theme }) => theme.space4};
`;

/**
 * The way into the dispute, stretched over the card.
 *
 * The visible text is the dispute ID, per ticket 04's rule that every dispute has one and not
 * every dispute has a title — a row whose template did not resolve would otherwise be the one
 * card a reader could not open. The pseudo-element is what makes the *card* the tap target
 * rather than this 24pt of text, which is a phone requirement rather than a nicety.
 *
 * One link per card, and deliberately not a link wrapping the whole card: an anchor around all
 * of this would take the title, the metadata and every agent juror's state as its accessible
 * name. `aria-label` carries a name a screen-reader user can actually use instead.
 *
 * Focus is drawn on the stretched area rather than on the text, so a keyboard user sees the
 * card they are about to open rather than three characters of it.
 */
const CardLink = styled(Link)`
  font: ${({ theme }) => theme.typeMonoSm};
  font-feature-settings: ${({ theme }) => theme.featureMono};
  font-weight: 600;
  color: ${({ theme }) => theme.accent};
  text-decoration: none;

  &::after {
    content: "";
    position: absolute;
    inset: 0;
  }

  /* The ring belongs on the whole card rather than on the digits that name it, and both halves
     of the system's ring have to go for that: base.css gives every focusable an outline of none
     and a --ring-focus box-shadow, so suppressing the outline alone suppresses nothing and leaves
     the shadow drawing a second, smaller ring around the link text inside the one on the overlay.
     Two rings, one focus. DisputeList.tsx records the same trap on the same card-overlay shape,
     and View.tsx records it from the other side; ticket 27 found this was the one of the three
     sites that never got the note. */
  &:focus-visible {
    outline: none;
    box-shadow: none;
  }

  &:focus-visible::after {
    outline: 2px solid ${({ theme }) => theme.focusRing};
    outline-offset: -3px;
    border-radius: ${({ theme }) => theme.radiusCard};
  }
`;

const CardTitle = styled.div`
  font: ${({ theme }) => theme.typeTitle3};
  letter-spacing: ${({ theme }) => theme.trackingTitle};
  color: ${({ theme }) => theme.textHeading};
`;

/* Wraps to as many lines as it needs, which is a deliberate departure from ticket 04: a
   desktop row truncates so every row keeps one height and the list scans as a column, and a
   card has no column to keep. A phone reader gets one card at a time and the title is what
   tells them whether to open it. */
const CardMeta = styled.div`
  display: flex;
  align-items: center;
  flex-wrap: wrap;
  gap: ${({ theme }) => theme.space3};
  font: ${({ theme }) => theme.typeMonoSm};
  font-feature-settings: ${({ theme }) => theme.featureMono};
  letter-spacing: ${({ theme }) => theme.trackingMono};
  text-transform: uppercase;
  color: ${({ theme }) => theme.textPending};
`;

const MetaSeparator = styled.span`
  color: ${({ theme }) => theme.textPending};
`;

/**
 * The agent jurors along the card's foot, six to a line.
 *
 * Full-bleed past the card's padding, which buys the gaps another 32px at 390pt — the
 * difference between slots that nearly touch and slots that read as separate positions.
 * The hairline above it then spans the card, which is also what makes the strip read as the
 * card's foot rather than as one more line of its body.
 *
 * A grid of six *equal* tracks would be the obvious construction and is the wrong one: equal
 * tracks are elastic, so the third agent juror would sit at a different x on a 390pt phone than
 * on a 600pt tablet, and the one property this layout exists to preserve would hold only at one
 * width. A grid of six tracks each fixed at `SLOT_WIDTH`, spread by `justify-content`, is the
 * right one — the tracks are where the flex row put them, and the gaps still absorb the slack.
 *
 * **It is a grid rather than a wrapping flex row for the sake of the last line, and this is the
 * whole reason the construction changed.** `flex-wrap: wrap` with `space-between` puts a lone
 * seventh slot flush left, which is right by accident, and an eighth flush *right* — position 5
 * on a line where it should be position 1. The grid has no such degenerate case: a short last
 * row fills columns 1..n of the same template the full rows use, so slot *k* is at position *k*
 * mod 6 whatever the roster's length happens to be. The nth agent juror is at one x, for ever.
 *
 * Before ticket 24 this was `flex-wrap: nowrap` and the roster was six, so there was nothing to
 * wrap and the question never came up. A seventh slot in a nowrap row does not wrap and does not
 * scroll: the card clips its overflow to keep its corners, so it is simply *gone*, with nothing
 * in the console. That is the failure this element is shaped to make impossible.
 *
 * The row gap is the strip's own `padding-top`, so a second line sits the same distance below the
 * first as the first sits below the hairline.
 */
const Strip = styled.div`
  display: grid;
  grid-template-columns: repeat(${SLOTS_PER_LINE}, ${SLOT_WIDTH});
  justify-content: space-between;
  row-gap: ${({ theme }) => theme.space5};
  margin: ${({ theme }) => `0 calc(-1 * ${theme.space6})`};
  padding-top: ${({ theme }) => theme.space5};
  border-top: ${({ theme }) => theme.borderHairline};
`;

const SlotBox = styled.span<{ $tone?: Tone; $filled?: boolean }>`
  display: flex;
  /* Stated here as well as in the strip's track template, and not redundantly: the track sets
     where the slot starts and this sets how wide the box paints, which is what the tint and the
     1px inset ring are drawn against. A flex: none used to sit here and was dropped with the
     flex row — on a grid item it declares nothing. (No backticks in here: one ends the
     template.) */
  width: ${SLOT_WIDTH};
  min-height: 56px;
  flex-direction: column;
  align-items: center;
  justify-content: center;
  gap: ${({ theme }) => theme.space3};
  border-radius: ${({ theme }) => theme.radiusChip};
  background-color: ${({ theme, $tone, $filled }) =>
    $filled === true && $tone !== undefined ? toneWash(theme, $tone) : "transparent"};
  box-shadow: ${({ theme, $tone, $filled }) =>
    $filled === true && $tone !== undefined ? `inset 0 0 0 1px ${toneLine(theme, $tone)}` : "none"};
`;

/**
 * The avatar box, and the four borders it can wear.
 *
 * Two of them are dashed and they must not be confused, which the ticket calls out by name:
 * `$awaiting` is a draw that has been made and has not committed yet, and `$fallenBack` is an
 * ENS portrait this dashboard could not fetch. One is a fact about an agent juror's conduct and
 * the other a fact about a lookup. They are told apart by hue — mint against amber — and by the
 * mint glyph that sits under an awaiting slot and under nothing else, so neither rests on
 * colour alone (ADR-0006).
 *
 * Where a slot is both, the state wins and the ENS dash is lost on that one slot. Nothing goes
 * with it: an unfetched portrait already shows as two letters instead of a face, and the
 * degraded panel at the top of the page says why once for the whole page.
 */
const SlotAvatar = styled.span<{ $tone?: Tone; $awaiting?: boolean; $fallenBack?: boolean }>`
  display: flex;
  width: ${SLOT_AVATAR};
  height: ${SLOT_AVATAR};
  flex: none;
  align-items: center;
  justify-content: center;
  overflow: hidden;
  border-radius: ${({ theme }) => theme.radiusTile};
  border: ${({ theme, $tone, $awaiting, $fallenBack }) => {
    if ($awaiting === true) return `1px dashed ${theme.lineMint}`;
    if ($tone === "work" || $tone === "fail") return `1px solid ${toneLine(theme, $tone)}`;
    if ($fallenBack === true) return `1px dashed ${theme.lineAmber}`;
    return theme.borderVisible;
  }};
  background-color: ${({ theme }) => theme.surfaceInset};
  font: ${({ theme }) => theme.typeMonoSm};
  font-feature-settings: ${({ theme }) => theme.featureMono};
  color: ${({ theme }) => theme.textMeta};
  text-transform: uppercase;
`;

const SlotPortrait = styled.img`
  width: 100%;
  height: 100%;
  object-fit: cover;
`;

/* The glyph and the one figure, on one line. Baseline-aligned so a glyph and a duration sit on
   the same line however the digits are set. */
const SlotFigure = styled.span`
  display: flex;
  align-items: baseline;
  justify-content: center;
  gap: ${({ theme }) => theme.space1};
`;

const SlotGlyph = styled.span<{ $tone: Tone }>`
  flex: none;
  font: ${({ theme }) => theme.typeMonoSm};
  font-size: 10px;
  line-height: 1.2;
  color: ${({ theme, $tone }) => toneInk(theme, $tone)};
`;

/**
 * The figure, at the artboard's 9.5px.
 *
 * Small, and smaller than anything on the desktop, because a 52pt slot has to hold "54m 12s"
 * beside a glyph. Nothing rests on reading it alone: the same duration is on the dispute's own
 * view one tap away, and the state it belongs to is carried by the glyph and by the slot's
 * accessible name. Ticket 18 owns the type sizes across the whole dashboard and this is one of
 * the figures it will have to weigh.
 *
 * The ink follows the *figure* where the figure is not a measurement — pending stays pending
 * and a missed or unread one stays rose — and follows the *state* where it is, which is what
 * the artboard draws: a coherent duration in heading ink, a diverged one in amber, a live one
 * in mint. `nowrap` is required rather than cosmetic: a latency reads "6m 41s", and letting it
 * wrap would break a single measurement across two lines at the space.
 */
const SlotValue = styled.span<{ $tone: Figure["tone"]; $state: Tone }>`
  font: ${({ theme }) => theme.typeMonoSm};
  /* TRAP: the font shorthand above just reset font-feature-settings, and with it the tabular
     digits base.css puts on body. Without this line a strip of latencies stops lining up down
     the page and nothing anywhere says so. */
  font-feature-settings: ${({ theme }) => theme.featureMono};
  font-size: 9.5px;
  font-weight: 600;
  line-height: 1.2;
  white-space: nowrap;
  color: ${({ theme, $tone, $state }) => {
    if ($tone === "missed" || $tone === "unread") return theme.stateFail;
    if ($tone === "pending") return theme.textPending;
    return $state === "pass" ? theme.textHeading : toneInk(theme, $state);
  }};
`;

/* The blank position, at the size the desktop draws it. Nothing else: no avatar, no glyph, no
   figure, no fill and no border, so an agent juror that was not drawn can never be read as one
   that failed to act. */
const SlotDot = styled.span`
  width: 3px;
  height: 3px;
  border-radius: 50%;
  /* theme.textDisabled, for the reason Legend's own Dot gives: the two are one mark at two
     sizes, and they cannot drift apart in ink any more than they may in meaning. */
  background-color: ${({ theme }) => theme.textDisabled};
`;

const Empty = styled.p`
  color: ${({ theme }) => theme.textBody};
`;

/* ─── the view ─────────────────────────────────────────────────────────────────────────── */

export type DisputeCardsProps = {
  performance: CourtPerformance;
  /** Nicknames and avatars for the slots. The roster is what they are keyed on. */
  roster: RosterView;
  /** How ticket 04 supplies each card's title and category. */
  slotsFor?: (dispute: Dispute) => DisputeRowSlots;
  /** The present, in epoch milliseconds. A prop and never a clock here — see `MatrixProps`. */
  now?: number;
};

export function DisputeCards({
  performance,
  roster,
  slotsFor,
  now = Date.now(),
}: DisputeCardsProps) {
  const { agentJurors, rows, totals, commitCoverage, parameters } = performance;
  const flagContext: RowFlagContext = { current: parameters.current, now };
  const unread = commitCoverage.expected - commitCoverage.resolved;
  const identityOf = new Map(
    roster.entries.map(({ agentJuror, identity }) => [agentJuror.address, identity]),
  );
  // `isResolving` as well as `isResolvedFromEns`: the second is false while the lookup is out
  // and after it fails, and a mark keyed on it alone would dash every avatar on every cold load.
  const fallenBack = !roster.isResolving && !roster.isResolvedFromEns;

  return (
    <Section aria-labelledby="cards-heading">
      <Heading id="cards-heading">The matrix</Heading>
      <Lede>
        The same record, folded to one card per dispute. Column position is the agent juror, on
        every card: the sixth slot is the same agent juror here as on the card above it, whether or
        not that agent juror was drawn. Each slot carries one figure — the latency of the most
        recent thing that draw did. Tap a card for both latencies, the ballot and the published
        reasoning.
      </Lede>

      {rows.length === 0 ? (
        <Empty>
          The subgraph returned no disputes for court 34. That is what was read, not a finding that
          the court has held none.
        </Empty>
      ) : (
        <>
          {/* The same cross-check the grid states, gated the same way — until the log scan has
              come back every commitment is unresolved, and saying so would announce a failure
              that has not happened — but deliberately *not* in the same words.

              The grid can say "those cells read Not read", because every cell there has a commit
              slot. A card slot shows one figure and it is the commit only while a reveal is still
              ahead, so on a court whose shortfall sits mostly in finalised disputes nothing on
              this page reads "Not read" at all. Transcribing the grid's sentence would send a
              reader hunting for a string that is not there — and would leave the shortfall itself
              unstated on this layout, which is the failure the cross-check exists to prevent.
              So it says where the affected figures live instead. */}
          {commitCoverage.read && unread > 0 && (
            <Notice $tone="rose" role="status">
              {commitCoverage.resolved === 0
                ? `None of the ${commitCoverage.expected} commitments this court recorded could be read from Arbitrum, so no commit latency is a measurement.`
                : `${unread} of the ${commitCoverage.expected} commitments this court recorded could not be found on Arbitrum, so those commit latencies are unknown.`}{" "}
              That is a read that came back short, not an agent juror that failed to commit. Commit
              latency is not on a card's face at all — it is on each dispute's own page, where an
              affected draw says so in its own words. Reveal latency and coherence come from the
              subgraph and are unaffected.
            </Notice>
          )}

          {/* Ticket 16's open question, answered here and recorded on the ticket: the legend and
              the sparsity note reach a phone reader by being rendered inline at the head of the
              card list, always visible and never behind a control or a link.

              One mechanism, used for both, and it is the head of the list rather than its foot
              on purpose. The desktop puts the sparsity note under the grid, where a reader
              arrives having already seen the whole thing; a phone reader scrolling a stack of
              cards may never reach the foot, and this is the note that prevents a *misreading*
              rather than answering a question a reader knows they have. A blank slot means an
              agent juror was not drawn, and a reader who has not been told that reads it as one
              that failed to act — which is the distinction ticket 05 exists to protect.

              Collapsing the pair behind a disclosure was the alternative and was rejected for
              the same reason: `CLAUDE.md` requires caveats visible in the UI rather than merely
              handled correctly in code, and a reader who does not know they have been misled
              does not go looking. */}
          <Legend>
            <StateLegend unknown={totals.unreadDisputes.length > 0} />
          </Legend>
          <SparsityNote performance={performance} noun="slot" />

          <Caption>
            <CaptionCount>
              {totals.finalised} finalised · {totals.live} live
            </CaptionCount>
            <CaptionBody>
              Newest first. One card per dispute, one slot per agent juror, one slot per draw.
            </CaptionBody>
          </Caption>

          <Cards>
            {rows.map((row) => (
              <DisputeCard
                key={row.dispute.id}
                row={row}
                agentJurors={agentJurors}
                identityOf={identityOf}
                fallenBack={fallenBack}
                scanned={commitCoverage.read}
                slots={slotsFor?.(row.dispute)}
                flagContext={flagContext}
              />
            ))}
          </Cards>

          <Footnotes>
            <WindowFootnote performance={performance} />
            <OffRosterFootnote performance={performance} />
            <LonePanelFootnote performance={performance} />
          </Footnotes>
        </>
      )}
    </Section>
  );
}

/**
 * One dispute's card.
 *
 * The head holds the dispute ID and then either the flag pill or the metadata, and the
 * metadata drops below the title wherever a pill took its place. That is one rule covering both
 * of the artboard's cards — its live card puts the pill beside the ID and the metadata under
 * the title, and its finalised card has no pill and puts the metadata beside the ID — rather
 * than two cases keyed on liveness, which would leave a finalised dispute carrying a window or
 * lone-panel flag with two things competing for one line.
 */
function DisputeCard({
  row,
  agentJurors,
  identityOf,
  fallenBack,
  scanned,
  slots,
  flagContext,
}: {
  row: MatrixRow;
  agentJurors: readonly AgentJuror[];
  identityOf: Map<string, AgentJurorIdentity | undefined>;
  fallenBack: boolean;
  scanned: boolean;
  slots: DisputeRowSlots | undefined;
  flagContext: RowFlagContext;
}) {
  const { dispute } = row;
  const flag = rowFlagOf(row, flagContext);
  const live = !isFinalised(dispute);
  const title = slots?.title;
  const category = slots?.category;
  const panel = panelPillOf(row);

  const meta = (
    <CardMeta>
      {category !== undefined && category !== null && category !== "" && (
        <>
          <span>{category}</span>
          <MetaSeparator aria-hidden="true">·</MetaSeparator>
        </>
      )}
      {/* Never a blank where the ruling sits: a dispute the court has not decided reads
          "Pending", and an empty slot there is indistinguishable from one that failed to load. */}
      <span>{rulingLabel(dispute.ruling)}</span>
      {/* Only where there is no panel to see, and the separator goes with it — a middot left
          behind by an absent neighbour is the same defect the matrix row carried until its own
          second line stopped wrapping. `panelPillOf` is where the two surviving cases are
          decided, shared with that row: a dispute whose draws were never read, and one the
          court has not drawn a panel for yet. The size is gone from both layouts, because a
          card's slots are the count in the same way a row's cells are. */}
      {panel !== null && (
        <>
          <MetaSeparator aria-hidden="true">·</MetaSeparator>
          <Pill $tone={panel.tone}>{panel.text}</Pill>
        </>
      )}
    </CardMeta>
  );

  return (
    <Card $live={live} $rail={flag?.tone}>
      <CardHead>
        <CardLink
          to={`/disputes/${dispute.id}`}
          aria-label={
            typeof title === "string" && title !== ""
              ? `Dispute ${dispute.id}: ${title}`
              : `Dispute ${dispute.id}`
          }
        >
          {dispute.id}
        </CardLink>
        {flag !== undefined ? (
          <Pill $tone={flag.tone}>
            <span aria-hidden="true">{flag.glyph}</span>
            {flag.label(row, flagContext)}
          </Pill>
        ) : (
          meta
        )}
      </CardHead>

      {/* Rendered even when empty, so a dispute whose template did not resolve keeps a card of
          the same shape as one whose did rather than collapsing onto its metadata. */}
      <CardTitle>{title}</CardTitle>

      {flag !== undefined && meta}

      <Strip>
        {agentJurors.map((agentJuror, column) => (
          <Slot
            key={agentJuror.address}
            agentJuror={agentJuror}
            identity={identityOf.get(agentJuror.address)}
            // Order matters, and it is the same order the matrix's cells are chosen in: an
            // unread dispute's cells are all null, so testing for null first would draw a
            // "not drawn" dot for every agent juror — an unread state rendering as a fact
            // about the court.
            draw={row.read ? (row.cells[column] ?? null) : null}
            read={row.read}
            fallenBack={fallenBack}
            scanned={scanned}
          />
        ))}
      </Strip>
    </Card>
  );
}

/**
 * One agent juror's position on one card.
 *
 * Three shapes and no more. A draw is an avatar, a glyph and one figure. No draw is a single
 * dot, in that agent juror's fixed position, carrying nothing that could be read as conduct. A
 * dispute whose draws were never read is the loudest of the three rather than the emptiest —
 * rose, a border, a glyph and a word — because the emptiest thing here already means something
 * else, and means it about an agent juror.
 *
 * The word naming the state does not fit under a 36pt avatar and is not on the slot's face. It
 * is in the slot's accessible name instead, alongside the agent juror's nickname, so no state
 * rests on hue alone: ADR-0006's greyscale test is met by the glyph, and the word stays
 * reachable. That is also what makes the strip readable at all to a screen reader, which cannot
 * see that the third slot is the third agent juror.
 */
function Slot({
  agentJuror,
  identity,
  draw,
  read,
  fallenBack,
  scanned,
}: {
  agentJuror: AgentJuror;
  identity: AgentJurorIdentity | undefined;
  draw: Draw | null;
  read: boolean;
  fallenBack: boolean;
  scanned: boolean;
}) {
  const nickname = identity?.nickname ?? agentJuror.nickname;

  if (!read) {
    return (
      <SlotState
        agentJuror={agentJuror}
        identity={identity}
        presentation={UNREAD_PRESENTATION}
        figure={UNREAD_FIGURE}
        fallenBack={fallenBack}
      />
    );
  }

  if (draw === null) {
    return (
      <SlotBox>
        {/* The full stop is doing the same job as the comma the matrix's row header carries:
            the slots are siblings with no whitespace between them, and accessible-name
            computation normalises whitespace out from between adjacent nodes — so without it the
            strip announced as one run-on string and a reader could not tell where one agent
            juror's reading ended and the next began. */}
        <VisuallyHidden>{`${nickname}: Not drawn. `}</VisuallyHidden>
        <SlotDot aria-hidden="true" />
      </SlotBox>
    );
  }

  return (
    <SlotState
      agentJuror={agentJuror}
      identity={identity}
      presentation={presentationOf(draw.state)}
      figure={slotFigureOf(draw, scanned)}
      fallenBack={fallenBack}
      awaiting={draw.state.kind === "live" && draw.state.stage === "awaiting"}
    />
  );
}

/** A slot with something in it: the avatar, the glyph, the figure and the word behind them. */
function SlotState({
  agentJuror,
  identity,
  presentation,
  figure,
  fallenBack,
  awaiting = false,
}: {
  agentJuror: AgentJuror;
  identity: AgentJurorIdentity | undefined;
  presentation: Presentation;
  figure: Figure;
  fallenBack: boolean;
  awaiting?: boolean;
}) {
  const nickname = identity?.nickname ?? agentJuror.nickname;
  // The live family is the one state the slot does not fill: the card carries it whole, by its
  // own border and tint, and a card of tinted slots inside a tinted card would say one thing
  // once per agent juror with nothing left for the states to say.
  const filled = presentation.filled && presentation.tone !== "live";

  return (
    <SlotBox $tone={presentation.tone} $filled={filled}>
      {/* First, so a screen reader hears which agent juror and what happened before the
          duration it happened in — and terminated, so the slots do not run together into
          one string. The blank slot above is punctuated the same way; the two used to disagree,
          one ending in a comma and one in nothing. */}
      <VisuallyHidden>{`${nickname}: ${presentation.word}, `}</VisuallyHidden>
      <SlotAvatar
        $tone={presentation.tone}
        $awaiting={awaiting}
        $fallenBack={fallenBack}
        aria-hidden="true"
      >
        {identity?.avatarUrl ? (
          <SlotPortrait src={identity.avatarUrl} alt="" loading="lazy" />
        ) : (
          agentJuror.nickname.slice(0, 2)
        )}
      </SlotAvatar>
      <SlotFigure>
        <SlotGlyph $tone={presentation.tone} aria-hidden="true">
          {presentation.glyph}
        </SlotGlyph>
        <SlotValue $tone={figure.tone} $state={presentation.tone}>
          {figure.text}
        </SlotValue>
      </SlotFigure>
    </SlotBox>
  );
}
