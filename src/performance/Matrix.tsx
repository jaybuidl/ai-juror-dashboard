import styled from "styled-components";
import { Notice } from "../chrome/Failure";
import { DisputeRow, type DisputeRowSlots } from "../disputes/DisputeList";
import type { Dispute } from "../disputes/disputes";
import type { RosterView } from "../roster/useRoster";
import { type Tone, toneInk, toneLine, toneWash } from "../styles/tones";
import {
  commitFigureOf,
  type Figure,
  presentationOf,
  revealFigureOf,
  UNREAD_FIGURE,
  UNREAD_PRESENTATION,
} from "./cell";
import { railFraction } from "./latency";
import type { CourtPerformance, Draw, MatrixRow } from "./performance";

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

/* ─── the row flag ─────────────────────────────────────────────────────────────────────── */

/**
 * A row carries at most one flag, in this order.
 *
 * The precedence is the point of the list. Ticket 08 adds the changed-window flag above the
 * lone panel — dispute 151 is both, and the window is the one that makes its figures
 * incomparable — and ticket 12 adds the live flag below it. Each is one entry here, not a
 * second hard-coded pill in the markup.
 */
const ROW_FLAGS: readonly {
  key: string;
  applies: (row: MatrixRow) => boolean;
  glyph: string;
  label: string;
  tone: Tone;
}[] = [
  // First, and above every flag any later ticket adds: a row whose draws were never read has
  // nothing true to flag. Its panel size is 0 rather than 1, so the lone-panel flag below would
  // not fire on it today — but ticket 08's window flag reads the dispute, which *was* read, and
  // would happily label a row the matrix is about to draw as entirely unknown.
  {
    key: "not-read",
    applies: (row) => !row.read,
    glyph: "?",
    label: "Not read",
    tone: "fail",
  },
  // Ticket 08: { key: "window", applies: row => ranUnderTheOldParameters(row), … }
  {
    key: "lone-panel",
    applies: (row) => row.panelSize === 1,
    glyph: "‡",
    label: "Lone panel",
    tone: "work",
  },
  // Ticket 12: { key: "live", applies: row => row.dispute.period !== "execution", … }
];

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

const Legend = styled.div`
  display: flex;
  flex-wrap: wrap;
  align-items: center;
  justify-content: space-between;
  gap: ${({ theme }) => theme.space8};
  padding: ${({ theme }) => `${theme.space5} ${theme.space7}`};
  border: ${({ theme }) => theme.borderHairline};
  border-radius: ${({ theme }) => theme.radiusTile};
  background-color: ${({ theme }) => theme.surfaceInset};
`;

const LegendGroup = styled.div`
  display: flex;
  flex-wrap: wrap;
  align-items: center;
  gap: ${({ theme }) => theme.space8};
`;

const LegendItem = styled.span<{ $tone?: Tone }>`
  display: inline-flex;
  align-items: center;
  gap: ${({ theme }) => theme.space3};
  font: ${({ theme }) => theme.typeMonoSm};
  font-feature-settings: ${({ theme }) => theme.featureMono};
  letter-spacing: ${({ theme }) => theme.trackingMono};
  text-transform: uppercase;
  color: ${({ theme, $tone }) => ($tone === undefined ? theme.textMeta : toneInk(theme, $tone))};
`;

/* The blank cell's mark, at legend size and in a cell. 3px of quiet: it holds the grid's
   rhythm and says nothing, because nothing happened and nothing was expected. */
const Dot = styled.span`
  width: 3px;
  height: 3px;
  border-radius: 50%;
  background-color: ${({ theme }) => theme.textPending};
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

const AgentColumn = styled.th`
  width: 148px;
  box-sizing: border-box;
  padding: ${({ theme }) => `${theme.space6} ${theme.space5} ${theme.space5}`};
  border-left: ${({ theme }) => theme.borderHairline};
  border-bottom: 1px solid ${({ theme }) => theme.lineStrongColor};
  text-align: left;
  vertical-align: bottom;
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

const Footnotes = styled.div`
  display: flex;
  flex-wrap: wrap;
  gap: ${({ theme }) => theme.space9};
  align-items: flex-start;
`;

const Footnote = styled.p`
  flex: 1 1 380px;
  display: flex;
  gap: ${({ theme }) => theme.space4};
  font: ${({ theme }) => theme.typeBodySm};
  color: ${({ theme }) => theme.textBody};
`;

