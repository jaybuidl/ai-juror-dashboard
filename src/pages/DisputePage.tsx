import { useParams } from "react-router";
import styled, { type DefaultTheme } from "styled-components";
import { Breadcrumb } from "../chrome/Breadcrumb";
import { Notice } from "../chrome/Failure";
import { type Failures, olderOf, present } from "../chrome/failures";
import { useDocumentTitle } from "../chrome/title";
import { View } from "../chrome/View";
import { casePageOf } from "../court-frontend";
import type { DisputesView } from "../disputes/useDisputes";
import { arbitrumSource } from "../performance/arbitrum";
import { DisputePanel } from "../performance/DisputePanel";
import type { RawDisputeChain } from "../performance/dispute-chain";
import {
  buildDisputeReading,
  type DisputeReading,
  revealedCountOf,
} from "../performance/dispute-detail";
import {
  buildDisputeTimeline,
  type DisputeTimeline,
  progressOf,
} from "../performance/dispute-timeline";
import { PeriodStrip } from "../performance/PeriodStrip";
import { type ChainRead, useDisputeChain } from "../performance/useChainReads";
import type { CourtPerformanceView } from "../performance/useCourtPerformance";
import { type DisputeDetailView, useDisputeDetail } from "../performance/useDisputeDetail";
import { type FailedRead, failureOf, SOURCES } from "../read-failure";
import { ensFallbackOf } from "../roster/ens-fallback";
import type { RosterView } from "../roster/useRoster";
import { narrow } from "../styles/breakpoints";
import { VisuallyHidden } from "../styles/hidden";

/**
 * One dispute, and every panel member's reasoning about it, at its own URL.
 *
 * The view this experiment exists for. The matrix says *whether* six stacks agreed; this says
 * what each of them thought, in its own words, against the same evidence — which is the thing a
 * reader wants the moment they see a diverged cell.
 *
 * Five sources meet here and two of them are this view's own. The dispute, its title and its
 * cells are already held for the matrix and the index; `useDisputeDetail` adds the ballot, the
 * evidence count and the prose, and `useDisputeChain` adds the dispute's record on Arbitrum —
 * who opened each period and when each agent juror committed — for the timeline (ADR-0012).
 * That is deliberate — moving between views must not re-read the court — and it is also why the
 * failure composition below has several channels rather than one: they can each fail, and each
 * fail differently, and `CLAUDE.md` records what happens when a page reports "the court" is
 * stale instead of saying which half is.
 */

const Header = styled.header`
  display: flex;
  flex-direction: column;
  gap: ${({ theme }) => theme.space6};
`;

const Split = styled.div`
  display: flex;
  align-items: flex-start;
  gap: ${({ theme }) => theme.space10};

  ${narrow} {
    flex-direction: column;
    gap: ${({ theme }) => theme.space7};
  }
`;

const Identified = styled.div`
  display: flex;
  min-width: 0;
  flex: 1;
  flex-direction: column;
  gap: ${({ theme }) => theme.space6};
`;

const Title = styled.h1`
  max-width: 24ch;
  font: ${({ theme }) => theme.typeDisplay2};
  letter-spacing: ${({ theme }) => theme.trackingDisplay};
  color: ${({ theme }) => theme.textHeading};
  text-wrap: balance;
`;

/* A dispute with no title is identified by its id and says so, rather than rendering a blank
   heading. `CLAUDE.md`: a template is nullable on the subgraph's own type and one dispute in
   this court already carries an empty category. */
const Untitled = styled.span`
  color: ${({ theme }) => theme.textMeta};
`;

const Facts = styled.div`
  display: flex;
  align-items: center;
  gap: ${({ theme }) => theme.space4};
  flex-wrap: wrap;
`;

