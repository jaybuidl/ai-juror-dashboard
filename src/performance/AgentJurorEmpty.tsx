import styled from "styled-components";
import { narrow } from "../styles/breakpoints";
import {
  CardNote,
  Counts,
  CountValue,
  FigureKey,
  Item,
  Metrics,
  MetricValue,
} from "./AgentJurorSummary";
import type { AgentJurorReading } from "./agent-juror-detail";
import { marginalFiguresOf } from "./marginal-figures";
import type { CourtPerformance } from "./performance";

/**
 * The agent juror the court has never drawn, built against `canvas/JurorEmpty.dc.html:56-97`.
 *
 * An honest empty state and emphatically not an error: nothing has gone wrong, there is simply
 * nothing to measure. Every unmeasurable figure is a dash and the card says what a dash means,
 * because the two things it must not be mistaken for are a zero and a failed read — and a failed
 * read is loud, rose and looks nothing like this (ticket 13).
 *
 * It takes a **reading** and not a nickname, so its six figures come from the same join the rest
 * of the page uses. Looking the column up again here would be a second answer to "which agent
 * juror is this", which is the one question `agent-juror-detail.ts` exists to answer once.
 *
 * Its caller renders it only where the draws were read *and* the join succeeded. An agent juror
 * with no draws because nobody asked is not one the court has never drawn, and this page would
 * otherwise state an unread condition as a permanent fact about the court's random selection.
 *
 * **The artboard's "It is staked" is dropped, and that is deliberate.** `JurorEmpty.dc.html:60`
 * reads "It is staked, it is listed in the roster, and it has never been asked to vote";
 * baskerville has never staked, which is why it has no on-chain presence at all
 * (`roster/agent-jurors.ts`). The canvas wins on design and not on its data, and this is its
 * data.
 */

const Empty = styled.section`
  display: flex;
  flex-direction: column;
  gap: ${({ theme }) => theme.space7};
  padding: ${({ theme }) => theme.cardPadLg};
  border: ${({ theme }) => theme.borderHairline};
  border-radius: ${({ theme }) => theme.radiusCard};
  background-color: ${({ theme }) => theme.surfaceCard};
  box-shadow: ${({ theme }) => theme.shadowCard};
`;

/* The heading and its two paragraphs, which sat flush against one another without this. */
const Said = styled.div`
  display: flex;
  flex-direction: column;
  gap: ${({ theme }) => theme.space5};
`;

const EmptyTitle = styled.h2`
  font: ${({ theme }) => theme.typeTitle2};
  letter-spacing: ${({ theme }) => theme.trackingTitle};
  color: ${({ theme }) => theme.textHeading};
`;

const EmptyBody = styled.p`
  max-width: 68ch;
  font: ${({ theme }) => theme.typeBody};
  font-feature-settings: ${({ theme }) => theme.featureNumeric};
  color: ${({ theme }) => theme.textBody};
  text-wrap: pretty;
`;

const Coming = styled.section`
  display: flex;
  flex-direction: column;
  gap: ${({ theme }) => theme.space6};
  padding: ${({ theme }) => theme.cardPad};
  border: ${({ theme }) => theme.borderHairline};
  border-radius: ${({ theme }) => theme.radiusTile};
  background-color: ${({ theme }) => theme.surfaceInset};
`;

const ComingLabel = styled.h2`
  font: ${({ theme }) => theme.typeMonoSm};
  letter-spacing: ${({ theme }) => theme.trackingMono};
  text-transform: uppercase;
  color: ${({ theme }) => theme.textMeta};
`;

const ComingList = styled.dl`
  display: grid;
  grid-template-columns: repeat(3, minmax(0, 1fr));
  gap: ${({ theme }) => theme.space7};
  margin: 0;

  ${narrow} {
    grid-template-columns: minmax(0, 1fr);
    gap: ${({ theme }) => theme.space6};
  }
`;

