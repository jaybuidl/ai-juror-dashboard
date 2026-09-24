import styled from "styled-components";
import { narrow } from "../styles/breakpoints";
import type { AgentJurorReading } from "./agent-juror-detail";
import type { Figure } from "./cell";
import { marginalFiguresOf } from "./marginal-figures";
import type { CourtPerformance } from "./performance";

/**
 * One agent juror's six figures, in the stat card at `canvas/Juror.dc.html:70-82`.
 *
 * The same six the matrix's column header prints, read by the same `marginalFiguresOf` — three
 * medians and a count across the top, the two sums and the draw count beneath a hairline. This
 * decides how they are laid out and reads none of them: the arithmetic is in `totals.ts` and the
 * gates and absences are in `marginal-figures.ts`. The caveat marks that rode these figures, and
 * the reasons listed under the card, were removed on 2026-09-24 (maintainer's ruling).
 *
 * Beside the model rather than inside the page, exactly as `DisputePanel` sits beside
 * `DisputePage`: a view composes, and a block with six figures in it is a
 * component. It renders at every width — this card is the one place below the breakpoint where
 * cumulative ETH and net PNK are legible at all, since the matrix's card layout has no column
 * headers to carry them.
 */

const Card = styled.section`
  display: flex;
  width: 468px;
  max-width: 100%;
  flex: none;
  flex-direction: column;
  gap: ${({ theme }) => theme.space6};
  padding: ${({ theme }) => theme.cardPad};
  border: ${({ theme }) => theme.borderHairline};
  border-radius: ${({ theme }) => theme.radiusCard};
  background-color: ${({ theme }) => theme.surfaceCard};
  box-shadow: ${({ theme }) => theme.shadowCard};

  ${narrow} {
    width: 100%;
  }
`;

export const Metrics = styled.dl`
  display: grid;
  grid-template-columns: repeat(3, minmax(0, 1fr));
  gap: ${({ theme }) => theme.space5};
  margin: 0;
`;

/*
 * One figure: its key in the DOM before its value, and its value above its key on the page.
 *
 * A dd before its own dt is invalid inside a description list, and the artboard puts the number
 * on top — so the order is reversed in the arrangement rather than in the markup. Through
 * `order` on the value and not through column-reverse: reversing lays the column out from the
 * bottom, so an item whose key wraps to two lines pushes its own number a line higher than the
 * two beside it, and the three stop sharing a baseline. That is exactly what happens at 390pt,
 * where "Median reveal" wraps and "Coherent" does not.
 */
export const Item = styled.div`
  display: flex;
  min-width: 0;
  flex-direction: column;
  gap: ${({ theme }) => theme.space4};
`;

export const Counts = styled(Metrics)`
  padding-top: ${({ theme }) => theme.space6};
  border-top: ${({ theme }) => theme.borderHairline};
`;

export const FigureKey = styled.dt`
  font: ${({ theme }) => theme.typeMonoSm};
  letter-spacing: ${({ theme }) => theme.trackingMono};
  text-transform: uppercase;
  color: ${({ theme }) => theme.textMeta};
`;

export const MetricValue = styled.dd<{ $tone: Figure["tone"]; $loss?: boolean }>`
  margin: 0;
  min-width: 0;
  /* Above its own key, which sits before it in the markup. See the Item comment above. */
  order: -1;
  font: ${({ theme }) => theme.typeMetricSm};
  /* The shorthand above resets the tabular figures base.css puts on body, and three of these
     sit side by side with three more underneath them. */
  font-feature-settings: ${({ theme }) => theme.featureMono};
  color: ${({ theme, $tone, $loss }) => {
    if ($tone === "missed" || $tone === "unread") return theme.stateFail;
    /* The same ink the matrix's column header gives an absent figure. One ink for "there is
       nothing here to measure" across both renderings, or a reader learns two. */
    if ($tone === "pending") return theme.textPending;
    return $loss === true ? theme.stateWork : theme.textHeading;
  }};
  white-space: nowrap;
`;

export const CountValue = styled(MetricValue)`
  font: ${({ theme }) => theme.typeMono};
  font-feature-settings: ${({ theme }) => theme.featureMono};
`;

export const CardNote = styled.p`
  font: ${({ theme }) => theme.typeBodySm};
  font-feature-settings: ${({ theme }) => theme.featureNumeric};
  color: ${({ theme }) => theme.textMeta};
  text-wrap: pretty;
`;

export function AgentJurorSummary({
  reading,
  performance,
}: {
  reading: AgentJurorReading;
  performance: CourtPerformance;
}) {
  const nickname = reading.agentJuror.nickname;
  const figures = marginalFiguresOf(reading.marginals, {
    scanned: performance.commitCoverage.read,
    payouts: performance.rewards,
  });
  const metrics = figures.slice(0, 3);
  const counts = figures.slice(3);
  const note = coherenceNote(reading);

  return (
    <Card aria-label={`What ${nickname} has done, summarised`}>
      <Metrics>
        {metrics.map((figure) => (
          <Item key={figure.key}>
            <FigureKey>{figure.caption}</FigureKey>
            <MetricValue $tone={figure.figure.tone} $loss={figure.loss}>
              {figure.figure.text}
            </MetricValue>
          </Item>
        ))}
      </Metrics>
      <Counts>
        {counts.map((figure) => (
          <Item key={figure.key}>
            <FigureKey>{figure.caption}</FigureKey>
            <CountValue $tone={figure.figure.tone} $loss={figure.loss}>
              {figure.figure.text}
            </CountValue>
          </Item>
        ))}
      </Counts>

      {note !== null && <CardNote>{note}</CardNote>}
    </Card>
  );
}

/**
 * The sentence under the card, in whichever of its three states this column is in.
 *
 * The artboard's is the affirmative one — "every panel this agent sat on had 2 or more members"
 * — and it is a claim, so it is made only where it is true and only where there is a coherence
 * figure for it to be about. Where a lone panel *is* behind the count, it says nothing: the claim
 * would be false, and the lone-panel caveat itself lives on /method since 2026-09-24.
 */
function coherenceNote(reading: AgentJurorReading): string | null {
  const nickname = reading.agentJuror.nickname;
  const { coherent, resolved, lonePanelDisputes } = reading.marginals.coherence;

  if (resolved === 0) {
    return `The court has not ruled on any dispute ${nickname} was drawn in, so it has no coherence figure yet. A round majority before the appeal period closes is a prediction, not a ruling.`;
  }
  if (lonePanelDisputes.length > 0) return null;

  return `Every panel ${nickname} sat on held two or more agent jurors, so none of this coherence is tautological. It is ${coherent} of ${resolved} draws the court has ruled on, counted and never rated.`;
}