const Fact = styled.span`
  display: inline-flex;
  align-items: center;
  padding: ${({ theme }) => `${theme.space3} ${theme.space4}`};
  border: ${({ theme }) => theme.borderVisible};
  border-radius: ${({ theme }) => theme.radiusChip};
  font: ${({ theme }) => theme.typeMonoSm};
  font-feature-settings: ${({ theme }) => theme.featureMono};
  letter-spacing: ${({ theme }) => theme.trackingMono};
  text-transform: uppercase;
  color: ${({ theme }) => theme.textMeta};
  white-space: nowrap;
`;

/* The category, in the accent — the same ink and quiet border as the agent juror page's stack
   pill. */
const AccentFact = styled(Fact)`
  border-color: ${({ theme }) => theme.accentQuiet};
  color: ${({ theme }) => theme.accent};
`;

/* A pill that is also a link out. Still a pill, because it states the same fact it did before it
   linked anywhere, in a pill's own grey (2026-11-02, maintainer's ruling: on the agent juror
   page only the stack pill is green, and these follow it). Marked as a link by the arrow and an
   underline on hover — not by colour, which WCAG 1.4.1 would not allow to be the only mark.

   The gap is the space before the arrow. A pill is inline-flex, so a hidden span splits the label
   into anonymous flex items and each loses its edge whitespace — the space written in the markup
   survives in the accessible name and vanishes on screen, drawing "DISPUTE 156↗". One mono
   character puts it back; the hidden span is out of flow and takes no gap of its own. */
const FactLink = styled(Fact)`
  gap: 1ch;
  text-decoration: none;

  &:hover {
    text-decoration: underline;
  }

  &:focus-visible {
    outline: 2px solid ${({ theme }) => theme.focusRing};
    outline-offset: 3px;
  }
`;

const Question = styled.p`
  max-width: 68ch;
  font: ${({ theme }) => theme.typeBodyLg};
  color: ${({ theme }) => theme.textBody};
  text-wrap: pretty;
`;

const QuestionKey = styled.span`
  color: ${({ theme }) => theme.textMeta};
`;

const Card = styled.section`
  display: flex;
  width: 372px;
  max-width: 100%;
  flex: none;
  flex-direction: column;
  gap: ${({ theme }) => theme.space5};
  padding: ${({ theme }) => theme.cardPad};
  border: ${({ theme }) => theme.borderHairline};
  border-radius: ${({ theme }) => theme.radiusCard};
  background-color: ${({ theme }) => theme.surfaceCard};
  box-shadow: ${({ theme }) => theme.shadowCard};

  ${narrow} {
    width: 100%;
  }
`;

const CardLabel = styled.h2`
  font: ${({ theme }) => theme.typeMonoSm};
  letter-spacing: ${({ theme }) => theme.trackingMono};
  text-transform: uppercase;
  color: ${({ theme }) => theme.textPending};
`;

/* The ruling in words, large and in the accent, with no choice number beside it (2026-11-02,
   maintainer's ruling). The number was drawn as a metric and read as a count — "4" over a
   ballot of 5 votes from four agent jurors — when it is only the choice's id, which the tally
   below still carries on the ruling's own row. */
const Winner = styled.p`
  font: ${({ theme }) => theme.typeTitle1};
  letter-spacing: ${({ theme }) => theme.trackingTitle};
  color: ${({ theme }) => theme.accent};
  text-wrap: balance;
`;

const WinnerName = styled.span`
  font: ${({ theme }) => theme.typeTitle2};
  letter-spacing: ${({ theme }) => theme.trackingTitle};
  color: ${({ theme }) => theme.textHeading};
`;

const CardNote = styled.p`
  font: ${({ theme }) => theme.typeBodySm};
  color: ${({ theme }) => theme.textMeta};
`;

/* Flush with the card's left edge: a list keeps the browser's 40px start padding unless it is
   reset, and list-style none removes the bullets without removing the indent they sat in. */
const Tally = styled.ul`
  display: flex;
  flex-direction: column;
  padding: ${({ theme }) => theme.space5} 0 0;
  border-top: ${({ theme }) => theme.borderHairline};
  list-style: none;
`;