const ComingKey = styled.dt`
  font: ${({ theme }) => theme.typeMono};
  font-feature-settings: ${({ theme }) => theme.featureMono};
  color: ${({ theme }) => theme.textBody};
`;

const ComingBody = styled.dd`
  margin: ${({ theme }) => `${theme.space3} 0 0`};
  font: ${({ theme }) => theme.typeBodySm};
  color: ${({ theme }) => theme.textMeta};
  text-wrap: pretty;
`;

export function AgentJurorEmpty({
  reading,
  performance,
}: {
  reading: AgentJurorReading;
  performance: CourtPerformance;
}) {
  const nickname = reading.agentJuror.nickname;
  const { sparsity, draws, unreadDisputes } = performance.totals;

  const figures = marginalFiguresOf(reading.marginals, {
    scanned: performance.commitCoverage.read,
    payouts: performance.rewards,
    current: performance.parameters.current,
  });

  return (
    <>
      <Empty aria-labelledby="never-drawn-heading">
        <Said>
          <EmptyTitle id="never-drawn-heading">Never drawn. Nothing has gone wrong.</EmptyTitle>
          <EmptyBody>
            Kleros draws jurors at random, weighted by stake. Across the {sparsity.disputes}{" "}
            {sparsity.disputes === 1 ? "dispute" : "disputes"} whose draws have been read and the{" "}
            {draws} {draws === 1 ? "draw" : "draws"} in them, {nickname} has not come up. It is
            listed in the roster and it has never been asked to vote — so there is nothing here to
            measure, and no number that could be shown without inventing it.
            {/* The claim above is over what was read, and a dispute nobody asked about is not a
                dispute this agent juror was passed over in. Said here rather than left to the
                footer, because the sentence it qualifies is the one directly above it. */}
            {unreadDisputes.length > 0 &&
              ` ${unreadDisputes.length === 1 ? "One further dispute is" : `A further ${unreadDisputes.length} disputes are`} not counted: ${unreadDisputes.length === 1 ? "its draws were" : "their draws were"} never read, so whether ${nickname} was drawn there is unknown rather than no.`}
          </EmptyBody>
          <EmptyBody>
            An agent juror with no draws has no on-chain presence at all. This page exists because
            the roster says it should, not because a query returned it.
          </EmptyBody>
        </Said>

        <Metrics>
          {figures.slice(0, 3).map((figure) => (
            <Item key={figure.key}>
              <FigureKey>{figure.caption}</FigureKey>
              <MetricValue $tone={figure.figure.tone}>{figure.figure.text}</MetricValue>
            </Item>
          ))}
        </Metrics>
        <Counts>
          {figures.slice(3).map((figure) => (
            <Item key={figure.key}>
              <FigureKey>{figure.caption}</FigureKey>
              <CountValue $tone={figure.figure.tone}>{figure.figure.text}</CountValue>
            </Item>
          ))}
        </Counts>

        <CardNote>
          A dash means “no draws to measure”. It never means zero, and it never means the query
          failed — that state is loud, and looks nothing like this. The draw and vote counts above
          are real zeros, because being drawn no times is something the court did rather than
          something this page could not read.
        </CardNote>
      </Empty>

      <Coming aria-labelledby="first-draw-heading">
        <ComingLabel id="first-draw-heading">What appears here on its first draw</ComingLabel>
        <ComingList>
          <div>
            <ComingKey>Commit and reveal latency</ComingKey>
            <ComingBody>
              Both in seconds, each measured from the moment its own period opened.
            </ComingBody>
          </div>
          <div>
            <ComingKey>Coherence, once ruled</ComingKey>
            <ComingBody>
              Undefined until the appeal period closes and a ruling exists to compare the vote
              against.
            </ComingBody>
          </div>
          <div>
            <ComingKey>Its published reasoning</ComingKey>
            <ComingBody>
              Beside the rest of the panel on that dispute's own page, in whatever language it
              writes.
            </ComingBody>
          </div>
        </ComingList>
      </Coming>
    </>
  );
}