const FootnoteMark = styled.span`
  flex: none;
  font: ${({ theme }) => theme.typeMonoSm};
  color: ${({ theme }) => theme.stateWork};
`;

const SparsityCard = styled.div`
  flex: 1 1 380px;
  padding: ${({ theme }) => `${theme.space6} ${theme.space7}`};
  border: ${({ theme }) => theme.borderHairline};
  border-radius: ${({ theme }) => theme.radiusTile};
  background-color: ${({ theme }) => theme.surfaceInset};
`;

const SparsityLabel = styled.div`
  font: ${({ theme }) => theme.typeMonoSm};
  font-feature-settings: ${({ theme }) => theme.featureMono};
  letter-spacing: ${({ theme }) => theme.trackingMono};
  text-transform: uppercase;
  color: ${({ theme }) => theme.textMeta};
`;

const SparsityBody = styled.p`
  margin-top: ${({ theme }) => theme.space4};
  font: ${({ theme }) => theme.typeBodySm};
  color: ${({ theme }) => theme.textBody};
`;

const Empty = styled.p`
  max-width: 68ch;
  color: ${({ theme }) => theme.textBody};
`;

/* Read by a screen reader, drawn for nobody: the keys and glyphs beside a figure are shorthand
   for people who can see the legend a few lines above them. */
const VisuallyHidden = styled.span`
  position: absolute;
  width: 1px;
  height: 1px;
  margin: -1px;
  padding: 0;
  overflow: hidden;
  clip-path: inset(50%);
  white-space: nowrap;
  border: 0;
`;

/* ─── the view ─────────────────────────────────────────────────────────────────────────── */

export type MatrixProps = {
  performance: CourtPerformance;
  /** Nicknames and avatars for the column headers. The roster is what they are keyed on. */
  roster: RosterView;
  /** How ticket 04 supplies each row header's title and category. */
  slotsFor?: (dispute: Dispute) => DisputeRowSlots;
};

/** "155", "155 and 160", "155, 158 and 160". */
function listOf(ids: readonly number[]): string {
  if (ids.length <= 1) return ids.join("");
  return `${ids.slice(0, -1).join(", ")} and ${ids[ids.length - 1]}`;
}

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