const TallyRow = styled.li`
  display: flex;
  align-items: baseline;
  justify-content: space-between;
  gap: ${({ theme }) => theme.space5};
  padding: ${({ theme }) => `${theme.space3} 0`};
`;

/** One ink for a tally row's name and its count, so the two cannot drift apart. */
function tallyInk(theme: DefaultTheme, ruling: boolean, any: boolean): string {
  if (ruling) return theme.accent;
  if (any) return theme.stateWork;
  return theme.textPending;
}

/* Each row's name takes its count's ink, so a row reads as one line: the ruling's in the accent,
   pointing back at the headline; a choice that drew votes and lost — a tie the court broke the
   other way, say — in gold; a choice nobody picked stays quiet. */
const TallyName = styled.span<{ $ruling: boolean; $any: boolean }>`
  min-width: 0;
  font: ${({ theme }) => theme.typeMonoSm};
  font-feature-settings: ${({ theme }) => theme.featureMono};
  letter-spacing: ${({ theme }) => theme.trackingMono};
  text-transform: uppercase;
  color: ${({ theme, $ruling, $any }) => tallyInk(theme, $ruling, $any)};
  overflow-wrap: anywhere;
`;

const TallyVotes = styled.span<{ $ruling: boolean; $any: boolean }>`
  font: ${({ theme }) => theme.typeMono};
  font-feature-settings: ${({ theme }) => theme.featureMono};
  color: ${({ theme, $ruling, $any }) => tallyInk(theme, $ruling, $any)};
  white-space: nowrap;
`;

/* A section and emphatically not a `main`: `View` already wraps every view's children in one,
   so this nested a second `main` inside it — invalid HTML, two landmarks of the same name, and
   `getByRole("main")` ambiguous for anything that ever looks for it. `NotFoundPage` gets the
   same shape right with a `header`. */
const Missing = styled.section`
  display: flex;
  flex-direction: column;
  gap: ${({ theme }) => theme.space6};
`;

const MissingTitle = styled.h1`
  font: ${({ theme }) => theme.typeDisplay2};
  letter-spacing: ${({ theme }) => theme.trackingDisplay};
  color: ${({ theme }) => theme.textHeading};
`;

const MissingBody = styled.p`
  max-width: 68ch;
  font: ${({ theme }) => theme.typeBodyLg};
  color: ${({ theme }) => theme.textBody};
`;

/**
 * The core subgraph's half, at most once — the same worst-first shape the matrix uses.
 *
 * One fault reaches this view through several channels: a failed dispute read propagates into
 * `performance.error`, and this view adds a third query of its own that reads the *same*
 * endpoint. Listed separately they would read as three things having gone wrong, and one source
 * gets one banner line.
 */
function coreFailureOf({
  disputes,
  performance,
  detail,
}: {
  disputes: DisputesView;
  performance: CourtPerformanceView;
  detail: DisputeDetailView;
}) {
  if (disputes.error !== null) {
    return failureOf(
      disputes.error,
      SOURCES.core,
      "The court's disputes could not be read, so what is below is whatever was already held rather than the court as it stands.",
    );
  }

  if (performance.error !== null) {
    return failureOf(
      performance.error,
      SOURCES.core,
      "The draws could not be read, so no draw and no coherence on this page was measured on this load.",
    );
  }

  if (detail.error !== null) {
    // The timeline's half only where the chain read has no block range to scan: this read
    // carries it, so a first read that failed leaves none, and so does an earlier read made
    // before anyone was drawn whose re-read has now failed. A failed re-read of a drawn dispute
    // keeps its range, and the timeline is drawn.
    return failureOf(
      detail.error,
      SOURCES.core,
      detail.detail.blockRange === null
        ? "This dispute's ballot, evidence count and published reasoning could not be read, so the ruling card and every column below are missing what they would have said, and the timeline cannot say who opened each period or when each agent juror committed."
        : "This dispute's ballot, evidence count and published reasoning could not be read again, so the ruling card and every column below show what an earlier read said.",
    );
  }

  return null;
}

