import styled from "styled-components";
import { narrow } from "../styles/breakpoints";
import { formatLatencySeconds, formatWindowSeconds } from "./latency";
import { StripBand } from "./StripBand";
import { STRIP_RANGE_LABEL, STRIP_TICKS, stripFraction, stripMarks } from "./strip";
import { type LatencySummary, markedWindows, type WindowChange } from "./totals";
import type { PeriodWindows } from "./windows";

/**
 * One agent juror's reveal latencies against the court's, built against
 * `canvas/Juror.dc.html:86-110`.
 *
 * A separate component from `LatencyStrip` and reading the same axis from `strip.ts`, which is
 * the split that matters: the scale is shared so the two plots can be compared across pages,
 * and the anatomy differs because this one carries two series and a court median rather than one
 * series and its own. Merging them would put a second, optional series and a second median
 * through a component the matrix page relies on; keeping the *scale* separate would let one page
 * quietly place 85 seconds somewhere the other page does not.
 *
 * **This plot carries the comparison band, and that is a decision rather than a side effect.**
 * Ticket 22 moved the band to five days and had to widen the shared axis to a month to hold it,
 * which moves every mark on this page too. The three ways out were a scale of this plot's own, a
 * wider axis with nothing on it past an hour, or the band. A scale of its own is the one that
 * had to go: the background series here *is* the court's distribution, the same seconds
 * `LatencyStrip` plots, so a second scale would draw one set of numbers two shapes on two pages
 * — the fork `CLAUDE.md` records the matrix and the card list being lifted apart to prevent. Of
 * the remaining two, a bare wider axis leaves the right third of the plot empty with nothing to
 * say why, and the band is what that emptiness *means*: it is the distance this page exists to
 * measure. It is illustrative here exactly as it is on the matrix page, and said so in the same
 * place — this view's provenance footer, gated on this plot being on the screen at all.
 *
 * **What is plotted is reveal latency, and the reason on the artboard is false.**
 * `Juror.dc.html:108` gives it as "commit latency is not comparable across dispute 151, which ran
 * an 8-hour window" — and court 34 changed its commit window from 8h to 45m *and* its vote window
 * from 8h to 30m in one `CourtModified`, so a reveal is exactly as affected as a commit
 * (`CLAUDE.md` § Traps; `canvas/README.md` records the defect that premise produced, which is the
 * same artboard printing a median commit at `:73` while excluding commit latency from the chart
 * at `:108` as incomparable). So the exclusion stands and the reason is rewritten: the two are
 * measured from *different periods*, and pooling them would be ADR-0005's mistake in another
 * form. What the window change actually costs is disclosed in the caption beneath the plot, as a
 * dagger naming how many of the plotted draws ran under a vote window the court has since
 * replaced — in the caption and not on the marks themselves, because the plot is `aria-hidden`
 * decoration over figures printed in full below it and a mark nobody can read is not a caveat.
 */

const Card = styled.section`
  display: flex;
  flex-direction: column;
  gap: ${({ theme }) => theme.space6};
  padding: ${({ theme }) => theme.cardPad};
  border: ${({ theme }) => theme.borderHairline};
  border-radius: ${({ theme }) => theme.radiusCard};
  background-color: ${({ theme }) => theme.surfaceCard};
  box-shadow: ${({ theme }) => theme.shadowCard};
`;

const Head = styled.div`
  display: flex;
  align-items: baseline;
  justify-content: space-between;
  gap: ${({ theme }) => theme.space6};
  flex-wrap: wrap;
`;

const Heading = styled.h2`
  font: ${({ theme }) => theme.typeMonoSm};
  font-feature-settings: ${({ theme }) => theme.featureMono};
  letter-spacing: ${({ theme }) => theme.trackingMono};
  text-transform: uppercase;
  color: ${({ theme }) => theme.textMeta};
`;

const Scale = styled.span`
  font: ${({ theme }) => theme.typeMonoSm};
  /* It names two durations, and the shorthand above resets the tabular figures base.css puts on
     the body. */
  font-feature-settings: ${({ theme }) => theme.featureMono};
  letter-spacing: ${({ theme }) => theme.trackingMono};
  text-transform: uppercase;
  color: ${({ theme }) => theme.textPending};
`;

const Plot = styled.div`
  position: relative;
  height: 108px;

  /* Taller rather than narrower: the axis keeps its full width at 390pt and the marks need the
     vertical room, because a stack of coincident latencies grows upwards. The same move the
     court's own strip makes, for the same reason. */
  ${narrow} {
    height: 132px;
  }
`;

