import { Link } from "react-router";
import styled from "styled-components";
import type { Dispute } from "../disputes/disputes";
import { useIsNarrow } from "../styles/breakpoints";
import { VisuallyHidden } from "../styles/hidden";
import { type Tone, toneInk, toneLine } from "../styles/tones";
import type { AgentJurorDraw } from "./agent-juror-detail";
import {
  commitFigureOf,
  type Figure,
  type Presentation,
  presentationOf,
  revealFigureOf,
} from "./cell";
import { listOf } from "./Footnotes";
import { Legend, StateLegend } from "./Legend";
import { type RowFlagContext, rowFlagOf } from "./row-flags";

/**
 * The disputes one agent juror was drawn in, built against `canvas/Juror.dc.html:113-134`.
 *
 * Two arrangements of one derivation, which is ticket 16's rule applied inside a single
 * component: `linesOf` below reads every figure once, and the table and the phone's list both
 * map over what it returned. Seven columns cannot be shown at 390pt without pushing the page
 * sideways — the one thing a layout here must never do — and a table transposed, scaled or
 * scrolled sideways is the shape ticket 16 rejected for the matrix. Only one of the two is ever
 * in the DOM.
 *
 * Every figure is read by a function the matrix already reads it with: `revealFigureOf` and
 * `commitFigureOf` for the two latencies, `presentationOf` for the state, `rowFlagOf` for the
 * one flag a dispute wears. A second reading here would be a second set of judgements about
 * what an absent commit log means, on a page where the agent juror is named at the top.
 */

const Section = styled.section`
  display: flex;
  flex-direction: column;
  gap: ${({ theme }) => theme.space6};
`;

const Heading = styled.h2`
  font: ${({ theme }) => theme.typeTitle2};
  /* It counts disputes, and the shorthand above resets the tabular figures base.css puts on the
     body. Every numeric element on every artboard carries its own, which is the tell. */
  font-feature-settings: ${({ theme }) => theme.featureNumeric};
  letter-spacing: ${({ theme }) => theme.trackingTitle};
  color: ${({ theme }) => theme.textHeading};
`;

const Deck = styled.p`
  max-width: 68ch;
  font: ${({ theme }) => theme.typeBody};
  font-feature-settings: ${({ theme }) => theme.featureNumeric};
  color: ${({ theme }) => theme.textMeta};
  text-wrap: pretty;
`;

/* `table-layout: fixed` and a colgroup, so the widths are the artboard's and a long title
   clips rather than widening its column. An auto-laid table sizes to its content exactly as a
   `1fr` grid track does, and the row then runs off the side of the page with nothing in the
   console (`CLAUDE.md`, on `text-overflow` inside a `1fr` track). */
const Table = styled.table`
  width: 100%;
  table-layout: fixed;
  border-collapse: collapse;
`;

const HeaderCell = styled.th`
  padding: 0 ${({ theme }) => theme.space5} ${({ theme }) => theme.space5} 0;
  font: ${({ theme }) => theme.typeMonoSm};
  font-size: 9px;
  letter-spacing: ${({ theme }) => theme.trackingMono};
  text-transform: uppercase;
  text-align: left;
  color: ${({ theme }) => theme.textPending};
  white-space: nowrap;
`;

const LastHeaderCell = styled(HeaderCell)`
  padding-right: 0;
  text-align: right;
`;

const BodyCell = styled.td`
  min-height: 54px;
  padding: ${({ theme }) => `${theme.space5} ${theme.space5} ${theme.space5} 0`};
  border-top: ${({ theme }) => theme.borderHairline};
  vertical-align: middle;
`;

const LastBodyCell = styled(BodyCell)`
  padding-right: 0;
  text-align: right;
`;

const DisputeId = styled(Link)`
  font: ${({ theme }) => theme.typeMono};
  font-feature-settings: ${({ theme }) => theme.featureMono};
  color: ${({ theme }) => theme.textMeta};
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

const Title = styled.span`
  display: block;
  /* Both, and both required: a flex item's minimum is its content's, so without this the title
     grows to fit and pushes the row sideways rather than clipping — the same failure CLAUDE.md
     records for text-overflow inside a 1fr grid track, with nothing in the console either time.
     No backticks in this comment: one would close the styled template and break the file far
     below it. */
  min-width: 0;
  flex: 1;
  overflow: hidden;
  font: ${({ theme }) => theme.typeBody};
  font-weight: 600;
  color: ${({ theme }) => theme.textHeading};
  text-overflow: ellipsis;
  white-space: nowrap;
`;

/* A dispute whose template carried no title, said rather than left blank: an empty heading is
   indistinguishable from one that failed to load. */
const Untitled = styled(Title)`
  font-weight: 400;
  color: ${({ theme }) => theme.textPending};
