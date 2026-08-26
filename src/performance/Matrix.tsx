import { Link } from "react-router";
import styled, { css } from "styled-components";
import { Notice } from "../chrome/Failure";
import { DisputeRow, type DisputeRowSlots } from "../disputes/DisputeList";
import type { Dispute } from "../disputes/disputes";
import { isFinalised } from "../disputes/liveness";
import type { RosterView } from "../roster/useRoster";
import { belowCompactGrid, COMPACT_GRID_MIN_PX, useFitsCompactGrid } from "../styles/breakpoints";
import { VisuallyHidden } from "../styles/hidden";
import { type Tone, toneInk, toneLine, toneWash } from "../styles/tones";
import {
  commitFigureOf,
  commitMedianFigureOf,
  type Figure,
  presentationOf,
  revealFigureOf,
  UNREAD_FIGURE,
  UNREAD_PRESENTATION,
} from "./cell";
import { CELL_HEIGHT_PX, COMPACT_CELL_HEIGHT_PX, type Density, densityOf } from "./density";
import { Footnotes, LonePanelFootnote, SparsityNote, WindowFootnote } from "./Footnotes";
import { Dot, Legend, LegendGroup, LegendItem, StateLegend } from "./Legend";
import { railFraction } from "./latency";
import { Marginals } from "./Marginals";
import { panelPillOf } from "./panel";
import type { CourtPerformance, Draw, MatrixRow } from "./performance";
import { type RowFlagContext, rowFlagOf } from "./row-flags";
import { rowCommitLatencyOf } from "./totals";

/**
 * The dispute matrix: one row per dispute, one column per agent juror, one cell per draw.
 *
 * Built against `canvas/Main.dc.html:112-223` — the legend, the grid, the row it hangs off and
 * the footnote cards — and `canvas/Cell.dc.html:43-174` for the cell's anatomy and all five of
 * its states. The artboards lay it out as a CSS grid; this is a real `<table>`, because the
 * association between a cell, its dispute and its agent juror is the whole content of a sparse
 * matrix, and a grid of divs leaves a screen-reader user to reconstruct it from position.
 *
 * Everything rendered here comes from `buildCourtPerformance`. This file computes no latency
 * and decides no coherence; it decides how they are read.
 */

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
  max-width: 68ch;
  color: ${({ theme }) => theme.textBody};
`;

/**
 * How the grid meets a page narrower than it is, which is every page at the comfortable density.
 *
 * The matrix is 1328px at the canvas's measurements — a 440px row header and six 148px columns —
 * and this page's container is 1200. So it scrolls sideways in its own box rather than pushing
 * the page, which is what ticket 16 spared the phone and what this keeps for the desktop.
 *
 * **Absent at the compact density, and it has to be.** `overflow-x: auto` makes this element a
 * scroll container in *both* axes: `overflow-y`'s computed value beside it is `auto` rather than
 * `visible`, per CSS Overflow 3. A `position: sticky` header inside a scroll container sticks to
 * that container's scrollport and not to the page — and this box never scrolls vertically, so the
 * frozen column header would simply never freeze. Nothing throws, nothing warns, and jsdom lays
 * nothing out, so no test here could see it. The compact grid fits its container instead of
 * overflowing it (see `Table`), which is what leaves nothing to scroll.
 *
 * Below `breakpoints.compactGrid` it comes back, because there the compact grid does not fit
 * either: its columns would fall under the width a compact cell needs and the durations would
 * spill into the column beside them. The reader gets the sideways box the comfortable density
 * always has, and loses the freeze with it — every other reduction still holds.
 */
const TableScroll = styled.div<{ $compact: boolean }>`
  ${({ $compact }) =>
    $compact
      ? css`
          ${belowCompactGrid} {
            overflow-x: auto;
          }
        `
      : css`
          overflow-x: auto;
        `}
`;

/**
 * Fixed and full-width at the compact density, fixed-pixel at the comfortable one.
 *
 * The artboard draws both densities on a 1440px page where 1328px of grid fits with room to
 * spare. This page's container is 1200, so at the compact density the columns take a share of
 * what there is rather than a measurement that does not fit — which is what lets the header
 * freeze against the page rather than inside a sideways-scrolling box. Nothing about the record
 * changes with it: six columns, in roster order, every one of them on screen.
 *
 * 40% and six of 10% is 100%, and at this page's container that is a 441px row header against the
 * artboard's 440 and 110px columns against its 148. The row header keeps the artboard's width
 * because that is where the shortfall bites: a one-line row carries an id, a title, a flag, a
 * panel and a figure, and it was measured in a browser at 34% with the title down to nothing.
 */
const ROW_HEADER_SHARE = "40%";
const COLUMN_SHARE = "10%";

const Table = styled.table<{ $compact: boolean }>`
  border-collapse: collapse;
  border-top: ${({ theme }) => theme.borderHairline};
  ${({ $compact }) =>
    $compact &&
    css`
      table-layout: fixed;
      width: 100%;
      /* The floor a compact cell needs — a glyph, a duration and its rail — six times over,
         beside the row header. Under it the box above scrolls rather than crushing them. */
      min-width: ${COMPACT_GRID_MIN_PX}px;
    `}
`;

/**
 * The corner cell, which freezes with the header it is part of.
 *
 * Sticky at the compact density and given a background of its own, since a transparent cell that
 * outlives the rows scrolling under it shows them through. With `border-collapse: collapse` the
 * table paints the borders rather than the cell, and a sticky cell leaves its bottom border
 * behind as it moves — so the hairline travels as an inset shadow instead.
 */
const CaptionCell = styled.th<{ $compact: boolean }>`
  width: ${({ $compact }) => ($compact ? ROW_HEADER_SHARE : "440px")};
  box-sizing: border-box;
  padding: ${({ theme }) => `${theme.space6} ${theme.space6} ${theme.space5} 0`};
  border-bottom: 1px solid ${({ theme }) => theme.lineStrongColor};
  text-align: left;
  vertical-align: bottom;
  font-weight: inherit;
  ${({ theme, $compact }) =>
    $compact &&
    css`
      position: sticky;
      top: 0;
      z-index: 1;
      background-color: ${theme.page};
      border-bottom: none;
      box-shadow: inset 0 -1px 0 ${theme.lineStrongColor};
    `}