/**
 * Arbitrum's half, at most once, worded by what it cost the timeline.
 *
 * Two reads share the endpoint: the court's parameter history, which supplies each period's
 * window, and this dispute's own record, which supplies who opened each period and when each
 * agent juror committed. One source gets one banner line, so the two errors are worded together
 * when both failed, and either error outranks the shortfall — a read that failed has not come
 * back short.
 *
 * The shortfall is only counted once the dispute's read answers for the dispute as the court now
 * reports it (`ChainRead.answered`): a read standing in from before a commitment the court has
 * since seen has not fallen short, it is behind, and `buildDisputeTimeline` counts nothing
 * missing from it.
 */
function arbitrumFailureOf(
  performance: CourtPerformanceView,
  chain: ChainRead<RawDisputeChain>,
  timeline: DisputeTimeline | null,
): FailedRead | null {
  const source = arbitrumSource();
  const parameters = performance.parametersError;

  if (parameters !== null && chain.error !== null) {
    return failureOf(
      chain.error,
      source,
      chain.data !== null
        ? "Neither the court's parameter history nor this dispute's record could be read from Arbitrum, so the timeline below does not say what each period was configured to allow, and who opened each period and when each agent juror committed come from an earlier read, which accounts for nothing since."
        : "Neither the court's parameter history nor this dispute's record could be read from Arbitrum, so the timeline below shows when each period opened and how long it ran, but not what it was configured to allow, who opened it, or when any agent juror committed.",
    );
  }

  if (chain.error !== null) {
    return failureOf(
      chain.error,
      source,
      chain.data !== null
        ? "This dispute's record could not be re-read from Arbitrum, so who opened each period and when each agent juror committed come from an earlier read, which accounts for nothing since."
        : "This dispute's record could not be read from Arbitrum, so the timeline below shows when each period opened but not who opened it, and no agent juror's commitment.",
    );
  }

  if (parameters !== null) {
    return failureOf(
      parameters,
      source,
      "The court's period durations could not be read from its own parameter history, so the timeline below shows how long each period ran and not what it was configured to allow.",
    );
  }

  const missing = timeline?.missing;
  const expected = timeline?.expected;
  if (missing === undefined || expected === undefined) return null;
  if (missing.commits === 0 && missing.openings === 0) return null;

  // Worded by what each half costs, which is not the same thing: a commitment that was not found
  // is a moment the timeline cannot place, while an opening that was not found still has its
  // moment, from the subgraph, and loses only who opened it.
  const parts = [
    missing.commits > 0
      ? `${missing.commits} of ${expected.commits} commitments could not be found on Arbitrum, so when those agent jurors committed is unknown`
      : null,
    missing.openings > 0
      ? `${missing.openings} of ${expected.openings} period openings could not be found on Arbitrum, so who opened those periods is unknown`
      : null,
  ].filter((part) => part !== null);
  return {
    source,
    status: "Short read",
    what: `In this dispute, ${parts.join(", and ")}.`,
  };
}

function failuresOf({
  roster,
  disputes,
  performance,
  detail,
  chain,
  timeline,
}: {
  roster: RosterView;
  disputes: DisputesView;
  performance: CourtPerformanceView;
  detail: DisputeDetailView;
  chain: ChainRead<RawDisputeChain>;
  timeline: DisputeTimeline | null;
}): Failures {
  return {
    blocking: present(
      coreFailureOf({ disputes, performance, detail }),
      arbitrumFailureOf(performance, chain, timeline),
    ),
    degraded: [ensFallbackOf(roster)].filter((read) => read !== null),
    offline: disputes.isPaused || performance.isPaused || detail.isPaused || chain.isPaused,
    // The oldest of the three reads this page is built from. It was last whole when the
    // stalest of them landed, and `null` if any has never landed at all — the page has then
    // never been complete, and the banner says "Never" rather than dating it by the half that
    // worked. The chain read is not counted, as the parameter history is not: the page renders
    // without either and the timeline says for itself, moment by moment, what is not in.
    lastCompleteRead: olderOf(olderOf(disputes.readAt, performance.readAt), detail.readAt),
    retry: () => {
      performance.retry();
      detail.retry();
      chain.retry();
    },
  };
}