`;

const Value = styled.span<{ $tone: Figure["tone"] }>`
  font: ${({ theme }) => theme.typeMono};
  /* The shorthand above resets the tabular figures base.css puts on body, and a column of
     latencies that stops lining up reports nothing anywhere. */
  font-feature-settings: ${({ theme }) => theme.featureMono};
  color: ${({ theme, $tone }) => {
    if ($tone === "missed" || $tone === "unread") return theme.stateFail;
    if ($tone === "pending") return theme.textPending;
    return theme.textBody;
  }};
  white-space: nowrap;
`;

const Quiet = styled.span`
  font: ${({ theme }) => theme.typeMono};
  font-feature-settings: ${({ theme }) => theme.featureMono};
  color: ${({ theme }) => theme.textMeta};
  white-space: nowrap;
`;

const StatePill = styled.span<{ $tone: Tone }>`
  display: inline-flex;
  align-items: center;
  gap: ${({ theme }) => theme.space2};
  padding: ${({ theme }) => `${theme.space2} ${theme.space3}`};
  border: 1px solid ${({ theme, $tone }) => toneLine(theme, $tone)};
  border-radius: ${({ theme }) => theme.radiusChip};
  font: ${({ theme }) => theme.typeMonoSm};
  letter-spacing: ${({ theme }) => theme.trackingMono};
  text-transform: uppercase;
  color: ${({ theme, $tone }) => toneInk(theme, $tone)};
  white-space: nowrap;
`;

/* The ‡ beside a coherence mark whose panel held one agent juror. It rides the *state* and not
   the panel size, because it is the state that is uninformative there — being the majority took
   no agreement. */
const LoneMark = styled(Link)`
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

const FlagPill = styled.span<{ $tone: Tone }>`
  display: inline-flex;
  align-items: center;
  gap: ${({ theme }) => theme.space2};
  padding: ${({ theme }) => `${theme.space2} ${theme.space3}`};
  border: 1px solid ${({ theme, $tone }) => toneLine(theme, $tone)};
  border-radius: ${({ theme }) => theme.radiusChip};
  font: ${({ theme }) => theme.typeMonoSm};
  font-feature-settings: ${({ theme }) => theme.featureMono};
  letter-spacing: ${({ theme }) => theme.trackingMono};
  text-transform: uppercase;
  color: ${({ theme, $tone }) => toneInk(theme, $tone)};
  white-space: nowrap;
`;

/* The phone's arrangement. A `ul` carries 40px of UA `padding-inline-start` and this repo has
   no reset that removes it — left in, the whole list sits 40px right of everything above it and
   pushes the page sideways. jsdom lays nothing out, so no test can see it (`CLAUDE.md`). */
const Cards = styled.ul`
  display: flex;
  flex-direction: column;
  gap: ${({ theme }) => theme.space5};
  margin: 0;
  padding: 0;
  list-style: none;
`;

const CardItem = styled.li`
  display: flex;
  flex-direction: column;
  gap: ${({ theme }) => theme.space4};
  padding: ${({ theme }) => `${theme.space5} ${theme.space6}`};
  border: ${({ theme }) => theme.borderHairline};
  border-radius: ${({ theme }) => theme.radiusTile};
  background-color: ${({ theme }) => theme.surfaceCard};
`;

const CardHead = styled.div`
  display: flex;
  align-items: baseline;
  gap: ${({ theme }) => theme.space4};
  min-width: 0;
`;

const CardMarks = styled.div`
  display: flex;
  align-items: center;
  gap: ${({ theme }) => theme.space3};
  flex-wrap: wrap;
`;

const CardFigures = styled.dl`
  display: grid;
  grid-template-columns: repeat(2, minmax(0, 1fr));
  gap: ${({ theme }) => `${theme.space4} ${theme.space5}`};
  margin: 0;
`;

const FigureKey = styled.dt`
  font: ${({ theme }) => theme.typeMonoSm};
  font-size: 9px;
  letter-spacing: ${({ theme }) => theme.trackingMono};
  text-transform: uppercase;
  color: ${({ theme }) => theme.textPending};
`;

const FigureValue = styled.dd`
  margin: ${({ theme }) => `${theme.space2} 0 0`};
`;

/** One dispute's line, read once and drawn twice. */
type DrawLine = {
  dispute: Dispute;
  title: string | null;
  panelSize: number;
  lonePanel: boolean;
  /** What this draw voted, or the em dash for a draw that has not revealed. */
  choice: Figure;
  reveal: Figure;
  commit: Figure;
  state: Presentation;
  flag: { glyph: string; label: string; tone: Tone } | undefined;
};