`;

const CaptionCount = styled.div`
  font: ${({ theme }) => theme.typeMonoSm};
  font-feature-settings: ${({ theme }) => theme.featureMono};
  letter-spacing: ${({ theme }) => theme.trackingMono};
  text-transform: uppercase;
  color: ${({ theme }) => theme.textHeading};
`;

const CaptionBody = styled.div`
  margin-top: ${({ theme }) => theme.space4};
  font: ${({ theme }) => theme.typeBodySm};
  color: ${({ theme }) => theme.textMeta};
`;

/* Top-aligned since the marginals landed underneath the identity, and it has to be: a column
   carrying a marker's reason line is taller than the five beside it, and bottom alignment would
   push that column's nickname and avatar down while the other five stayed put — six identity
   blocks at five different heights, from one footnote. */
const AgentColumn = styled.th<{ $compact: boolean }>`
  width: ${({ $compact }) => ($compact ? COLUMN_SHARE : "148px")};
  box-sizing: border-box;
  padding: ${({ theme }) => `${theme.space6} ${theme.space5} ${theme.space5}`};
  border-left: ${({ theme }) => theme.borderHairline};
  border-bottom: 1px solid ${({ theme }) => theme.lineStrongColor};
  text-align: left;
  vertical-align: top;
  font-weight: inherit;
  /* Frozen at the compact density, so a reader hundreds of rows down still knows which agent
     juror each column belongs to. The freeze is this row's alone — the dispute rows, the legend
     and the footnotes scroll past it, and the page keeps one scroll context. */
  ${({ theme, $compact }) =>
    $compact &&
    css`
      position: sticky;
      top: 0;
      z-index: 1;
      background-color: ${theme.page};
      border-bottom: none;
      box-shadow: inset 0 -1px 0 ${theme.lineStrongColor};
    `}
`;

const AgentIdentity = styled.div`
  display: flex;
  align-items: center;
  gap: ${({ theme }) => theme.space4};
  min-width: 0;
`;

const Avatar = styled.img`
  width: 26px;
  height: 26px;
  flex: none;
  border-radius: ${({ theme }) => theme.radiusChip};
  border: ${({ theme }) => theme.borderHairline};
  object-fit: cover;
  background-color: ${({ theme }) => theme.page};
`;

/* Dashed when the initials stand in for a portrait ENS could not be fetched, matching the roster
   card and Errors.dc.html:152. The panel above the page says ENS is unreachable once; this is
   what says which elements it reached, on the elements themselves. */
const AvatarFallback = styled.span<{ $fallenBack?: boolean }>`
  display: flex;
  width: 26px;
  height: 26px;
  flex: none;
  align-items: center;
  justify-content: center;
  border-radius: ${({ theme }) => theme.radiusChip};
  border: ${({ theme, $fallenBack }) =>
    $fallenBack === true ? `1px dashed ${theme.lineAmber}` : theme.borderVisible};
  background-color: ${({ theme }) => theme.surfaceInset};
  font: ${({ theme }) => theme.typeMonoSm};
  font-feature-settings: ${({ theme }) => theme.featureMono};
  color: ${({ theme }) => theme.textMeta};
  text-transform: uppercase;
`;

const AgentNames = styled.span`
  display: flex;
  flex-direction: column;
  gap: ${({ theme }) => theme.space1};
  min-width: 0;
`;

/* A link to that agent juror's own view, and no `aria-label` on it. The name of a
   `columnheader` is built from its content, so labelling the link would rename the column and
   with it every cell that answers to it — the same trap `DisputeRow` records against the
   dispute id. The text is the name; the destination is where the six figures below it are
   printed at length. Keyed on the roster nickname while it displays the resolved one. */
const AgentNickname = styled(Link)<{ $drawn: boolean }>`
  font: ${({ theme }) => theme.typeTitle3};
  letter-spacing: ${({ theme }) => theme.trackingTitle};
  color: ${({ theme, $drawn }) => ($drawn ? theme.textHeading : theme.textMeta)};
  overflow: hidden;
  text-overflow: ellipsis;
  white-space: nowrap;
  text-decoration: none;

  &:hover {
    color: ${({ theme }) => theme.accent};
    text-decoration: underline;
  }

  &:focus-visible {
    outline: 2px solid ${({ theme }) => theme.focusRing};
    outline-offset: 3px;
  }
`;

/* The line-height inside `--type-mono-sm`, named so the reserved height below is derived from
   the token rather than transcribed from a browser. */
const STACK_LINE_HEIGHT = 1.2;

const AgentStack = styled.span`
  font: ${({ theme }) => theme.typeMonoSm};
  font-feature-settings: ${({ theme }) => theme.featureMono};
  letter-spacing: ${({ theme }) => theme.trackingMono};
  text-transform: uppercase;
  color: ${({ theme }) => theme.textPending};

  /* Two lines held whether this one needs them or not, because the slot carries two different
     kinds of string: a stack name for an agent juror the court has drawn, and the words "never
     drawn" for one it has not. The longer of those wraps at this column width and the shorter
     does not, which put baskerville's six figures 13px below the five columns beside it — one
     measure at two heights across a header whose whole purpose is to be read across. Reserving
     the taller case makes that baseline a property of the layout rather than of whichever
     strings the roster happens to hold, so a longer stack name cannot reintroduce it either.
     The slot is set to display block because a bare inline box ignores a min-height. */
  display: block;
  min-height: ${STACK_LINE_HEIGHT * 2}em;