export type DisputePageProps = {
  roster: RosterView;
  disputes: DisputesView;
  performance: CourtPerformanceView;
};

export type DisputeViewProps = DisputePageProps & {
  /** The path segment exactly as it was typed, for the breadcrumb and the wrong-address case. */
  pathId: string | undefined;
  detail: DisputeDetailView;
  /** The dispute's own record on Arbitrum, for the timeline. See `useDisputeChain`. */
  chain: ChainRead<RawDisputeChain>;
};

/**
 * The dispute id in the path, or `null` where the path segment is not one.
 *
 * `/disputes/abc` is not a 404 — every path answers HTTP 200 through the SPA fallback and the
 * route table matched this one — and it is not a read that failed either. It is an address that
 * names nothing, and turning it into a subgraph round trip would produce a banner about an
 * endpoint that is perfectly healthy.
 */
function disputeIdOf(raw: string | undefined): number | null {
  if (raw === undefined || !/^(0|[1-9]\d*)$/.test(raw)) return null;
  return Number(raw);
}

/**
 * The route, and the two reads this view makes of its own.
 *
 * Split from `DisputeView` below so that everything with a decision in it stays testable
 * offline against hand-built data, which is the discipline every other view here keeps — the
 * difference is that those take their reads as props from `App`, and this one cannot: the
 * dispute it reads is named by the URL, which `App` does not know.
 */
export function DisputePage(props: DisputePageProps) {
  const { disputeId: pathId } = useParams();
  // The id as it was typed, so an address naming nothing still titles the tab with what was
  // asked for rather than with a name this view has just refused to give it.
  useDocumentTitle(`Dispute ${pathId ?? ""}`.trim());
  const disputeId = disputeIdOf(pathId);
  const row = props.performance.performance?.rows.find(
    (candidate) => candidate.dispute.id === disputeId,
  );
  const detail = useDisputeDetail(
    disputeId,
    revealedCountOf(row),
    row === undefined ? null : row.panelSize > 0,
  );
  // Keyed on what the court read says the dispute has reached, so the record is read again when
  // a period opens or an agent juror commits, and not on a clock.
  const chain = useDisputeChain(disputeId, detail.detail.blockRange, progressOf(row));

  return <DisputeView {...props} pathId={pathId} detail={detail} chain={chain} />;
}

/**
 * What to say about a dispute this view cannot show, and the three reasons it cannot.
 *
 * The one worth separating out is `elsewhere`. A dispute id is global on the core subgraph
 * across every court, so `/disputes/50` names a real dispute that this dashboard will never
 * have a row for — the read succeeded, it found something, and court 34 does not hold it.
 * Falling through to "has not been read yet" would state an unread condition as a permanent
 * fact about a read that worked, which is the shape this repository guards against everywhere
 * else.
 */
function missingBody(
  disputeId: number | null,
  detail: DisputeDetailView,
  elsewhere: boolean,
): string {
  if (disputeId === null) {
    return "The address you followed does not name a dispute. Court 34's disputes are numbered, starting at 151.";
  }
  if (detail.isUnknownDispute) {
    return "No dispute anywhere on this subgraph carries this number. It may not exist yet.";
  }
  if (elsewhere) {
    return "This dispute exists, and it is not one of court 34's. This dashboard measures a single court, so there is nothing here to show for it.";
  }
  return "This dispute has not been read yet.";
}