/**
 * What this draw voted for, as a phrase rather than a number.
 *
 * A list and not a single value, because `Draw.choices` is one: a draw holds several vote IDs
 * and nothing in the model forces them to agree. It has never happened in this court, and
 * printing "Choice 2" over a draw that voted 1 *and* 2 would be a claim the draw did not make.
 *
 * A `Figure` and not a string, so the em dash carries its own pending tone the way the two
 * latencies beside it do. Returning the dash as text left both renderings comparing against the
 * character to decide the ink — a sentinel neither of them should have had to know.
 */
function choiceOf(choices: readonly number[]): Figure {
  if (choices.length === 0) return { text: "—", tone: "pending" };
  if (choices.length === 1) return { text: `Choice ${choices[0]}`, tone: "value" };
  return { text: `Choices ${listOf(choices)}`, tone: "value" };
}

function linesOf(
  draws: readonly AgentJurorDraw[],
  scanned: boolean,
  flagContext: RowFlagContext,
  titleFor: (dispute: Dispute) => string | null,
): DrawLine[] {
  return draws.map(({ row, draw }) => {
    const flag = rowFlagOf(row, flagContext);

    return {
      dispute: row.dispute,
      title: titleFor(row.dispute),
      panelSize: row.panelSize,
      lonePanel: row.panelSize === 1,
      choice: choiceOf(draw.choices),
      reveal: revealFigureOf(draw),
      commit: commitFigureOf(draw, scanned),
      state: presentationOf(draw.state),
      flag:
        flag === undefined
          ? undefined
          : { glyph: flag.glyph, label: flag.label(row, flagContext), tone: flag.tone },
    };
  });
}

export type AgentJurorDrawsProps = {
  nickname: string;
  draws: readonly AgentJurorDraw[];
  /** `commitCoverage.read` — see `commitFigureOf`. */
  scanned: boolean;
  flagContext: RowFlagContext;
  /** The dispute's subject, or `null` where the template subgraph gave none. */
  titleFor: (dispute: Dispute) => string | null;
  /** Disputes whose draws were never read, which this list is short by. */
  unreadDisputes: readonly number[];
};

export function AgentJurorDraws({
  nickname,
  draws,
  scanned,
  flagContext,
  titleFor,
  unreadDisputes,
}: AgentJurorDrawsProps) {
  const isNarrow = useIsNarrow();
  const lines = linesOf(draws, scanned, flagContext, titleFor);
  const unread = unreadDisputes.length;

  return (
    <Section aria-labelledby="draws-heading">
      <Heading id="draws-heading">
        Drawn in {lines.length} {lines.length === 1 ? "dispute" : "disputes"}.
      </Heading>
      <Deck>
        Newest first. Every coherence mark here is given with the panel size of the dispute it came
        from, because one does not mean anything without the other: a lone agent juror is
        automatically the majority.
        {/* "Given with" and not "beside": in the table the panel is the third column and the
            coherence the seventh, and on a card the state sits above the figures rather than
            next to one. A sentence naming a position is a claim about which layout the reader is
            looking at, which is the fault ticket 16's review caught five times over.

            The heading counts what was read, and a dispute whose draws were never read is not a
            dispute this agent juror was absent from — nobody asked. Said here because the count
            it qualifies is in the heading directly above it, and said in the banner above that.
            Twice and never a third time: the footer carries no caveat for it. */}
        {unread > 0 &&
          ` ${unread === 1 ? "Dispute" : "Disputes"} ${listOf(unreadDisputes)} ${unread === 1 ? "is" : "are"} not counted: ${unread === 1 ? "its draws were" : "their draws were"} never read, so whether ${nickname} was drawn ${unread === 1 ? "there" : "in them"} is unknown rather than no.`}
      </Deck>

      {/* The decoder for the state words below, in the one place both this view and the matrix
          read it from. Ticket 16's rule: any view that shows a draw's state owes its reader the
          legend, and a second copy of the list would be a second vocabulary. `unknown` is false
          because the sixth state cannot appear here — an unread row has no cell for anybody, so
          it contributes no line to this list at all, and naming a state the record does not
          contain teaches a reader to look for a failure that is not there. */}
      <Legend>
        <StateLegend unknown={false} />
      </Legend>

      {isNarrow ? (
        <DrawCards lines={lines} nickname={nickname} />
      ) : (
        <DrawTable lines={lines} nickname={nickname} />
      )}
    </Section>
  );
}