`;

/**
 * A row whose dispute is still being decided, marked so it is found without being read.
 *
 * Three carriers, per `canvas/Main.dc.html:302-306`: the flag pill above, this tint across the
 * row, and the rail down its left edge. The pill is the one that says what is happening; these
 * two are what make the row findable in a column of forty, and neither carries meaning alone —
 * ADR-0006.
 *
 * **The two answer different questions**, which the artboard is careful about and it would be
 * easy to collapse. Its `bg` is mint exactly when the dispute is live; its `mark` is the colour
 * of whichever flag the row is wearing — amber for a lone panel or a changed window, mint for
 * live. So a lone panel that is still being decided has an amber rail over a mint tint, and a
 * finalised lone panel has the rail with no tint at all. Painting the rail from liveness instead
 * would leave the highest-precedence flag on the row marked in the colour of a lower one.
 *
 * The rail is an inset shadow rather than a border because a border on one row and not another
 * shifts that row's contents two pixels sideways, which reads as a rendering fault in a grid
 * whose whole job is alignment.
 *
 * Half a wash: the artboard tints the row at roughly half the strength it tints a live cell, so
 * that the cells still read as the stronger mark where they sit on top of it. The token set has
 * one mint wash rather than two, so the second strength is mixed down from it here rather than
 * invented as a value in `theme.ts` — which holds aliases and no colours of its own.
 */
const BodyRow = styled.tr<{ $live: boolean; $rail?: Tone }>`
  ${({ theme, $live }) =>
    $live &&
    css`
      background-color: color-mix(in srgb, ${theme.washMint} 50%, transparent);
    `}
  ${({ theme, $rail }) =>
    $rail !== undefined &&
    css`
      box-shadow: inset 2px 0 0 ${toneInk(theme, $rail)};
    `}
`;

const RowHeaderCell = styled.th<{ $compact: boolean }>`
  width: ${({ $compact }) => ($compact ? ROW_HEADER_SHARE : "440px")};
  box-sizing: border-box;
  padding: 0;
  text-align: left;
  vertical-align: middle;
  font-weight: inherit;
`;

/**
 * The cell, at whichever height the density stands at.
 *
 * `height` on a table cell is a minimum, so declaring the comfortable one changes nothing about
 * what it already drew — three lines and their padding come to about this on their own. It is
 * declared so that the compact cell can be half of it and be seen to be: the artboards give two
 * different pixels for the compact cell (44px on `Cell.dc.html`, a 40px row on
 * `MatrixDense.dc.html`), so ticket 17 asks for the ratio and leaves the pixel open.
 */
const CellBox = styled.td<{ $tone?: Tone; $filled?: boolean; $compact?: boolean }>`
  width: ${({ $compact }) => ($compact === true ? COLUMN_SHARE : "148px")};
  height: ${({ $compact }) =>
    $compact === true ? `${COMPACT_CELL_HEIGHT_PX}px` : `${CELL_HEIGHT_PX}px`};
  box-sizing: border-box;
  padding: ${({ theme, $compact }) =>
    $compact === true ? `0 ${theme.space5}` : `${theme.space4} ${theme.space5}`};
  border-left: ${({ theme }) => theme.borderHairline};
  border-bottom: ${({ theme }) => theme.borderHairline};
  vertical-align: middle;
  background-color: ${({ theme, $tone, $filled }) =>
    $filled && $tone !== undefined ? toneWash(theme, $tone) : "transparent"};
  box-shadow: ${({ theme, $tone, $filled }) =>
    $filled && $tone !== undefined ? `inset 0 0 0 1px ${toneLine(theme, $tone)}` : "none"};
`;

const EmptyCell = styled(CellBox)`
  text-align: center;
`;

const CellHead = styled.div`
  display: flex;
  align-items: center;
  gap: ${({ theme }) => theme.space3};
`;

const Glyph = styled.span<{ $tone: Tone }>`
  font: ${({ theme }) => theme.typeMonoSm};
  font-size: 12px;
  color: ${({ theme, $tone }) => toneInk(theme, $tone)};
`;

const Verdict = styled.span<{ $tone: Tone }>`
  font: ${({ theme }) => theme.typeMonoSm};
  font-size: 9px;
  letter-spacing: 0.1em;
  text-transform: uppercase;
  color: ${({ theme, $tone }) => toneInk(theme, $tone)};
`;

/* Absent whenever it would say ×1, which is 40 of the 56 draws: on a page of cells, an
   annotation that is almost always the same number is noise. */
const VoteCount = styled.span`
  margin-left: auto;
  font: ${({ theme }) => theme.typeMonoSm};
  font-feature-settings: ${({ theme }) => theme.featureMono};
  font-size: 9px;
  color: ${({ theme }) => theme.textPending};
`;

const Measure = styled.div<{ $context?: boolean; $compact?: boolean }>`
  display: flex;
  align-items: center;
  gap: ${({ theme }) => theme.space3};
  /* Tighter above the commit line than above the reveal, so the two read as one block with a
     headline and its context rather than as two measurements of equal standing. The compact
     cell has one measure and nothing above it, so it has nothing to be spaced from. */
  margin-top: ${({ theme, $context, $compact }) =>
    $compact === true ? "0" : $context === true ? theme.space2 : theme.space4};
`;

const MeasureKey = styled.span`
  flex: none;
  width: 7px;
  font: ${({ theme }) => theme.typeMonoSm};
  font-size: 9px;
  letter-spacing: 0.1em;
  color: ${({ theme }) => theme.textPending};
`;

const MeasureValue = styled.span<{ $tone: Figure["tone"] }>`
  flex: none;
  /* Wide enough for a duration; "Not read" and "Not dated" are wider, and a fixed width would
     either clip them or set every latency column to the width of a word. */
  min-width: 56px;
  font: ${({ theme }) => theme.typeMono};
  /* TRAP: the font shorthand above just reset font-feature-settings, and with it the tabular
     digits base.css puts on body. Without this line a column of latencies stops lining up and
     nothing anywhere says so. */
  font-feature-settings: ${({ theme }) => theme.featureMono};
  font-weight: 600;
  white-space: nowrap;
  color: ${({ theme, $tone }) => {
    if ($tone === "missed" || $tone === "unread") return theme.stateFail;
    return $tone === "pending" ? theme.textPending : theme.textHeading;
  }};
