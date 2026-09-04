import { useParams } from "react-router";
import styled from "styled-components";
import { Breadcrumb } from "../chrome/Breadcrumb";
import { Notice } from "../chrome/Failure";
import { type Failures, olderOf, present } from "../chrome/failures";
import { type Provenance, rangeOf } from "../chrome/provenance";
import { useDocumentTitle } from "../chrome/title";
import { View } from "../chrome/View";
import { COURT_ID } from "../disputes/court-subgraph";
import type { DisputesView } from "../disputes/useDisputes";
import { arbitrumSource } from "../performance/arbitrum";
import { DisputePanel } from "../performance/DisputePanel";
import {
  buildDisputeReading,
  type DisputeReading,
  type PeriodRun,
} from "../performance/dispute-detail";
import { formatElapsedSeconds, formatWindowSeconds } from "../performance/latency";
import type { CourtPerformanceView } from "../performance/useCourtPerformance";
import { type DisputeDetailView, useDisputeDetail } from "../performance/useDisputeDetail";
import { failureOf, SOURCES } from "../read-failure";
import { ensFallbackOf } from "../roster/ens-fallback";
import type { RosterView } from "../roster/useRoster";
import { narrow } from "../styles/breakpoints";

/**
 * One dispute, and every panel member's reasoning about it, at its own URL.
 *
 * The view this experiment exists for. The matrix says *whether* six stacks agreed; this says
 * what each of them thought, in its own words, against the same evidence — which is the thing a
 * reader wants the moment they see a diverged cell.
 *
 * Four sources meet here and only one of them is this view's own. The dispute, its title and
 * its cells are already held for the matrix and the index; `useDisputeDetail` adds the ballot,
 * the evidence count and the prose. That is deliberate — moving between views must not re-read
 * the court — and it is also why the failure composition below has four channels rather than
 * one: they can each fail, and each fail differently, and `CLAUDE.md` records what happens when
 * a page reports "the court" is stale instead of saying which half is.
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

const OnChain = styled.a`
  font: ${({ theme }) => theme.typeMonoSm};
  letter-spacing: ${({ theme }) => theme.trackingMono};
  text-transform: uppercase;
  color: ${({ theme }) => theme.accent};
  text-decoration: none;
  white-space: nowrap;

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

const Winner = styled.div`
  display: flex;
  align-items: baseline;
  gap: ${({ theme }) => theme.space5};
`;

const WinnerChoice = styled.span`
  font: ${({ theme }) => theme.typeMetric};
  font-feature-settings: ${({ theme }) => theme.featureMono};
  color: ${({ theme }) => theme.accent};
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

const Tally = styled.ul`
  display: flex;
  flex-direction: column;
  padding-top: ${({ theme }) => theme.space5};
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

const TallyName = styled.span`
  min-width: 0;
  font: ${({ theme }) => theme.typeMonoSm};
  font-feature-settings: ${({ theme }) => theme.featureMono};
  letter-spacing: ${({ theme }) => theme.trackingMono};
  text-transform: uppercase;
  color: ${({ theme }) => theme.textPending};
  overflow-wrap: anywhere;
`;

const TallyVotes = styled.span<{ $ruling: boolean; $any: boolean }>`
  font: ${({ theme }) => theme.typeMono};
  font-feature-settings: ${({ theme }) => theme.featureMono};
  color: ${({ theme, $ruling, $any }) => {
    if ($ruling) return theme.accent;
    if ($any) return theme.stateWork;
    return theme.textPending;
  }};
  white-space: nowrap;
`;

const Strip = styled.ol`
  display: grid;
  grid-template-columns: repeat(4, minmax(0, 1fr));
  gap: ${({ theme }) => theme.space6};
  padding: ${({ theme }) => `${theme.space6} ${theme.space7}`};
  border: ${({ theme }) => theme.borderHairline};
  border-radius: ${({ theme }) => theme.radiusTile};
  background-color: ${({ theme }) => theme.surfaceInset};
  list-style: none;

  /* The one width this dashboard reduces at, since ticket 16. It was a 760px literal that
     pre-dated nothing and agreed with nothing; four period columns still fit at 720. */
  ${narrow} {
    grid-template-columns: repeat(2, minmax(0, 1fr));
  }
`;

const Slot = styled.li`
  display: flex;
  min-width: 0;
  flex-direction: column;
  gap: ${({ theme }) => theme.space4};
`;

const SlotName = styled.span`
  font: ${({ theme }) => theme.typeMonoSm};
  letter-spacing: ${({ theme }) => theme.trackingMono};
  text-transform: uppercase;
  color: ${({ theme }) => theme.textPending};
`;

const SlotValue = styled.span`
  font: ${({ theme }) => theme.typeMono};
  font-feature-settings: ${({ theme }) => theme.featureMono};
  color: ${({ theme }) => theme.textBody};
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

