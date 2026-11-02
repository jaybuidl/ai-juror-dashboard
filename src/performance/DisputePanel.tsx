import styled from "styled-components";
import { stackLabelOf } from "../roster/agent-jurors";
import type { AgentJurorIdentity } from "../roster/ens";
import type { RosterView } from "../roster/useRoster";
import { narrow } from "../styles/breakpoints";
import { VisuallyHidden } from "../styles/hidden";
import { type Tone, toneInk, toneLine, toneWash } from "../styles/tones";
import { commitFigureOf, type Figure, presentationOf, revealFigureOf } from "./cell";
import type { DisputeReading, PanelColumn } from "./dispute-detail";
import { JustificationProse } from "./Justification";

/**
 * Every panel member's published reasoning, one card under another.
 *
 * The thing this experiment exists to show: identical evidence, one question, and however many
 * independent stacks the court drew, reasoning about it in their own words. One full-width card
 * per panel member, in roster order — a panel is a handful of vote IDs and has never exceeded the
 * roster, so there is no carousel and no pagination.
 *
 * "At most six" is what this said until the roster stopped being six (ticket 24), and the number
 * was the wrong thing to lean on twice over: it is a bound on the *roster*, and the quantity that
 * decides whether this layout works is how many jurors the court drew for one dispute. Neither
 * bound sizes `Columns`, so what changed then was only the sentence — which is the tell
 * `CONTEXT.md`'s Panel entry warns about: a claim quantified over a set that has since been
 * widened.
 *
 * Coherence does not reorder them. A diverged reading keeps its roster position and is never
 * sorted last: the ordering is `MatrixRow.cells`', which is `agent-jurors.ts`', and nothing
 * here sorts. Ranking the panel by whether it agreed with the ruling would be this dashboard
 * expressing a preference about which reasoning was better, which is exactly what it does not do.
 */

const Band = styled.section`
  display: flex;
  flex-direction: column;
  gap: ${({ theme }) => theme.space6};
`;

const BandHead = styled.header`
  display: flex;
  align-items: baseline;
  justify-content: space-between;
  gap: ${({ theme }) => theme.space8};

  ${narrow} {
    flex-direction: column;
    align-items: flex-start;
    gap: ${({ theme }) => theme.space5};
  }
`;

const Heading = styled.h2`
  font: ${({ theme }) => theme.typeTitle1};
  letter-spacing: ${({ theme }) => theme.trackingTitle};
  color: ${({ theme }) => theme.textHeading};
`;

/**
 * One card per row, full width, in roster order (2026-11-02, maintainer's ruling).
 *
 * They were equal-width columns side by side — an auto-fit grid — and at four or five to a row
 * each card was about 250px wide, which is prose nobody can read. Stacked, a card and its
 * reasoning take the page's full width. The panel is no
 * longer all on screen at once; the order is still the roster's and nothing is ranked.
 */
const Columns = styled.div`
  display: flex;
  flex-direction: column;
  gap: ${({ theme }) => theme.space6};
`;

const Column = styled.article`
  display: flex;
  min-width: 0;
  flex-direction: column;
  border: ${({ theme }) => theme.borderHairline};
  border-radius: ${({ theme }) => theme.radiusCard};
  background-color: ${({ theme }) => theme.surfaceCard};
  box-shadow: ${({ theme }) => theme.shadowCard};
  overflow: hidden;
`;

const ColumnHead = styled.header`
  display: flex;
  flex-direction: column;
  gap: ${({ theme }) => theme.space5};
  padding: ${({ theme }) => theme.space6};
  border-bottom: ${({ theme }) => theme.borderHairline};
`;

const Who = styled.div`
  display: flex;
  align-items: center;
  gap: ${({ theme }) => theme.space4};
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

/* Stands in for an avatar ENS did not give us, drawn exactly as the roster draws it: the
   system's glyph tile, never a generated identicon. An invented portrait is indistinguishable
   from a real one at a glance, and this page keeps what it was told apart from what it made up. */
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

const Named = styled.div`
  display: flex;
  min-width: 0;
  flex-direction: column;
  gap: ${({ theme }) => theme.space2};
`;

const Nickname = styled.span`
  font: ${({ theme }) => theme.typeTitle3};
  letter-spacing: ${({ theme }) => theme.trackingTitle};
  color: ${({ theme }) => theme.textHeading};
  overflow-wrap: anywhere;