`;

/* Decoration, and only ever beside the number it echoes: logarithmic from 1s to 1h, because
   the record spans 7 seconds to 54 minutes and a linear bar renders most of it as nothing.
   Ticket 07 hangs commit latency on the same scale. */
const Rail = styled.span<{ $compact?: boolean }>`
  /* Allowed to shrink at the compact density and never to grow: the column is a share of the
     page there rather than 148px, and a rail that refused to give way would push the duration
     beside it out of a narrow window — the figure is the carrier and the rail is the decoration,
     so the rail is what yields. */
  flex: ${({ $compact }) => ($compact === true ? "0 1 34px" : "none")};
  width: ${({ $compact }) => ($compact === true ? "34px" : "42px")};
  height: 3px;
  border-radius: 999px;
  overflow: hidden;
  background-color: ${({ theme }) => theme.surfaceRaised};
`;

const RailFill = styled.span`
  display: block;
  height: 3px;
  border-radius: 999px;
  background-color: ${({ theme }) => theme.accent};
`;

/* Reveal latency is the figure the experiment is about, so it is the largest thing in the cell
   and the only one in heading ink. Commit latency sits below it in the same unit and on the same
   rail, a step smaller and a step dimmer, so it reads as context for the reveal rather than as a
   competing number. */
const CommitValue = styled(MeasureValue)`
  font: ${({ theme }) => theme.typeMonoSm};
  /* TRAP: a second font shorthand, so a second reset of font-feature-settings. Without this the
     commit line loses its tabular digits while the reveal above it keeps them, and a column of
     cells stops lining up in a way nothing reports. */
  font-feature-settings: ${({ theme }) => theme.featureMono};
  font-weight: 600;
  color: ${({ theme, $tone }) => {
    if ($tone === "missed" || $tone === "unread") return theme.stateFail;
    return $tone === "pending" ? theme.textPending : theme.textBody;
  }};
`;

/* The same rail, quieter: one scale shared by both measures is what lets a 7-second reveal and a
   54-minute commit be compared by eye at all. */
const CommitRailFill = styled(RailFill)`
  background-color: ${({ theme }) => theme.accentQuiet};
`;

/* The one sentence the dense artboard adds to the legend row, at its right-hand end. */
const VolumeNote = styled.p`
  margin-left: auto;
  max-width: 46ch;
  font: ${({ theme }) => theme.typeBodySm};
  /* It counts columns and disputes, so the shorthand's reset has to be undone here too. */
  font-feature-settings: ${({ theme }) => theme.featureNumeric};
  color: ${({ theme }) => theme.textMeta};
  text-wrap: pretty;
`;

/* The row's own measure, at the end of the one line a compact row has. Nothing about it is new
   ink: the key and the value are the cell's, at the grain of a dispute.

   The key is widened here rather than in `MeasureKey`, which is 7px because a cell's key is one
   letter. "MED C" in 7px overlapped the duration beside it — legible in a browser, invisible to
   jsdom, and exactly the class of defect this repo keeps finding by opening the page. */
const RowMeasure = styled.span`
  display: inline-flex;
  align-items: baseline;
  gap: ${({ theme }) => theme.space3};
  white-space: nowrap;

  ${MeasureKey} {
    width: auto;
  }
`;

const Empty = styled.p`
  max-width: 68ch;
  color: ${({ theme }) => theme.textBody};