export function DisputeView({
  roster,
  disputes,
  performance,
  pathId: raw,
  detail,
  chain,
}: DisputeViewProps) {
  const disputeId = disputeIdOf(raw);

  const row = performance.performance?.rows.find((candidate) => candidate.dispute.id === disputeId);
  // A dispute the subgraph found and this court does not hold. Both halves are needed: the
  // detail read has to have landed on something, and the court's own list has to have landed
  // too — while either is out, "not in this court" is a guess rather than a reading.
  const elsewhere =
    detail.readAt !== null &&
    !detail.isUnknownDispute &&
    !disputes.isLoading &&
    disputes.error === null &&
    !disputes.disputes.some((candidate) => candidate.id === disputeId);
  const reading =
    row === undefined
      ? null
      : buildDisputeReading({
          row,
          detail: detail.detail,
          template: disputes.templateFor(row.dispute),
          detailBehind: detail.isBehindReveals,
        });

  const timeline =
    reading === null || performance.performance === null
      ? null
      : buildDisputeTimeline({
          reading,
          roster: performance.performance.agentJurors,
          chain: chain.data,
          answered: chain.answered,
        });

  // A failure is loud because it costs a figure, so a page that names nothing here — not a
  // dispute, no dispute, or another court's — raises no banner: it has lost no figure, and every
  // sentence `failuresOf` writes would describe something not on screen (`AgentJurorPage` settles
  // its own wrong address the same way). A court-34 dispute that is merely not read *yet* keeps
  // the banner, because the banner is what says why.
  const namesNothingHere =
    reading === null && (disputeId === null || detail.isUnknownDispute || elsewhere);
  const failures = namesNothingHere
    ? undefined
    : failuresOf({ roster, disputes, performance, detail, chain, timeline });

  return (
    <View failures={failures}>
      <Breadcrumb to="/disputes" parent="Disputes" current={raw ?? "Unknown"} />
      {reading === null ? (
        <Missing>
          <MissingTitle>
            {disputeId === null ? "That is not a dispute" : `Dispute ${disputeId}`}
          </MissingTitle>
          <MissingBody>{missingBody(disputeId, detail, elsewhere)}</MissingBody>
        </Missing>
      ) : (
        <>
          <Header>
            <Split>
              <Identified>
                <Title>
                  {reading.template?.title ? (
                    reading.template.title
                  ) : (
                    <Untitled>Dispute {reading.dispute.id}, untitled</Untitled>
                  )}
                </Title>
                <Facts>
                  {/* The one accent pill in the row, as the stack is on the agent juror page
                      (2026-11-02, maintainer's ruling): it is what kind of dispute this is. */}
                  {reading.template?.category && (
                    <AccentFact>{reading.template.category}</AccentFact>
                  )}
                  {/* The dispute's own pill is the link to its case on the court: the id is what
                      the court's page is keyed on, so the pill naming it is the one that goes
                      there. "on Kleros Court" is said and not drawn — a links list is read out of
                      context, and "Dispute 156" alone does not say the link leaves this
                      dashboard. The space is a text node of the anchor; inside the hidden span it
                      would be trimmed. */}
                  <FactLink
                    as="a"
                    href={casePageOf(reading.dispute.id)}
                    target="_blank"
                    rel="noopener noreferrer"
                  >
                    Dispute {reading.dispute.id} <VisuallyHidden>on Kleros Court</VisuallyHidden> ↗
                  </FactLink>
                  {/* Only where there is one. `|| 1` here would print "Round 1 of 1" over a
                      dispute that has no round at all, which is a claim about the court rather
                      than a formatting default — and a dispute with no round is a real state,
                      not a hypothetical one. */}
                  {reading.round !== undefined && (
                    <Fact>
                      Round {reading.round.index + 1} of {reading.dispute.rounds.length}
                    </Fact>
                  )}
                  {/* No panel size here either. This page draws every panel member, one card
                      each, under a heading that counts them — nothing is paged away — so the
                      chip counted what the reader is already looking at, the same reason
                      it left the matrix row and the phone's card. The two absences it used to
                      guard are unaffected: ticket 09 words both in prose on this view rather
                      than in a chip, which is where `panelPillOf` took the idea from. */}
                  <Fact>{reading.dispute.period}</Fact>
                  {/* Last, after the court's own link: Arbiscan is where a reader checks the
                      transaction behind the dispute, not where they read it. A pill like the
                      dispute's, and named by destination — "On chain" said what it held but not
                      that it was Arbiscan. */}
                  {reading.transactionHash !== null && (
                    <FactLink
                      as="a"
                      href={`https://arbiscan.io/tx/${reading.transactionHash}`}
                      target="_blank"
                      rel="noopener noreferrer"
                    >
                      Arbiscan ↗
                    </FactLink>
                  )}
                </Facts>
                {reading.template?.question && (
                  <Question>
                    <QuestionKey>The question put to the panel — </QuestionKey>
                    {reading.template.question}
                  </Question>
                )}
              </Identified>

              <RulingCard reading={reading} />
            </Split>

            {timeline !== null && (
              <PeriodStrip reading={reading} timeline={timeline} roster={roster} />
            )}
          </Header>

          {!reading.read && (
            <Notice $tone="rose" role="status">
              The draws for this dispute have not been read, so who was on the panel and what they
              did is unknown rather than absent. Nothing below is a measurement of this dispute.
            </Notice>
          )}

          <DisputePanel reading={reading} roster={roster} />
        </>
      )}
    </View>
  );
}