`;

const StackLabel = styled.span`
  font: ${({ theme }) => theme.typeMonoSm};
  letter-spacing: ${({ theme }) => theme.trackingMono};
  text-transform: uppercase;
  color: ${({ theme }) => theme.textPending};
`;

/* A glyph and a word before it is a colour — ADR-0006. Removing the hue leaves the mark
   readable, which is the property that decision exists to keep. */
const Mark = styled.span<{ $tone: Tone }>`
  display: inline-flex;
  align-items: center;
  gap: ${({ theme }) => theme.space3};
  margin-left: auto;
  padding: ${({ theme }) => `${theme.space3} ${theme.space4}`};
  border: 1px solid ${({ theme, $tone }) => toneLine(theme, $tone)};
  border-radius: ${({ theme }) => theme.radiusChip};
  background-color: ${({ theme, $tone }) => toneWash(theme, $tone)};
  font: ${({ theme }) => theme.typeMonoSm};
  letter-spacing: ${({ theme }) => theme.trackingMono};
  text-transform: uppercase;
  color: ${({ theme, $tone }) => toneInk(theme, $tone)};
  white-space: nowrap;
`;

const Measures = styled.div`
  display: flex;
  align-items: center;
  gap: ${({ theme }) => theme.space5};
  flex-wrap: wrap;
`;

const Measure = styled.span`
  display: inline-flex;
  align-items: baseline;
  gap: ${({ theme }) => theme.space3};
`;

const MeasureKey = styled.abbr`
  font: ${({ theme }) => theme.typeMonoSm};
  letter-spacing: ${({ theme }) => theme.trackingMono};
  color: ${({ theme }) => theme.textPending};
  text-decoration: none;
`;

const MeasureValue = styled.span<{ $tone: Figure["tone"] }>`
  font: ${({ theme }) => theme.typeMono};
  /* The type token is a font shorthand and resets the tabular figures base.css puts on body.
     A column of latencies that stops lining up is the whole reason this is re-declared. */
  font-feature-settings: ${({ theme }) => theme.featureMono};
  color: ${({ theme, $tone }) => {
    if ($tone === "value") return theme.textHeading;
    if ($tone === "missed") return theme.stateWork;
    if ($tone === "unread") return theme.stateFail;
    return theme.textPending;
  }};
`;

/* How many of the dispute's vote IDs this draw holds — the court can draw one juror more than
   once, and each draw is a vote. In the header since 2026-11-02, when the footer that carried it
   (as "N vote IDs", and only above one) went with the prose's length and format. */
const Votes = styled.span`
  margin-left: auto;
  font: ${({ theme }) => theme.typeMonoSm};
  font-feature-settings: ${({ theme }) => theme.featureMono};
  letter-spacing: ${({ theme }) => theme.trackingMono};
  text-transform: uppercase;
  color: ${({ theme }) => theme.textMeta};
  white-space: nowrap;
`;

const Choice = styled.span<{ $tone: Tone }>`
  font: ${({ theme }) => theme.typeMonoSm};
  font-feature-settings: ${({ theme }) => theme.featureMono};
  letter-spacing: ${({ theme }) => theme.trackingMono};
  text-transform: uppercase;
  color: ${({ theme, $tone }) => toneInk(theme, $tone)};
  white-space: nowrap;
`;

/* The reasoning takes the card's full width (2026-11-02, maintainer's ruling: an 80ch measure
   was tried and read as unused space). */
const ColumnBody = styled.div`
  display: flex;
  flex: 1;
  flex-direction: column;
  gap: ${({ theme }) => theme.space5};
  padding: ${({ theme }) => theme.space6};
`;

/* The empty state, and it must not read as a failure. Centred, quiet, and drawn in the
   system's absent-data vocabulary rather than in the failure vocabulary: nothing went wrong
   here and nothing was lost in transit — the field was published empty. */
const Unpublished = styled.div`
  display: flex;
  flex: 1;
  flex-direction: column;
  align-items: center;
  justify-content: center;
  gap: ${({ theme }) => theme.space5};
  padding: ${({ theme }) => `${theme.space8} ${theme.space5}`};
  text-align: center;
`;

const UnpublishedGlyph = styled.span`
  display: flex;
  width: 44px;
  height: 44px;
  align-items: center;
  justify-content: center;
  border: 1px dashed ${({ theme }) => theme.lineStrongColor};
  border-radius: ${({ theme }) => theme.radiusTile};
  font: ${({ theme }) => theme.typeMono};
  color: ${({ theme }) => theme.textPending};