export function Matrix({ performance, roster, slotsFor }: MatrixProps) {
  const { agentJurors, rows, commitCoverage } = performance;
  const unread = commitCoverage.expected - commitCoverage.resolved;
  const identityOf = new Map(
    roster.entries.map(({ agentJuror, identity }) => [agentJuror.address, identity]),
  );
  // `isResolving` as well as `isResolvedFromEns`: the second is false while the lookup is out
  // and after it fails, and a mark keyed on it alone would dash every avatar on every cold load.
  const fallenBack = !roster.isResolving && !roster.isResolvedFromEns;

  const finalised = rows.filter((row) => row.dispute.ruling.state !== "pending").length;
  const running = rows.length - finalised;

  // Every count below is about the part of the grid that was read. An unread row's cells are
  // null and would otherwise be counted as blank, which would fold a gap into the sparsity
  // figure — the one number on this page whose whole job is to say that blank means "not drawn".
  const readRows = rows.filter((row) => row.read);
  const unreadRows = rows.length - readRows.length;
  const drawnCells = readRows.reduce(
    (total, row) => total + row.cells.filter((cell) => cell !== null).length,
    0,
  );
  const totalCells = readRows.length * agentJurors.length;
  // "Never drawn" is a claim about the whole record, so a column is only empty end to end if
  // every row that was actually read leaves it empty — and only if there is a read row to say it
  // about. `every` on an empty array is vacuously true, so without the length guard a court whose
  // every row was unread would report all six agent jurors as never drawn, on no evidence at all.
  // Latent while a draw read covers everything it is joined to, and reachable the moment ticket
  // 12 persists one across sessions.
  const emptyColumns =
    readRows.length === 0
      ? 0
      : agentJurors.filter((_, column) => readRows.every((row) => row.cells[column] === null))
          .length;
  const lonePanels = readRows.filter((row) => row.panelSize === 1).map((row) => row.dispute.id);

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
            <LegendGroup>
              <LegendItem $tone="pass">
                <span aria-hidden="true">✓</span>Coherent
              </LegendItem>
              <LegendItem $tone="work">
                <span aria-hidden="true">✕</span>Diverged
              </LegendItem>
              <LegendItem $tone="fail">
                <span aria-hidden="true">∅</span>No vote
              </LegendItem>
              <LegendItem $tone="live">
                <span aria-hidden="true">⋯</span>Acting
              </LegendItem>
              {/* Named only when one is on screen. A legend entry for a state the grid does not
                  contain teaches a reader to look for a failure that is not there — and this is
                  the entry a reader would most readily mistake for one of the others. */}
              {unreadRows > 0 && (
                <LegendItem $tone="fail">
                  <span aria-hidden="true">?</span>Unknown
                </LegendItem>
              )}
              <LegendItem>
                <Dot aria-hidden="true" />
                Not drawn
              </LegendItem>
            </LegendGroup>
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
                    <CaptionCount>
                      {finalised} finalised · {running} running
                    </CaptionCount>
                    <CaptionBody>
                      Newest first. One row per dispute, one column per agent juror, one cell per
                      draw.
                    </CaptionBody>
                  </CaptionCell>
                  {agentJurors.map((agentJuror, column) => {
                    const identity = identityOf.get(agentJuror.address);
                    const drawn = rows.some((row) => row.cells[column] !== null);

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
                              {drawn ? agentJuror.stack.label : "Never drawn"}
                            </AgentStack>
                          </AgentNames>
                        </AgentIdentity>
                      </AgentColumn>
                    );
                  })}
                </tr>
              </thead>
              <tbody>
                {rows.map((row) => {
                  const flag = ROW_FLAGS.find((candidate) => candidate.applies(row));
                  const lone = row.panelSize === 1;

                  return (
                    <tr key={row.dispute.id}>
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
                            panel: row.read ? `Panel ${row.panelSize}` : "Row unavailable",
                            panelTone: !row.read ? "fail" : lone ? "work" : undefined,
                            flag: flag && (
                              <>
                                <span aria-hidden="true">{flag.glyph}</span>
                                {flag.label}
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
                    </tr>
                  );
                })}
              </tbody>
            </Table>
          </TableScroll>

          <Footnotes>
            {lonePanels.length > 0 && (
              <Footnote>
                <FootnoteMark aria-hidden="true">‡</FootnoteMark>
                <span>
                  {lonePanels.length === 1 ? "Dispute" : "Disputes"} {listOf(lonePanels)}{" "}
                  {lonePanels.length === 1 ? "was" : "were"} decided by a panel of one. A lone agent
                  juror is automatically the majority, so coherence there is tautological and
                  carries no information. It is counted in the matrix and marked wherever it is
                  counted.
                </span>
              </Footnote>
            )}
            <SparsityCard>
              <SparsityLabel>On the empty cells</SparsityLabel>
              <SparsityBody>
                {/* Every figure here is about the rows that were read, so with none of them read
                    there is nothing to count and the card says that instead of counting to zero.
                    "0 of the 0 cells here are blank" is not a smaller version of this claim; it
                    is a different one, and it is false. */}
                {readRows.length === 0 ? (
                  "No dispute on this page had its draws read, so there is nothing here to count as blank or as drawn."
                ) : (
                  <>
                    {totalCells - drawnCells} of the {totalCells} cells here are blank
                    {emptyColumns > 0 &&
                      `, and ${emptyColumns === 1 ? "one column is" : `${emptyColumns} columns are`} blank end to end`}
                    . Agent jurors are drawn at random: sparsity is the normal state of this matrix,
                    not missing data. A blank cell is drawn as nothing at all, so it can never be
                    read as a failure to act.
                  </>
                )}
                {/* The sentence above is true of a row that was read and false of one that was
                    not, where a blank would mean the draw has not been read rather than not
                    happened. Those rows are drawn as Unknown instead and counted out of the
                    figures above, and this says so rather than leaving the count unexplained. */}
                {unreadRows > 0 &&
                  ` ${unreadRows === 1 ? "One further dispute is" : `A further ${unreadRows} disputes are`} not counted here at all: ${unreadRows === 1 ? "its draws were" : "their draws were"} never read, so ${unreadRows === 1 ? "that row is" : "those rows are"} marked Unknown rather than blank.`}
              </SparsityBody>
            </SparsityCard>
          </Footnotes>
        </>
      )}
    </Section>
  );
}
