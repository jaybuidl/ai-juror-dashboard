import styled from "styled-components";
import { narrow } from "../styles/breakpoints";
import { formatLatencySeconds } from "./latency";
import { ORDINARY_COURT_FROM_SECONDS, STRIP_TICKS, stripFraction, stripMarks } from "./strip";
import type { LatencySummary } from "./totals";

/**
 * The reveal-latency distribution, built against `canvas/Main.dc.html:79-109`.
 *
 * One mark per draw on a logarithmic axis, a median line carrying its own value, and the
 * fastest, median and slowest as three absolute durations. All of it is read from
 * `totals.revealLatency` — the same per-draw seconds the matrix cells print — so this is a
 * second view of one set of numbers and never a separately derived figure.
 *
 * The heading says how many draws are plotted, because a distribution with no count can be
 * read as covering more of the record than it does.
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
  letter-spacing: ${({ theme }) => theme.trackingMono};
  text-transform: uppercase;
  color: ${({ theme }) => theme.textPending};
`;

const Plot = styled.div`
  position: relative;
  height: 108px;
  margin-top: ${({ theme }) => theme.space2};

  ${narrow} {
    height: 132px;
  }
`;

/** The illustrative band. Decoration behind the marks, and never in front of them. */
const Band = styled.div<{ $from: number }>`
  position: absolute;
  left: ${({ $from }) => `${$from * 100}%`};
  right: 0;
  top: 0;
  bottom: 26px;
  background-color: ${({ theme }) => theme.washViolet};
  border-left: 1px solid ${({ theme }) => theme.orbitLine};
  border-radius: 0 ${({ theme }) => theme.radiusChip} ${({ theme }) => theme.radiusChip} 0;
`;

const BandLabel = styled.div<{ $from: number }>`
  position: absolute;
  left: calc(${({ $from }) => `${$from * 100}%`} + 10px);
  top: 4px;
  font: ${({ theme }) => theme.typeMonoSm};
  letter-spacing: ${({ theme }) => theme.trackingMonoTight};
  color: ${({ theme }) => theme.textBody};
`;

const BandLabelQuiet = styled.span`
  color: ${({ theme }) => theme.textMeta};
`;

const Axis = styled.div`
  position: absolute;
  left: 0;
  right: 0;
  bottom: 26px;
  height: 1px;
  background-color: ${({ theme }) => theme.lineStrongColor};
`;

const Mark = styled.span`
  position: absolute;
  width: 8px;
  height: 8px;
  margin-left: -4px;
  border-radius: 50%;
  background-color: ${({ theme }) => theme.accent};
  border: 1px solid ${({ theme }) => theme.page};
  box-sizing: border-box;
  opacity: 0.72;
`;

const Median = styled.div`
  position: absolute;
  top: 0;
  bottom: 26px;
  width: 1px;
  background-color: ${({ theme }) => theme.accent};
`;

const MedianValue = styled.div`
  position: absolute;
  top: 0;
  font: ${({ theme }) => theme.typeMono};
  font-feature-settings: ${({ theme }) => theme.featureMono};
  color: ${({ theme }) => theme.accent};
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

const Summary = styled.dl`
  display: flex;
  gap: ${({ theme }) => theme.space9};
  margin: 0;
  padding-top: ${({ theme }) => theme.space6};
  border-top: ${({ theme }) => theme.borderHairline};
`;

const SummaryKey = styled.dt`
  font: ${({ theme }) => theme.typeMonoSm};
  letter-spacing: ${({ theme }) => theme.trackingMono};
  text-transform: uppercase;
  color: ${({ theme }) => theme.textMeta};
`;

const SummaryValue = styled.dd`
  margin: ${({ theme }) => `${theme.space3} 0 0`};
  font: ${({ theme }) => theme.typeMonoLg};
  font-feature-settings: ${({ theme }) => theme.featureMono};
  color: ${({ theme }) => theme.textHeading};
`;

const Caption = styled.p`
  font: ${({ theme }) => theme.typeBodySm};
  font-feature-settings: ${({ theme }) => theme.featureNumeric};
  color: ${({ theme }) => theme.textMeta};
`;

const Nothing = styled.p`
  font: ${({ theme }) => theme.typeBodySm};
  color: ${({ theme }) => theme.textMeta};
`;

/** Where a mark sits above the axis, stacked so two equal latencies do not overprint. */
function markBottom(stack: number): string {
  return `${31 + stack * 10}px`;
}

export function LatencyStrip({ latency }: { latency: LatencySummary | null }) {
  if (latency === null) {
    // An empty plot with an axis and no marks reads as a court where nothing happened.
    return (
      <Card aria-labelledby="strip-heading">
        <Head>
          <Heading id="strip-heading">Reveal latency</Heading>
        </Head>
        <Nothing>
          No draw has revealed in what was read, so there is no distribution to plot. That is the
          state of the read, not a measurement of zero.
        </Nothing>
      </Card>
    );
  }

  const marks = stripMarks(latency.seconds);
  const median = stripFraction(latency.median);
  const band = stripFraction(ORDINARY_COURT_FROM_SECONDS);

  return (
    <Card aria-labelledby="strip-heading">
      <Head>
        <Heading id="strip-heading">
          Reveal latency · {latency.seconds.length}{" "}
          {latency.seconds.length === 1 ? "draw" : "draws"}
        </Heading>
        <Scale>Log scale</Scale>
      </Head>

      {/* The plot is decoration over a figure that is printed in full below it: every value
          here is in the summary, and the marks carry no information the durations do not. */}
      <Plot aria-hidden="true">
        <Band $from={band} />
        <BandLabel $from={band}>
          Ordinary Kleros court
          <br />
          <BandLabelQuiet>hours to days</BandLabelQuiet>
        </BandLabel>
        <Axis />

        {marks.map((mark) => (
          <Mark
            // Two draws can share a latency, so the value alone is not a key; the stack
            // index makes the pair unique without keying on array position.
            key={`${mark.seconds}-${mark.stack}`}
            style={{ left: `${mark.x * 100}%`, bottom: markBottom(mark.stack) }}
          />
        ))}

        <Median style={{ left: `${median * 100}%` }} />
        <MedianValue style={{ left: `calc(${median * 100}% + 8px)` }}>
          {formatLatencySeconds(latency.median)} median
        </MedianValue>

        {STRIP_TICKS.map((tick) => (
          <Tick key={tick.label} style={{ left: `${stripFraction(tick.seconds) * 100}%` }}>
            {tick.label}
          </Tick>
        ))}
      </Plot>

      <Summary>
        <div>
          <SummaryKey>Fastest</SummaryKey>
          <SummaryValue>{formatLatencySeconds(latency.fastest)}</SummaryValue>
        </div>
        <div>
          <SummaryKey>Median</SummaryKey>
          <SummaryValue>{formatLatencySeconds(latency.median)}</SummaryValue>
        </div>
        <div>
          <SummaryKey>Slowest</SummaryKey>
          <SummaryValue>{formatLatencySeconds(latency.slowest)}</SummaryValue>
        </div>
      </Summary>

      <Caption>
        Each mark is one draw, placed by how long it took to reveal after the vote period opened.
        The comparison band is illustrative: ordinary Kleros courts run their periods over hours and
        days, and court 34 does not. It measures no court.
      </Caption>
    </Card>
  );
}
