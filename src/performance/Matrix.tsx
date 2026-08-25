import { Link } from "react-router";
import styled from "styled-components";
import { DisputeRow, type DisputeRowSlots } from "../disputes/DisputeList";
import type { Dispute } from "../disputes/disputes";
import type { RosterView } from "../roster/useRoster";
import { type Tone, toneInk, toneLine, toneWash } from "../styles/tones";
import { commitFigureOf, presentationOf, revealFigureOf } from "./cell";
import { formatWindowSeconds, railFraction } from "./latency";
import type { CourtPerformance, Draw, MatrixRow } from "./performance";
import type { PeriodWindows } from "./windows";

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
 * The precedence is the point of the list. The changed-window flag sits above the lone panel
 * because the window is what makes a row's figures incomparable with the rows around it, where
 * a lone panel only makes one of them uninformative; ticket 12 adds the live flag below them.
 * Each is one entry here, not a second hard-coded pill in the markup.
 *
 * No row is both today — 151 is the marked one and 155 the lone panel — and one that was would
 * still be marked as a lone panel, because `Panel 1` carries its own amber tone independently
 * of this slot. The flag is the second mark on such a row, not the only one.
 *
 * `label` and `applies` take the court's current windows as well as the row, because the window
 * flag names *which* window changed: `† 8h window` on dispute 151, read from what the court was
 * configured with rather than typed in.
 */
const ROW_FLAGS: readonly {
  key: string;
  applies: (row: MatrixRow, current: PeriodWindows | null) => boolean;
  glyph: string;
  label: (row: MatrixRow, current: PeriodWindows | null) => string;
  tone: Tone;
}[] = [
  {
    key: "window",
    applies: (row) => row.underEarlierWindows,
    glyph: "†",
    label: windowFlagLabel,
    tone: "work",
  },
  {
    key: "lone-panel",
    applies: (row) => row.panelSize === 1,
    glyph: "‡",
    label: () => "Lone panel",
    tone: "work",
  },
  // Ticket 12: { key: "live", applies: row => row.dispute.period !== "execution", … }
];

/**
 * The window flag's label: the one that actually differs.
 *
 * Naming the commit window unconditionally would be right for court 34's one reconfiguration
 * and wrong for the next one. A court that changed only its vote window would put `† 45m
 * window` on every older row — a duration identical to the one the court holds now, so the
 * marker would read as if it had been placed in error.
 *
 * `windows` is non-null wherever `underEarlierWindows` is true, the seam setting one from the
 * other; the fallback is here rather than a non-null assertion.
 */
function windowFlagLabel(row: MatrixRow, current: PeriodWindows | null): string {
  if (row.windows === null) return "Earlier window";

  const commitChanged = current === null || row.windows.commitSeconds !== current.commitSeconds;
  return commitChanged
    ? `${formatWindowSeconds(row.windows.commitSeconds)} window`
    : `${formatWindowSeconds(row.windows.voteSeconds)} vote window`;
}

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