const PERIOD_NAMES: Record<PeriodRun["period"], string> = {
  evidence: "Evidence",
  commit: "Commit period",
  vote: "Vote period",
  appeal: "Appeal period",
};

/**
 * What one slot of the timeline reads.
 *
 * The configured window and how long the period actually ran, as two absolute durations with a
 * middot between them and no division anywhere — ADR-0005, and this is the strip that decision
 * names. The evidence slot carries its submission count instead, because no window governs how
 * long evidence is accepted in practice and the count is what a reader wants there.
 *
 * Three absences, told apart: a window the parameter history has not supplied, a period that
 * has not closed, and a period the dispute never reached. Only the first is about this
 * dashboard, and it is the only one worded as something unread.
 */
function slotValue(run: PeriodRun, evidenceCount: number | null, reached: boolean): string {
  if (run.period === "evidence") {
    if (evidenceCount === null) return "Submissions not read";
    return evidenceCount === 1 ? "1 submission" : `${evidenceCount} submissions`;
  }

  const window =
    run.windowSeconds === null
      ? "Window not read"
      : `${formatWindowSeconds(run.windowSeconds)} configured`;

  if (run.elapsedSeconds !== null) {
    return `${window} · closed in ${formatElapsedSeconds(run.elapsedSeconds)}`;
  }

  return `${window} · ${reached ? "still open" : "not reached"}`;
}

/** Whether the dispute has got as far as a period, from the moments its round recorded. */
function hasReached(reading: DisputeReading, period: PeriodRun["period"]): boolean {
  const round = reading.round;
  if (round === undefined) return period === "evidence";

  switch (period) {
    case "evidence":
      return true;
    case "commit":
      return round.commitOpenedAt !== null;
    case "vote":
      return round.voteOpenedAt !== null;
    case "appeal":
      return round.appealOpenedAt !== null;
  }
}

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
      "The draws could not be read, so no latency and no coherence on this page was measured on this load.",
    );
  }

  if (detail.error !== null) {
    return failureOf(
      detail.error,
      SOURCES.core,
      "This dispute's ballot, evidence count and published reasoning could not be read, so the ruling card and every column below are missing what they would have said.",
    );
  }

  return null;
}

function failuresOf({
  roster,
  disputes,
  performance,
  detail,
}: {
  roster: RosterView;
  disputes: DisputesView;
  performance: CourtPerformanceView;
  detail: DisputeDetailView;
}): Failures {
  return {
    blocking: present(
      coreFailureOf({ disputes, performance, detail }),
      // Arbitrum serves the commit scan and the parameter history both, so an outage takes
      // both and the worse one is the one named — the matrix's own rule, and the reason this
      // does not list the source twice.
      performance.commitError !== null
        ? failureOf(
            performance.commitError,
            arbitrumSource(),
            "The commitments could not be read from Arbitrum, so no commit latency in the columns below is a measurement.",
          )
        : performance.parametersError !== null
          ? failureOf(
              performance.parametersError,
              arbitrumSource(),
              "The court's period durations could not be read from its own parameter history, so the timeline below shows how long each period ran and not what it was configured to allow.",
            )
          : null,
    ),
    degraded: [ensFallbackOf(roster)].filter((read) => read !== null),
    offline: disputes.isPaused || performance.isPaused || detail.isPaused,
    // The oldest of the three reads this page is built from. It was last whole when the
    // stalest of them landed, and `null` if any has never landed at all — the page has then
    // never been complete, and the banner says "Never" rather than dating it by the half that
    // worked.
    lastCompleteRead: olderOf(olderOf(disputes.readAt, performance.readAt), detail.readAt),
    retry: () => {
      performance.retry();
      detail.retry();
    },
  };
}

