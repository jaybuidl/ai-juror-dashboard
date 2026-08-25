import styled, { css } from "styled-components";
import { Notice } from "../chrome/Failure";
import { DisputeRow, type DisputeRowSlots } from "../disputes/DisputeList";
import type { Dispute } from "../disputes/disputes";
import { isFinalised } from "../disputes/liveness";
import type { RosterView } from "../roster/useRoster";
import { VisuallyHidden } from "../styles/hidden";
import { type Tone, toneInk, toneLine, toneWash } from "../styles/tones";
import {
  commitFigureOf,
  type Figure,
  presentationOf,
  revealFigureOf,
  UNREAD_FIGURE,
  UNREAD_PRESENTATION,
} from "./cell";
import { Footnotes, LonePanelFootnote, SparsityNote, WindowFootnote } from "./Footnotes";
import { Dot, Legend, LegendGroup, LegendItem, StateLegend } from "./Legend";
import { railFraction } from "./latency";
import { Marginals } from "./Marginals";
import type { CourtPerformance, Draw } from "./performance";
import { type RowFlagContext, rowFlagOf } from "./row-flags";

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

/* The matrix is 1328px at the canvas's measurements and the page is not. It scrolls in its
   own box rather than pushing the page sideways; ticket 16 gives the phone a real answer and
   ticket 17 the density past forty rows. */
const TableScroll = styled.div`
  overflow-x: auto;
`;

const Table = styled.table`
  border-collapse: collapse;
  border-top: ${({ theme }) => theme.borderHairline};
`;

const CaptionCell = styled.th`
  width: 440px;
  box-sizing: border-box;
  padding: ${({ theme }) => `${theme.space6} ${theme.space6} ${theme.space5} 0`};
  border-bottom: 1px solid ${({ theme }) => theme.lineStrongColor};
  text-align: left;
  vertical-align: bottom;
  font-weight: inherit;
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
const AgentColumn = styled.th`
  width: 148px;
  box-sizing: border-box;
  padding: ${({ theme }) => `${theme.space6} ${theme.space5} ${theme.space5}`};
  border-left: ${({ theme }) => theme.borderHairline};
  border-bottom: 1px solid ${({ theme }) => theme.lineStrongColor};
  text-align: left;
  vertical-align: top;
  font-weight: inherit;
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

const AgentNickname = styled.span<{ $drawn: boolean }>`
  font: ${({ theme }) => theme.typeTitle3};
  letter-spacing: ${({ theme }) => theme.trackingTitle};
  color: ${({ theme, $drawn }) => ($drawn ? theme.textHeading : theme.textMeta)};
  overflow: hidden;
  text-overflow: ellipsis;
  white-space: nowrap;
`;

const AgentStack = styled.span`
  font: ${({ theme }) => theme.typeMonoSm};
  font-feature-settings: ${({ theme }) => theme.featureMono};
  letter-spacing: ${({ theme }) => theme.trackingMono};
  text-transform: uppercase;
  color: ${({ theme }) => theme.textPending};
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

const RowHeaderCell = styled.th`
  width: 440px;
  box-sizing: border-box;
  padding: 0;
  text-align: left;
  vertical-align: middle;
  font-weight: inherit;
`;

const CellBox = styled.td<{ $tone?: Tone; $filled?: boolean }>`
  width: 148px;
  box-sizing: border-box;
  padding: ${({ theme }) => `${theme.space4} ${theme.space5}`};
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

const Measure = styled.div<{ $context?: boolean }>`
  display: flex;
  align-items: center;
  gap: ${({ theme }) => theme.space3};
  /* Tighter above the commit line than above the reveal, so the two read as one block with a
     headline and its context rather than as two measurements of equal standing. */
  margin-top: ${({ theme, $context }) => ($context ? theme.space2 : theme.space4)};
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
const Rail = styled.span`
  flex: none;
  width: 42px;
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
function UnreadCell() {
  return (
    <CellBox $tone={UNREAD_PRESENTATION.tone} $filled={UNREAD_PRESENTATION.filled}>
      <CellHead>
        <Glyph $tone={UNREAD_PRESENTATION.tone} aria-hidden="true">
          {UNREAD_PRESENTATION.glyph}
        </Glyph>
        <Verdict $tone={UNREAD_PRESENTATION.tone}>{UNREAD_PRESENTATION.word}</Verdict>
      </CellHead>
      <Measure>
        <MeasureKey aria-hidden="true">R</MeasureKey>
        <VisuallyHidden>Reveal latency</VisuallyHidden>
        <MeasureValue $tone={UNREAD_FIGURE.tone}>{UNREAD_FIGURE.text}</MeasureValue>
      </Measure>
      <Measure $context>
        <MeasureKey aria-hidden="true">C</MeasureKey>
        <VisuallyHidden>Commit latency</VisuallyHidden>
        <CommitValue $tone={UNREAD_FIGURE.tone}>{UNREAD_FIGURE.text}</CommitValue>
      </Measure>
    </CellBox>
  );
}