const Axis = styled.div`
  position: absolute;
  left: 0;
  right: 0;
  bottom: 26px;
  height: 1px;
  background-color: ${({ theme }) => theme.lineStrongColor};
`;

/* Every draw in the court, this agent juror's own among them. Quiet, behind, and never in
   front: it is the ground the accent marks are read against. */
const CourtMark = styled.span`
  position: absolute;
  width: 6px;
  height: 6px;
  margin-left: -3px;
  border-radius: 50%;
  background-color: ${({ theme }) => theme.orbitLine};
`;

/* This agent juror's own draws: larger, in the accent, and outlined in the page's own ink so
   that one sitting on top of a court mark reads as one draw rather than two. */
const OwnMark = styled.span`
  position: absolute;
  width: 9px;
  height: 9px;
  margin-left: -4.5px;
  border-radius: 50%;
  background-color: ${({ theme }) => theme.accent};
  border: 2px solid ${({ theme }) => theme.surfaceCard};
  box-sizing: border-box;
`;

const CourtMedian = styled.div`
  position: absolute;
  top: 0;
  bottom: 26px;
  width: 1px;
  background-color: ${({ theme }) => theme.lineStrongColor};
`;

const CourtMedianValue = styled.div`
  position: absolute;
  top: 0;
  font: ${({ theme }) => theme.typeMonoSm};
  font-feature-settings: ${({ theme }) => theme.featureMono};
  letter-spacing: ${({ theme }) => theme.trackingMonoTight};
  color: ${({ theme }) => theme.textMeta};
  white-space: nowrap;
`;

const Tick = styled.span`
  position: absolute;
  bottom: 0;
  transform: translateX(-50%);
  font: ${({ theme }) => theme.typeMonoSm};
  font-feature-settings: ${({ theme }) => theme.featureMono};
  color: ${({ theme }) => theme.textPending};
`;

const Keys = styled.div`
  display: flex;
  align-items: center;
  gap: ${({ theme }) => theme.space7};
  flex-wrap: wrap;
`;

const KeyItem = styled.span`
  display: inline-flex;
  align-items: center;
  gap: ${({ theme }) => theme.space3};
  font: ${({ theme }) => theme.typeMonoSm};
  letter-spacing: ${({ theme }) => theme.trackingMono};
  text-transform: uppercase;
  color: ${({ theme }) => theme.textMeta};
`;

const OwnKey = styled.span`
  width: 9px;
  height: 9px;
  flex: none;
  border-radius: 50%;
  background-color: ${({ theme }) => theme.accent};
`;

const CourtKey = styled.span`
  width: 7px;
  height: 7px;
  flex: none;
  border-radius: 50%;
  background-color: ${({ theme }) => theme.orbitLine};
`;

const Reading = styled.p`
  font: ${({ theme }) => theme.typeBodySm};
  font-feature-settings: ${({ theme }) => theme.featureNumeric};
  color: ${({ theme }) => theme.textBody};
`;

const Caption = styled.p`
  font: ${({ theme }) => theme.typeBodySm};
  font-feature-settings: ${({ theme }) => theme.featureNumeric};
  color: ${({ theme }) => theme.textMeta};
  text-wrap: pretty;
`;

const CaptionMark = styled.span`
  color: ${({ theme }) => theme.stateWork};
`;

const Nothing = styled.p`
  font: ${({ theme }) => theme.typeBodySm};
  color: ${({ theme }) => theme.textMeta};
`;

/** Where a mark sits above the axis, stacked so two equal latencies do not overprint. */
function markBottom(stack: number): string {
  return `${31 + stack * 10}px`;
}

export type AgentJurorLatencyProps = {
  nickname: string;
  /** This agent juror's own reveal latencies, or `null` where none of its draws has revealed. */
  own: LatencySummary | null;
  /** Every reveal latency the court recorded, or `null` where none has. */
  court: LatencySummary | null;
  /** The window changes touching this agent juror's own draws — `marginals.changedWindows`. */
  changedWindows: readonly WindowChange[];
  /** The windows the court is configured with today, against which an earlier one is named. */
  current: PeriodWindows | null;
};