`;

const UnpublishedHeading = styled.p`
  font: ${({ theme }) => theme.typeMonoSm};
  letter-spacing: ${({ theme }) => theme.trackingMono};
  text-transform: uppercase;
  color: ${({ theme }) => theme.textMeta};
`;

const UnpublishedBody = styled.p`
  font: ${({ theme }) => theme.typeBodySm};
  color: ${({ theme }) => theme.textMeta};
`;

const UnpublishedNote = styled.p`
  font: ${({ theme }) => theme.typeBodySm};
  color: ${({ theme }) => theme.textPending};
`;

const Caption = styled.div`
  display: flex;
  align-items: baseline;
  justify-content: space-between;
  gap: ${({ theme }) => theme.space8};

  ${narrow} {
    flex-direction: column;
    gap: ${({ theme }) => theme.space4};
  }
`;

const CaptionText = styled.p`
  max-width: 78ch;
  font: ${({ theme }) => theme.typeBodySm};
  color: ${({ theme }) => theme.textMeta};
`;

const CaptionCount = styled.span`
  font: ${({ theme }) => theme.typeMonoSm};
  font-feature-settings: ${({ theme }) => theme.featureMono};
  letter-spacing: ${({ theme }) => theme.trackingMono};
  text-transform: uppercase;
  color: ${({ theme }) => theme.textPending};
  white-space: nowrap;
`;

const Empty = styled.p`
  padding: ${({ theme }) => theme.cardPad};
  border: ${({ theme }) => theme.borderHairline};
  border-radius: ${({ theme }) => theme.radiusCard};
  background-color: ${({ theme }) => theme.surfaceCard};
  color: ${({ theme }) => theme.textMeta};