const AvatarFallback = styled.span`
  display: flex;
  width: 26px;
  height: 26px;
  flex: none;
  align-items: center;
  justify-content: center;
  border-radius: ${({ theme }) => theme.radiusChip};
  border: ${({ theme }) => theme.borderVisible};
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

const MeasureValue = styled.span<{ $tone: "value" | "missed" | "pending" }>`
  flex: none;
  width: 56px;
  font: ${({ theme }) => theme.typeMono};
  /* TRAP: the font shorthand above just reset font-feature-settings, and with it the tabular
     digits base.css puts on body. Without this line a column of latencies stops lining up and
     nothing anywhere says so. */
  font-feature-settings: ${({ theme }) => theme.featureMono};
  font-weight: 600;
  color: ${({ theme, $tone }) => {
    if ($tone === "missed") return theme.stateFail;
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
    if ($tone === "missed") return theme.stateFail;
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
  /* It names dispute ids and two configured durations, and the shorthand above resets the
     tabular figures base.css puts on the body. */
  font-feature-settings: ${({ theme }) => theme.featureNumeric};
  color: ${({ theme }) => theme.textBody};

  a {
    color: ${({ theme }) => theme.accent};
  }
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

/* Rose rather than the amber the dispute list uses for a missing title, because this changes a
   figure and that changes a label. ADR-0006 gives rose exactly two meanings, and ticket 13 adds
   the second of them: a thing that failed to act, and a thing that could not be read.
   Ticket 13 also owns folding this and the two other notices in this repo into one component and
   raising it to the blocking banner the Arbitrum endpoint is classified as deserving. */
const Shortfall = styled.p`
  max-width: 68ch;
  margin: 0;
  padding: 12px 16px;
  border: 1px solid ${({ theme }) => theme.lineRose};
  border-radius: 8px;
  background-color: ${({ theme }) => theme.washRose};
  color: ${({ theme }) => theme.textBody};
  font-size: 0.875rem;
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
 * The window footnote, in whichever of its three states the page is in.
 *
 * It is one footnote and not three, and it is always on the page, because the sentence it has
 * to carry in every state is the same one: nothing here is a fraction of a window. What
 * changes is how much it can say about which rows ran under what — a fact about the court that
 * has to be read from the chain before it can be stated.
 *
 * Where the history is missing it says so as a fact about the read, and it distinguishes only
 * what it can see: a scan that came back with no configuration at all is not the same as one
 * that has not answered. Which of *those* two happened — still in flight, or refused — is the
 * provenance footer's business, because a footnote that guessed would announce a failure on
 * every cold load, the trap `CLAUDE.md` records against `RosterView`.
 */
function WindowFootnote({ performance }: { performance: CourtPerformance }) {
  const { current, read } = performance.parameters;
  const { changedWindows: changes, unplacedDisputes: unplaced } = performance.totals;

  return (
    <Footnote>
      <FootnoteMark aria-hidden="true">†</FootnoteMark>
      <span>
        {current === null ? (
          <>
            Court 34's period durations changed partway through this experiment, and its parameter
            history is not in hand on this load —{" "}
            {read
              ? "that read came back carrying no configuration at all"
              : "it is still being read, or could not be"}
            . So no row above is marked as having run under the earlier ones, and that is an unread
            state rather than a finding.
          </>
        ) : changes.length === 0 && unplaced.length === 0 ? (
          <>
            Every dispute here ran under the period durations the court holds now: a commit window
            of {formatWindowSeconds(current.commitSeconds)} and a vote window of{" "}
            {formatWindowSeconds(current.voteSeconds)}.
          </>
        ) : changes.length === 0 ? (
          // The claim above is the one that must never be made carelessly. A dispute the
          // history could not place is not a dispute that ran under the current windows: a scan
          // that dropped the court's oldest configuration leaves exactly this state, and saying
          // "every dispute ran under 45m and 30m" over it would state the opposite of the truth
          // with nothing on the page to contradict it.
          <>
            No dispute here is marked as having run under earlier period durations, but the
            parameter history read on this load does not reach back far enough to place{" "}
            {unplaced.length === 1 ? "dispute" : "disputes"} {listOf(unplaced)} — so that is not the
            same as saying they ran under the {formatWindowSeconds(current.commitSeconds)} and{" "}
            {formatWindowSeconds(current.voteSeconds)} windows the court holds now.
          </>
        ) : (
          <>
            {changes.map((change) => (
              <span key={`${change.windows.commitSeconds}-${change.windows.voteSeconds}`}>
                {change.disputes.length === 1 ? "Dispute" : "Disputes"} {listOf(change.disputes)}{" "}
                ran with a commit window of {formatWindowSeconds(change.windows.commitSeconds)} and
                a vote window of {formatWindowSeconds(change.windows.voteSeconds)}, against{" "}
                {formatWindowSeconds(current.commitSeconds)} and{" "}
                {formatWindowSeconds(current.voteSeconds)} configured now.{" "}
              </span>
            ))}
            {unplaced.length > 0 && (
              <>
                {unplaced.length === 1 ? "Dispute" : "Disputes"} {listOf(unplaced)} the history read
                on this load cannot place at all, so {unplaced.length === 1 ? "it is" : "they are"}{" "}
                unmarked for want of anything to compare against rather than for having matched.{" "}
              </>
            )}
          </>
        )}{" "}
        Latency is held and shown as an absolute duration everywhere on this page, and never as a
        fraction of the window it ran in.{" "}
        <Link to="/method#window">What that means for these figures</Link>.
      </span>
    </Footnote>
  );
}

function DrawCell({ draw }: { draw: Draw }) {
  const presentation = presentationOf(draw.state);
  const figure = revealFigureOf(draw);
  const commit = commitFigureOf(draw);

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
  const { agentJurors, rows, commitCoverage, parameters } = performance;
  const unread = commitCoverage.expected - commitCoverage.resolved;
  const identityOf = new Map(
    roster.entries.map(({ agentJuror, identity }) => [agentJuror.address, identity]),
  );

  const finalised = rows.filter((row) => row.dispute.ruling.state !== "pending").length;
  const running = rows.length - finalised;
  const drawnCells = rows.reduce(
    (total, row) => total + row.cells.filter((cell) => cell !== null).length,
    0,
  );
  const totalCells = rows.length * agentJurors.length;
  const emptyColumns = agentJurors.filter((_, column) =>
    rows.every((row) => row.cells[column] === null),
  ).length;
  const lonePanels = rows.filter((row) => row.panelSize === 1).map((row) => row.dispute.id);

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
            <Shortfall role="status">
              {/* The cross-check ADR-0004 asks for, said in the one place a reader is looking
                  at the figures it affects. A truncating endpoint returns fewer logs and no
                  error, so without this sentence the page would simply show fewer commit
                  latencies — an absence indistinguishable from a fact. */}
              {commitCoverage.resolved === 0
                ? `None of the ${commitCoverage.expected} commitments this court recorded could be read from Arbitrum, so no commit latency below is a measurement.`
                : `${unread} of the ${commitCoverage.expected} commitments this court recorded could not be found on Arbitrum, and those cells read Unknown.`}{" "}
              That is a read that came back short, not an agent juror that failed to commit. Reveal
              latency and coherence come from the subgraph and are unaffected.
            </Shortfall>
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
                            <AvatarFallback aria-hidden="true">
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
                  const flag = ROW_FLAGS.find((candidate) =>
                    candidate.applies(row, parameters.current),
                  );
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
                            panel: `Panel ${row.panelSize}`,
                            panelTone: lone ? "work" : undefined,
                            flag: flag && (
                              <>
                                <span aria-hidden="true">{flag.glyph}</span>
                                {flag.label(row, parameters.current)}
                              </>
                            ),
                            flagTone: flag?.tone,
                          }}
                        />
                      </RowHeaderCell>
                      {row.cells.map((cell, column) => {
                        const agentJuror = agentJurors[column];
                        if (agentJuror === undefined) return null;

                        return cell === null ? (
                          <EmptyCell key={agentJuror.address}>
                            <Dot aria-hidden="true" />
                            <VisuallyHidden>Not drawn</VisuallyHidden>
                          </EmptyCell>
                        ) : (
                          <DrawCell key={agentJuror.address} draw={cell} />
                        );
                      })}
                    </tr>
                  );
                })}
              </tbody>
            </Table>
          </TableScroll>

          <Footnotes>
            {/* † before ‡, as the artboard orders them and as `ROW_FLAGS` ranks them: dispute
                151 carries both, and the window is the one that makes its figures
                incomparable rather than merely uninformative. */}
            <WindowFootnote performance={performance} />
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
                {totalCells - drawnCells} of the {totalCells} cells here are blank
                {emptyColumns > 0 &&
                  `, and ${emptyColumns === 1 ? "one column is" : `${emptyColumns} columns are`} blank end to end`}
                . Agent jurors are drawn at random: sparsity is the normal state of this matrix, not
                missing data. A blank cell is drawn as nothing at all, so it can never be read as a
                failure to act.
              </SparsityBody>
            </SparsityCard>
          </Footnotes>
        </>
      )}
    </Section>
  );
}