export function AgentJurorLatency({
  nickname,
  own,
  court,
  changedWindows,
  current,
}: AgentJurorLatencyProps) {
  if (own === null) {
    // An axis with the court on it and nothing of this agent juror's would be a comparison with
    // one side missing — and the empty half is exactly the half the heading claims to show.
    return (
      <Card aria-labelledby="latency-heading">
        <Head>
          <Heading id="latency-heading">Reveal latency against the court</Heading>
        </Head>
        <Nothing>
          No draw of this agent juror's has revealed in what was read, so there is no distribution
          to compare. That is the state of the record, not a measurement of zero.
        </Nothing>
      </Card>
    );
  }

  const ownMarks = stripMarks(own.seconds);
  const courtMarks = stripMarks(court?.seconds ?? []);
  const courtMedian = court === null ? null : stripFraction(court.median);
  // Over the draws actually plotted, so the dagger's own line quotes the denominator the reader
  // is looking at rather than every draw this agent juror has taken.
  const marked = markedWindows(changedWindows, current, "reveal");

  return (
    <Card aria-labelledby="latency-heading">
      <Head>
        <Heading id="latency-heading">
          Its {own.seconds.length} {own.seconds.length === 1 ? "reveal" : "reveals"} against the
          whole court
        </Heading>
        <Scale>Log scale · {STRIP_RANGE_LABEL}</Scale>
      </Head>

      {/* Decoration over figures printed in full beneath it: the medians are in the reading
          below and in the stat card above, and the marks carry nothing the durations do not. */}
      <Plot aria-hidden="true">
        <StripBand />
        <Axis />

        {courtMarks.map((mark) => (
          <CourtMark
            key={`court-${mark.seconds}-${mark.stack}`}
            style={{ left: `${mark.x * 100}%`, bottom: markBottom(mark.stack) }}
          />
        ))}

        {ownMarks.map((mark) => (
          <OwnMark
            key={`own-${mark.seconds}-${mark.stack}`}
            style={{ left: `${mark.x * 100}%`, bottom: markBottom(mark.stack) }}
          />
        ))}

        {courtMedian !== null && court !== null && (
          <>
            <CourtMedian style={{ left: `${courtMedian * 100}%` }} />
            <CourtMedianValue style={{ left: `calc(${courtMedian * 100}% + 8px)` }}>
              Court median {formatLatencySeconds(court.median)}
            </CourtMedianValue>
          </>
        )}

        {STRIP_TICKS.map((tick) => (
          <Tick key={tick.label} style={{ left: `${stripFraction(tick.seconds) * 100}%` }}>
            {tick.label}
          </Tick>
        ))}
      </Plot>

      <Keys>
        <KeyItem>
          <OwnKey aria-hidden="true" />
          {nickname}
        </KeyItem>
        <KeyItem>
          <CourtKey aria-hidden="true" />
          Every draw in the court
        </KeyItem>
      </Keys>

      {/* The plot's own content, in words. Not a summary of it — the same three figures it is
          drawn from, so a reader who cannot see the marks is not being told about a picture. */}
      <Reading>
        {nickname} revealed fastest in {formatLatencySeconds(own.fastest)}, slowest in{" "}
        {formatLatencySeconds(own.slowest)}, and its median is {formatLatencySeconds(own.median)}
        {court !== null && (
          <>
            {" "}
            against a court median of {formatLatencySeconds(court.median)} across{" "}
            {court.seconds.length} {court.seconds.length === 1 ? "reveal" : "reveals"}
          </>
        )}
        .
      </Reading>

      <Caption>
        {/* The background series is every reveal the court recorded, this agent juror's own
            among them, and the key says exactly that. The artboard labels it "All other draws",
            which would need this column subtracted out of the court's distribution — a second
            reduction of one set of numbers, and one that would leave the plot and the court
            median beside it counting different draws. */}
        Each mark is one draw, placed by how long it took to reveal after the vote period opened.
        Commit latency is not plotted here: it is measured from the commit period rather than the
        vote period, so the two are not one distribution and pooling them would compare durations
        against different clocks (ADR-0005). This agent juror's median commit is on the card above.
        {marked.draws > 0 && (
          <>
            {" "}
            <CaptionMark aria-hidden="true">†</CaptionMark> {marked.draws} of the{" "}
            {own.seconds.length} reveals plotted here ran under{" "}
            {marked.changes.length === 1 && marked.changes[0] !== undefined
              ? `a vote window of ${formatWindowSeconds(marked.changes[0].windows.voteSeconds)}, which the court has since changed`
              : "vote windows the court has since changed"}
            , so they are not comparable with the marks beside them.
          </>
        )}
      </Caption>
    </Card>
  );
}