`;

/**
 * What the choice slot says: the choice's name off the ballot, "Choice N" only where it has none.
 *
 * `choices` is a list because a draw's vote IDs can in principle disagree, and the honest
 * rendering of that is every choice rather than the first one. It has never happened in this
 * court; a card that named one choice over a draw that voted for two would be exactly the kind
 * of quiet falsehood the list exists to prevent.
 */
function choiceLabel(choices: readonly number[], tally: DisputeReading["tally"]): string | null {
  if (choices.length === 0) return null;
  return choices
    .map((choice) => tally.find((entry) => entry.choice === choice)?.title ?? `Choice ${choice}`)
    .join(" and ");
}

function identityFor(roster: RosterView, address: string): AgentJurorIdentity | undefined {
  return roster.entries.find((entry) => entry.agentJuror.address === address)?.identity;
}

function PanelMember({
  column,
  tally,
  roster,
  commitScanned,
}: {
  column: PanelColumn;
  /** The ballot, whose entries carry each choice's name. */
  tally: DisputeReading["tally"];
  roster: RosterView;
  commitScanned: boolean;
}) {
  const { draw, justification } = column;
  const presentation = presentationOf(draw.state);
  const identity = identityFor(roster, draw.agentJuror.address);
  const reveal = revealFigureOf(draw);
  const commit = commitFigureOf(draw, commitScanned);
  const choice = choiceLabel(draw.choices, tally);

  return (
    <Column aria-label={`${draw.agentJuror.nickname}, ${presentation.word}`}>
      <ColumnHead>
        <Who>
          {identity?.avatarUrl ? (
            <Avatar src={identity.avatarUrl} alt="" loading="lazy" />
          ) : (
            <AvatarFallback aria-hidden="true">
              {(identity?.nickname ?? draw.agentJuror.nickname).slice(0, 2)}
            </AvatarFallback>
          )}
          <Named>
            {/* The ENS nickname is a display name; the roster's is the key, because a `name`
                record is rewritable from a wallet. */}
            <Nickname>{identity?.nickname ?? draw.agentJuror.nickname}</Nickname>
            <StackLabel>{stackLabelOf(draw.agentJuror)}</StackLabel>
          </Named>
          <Mark $tone={presentation.tone}>
            <span aria-hidden="true">{presentation.glyph}</span>
            {presentation.word}
          </Mark>
        </Who>
        <Measures>
          {/* The key is drawn as a letter and said as the phrase, which is the pattern the
              matrix already uses for the same two keys. It was a `title` here, and a `title` is
              a tooltip: it needs a pointer hovering a non-focusable span, so a keyboard reader
              cannot reach it, a touch reader cannot reach it, and screen readers disagree about
              whether to announce it at all. The letter is the abbreviation; the phrase is what
              it abbreviates, and both should exist. */}
          <Measure>
            <MeasureKey aria-hidden="true">R</MeasureKey>
            <VisuallyHidden>Reveal latency</VisuallyHidden>
            <MeasureValue $tone={reveal.tone}>{reveal.text}</MeasureValue>
          </Measure>
          <Measure>
            <MeasureKey aria-hidden="true">C</MeasureKey>
            <VisuallyHidden>Commit latency</VisuallyHidden>
            <MeasureValue $tone={commit.tone}>{commit.text}</MeasureValue>
          </Measure>
          <Votes>
            {draw.voteCount} {draw.voteCount === 1 ? "vote" : "votes"}
          </Votes>
          {choice !== null && <Choice $tone={presentation.tone}>{choice}</Choice>}
        </Measures>
      </ColumnHead>

      {justification === null || justification.length === 0 ? (
        <ColumnBody>
          <Unpublished>
            <UnpublishedGlyph aria-hidden="true">∅</UnpublishedGlyph>
            <UnpublishedHeading>No justification published</UnpublishedHeading>
            {/* Two sentences, and the second is the one that matters. A reader who meets an
                empty column on a dashboard full of failure banners will read it as a failure
                unless told plainly that it is not one. */}
            <UnpublishedBody>
              {justification === null
                ? "This agent juror published no justification with its vote. The vote itself is on chain and counts in full; only the prose is absent."
                : "This agent juror revealed its vote with an empty justification. The vote itself is on chain and counts in full; only the prose is absent."}
            </UnpublishedBody>
            <UnpublishedNote>
              Nothing failed here, and nothing was lost in transit — the field was published empty.
            </UnpublishedNote>
          </Unpublished>
        </ColumnBody>
      ) : (
        <ColumnBody>
          <JustificationProse justification={justification} />
        </ColumnBody>
      )}
    </Column>
  );
}

export function DisputePanel({
  reading,
  roster,
  commitScanned,
}: {
  reading: DisputeReading;
  roster: RosterView;
  /** Whether the Arbitrum log scan has answered. See `commitFigureOf`. */
  commitScanned: boolean;
}) {
  const shown = reading.columns.length;
  // Everyone the court drew, which is not the same number. A juror outside the roster gets no
  // column and still counts — `CONTEXT.md` on panel against roster — and where the two differ
  // this view says so rather than presenting its columns as the whole panel.
  const drawn = reading.panelSize;

  return (
    <Band aria-labelledby="panel-heading">
      <BandHead>
        <div>
          {/* Counted from the columns actually shown, and worded for what that count is. Zero
              is a real case — a dispute still in its evidence period has no panel — and
              "0 stacks, one set of evidence." would be a headline about nothing. */}
          <Heading id="panel-heading">
            {shown === 0
              ? "No reasoning to compare yet."
              : shown === 1
                ? "One stack, one set of evidence."
                : `${shown} stacks, one set of evidence.`}
          </Heading>
        </div>
      </BandHead>

      {shown === 0 ? (
        <Empty>
          {reading.read
            ? "Nobody has been drawn for this dispute yet, so there is no reasoning to show. A panel is selected when the dispute leaves its evidence period."
            : "The draws for this dispute have not been read, so who was on the panel is unknown rather than absent."}
        </Empty>
      ) : (
        <>
          <Columns>
            {reading.columns.map((column) => (
              <PanelMember
                key={column.draw.agentJuror.address}
                column={column}
                tally={reading.tally}
                roster={roster}
                commitScanned={commitScanned}
              />
            ))}
          </Columns>
          <Caption>
            {/* Only the shortfall is said (2026-11-02, maintainer's ruling: the sentence on order
                and ranking went, as did the two pills above). A drawn juror with no card is a
                gap in what is shown, and a gap must not read as a complete panel. */}
            {drawn > shown && (
              <CaptionText>
                {drawn - shown} of the {drawn} drawn are not agent jurors on this dashboard's
                roster, so they have no card here.
              </CaptionText>
            )}
            <CaptionCount>
              {shown} of {drawn} shown
            </CaptionCount>
          </Caption>
        </>
      )}
    </Band>
  );
}