function DrawTable({ lines, nickname }: { lines: readonly DrawLine[]; nickname: string }) {
  return (
    <Table>
      <VisuallyHidden as="caption">
        Every dispute {nickname} was drawn in, newest first, with its panel size, what it voted, how
        long it took to commit and to reveal, and whether that vote matched the ruling.
      </VisuallyHidden>
      <colgroup>
        <col style={{ width: "56px" }} />
        <col />
        <col style={{ width: "92px" }} />
        <col style={{ width: "104px" }} />
        <col style={{ width: "120px" }} />
        <col style={{ width: "120px" }} />
        <col style={{ width: "150px" }} />
      </colgroup>
      <thead>
        <tr>
          <HeaderCell scope="col">ID</HeaderCell>
          <HeaderCell scope="col">Dispute</HeaderCell>
          <HeaderCell scope="col">Panel</HeaderCell>
          <HeaderCell scope="col">Choice</HeaderCell>
          <HeaderCell scope="col">Reveal</HeaderCell>
          <HeaderCell scope="col">Commit</HeaderCell>
          <LastHeaderCell scope="col">Coherence</LastHeaderCell>
        </tr>
      </thead>
      <tbody>
        {lines.map((line) => (
          <tr key={line.dispute.id}>
            <BodyCell>
              <DisputeId to={`/disputes/${line.dispute.id}`}>{line.dispute.id}</DisputeId>
            </BodyCell>
            <BodyCell>
              {line.title === null ? (
                <Untitled>Untitled</Untitled>
              ) : (
                <Title title={line.title}>{line.title}</Title>
              )}
              {line.flag && (
                <CardMarks>
                  <FlagPill $tone={line.flag.tone}>
                    <span aria-hidden="true">{line.flag.glyph}</span>
                    {line.flag.label}
                  </FlagPill>
                </CardMarks>
              )}
            </BodyCell>
            <BodyCell>
              <Quiet>{line.panelSize}</Quiet>
            </BodyCell>
            <BodyCell>
              <Value $tone={line.choice.tone}>{line.choice.text}</Value>
            </BodyCell>
            <BodyCell>
              <Value $tone={line.reveal.tone}>{line.reveal.text}</Value>
            </BodyCell>
            <BodyCell>
              <Value $tone={line.commit.tone}>{line.commit.text}</Value>
            </BodyCell>
            <LastBodyCell>
              <StateMark line={line} nickname={nickname} />
            </LastBodyCell>
          </tr>
        ))}
      </tbody>
    </Table>
  );
}

function DrawCards({ lines, nickname }: { lines: readonly DrawLine[]; nickname: string }) {
  return (
    <Cards>
      {lines.map((line) => (
        <CardItem key={line.dispute.id}>
          <CardHead>
            <DisputeId to={`/disputes/${line.dispute.id}`}>{line.dispute.id}</DisputeId>
            {line.title === null ? (
              <Untitled>Untitled</Untitled>
            ) : (
              <Title title={line.title}>{line.title}</Title>
            )}
          </CardHead>
          <CardMarks>
            <StateMark line={line} nickname={nickname} />
            {line.flag && (
              <FlagPill $tone={line.flag.tone}>
                <span aria-hidden="true">{line.flag.glyph}</span>
                {line.flag.label}
              </FlagPill>
            )}
          </CardMarks>
          <CardFigures>
            <div>
              <FigureKey>Panel</FigureKey>
              <FigureValue>
                <Quiet>{line.panelSize}</Quiet>
              </FigureValue>
            </div>
            <div>
              <FigureKey>Choice</FigureKey>
              <FigureValue>
                <Value $tone={line.choice.tone}>{line.choice.text}</Value>
              </FigureValue>
            </div>
            <div>
              <FigureKey>Reveal</FigureKey>
              <FigureValue>
                <Value $tone={line.reveal.tone}>{line.reveal.text}</Value>
              </FigureValue>
            </div>
            <div>
              <FigureKey>Commit</FigureKey>
              <FigureValue>
                <Value $tone={line.commit.tone}>{line.commit.text}</Value>
              </FigureValue>
            </div>
          </CardFigures>
        </CardItem>
      ))}
    </Cards>
  );
}

/** The state, its glyph and the ‡ where the panel behind it held one agent juror. */
function StateMark({ line, nickname }: { line: DrawLine; nickname: string }) {
  return (
    <StatePill $tone={line.state.tone}>
      <span aria-hidden="true">{line.state.glyph}</span>
      {line.state.word}
      {line.lonePanel && (
        <LoneMark
          to="/method#caveats"
          aria-label={`Why ${nickname}'s draw in dispute ${line.dispute.id} is marked`}
        >
          <span aria-hidden="true">‡</span>
        </LoneMark>
      )}
    </StatePill>
  );
}