/**
 * What the court decided, and what the panel actually voted.
 *
 * Both, and that is the point: the ruling is one number and the tally is what produced it, so a
 * reader can see a four-to-one as a four-to-one rather than being told the winner. Every choice
 * is listed, including choice 0 and any that drew no votes at all — an omitted row would read
 * as a choice nobody was offered rather than one nobody picked.
 */
function RulingCard({ reading }: { reading: DisputeReading }) {
  const winner = reading.tally.find((entry) => entry.isRuling);
  const ruled = reading.dispute.ruling.state !== "pending";

  return (
    <Card aria-labelledby="ruling-heading">
      <CardLabel id="ruling-heading">{ruled ? "Final ruling" : "No ruling yet"}</CardLabel>

      {winner === undefined ? (
        <WinnerName>
          {ruled
            ? "The court has ruled; the ballot has not been read"
            : "The court has not ruled on this dispute"}
        </WinnerName>
      ) : (
        // An unnamed choice falls back to its number, said as a choice so it cannot be read as a
        // count: without the title there is nothing else to name it by.
        <Winner>{winner.title ?? `Choice ${winner.choice}`}</Winner>
      )}

      {/* Only before the court rules (2026-11-02, maintainer's ruling: the ruled half, "measured
          against this ruling and nothing else", went). The unruled half stays, because a panel
          majority shown before the ruling must not read as one. */}
      {!ruled && (
        <CardNote>
          Coherence cannot be measured until the court rules. A round majority before the appeal
          period closes is a prediction, not a ruling.
        </CardNote>
      )}

      {reading.tally.length > 0 && (
        <Tally>
          {reading.tally.map((entry) => (
            <TallyRow key={entry.choice}>
              {/* The bare number, no "Choice" in front (2026-11-02, maintainer's ruling): every
                  row in this list is a choice, and the word said so six times over. */}
              <TallyName $ruling={entry.isRuling} $any={entry.votes > 0}>
                {entry.choice}
                {entry.title !== null && ` · ${entry.title}`}
              </TallyName>
              <TallyVotes $ruling={entry.isRuling} $any={entry.votes > 0}>
                {entry.votes === 1 ? "1 vote" : `${entry.votes} votes`}
              </TallyVotes>
            </TallyRow>
          ))}
        </Tally>
      )}
    </Card>
  );
}