function provenanceOf({
  roster,
  disputes,
  reading,
  detail,
}: {
  roster: RosterView;
  disputes: DisputesView;
  reading: DisputeReading | null;
  detail: DisputeDetailView;
}): Provenance {
  // The two standing caveats describe the justification band and the header. With no dispute on
  // screen there is neither, and a footer that carried them would be explaining the provenance
  // of something the reader is not looking at.
  const caveats: string[] =
    reading === null
      ? []
      : [
          "Justifications are published by the agent jurors themselves and are reproduced verbatim, in the language they were written in. This dashboard does not summarise, translate or rank them.",
          "Nothing validates a dispute's title, question or choice names before publication; they are written by whoever created the dispute.",
        ];

  if (reading?.underEarlierWindows === true) {
    caveats.push(
      "This dispute ran under period durations the court has since changed, so its latencies are not comparable with those of disputes after it.",
    );
  }

  if (reading !== null && reading.panelSize === 1) {
    caveats.push("This dispute was decided by a panel of one, where coherence is tautological.");
  }

  if (reading !== null && reading.evidenceCount === null) {
    // Named here and not in the banner: every endpoint answered, and what could not be
    // established is a join rather than a read. The slot itself already says so.
    caveats.push(
      "The evidence count could not be established for this dispute. The subgraph carries no link from a dispute to its evidence, so the count is read from the evidence group sharing its id, and that correspondence could not be confirmed here.",
    );
  }

  // In flight only. The failed half is the banner's, and a footer that said it too would make
  // one outage two voices — ticket 13's rule.
  if (detail.isLoading && detail.error === null) {
    caveats.push(
      "This dispute's ballot and published reasoning are still being read, so the ruling card and the columns below are not complete yet.",
    );
  }

  if (!roster.isResolving && !roster.isResolvedFromEns) {
    caveats.push(
      "ENS could not be reached, so every nickname above is the one held in this repository and no avatar is shown.",
    );
  }

  return {
    // Two forms, because the footer has to describe what is actually on screen. The not-found
    // branch shows no dispute at all, and naming three measures above it would be provenance
    // for figures the reader cannot see — the same mistake as a caveat about something absent.
    measures:
      reading === null
        ? "Nothing on this page is a measurement. No dispute is shown, so there is nothing here that was measured from one."
        : "Commit latency, reveal latency and coherence are the measured record here: how long this dispute's panel took to commit after its commit period opened, how long each took to reveal after the vote period opened, and whether that vote matched the dispute's final ruling. The prose is reproduced and not measured.",
    read: reading === null ? rangeOf([]) : rangeOf([reading.dispute.id]),
    readAt: disputes.readAt,
    caveats,
    identifiesAgentJurors: true,
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
 * The route, and the one read this view makes of its own.
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
  const detail = useDisputeDetail(disputeIdOf(pathId));

  return <DisputeView {...props} pathId={pathId} detail={detail} />;
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
        });

  // **Known wrong ordering, deliberately left.** A failure is loud because it costs a figure, so
  // failures must be composed *after* the branch that can return early — a page carrying no figure
  // has lost none and should raise no banner. `AgentJurorPage` does it in that order; this view
  // still composes above the `reading === null` branch below, so a dispute that was never read can
  // draw a banner about a read that cost it nothing. Settle it the day this view is next touched.
  const failures = failuresOf({ roster, disputes, performance, detail });
  const provenance = provenanceOf({ roster, disputes, reading, detail });

  return (
    <View provenance={provenance} failures={failures}>
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
                  {reading.template?.category && <Fact>{reading.template.category}</Fact>}
                  <Fact>Court {COURT_ID}</Fact>
                  <Fact>Dispute {reading.dispute.id}</Fact>
                  {/* Only where there is one. `|| 1` here would print "Round 1 of 1" over a
                      dispute that has no round at all, which is a claim about the court rather
                      than a formatting default — and a dispute with no round is a real state,
                      not a hypothetical one. */}
                  {reading.round !== undefined && (
                    <Fact>
                      Round {reading.round.index + 1} of {reading.dispute.rounds.length}
                    </Fact>
                  )}
                  {/* No panel size here either. This page draws every panel member side by
                      side and says so — the whole panel fits at once, so there is nothing to page —
                      so the chip counted what the reader is already looking at, the same reason
                      it left the matrix row and the phone's card. The two absences it used to
                      guard are unaffected: ticket 09 words both in prose on this view rather
                      than in a chip, which is where `panelPillOf` took the idea from. */}
                  <Fact>{reading.dispute.period}</Fact>
                  {reading.transactionHash !== null && (
                    <OnChain
                      href={`https://arbiscan.io/tx/${reading.transactionHash}`}
                      target="_blank"
                      rel="noopener noreferrer"
                    >
                      On chain ↗
                    </OnChain>
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

            <Strip aria-label="How long each period ran">
              {reading.periods.map((run) => (
                <Slot key={run.period}>
                  <SlotName>{PERIOD_NAMES[run.period]}</SlotName>
                  <SlotValue>
                    {slotValue(run, reading.evidenceCount, hasReached(reading, run.period))}
                  </SlotValue>
                </Slot>
              ))}
            </Strip>
          </Header>

          {!reading.read && (
            <Notice $tone="rose" role="status">
              The draws for this dispute have not been read, so who was on the panel and what they
              did is unknown rather than absent. Nothing below is a measurement of this dispute.
            </Notice>
          )}

          <DisputePanel
            reading={reading}
            roster={roster}
            commitScanned={performance.performance?.commitCoverage.read === true}
          />
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
        <Winner>
          <WinnerChoice>{winner.choice}</WinnerChoice>
          <WinnerName>{winner.title ?? "This choice is not named by the template"}</WinnerName>
        </Winner>
      )}

      <CardNote>
        {ruled
          ? "Coherence on this page is measured against this ruling and nothing else."
          : "Coherence cannot be measured until the court rules. A round majority before the appeal period closes is a prediction, not a ruling."}
      </CardNote>

      {reading.tally.length > 0 && (
        <Tally>
          {reading.tally.map((entry) => (
            <TallyRow key={entry.choice}>
              <TallyName>
                Choice {entry.choice}
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