function DrawCell({ draw, scanned }: { draw: Draw; scanned: boolean }) {
  const presentation = presentationOf(draw.state);
  const figure = revealFigureOf(draw);
  const commit = commitFigureOf(draw, scanned);

  return (
    <CellBox $tone={presentation.tone} $filled={presentation.filled}>
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
      <Measure>
        <MeasureKey aria-hidden="true">R</MeasureKey>
        <VisuallyHidden>Reveal latency</VisuallyHidden>
        <MeasureValue $tone={figure.tone}>{figure.text}</MeasureValue>
        {draw.revealLatencySeconds !== null && (
          <Rail aria-hidden="true">
            <RailFill style={{ width: `${railFraction(draw.revealLatencySeconds) * 100}%` }} />
          </Rail>
        )}
      </Measure>
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
    </CellBox>
  );
}

export function Matrix({ performance, roster, slotsFor, now = Date.now() }: MatrixProps) {
  const { agentJurors, rows, totals, marginals, commitCoverage, parameters } = performance;
  const flagContext: RowFlagContext = { current: parameters.current, now };
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

  return (
    <Section aria-labelledby="matrix-heading">
      <Heading id="matrix-heading">The matrix</Heading>
      <Lede>
        One row per dispute, one column per agent juror, one cell per draw. Each cell says how long
        that agent juror took to reveal its vote after the vote period opened, how long it took to
        commit after the commit period opened, and whether it voted with the dispute's final ruling.
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
              {commitCoverage.resolved === 0
                ? `None of the ${commitCoverage.expected} commitments this court recorded could be read from Arbitrum, so no commit latency below is a measurement.`
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
            <LegendGroup>
              <LegendItem>
                <span aria-hidden="true">R</span>Reveal
                <Rail aria-hidden="true">
                  <RailFill style={{ width: "62%" }} />
                </Rail>
              </LegendItem>
              <LegendItem>
                <span aria-hidden="true">C</span>Commit
                <Rail aria-hidden="true">
                  <CommitRailFill style={{ width: "71%" }} />
                </Rail>
              </LegendItem>
              <LegendItem>Rail: 1s — 1h, log</LegendItem>
            </LegendGroup>
          </Legend>

          <TableScroll>
            <Table>
              <thead>
                <tr>
                  <CaptionCell scope="col">
                    {/* Read off the model rather than reduced here. It is a court-wide count,
                        and those live on `CourtTotals` beside the ones the stat tiles print —
                        a caption that reduced the rows itself would be a second definition of
                        "finalised" sitting one component away from the first. */}
                    <CaptionCount>
                      {totals.finalised} finalised · {totals.live} live
                    </CaptionCount>
                    <CaptionBody>
                      Newest first. One row per dispute, one column per agent juror, one cell per
                      draw.
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
                    const neverDrawn = !drawn && unreadRows === 0;

                    return (
                      <AgentColumn key={agentJuror.address} scope="col">
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
                            <AgentNickname $drawn={drawn}>
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
                            current={parameters.current}
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
                  const lone = row.panelSize === 1;
                  // Read from the same predicate the flag and the caption use. The row wears
                  // the treatment even where a higher-precedence flag took the pill: a lone
                  // panel that is still being decided is both, and the rail is not the flag.
                  const isLive = !isFinalised(row.dispute);

                  return (
                    <BodyRow key={row.dispute.id} $live={isLive} $rail={flag?.tone}>
                      <RowHeaderCell scope="row">
                        <DisputeRow
                          as="div"
                          dispute={row.dispute}
                          slots={{
                            ...slotsFor?.(row.dispute),
                            // Content, not a pill: the row draws its own, and a pill passed in
                            // here would sit inside that one with two borders and two paddings.
                            //
                            // Panel size lives on the row and never in a cell: coherence cannot
                            // be read without it, and repeating it in every cell would cost more
                            // than it tells.
                            //
                            // An unread row's panel size is 0 because nobody asked, not because
                            // the court drew nobody, and "Panel 0" is exactly the sort of zero
                            // this ticket exists to keep off the page. It says what it knows.
                            panel: row.read ? `Panel ${row.panelSize}` : "Draws not read",
                            panelTone: !row.read ? "fail" : lone ? "work" : undefined,
                            flag: flag && (
                              <>
                                <span aria-hidden="true">{flag.glyph}</span>
                                {flag.label(row, flagContext)}
                              </>
                            ),
                            flagTone: flag?.tone,
                          }}
                        />
                      </RowHeaderCell>
                      {row.cells.map((cell, column) => {
                        const agentJuror = agentJurors[column];
                        if (agentJuror === undefined) return null;

                        // Order matters, and this is the whole point of the row: an unread row's
                        // cells are all null, so testing for null first would draw six "not
                        // drawn" dots — an unread state rendering as a fact about the court.
                        if (!row.read) return <UnreadCell key={agentJuror.address} />;

                        return cell === null ? (
                          <EmptyCell key={agentJuror.address}>
                            <Dot aria-hidden="true" />
                            <VisuallyHidden>Not drawn</VisuallyHidden>
                          </EmptyCell>
                        ) : (
                          <DrawCell
                            key={agentJuror.address}
                            draw={cell}
                            scanned={commitCoverage.read}
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