`;

/* ─── the view ─────────────────────────────────────────────────────────────────────────── */

export type MatrixProps = {
  performance: CourtPerformance;
  /** Nicknames and avatars for the column headers. The roster is what they are keyed on. */
  roster: RosterView;
  /** How ticket 04 supplies each row header's title and category. */
  slotsFor?: (dispute: Dispute) => DisputeRowSlots;
  /**
   * The present, in epoch milliseconds — the one thing on this page that is not read from the
   * chain.
   *
   * Here rather than below the seam because `buildCourtPerformance` reads no clock, and a prop
   * rather than a `Date.now()` buried in the flag so that a test can pin it. No timer drives
   * it: while anything in the court is live the whole model is re-read every five seconds and
   * this re-renders with it, and while nothing is live there is no elapsed figure to keep.
   */
  now?: number;
};

/**
 * A cell in a row whose draws were never read.
 *
 * Every slot where a figure belongs says so in words, which is the criterion: a reader can name
 * which rows are evidence and which are a gap without consulting the legend. It carries no rail,
 * because a rail is a picture of a number and there is no number.
 *
 * Deliberately the same anatomy as `DrawCell` rather than a smaller, quieter tile. An unread
 * row must be the loudest thing in the grid, not the emptiest — the emptiest thing here already
 * means something else, and means it about an agent juror.
 */
/**
 * Which draw this is, said at the head of every cell.
 *
 * A cell carries a state and two latencies and nothing that says whose they are: the grid says
 * that, in two dimensions, to a reader who can see it. `scope` gets a screen reader most of the
 * way — the row header and the column header are associated — but they are announced on crossing
 * into a new row or column, not on every cell, and not at all in the linear browse mode most
 * reading happens in. A cell that announces "Coherent, reveal latency 46s" has dropped the two
 * facts that make it a measurement rather than a number.
 *
 * The roster nickname, never the resolved one. The column header above displays whatever ENS
 * returned, because that is the name its operator publishes; this is the name the dashboard
 * keys, routes and joins on, and CONTEXT.md is explicit that the two are different things.
 */
function CellWhere({ nickname, disputeId }: { nickname: string; disputeId: number }) {
  return <VisuallyHidden>{`${nickname}, dispute ${disputeId}. `}</VisuallyHidden>;
}

function UnreadCell({
  density,
  nickname,
  disputeId,
}: {
  density: Density;
  nickname: string;
  disputeId: number;
}) {
  const compact = density === "compact";

  return (
    <CellBox
      $tone={UNREAD_PRESENTATION.tone}
      $filled={UNREAD_PRESENTATION.filled}
      $compact={compact}
    >
      <CellWhere nickname={nickname} disputeId={disputeId} />
      {!compact && (
        <CellHead>
          <Glyph $tone={UNREAD_PRESENTATION.tone} aria-hidden="true">
            {UNREAD_PRESENTATION.glyph}
          </Glyph>
          <Verdict $tone={UNREAD_PRESENTATION.tone}>{UNREAD_PRESENTATION.word}</Verdict>
        </CellHead>
      )}
      <Measure $compact={compact}>
        {compact ? (
          <>
            <Glyph $tone={UNREAD_PRESENTATION.tone} aria-hidden="true">
              {UNREAD_PRESENTATION.glyph}
            </Glyph>
            {/* The word the compact cell stops drawing is still said, because the glyph beside
                it is decoration and a reader hearing this page has nothing else to go on. What
                density costs is the ink, never the record. */}
            <VisuallyHidden>{UNREAD_PRESENTATION.word}. Reveal latency</VisuallyHidden>
          </>
        ) : (
          <>
            <MeasureKey aria-hidden="true">R</MeasureKey>
            <VisuallyHidden>Reveal latency</VisuallyHidden>
          </>
        )}
        <MeasureValue $tone={UNREAD_FIGURE.tone}>{UNREAD_FIGURE.text}</MeasureValue>
      </Measure>
      {!compact && (
        <Measure $context>
          <MeasureKey aria-hidden="true">C</MeasureKey>
          <VisuallyHidden>Commit latency</VisuallyHidden>
          <CommitValue $tone={UNREAD_FIGURE.tone}>{UNREAD_FIGURE.text}</CommitValue>
        </Measure>
      )}
    </CellBox>
  );
}

/**
 * One draw, at whichever density the grid is in.
 *
 * One component behind one flag rather than two components, per ticket 17 — and the reduction is
 * closed: the commit line goes with its figure, its `C` key and its rail; the state word, the
 * vote-count annotation and the `R` key go with it. What survives is reveal latency and the
 * coherence state, the reveal rail riding the figure it belongs to, and the glyph, fill and
 * border that keep the five states apart with hue removed (ADR-0006).
 *
 * The `R` key goes because one latency needs no key to name it. The commit figure is not lost
 * with it — the dispute row carries the median over that row's draws, per the corner cell.
 */
function DrawCell({
  draw,
  scanned,
  density,
  nickname,
  disputeId,
}: {
  draw: Draw;
  scanned: boolean;
  density: Density;
  nickname: string;
  disputeId: number;
}) {
  const presentation = presentationOf(draw.state);
  const figure = revealFigureOf(draw);
  const commit = commitFigureOf(draw, scanned);
  const compact = density === "compact";

  return (
    <CellBox $tone={presentation.tone} $filled={presentation.filled} $compact={compact}>
      <CellWhere nickname={nickname} disputeId={disputeId} />
      {!compact && (
        <CellHead>
          <Glyph $tone={presentation.tone} aria-hidden="true">
            {presentation.glyph}
          </Glyph>
          <Verdict $tone={presentation.tone}>{presentation.word}</Verdict>
          {draw.voteCount > 1 && (
            <VoteCount>
              <VisuallyHidden>{draw.voteCount} vote IDs</VisuallyHidden>
              <span aria-hidden="true">×{draw.voteCount}</span>
            </VoteCount>
          )}
        </CellHead>
      )}
      <Measure $compact={compact}>
        {compact ? (
          <>
            <Glyph $tone={presentation.tone} aria-hidden="true">
              {presentation.glyph}
            </Glyph>
            <VisuallyHidden>{presentation.word}. Reveal latency</VisuallyHidden>
          </>
        ) : (
          <>
            <MeasureKey aria-hidden="true">R</MeasureKey>
            <VisuallyHidden>Reveal latency</VisuallyHidden>
          </>
        )}
        <MeasureValue $tone={figure.tone}>{figure.text}</MeasureValue>
        {draw.revealLatencySeconds !== null && (
          <Rail aria-hidden="true" $compact={compact}>
            <RailFill style={{ width: `${railFraction(draw.revealLatencySeconds) * 100}%` }} />
          </Rail>
        )}
      </Measure>
      {!compact && (
        <Measure $context>
          <MeasureKey aria-hidden="true">C</MeasureKey>
          <VisuallyHidden>Commit latency</VisuallyHidden>
          <CommitValue $tone={commit.tone}>{commit.text}</CommitValue>
          {draw.commitLatencySeconds !== null && (
            <Rail aria-hidden="true">
              <CommitRailFill
                style={{ width: `${railFraction(draw.commitLatencySeconds) * 100}%` }}
              />
            </Rail>
          )}
        </Measure>
      )}
    </CellBox>
  );
}

/**
 * The commit figure the compact grid moves onto the dispute row.
 *
 * `MatrixDense.dc.html:64` states the move in the corner cell and does not draw it, so this is
 * where the ticket fixes what it says: the median over *this row's* dated commitments, named as
 * a median and counted, because a row holds up to six draws and one figure cannot be all of
 * them. An unlabelled duration on a row of six cells is a number a reader would have to guess at.
 *
 * Absent where there is nothing to say and never blank where there is: the three absences are
 * the ones every commit figure on this page tells apart, in `commitMedianFigureOf`.
 *
 * **`MED C` is doing the naming, and the count of draws behind it is said rather than drawn.**
 * The row is 441px wide and already carries an id, a title, a flag and a panel; "· 4 draws"
 * measured 40 of those pixels, and they come out of the title. What the criterion is protecting
 * against is a bare duration read as *the* commit latency of a dispute holding up to six draws,
 * and "MED" is what prevents that — a median is by construction not one draw's figure. The count
 * is in the accessible name, where it costs nothing, and the panel size sits beside it either way.
 */
function RowCommit({ row, scanned }: { row: MatrixRow; scanned: boolean }) {
  const { latency, commitments } = rowCommitLatencyOf(row);
  // An unread row's cells are all null, so the reduction above counts no commitment and the
  // figure would fall through to the em dash this design defines as "nothing to measure" — an
  // unread state stating a fact about the court, in the one figure the row carries. Its six
  // cells and its flag all say "Not read"; so does this. The same order `Matrix` draws the row
  // in, and for the same reason: read first, then anything the cells could tell you.
  const figure = row.read
    ? commitMedianFigureOf(latency?.median, commitments, scanned)
    : UNREAD_FIGURE;
  const counted = row.read ? (latency?.seconds.length ?? 0) : 0;

  return (
    <RowMeasure>
      <MeasureKey aria-hidden="true">MED C</MeasureKey>
      <VisuallyHidden>
        {counted > 0
          ? `Median commit latency across ${counted} ${counted === 1 ? "draw" : "draws"} in this dispute`
          : "Median commit latency in this dispute"}
      </VisuallyHidden>
      <CommitValue $tone={figure.tone}>{figure.text}</CommitValue>
    </RowMeasure>
  );
}

export function Matrix({ performance, roster, slotsFor, now = Date.now() }: MatrixProps) {
  const { agentJurors, rows, totals, marginals, commitCoverage, parameters, rewards } = performance;
  const flagContext: RowFlagContext = { current: parameters.current, now };
  // One flag, read by the cell, the dispute row and the column header alike. It switches on how
  // many disputes the model holds, so the matrix crosses into the compact density on its own as
  // the court grows — no upper bound on the dispute range is written anywhere, here or below the
  // seam, and there is no control on the page for a reader to set this with.
  const density = densityOf(rows.length);
  const compact = density === "compact";
  // Whether the grid's own box is a scroll container right now, which is the only condition
  // under which it should be a tab stop. Mirrors `TableScroll`'s `overflow-x` exactly.
  const fitsCompactGrid = useFitsCompactGrid();
  const scrolls = !compact || !fitsCompactGrid;
  const unread = commitCoverage.expected - commitCoverage.resolved;
  const identityOf = new Map(
    roster.entries.map(({ agentJuror, identity }) => [agentJuror.address, identity]),
  );
  // `isResolving` as well as `isResolvedFromEns`: the second is false while the lookup is out
  // and after it fails, and a mark keyed on it alone would dash every avatar on every cold load.
  const fallenBack = !roster.isResolving && !roster.isResolvedFromEns;

  // How many rows are a gap rather than a record. The sparsity figures themselves moved onto
  // `CourtTotals` with ticket 16, which gave the same disputes a second layout: two reductions
  // of "how much of this court is blank" are two chances for a desktop and a phone to disagree
  // about it. This one stays because it is a rendering decision — which legend entries to name,
  // and whether "never drawn" is sayable at all.
  const unreadRows = totals.unreadDisputes.length;
  // Read off the model and never reduced here, for the reason ticket 16 moved these figures onto
  // `CourtTotals` in the first place: this is now a third rendering of one record, and three
  // reductions of "how much of this court is blank" are three chances to disagree about it.
  const sparsity = totals.sparsity;
  // Read disputes the court has actually drawn a panel for — what a claim about who has never
  // been drawn has to rest on. Subtracted from the model's own two counts rather than scanned
  // for here, so it is the same set `emptyColumns` is taken over.
  const panelled = sparsity.disputes - sparsity.undrawnDisputes.length;

  return (
    <Section aria-labelledby="matrix-heading">
      <Heading id="matrix-heading">The matrix</Heading>
      {/* Two forms, for the reason the caveat card above this page has two: a sentence naming a
          figure is a claim about the rendering the reader is looking at, and past the threshold
          the cell has no commit figure in it. The corner cell says where that figure went; this
          would have gone on promising it in the cell, two elements above the correction. */}
      <Lede>
        One row per dispute, one column per agent juror, one cell per draw.{" "}
        {compact
          ? "Each cell says how long that agent juror took to reveal its vote after the vote period opened, and whether it voted with the dispute's final ruling; commit latency is on the row at this density, as a median over that dispute's draws."
          : "Each cell says how long that agent juror took to reveal its vote after the vote period opened, how long it took to commit after the commit period opened, and whether it voted with the dispute's final ruling."}{" "}
        Both durations are absolute and neither is a fraction of its window, because this court
        changed its period lengths midway through the experiment. Coherence is only asserted where
        the court has ruled: a dispute still in its appeal period has votes in it and no ruling, and
        its cells say so rather than reporting a majority as a result.
      </Lede>

      {rows.length === 0 ? (
        <Empty>
          The subgraph returned no disputes for court 34. That is what was read, not a finding that
          the court has held none.
        </Empty>
      ) : (
        <>
          {/* `read` gates this and not just the count: until the log scan has come back,
              every commitment is unresolved and saying so would announce a failure that has
              not happened — on every cold load, because the chain answers slower than the
              subgraph and this page deliberately does not wait for it. */}
          {commitCoverage.read && unread > 0 && (
            // Rose rather than the amber a missing title gets, because this changes a figure and
            // that changes a label. The shared component is ticket 13's: what were three separate
            // Notice definitions in three files, added by three tickets that never met, is now
            // one. The banner above the page says the same failure the other way round — this is
            // the half that sits where the missing figures are.
            <Notice $tone="rose" role="status">
              {/* The cross-check ADR-0004 asks for, said in the one place a reader is looking
                  at the figures it affects. A truncating endpoint returns fewer logs and no
                  error, so without this sentence the page would simply show fewer commit
                  latencies — an absence indistinguishable from a fact. */}
              {/* Where the missing figures actually are, which the density moved. At the
                  comfortable density every draw has a commit slot and the short ones say so in
                  words; past the threshold no cell carries a commit figure at all, and a row's
                  median goes quietly short instead — it is taken over the commitments that were
                  dated, and only says "Not read" where none of that row's could be. Sending a
                  reader to look for cells that read "Not read" on a grid whose cells have no
                  commit line is ticket 16's own review finding, one reduction later. */}
              {commitCoverage.resolved === 0
                ? `None of the ${commitCoverage.expected} commitments this court recorded could be read from Arbitrum, so no commit latency below is a measurement.`
                : compact
                  ? `${unread} of the ${commitCoverage.expected} commitments this court recorded could not be found on Arbitrum, so each row's median commit is taken over fewer draws than that dispute holds, and a row where none could be found reads "Not read".`
                  : `${unread} of the ${commitCoverage.expected} commitments this court recorded could not be found on Arbitrum, and those cells read "Not read".`}{" "}
              That is a read that came back short, not an agent juror that failed to commit. Reveal
              latency and coherence come from the subgraph and are unaffected.
            </Notice>
          )}

          <Legend>
            {/* The states themselves are shared with the phone's card list — they are
                ADR-0006's vocabulary rather than the grid's. The rails below are not: they
                annotate a cell, and a card has neither. */}
            <StateLegend unknown={unreadRows > 0} />
            {/* The rails, keyed to what the cells actually carry at this density. The compact
                cell has one rail and no key beside it, so keying a `C` rail here would decode a
                mark no cell wears — ticket 07 left that instruction against this very group. */}
            <LegendGroup>
              <LegendItem>
                {!compact && <span aria-hidden="true">R</span>}Reveal
                <Rail aria-hidden="true" $compact={compact}>
                  <RailFill style={{ width: "62%" }} />
                </Rail>
              </LegendItem>
              {!compact && (
                <LegendItem>
                  <span aria-hidden="true">C</span>Commit
                  <Rail aria-hidden="true">
                    <CommitRailFill style={{ width: "71%" }} />
                  </Rail>
                </LegendItem>
              )}
              <LegendItem>Rail: 1s — 1h, log</LegendItem>
            </LegendGroup>
            {/* `MatrixDense.dc.html:117`, and it earns its place at this density and not at the
                other: a reader who has scrolled through hundreds of rows of mostly-empty grid is
                the one who starts reading the blanks as a fault. The counts themselves are the
                sparsity note's below — this says the one thing volume tempts a reader to assume
                away, and it says it from the same `totals.sparsity` the note quotes so the two
                can never disagree about one court. */}
            {compact && (
              <VolumeNote>
                {sparsity.emptyColumns > 0 &&
                  `${sparsity.emptyColumns === 1 ? "One agent juror is" : `${sparsity.emptyColumns} agent jurors are`} still blank across all ${sparsity.disputes} disputes read here. `}
                Sparsity does not resolve with volume — a longer matrix is a taller sparse matrix,
                not a fuller one.
              </VolumeNote>
            )}
          </Legend>

          {/* Focusable and named *when it scrolls*, and only then. The comfortable grid is wider
              than most viewports and this box is what moves; a scroll container with nothing
              focusable inside it that a keyboard can reach is a region only a pointer can pan
              (WCAG 2.1.1), and the far columns do not exist for anyone else. `role="region"` is
              what makes the name announceable, and the name is what makes the tab stop
              explicable rather than a mystery stop on an empty box.

              The condition mirrors the `overflow-x` rule on `TableScroll` exactly, because at
              the compact density the box is only a scroll container below `compactGrid` — ticket
              17 had to drop it above that width, since a scroll container breaks the sticky
              header inside it. Unconditional attributes here would leave a named, focusable
              region on the ordinary desktop compact case that cannot scroll at all: a dead tab
              stop whose accessible name says it is scrollable. */}
          <TableScroll
            $compact={compact}
            {...(scrolls
              ? { role: "region" as const, "aria-label": "The matrix, scrollable", tabIndex: 0 }
              : {})}
          >
            <Table $compact={compact}>
              {/* The table's own name, and the first child of <table> because a caption may be
                  nothing else. Without it the grid announces as "table" and a reader has to
                  infer the two axes from the headers. The corner cell below carries prose that
                  is close to this, but it is prose about the *density* and it is drawn; this
                  says what the thing is. */}
              <VisuallyHidden as="caption">
                The matrix. One row per dispute, newest first; one column per agent juror, in roster
                order; one cell per draw.
              </VisuallyHidden>
              <thead>
                <tr>
                  {/* No `scope`. It is the corner cell — it sits above the row headers and to the
                      left of the column headers, and heads neither. With `scope="col"` on it the
                      paragraph inside became the declared column header of every row header in
                      the grid, so a reader moving down the disputes met this sentence again and
                      again as though it named them. */}
                  <CaptionCell $compact={compact}>
                    {/* Read off the model rather than reduced here. It is a court-wide count,
                        and those live on `CourtTotals` beside the ones the stat tiles print —
                        a caption that reduced the rows itself would be a second definition of
                        "finalised" sitting one component away from the first. */}
                    <CaptionCount>
                      {totals.finalised} finalised · {totals.live} live
                    </CaptionCount>
                    {/* What the density did, said where a reader meets the grid rather than left
                        to be noticed. A figure that is simply gone is a figure a reader who knew
                        it was there will go looking for; this is the corner cell of
                        `MatrixDense.dc.html:62-65`, which states the reduction as a choice. */}
                    <CaptionBody>
                      {compact
                        ? "Newest first. Reveal latency and coherence survive at this density; commit latency moves to the row, as a median over that dispute's own draws."
                        : "Newest first. One row per dispute, one column per agent juror, one cell per draw."}
                    </CaptionBody>
                  </CaptionCell>
                  {agentJurors.map((agentJuror, column) => {
                    const identity = identityOf.get(agentJuror.address);
                    const marginal = marginals[column];
                    // The column's own draw count, read off the model rather than scanned for
                    // here a second time. It is the same question the marginal below already
                    // answers, and two reductions of one fact are two chances to disagree about
                    // which agent juror the court has never drawn.
                    const drawn = (marginal?.draws ?? 0) > 0;
                    // "Never drawn" is a claim about the whole record, and an unread row is not
                    // part of the record — its cells are null because nobody asked. So it is
                    // only sayable when every row was read, the same guard `emptyColumns` below
                    // carries for the same reason. The case is not hypothetical: the draw read
                    // and the dispute read are separate queries polled every five seconds, so a
                    // newly-arrived dispute routinely sits unread beside a fresh dispute list —
                    // and this dashboard exists partly to record the day baskerville is drawn
                    // for the first time, which would land in exactly such a row.
                    //
                    // `panelled` is the second half of the same guard, and ticket 17 is what made
                    // it reachable: a dispute the court has not drawn a panel for has no draw in
                    // any column, so a page whose read rows were all of that kind would call all
                    // six agent jurors never drawn over a draw that has not happened.
                    const neverDrawn = !drawn && unreadRows === 0 && panelled > 0;

                    return (
                      <AgentColumn key={agentJuror.address} scope="col" $compact={compact}>
                        <AgentIdentity>
                          {identity?.avatarUrl ? (
                            <Avatar src={identity.avatarUrl} alt="" loading="lazy" />
                          ) : (
                            <AvatarFallback aria-hidden="true" $fallenBack={fallenBack}>
                              {agentJuror.nickname.slice(0, 2)}
                            </AvatarFallback>
                          )}
                          <AgentNames>
                            {/* Displayed as ENS resolved it, so the column and the roster card
                                above it read the same — `blaise` carries a name record reading
                                "Blaise". Keyed on the roster address regardless: the resolved
                                name is a display name, and joining a matrix on one would key it
                                on something an operator can change from a wallet. */}
                            <AgentNickname
                              to={`/agent-jurors/${agentJuror.nickname}`}
                              $drawn={drawn}
                            >
                              {identity?.nickname ?? agentJuror.nickname}
                            </AgentNickname>
                            <AgentStack>
                              {neverDrawn ? "Never drawn" : agentJuror.stack.label}
                            </AgentStack>
                          </AgentNames>
                        </AgentIdentity>
                        {/* The column's own summary, under a hairline and inside the column it
                            is about. There is no seventh column and no margin of its own:
                            agent jurors are the columns here. Keyed by position because the
                            marginals are built over the roster in roster order, which is the
                            same order these headers are — the seam guarantees one entry per
                            agent juror, drawn or not. */}
                        {marginal && (
                          <Marginals
                            marginals={marginal}
                            scanned={commitCoverage.read}
                            payouts={rewards}
                            current={parameters.current}
                            density={density}
                          />
                        )}
                      </AgentColumn>
                    );
                  })}
                </tr>
              </thead>
              <tbody>
                {rows.map((row) => {
                  const flag = rowFlagOf(row, flagContext);
                  // Read from the same predicate the flag and the caption use. The row wears
                  // the treatment even where a higher-precedence flag took the pill: a lone
                  // panel that is still being decided is both, and the rail is not the flag.
                  const isLive = !isFinalised(row.dispute);
                  const panel = panelPillOf(row);

                  return (
                    <BodyRow key={row.dispute.id} $live={isLive} $rail={flag?.tone}>
                      <RowHeaderCell scope="row" $compact={compact}>
                        <DisputeRow
                          as="div"
                          dispute={row.dispute}
                          compact={compact}
                          slots={{
                            ...slotsFor?.(row.dispute),
                            // Content, not a pill: the row draws its own, and a pill passed in
                            // here would sit inside that one with two borders and two paddings.
                            //
                            // Panel size lives on the row and never in a cell: coherence cannot
                            // be read without it, and repeating it in every cell would cost more
                            // than it tells. What it says is `panelPillOf`'s, shared with the
                            // phone's card — including the case neither layout had right until
                            // ticket 17: a dispute that was read and has no panel yet is not a
                            // panel of nobody.
                            panel: panel.text,
                            panelTone: panel.tone,
                            // Abbreviated at the compact density, per `MatrixDense.dc.html:213`
                            // against `Main.dc.html:302` — the one place the two artboards word
                            // one thing twice, and the reason is a row 375px wide. Which flag it
                            // is never changes; what goes is the qualifier after it.
                            flag: flag && (
                              <>
                                <span aria-hidden="true">{flag.glyph}</span>
                                {compact
                                  ? flag.shortLabel(row, flagContext)
                                  : flag.label(row, flagContext)}
                              </>
                            ),
                            flagTone: flag?.tone,
                            // The commit figure the compact cell gave up, at the grain the corner
                            // cell promises. Absent at the comfortable density, where every cell
                            // carries its own.
                            measure: compact ? (
                              <RowCommit row={row} scanned={commitCoverage.read} />
                            ) : undefined,
                          }}
                        />
                      </RowHeaderCell>
                      {row.cells.map((cell, column) => {
                        const agentJuror = agentJurors[column];
                        if (agentJuror === undefined) return null;

                        // Order matters, and this is the whole point of the row: an unread row's
                        // cells are all null, so testing for null first would draw six "not
                        // drawn" dots — an unread state rendering as a fact about the court.
                        if (!row.read) {
                          return (
                            <UnreadCell
                              key={agentJuror.address}
                              density={density}
                              nickname={agentJuror.nickname}
                              disputeId={row.dispute.id}
                            />
                          );
                        }

                        return cell === null ? (
                          // Identical at both densities, and deliberately: one 3px dot, no tile,
                          // no border and no glyph. The emptiest state and the loudest have to
                          // stay unconfusable however far the matrix is compressed, which is
                          // what compacting the *drawn* cell towards it must never cost.
                          <EmptyCell key={agentJuror.address} $compact={compact}>
                            <CellWhere nickname={agentJuror.nickname} disputeId={row.dispute.id} />
                            <Dot aria-hidden="true" />
                            <VisuallyHidden>Not drawn</VisuallyHidden>
                          </EmptyCell>
                        ) : (
                          <DrawCell
                            key={agentJuror.address}
                            draw={cell}
                            scanned={commitCoverage.read}
                            density={density}
                            nickname={agentJuror.nickname}
                            disputeId={row.dispute.id}
                          />
                        );
                      })}
                    </BodyRow>
                  );
                })}
              </tbody>
            </Table>
          </TableScroll>

          <Footnotes>
            {/* † before ‡, as the artboard orders them and as `ROW_FLAGS` ranks them: dispute
                151 carries both, and the window is the one that makes its figures
                incomparable rather than merely uninformative.

                All three are shared with the phone's card list, which is what the artboard for
                it does not answer and ticket 16 had to: they are caveats about the court, not
                about the grid, and `CLAUDE.md` requires them visible in the UI rather than
                handled correctly in code. */}
            <WindowFootnote performance={performance} />
            <LonePanelFootnote performance={performance} />
            <SparsityNote performance={performance} noun="cell" />
          </Footnotes>
        </>
      )}
    </Section>
  );
}
