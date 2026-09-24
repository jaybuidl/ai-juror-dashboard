import { Link, useParams } from "react-router";
import styled from "styled-components";
import { Breadcrumb } from "../chrome/Breadcrumb";
import { comparisonFailureOf } from "../chrome/comparison";
import { Notice } from "../chrome/Failure";
import { type Failures, olderOf, present } from "../chrome/failures";
import { type Provenance, rangeOf } from "../chrome/provenance";
import { useDocumentTitle } from "../chrome/title";
import { View } from "../chrome/View";
import type { Dispute } from "../disputes/disputes";
import type { DisputesView } from "../disputes/useDisputes";
import { AgentJurorDraws } from "../performance/AgentJurorDraws";
import { AgentJurorEmpty } from "../performance/AgentJurorEmpty";
import { AgentJurorLatency } from "../performance/AgentJurorLatency";
import { AgentJurorSummary } from "../performance/AgentJurorSummary";
import { type AgentJurorReading, buildAgentJurorReading } from "../performance/agent-juror-detail";
import { arbitrumSource } from "../performance/arbitrum";
import { comparisonOf } from "../performance/reference";
import type { CourtPerformanceView } from "../performance/useCourtPerformance";
import { type FailedRead, failureOf, SOURCES } from "../read-failure";
import { ensNameOf, handleUrlOf, pathSegmentOf, stackLabelOf } from "../roster/agent-jurors";
import { ensFallbackOf } from "../roster/ens-fallback";
import { StackIcon } from "../roster/StackIcon";
import type { RosterView } from "../roster/useRoster";
import { narrow } from "../styles/breakpoints";
import { VisuallyHidden } from "../styles/hidden";

/**
 * One agent juror on its own: what it runs, what it has done, and what it has been paid.
 *
 * Built against `canvas/Juror.dc.html` — identity and stat card at `:53-83`, the latency
 * profile at `:86-110`, the drawn-in table at `:113-134` — and `canvas/JurorEmpty.dc.html` for
 * an agent juror the court has not drawn yet.
 *
 * **It reads nothing of its own.** Ticket 06 built `CourtPerformance.marginals` for exactly this
 * page and ticket 10 filled its last two figures, so every number here is one the matrix already
 * computed, sliced down one column by `buildAgentJurorReading`. That is why this route is not
 * split around a hook the way `DisputePage` is: there is no query for a nickname to name, and
 * therefore no fourth face of the disabled-query trap to fall into. The only thing the path
 * segment decides is which column, and the roster is local — so an address naming nothing is
 * decidable with no read at all, which is the one way this view is *simpler* than ticket 09's
 * and not merely similar to it.
 *
 * It is also where the two reward sums reach a phone reader. The matrix's card layout drops the
 * column headers whole, so below the breakpoint cumulative ETH and net PNK are legible here and
 * nowhere else — which is the open question ticket 16 left for this ticket, answered by giving
 * this view no reduced form: the stat card, the latency profile and the disputes all render at
 * 390pt, the last of them as cards rather than as a seven-column table.
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

const Portrait = styled.div`
  display: flex;
  align-items: center;
  gap: ${({ theme }) => theme.space6};

  /* Centred against a two-line block on a desktop and against a five-line one at 390pt, where
     the pills wrap three deep and the avatar floats into the middle of them. Top-aligned there
     instead, so the portrait sits level with the name it belongs to. */
  ${narrow} {
    align-items: flex-start;
  }
`;

const Avatar = styled.img`
  width: 72px;
  height: 72px;
  flex: none;
  border-radius: ${({ theme }) => theme.radiusTile};
  border: ${({ theme }) => theme.borderHairline};
  object-fit: cover;
  background-color: ${({ theme }) => theme.page};
`;

/* Deliberately not a generated identicon: an invented image is indistinguishable from a real
   one at a glance, and this page has to keep what it was told apart from what it made up.
   Dashed when the fallback is a *failure* to reach ENS, per Errors.dc.html:152 — which is what
   tells it apart from an agent juror that simply has no avatar set. */
const AvatarFallback = styled.span<{ $fallenBack: boolean }>`
  display: flex;
  width: 72px;
  height: 72px;
  flex: none;
  align-items: center;
  justify-content: center;
  border-radius: ${({ theme }) => theme.radiusTile};
  border: ${({ theme, $fallenBack }) =>
    $fallenBack ? `1px dashed ${theme.lineAmber}` : theme.borderVisible};
  background-color: ${({ theme }) => theme.surfaceInset};
  font: ${({ theme }) => theme.typeMonoLg};
  font-feature-settings: ${({ theme }) => theme.featureMono};
  color: ${({ theme }) => theme.textMeta};
  text-transform: uppercase;
`;

const Names = styled.div`
  display: flex;
  min-width: 0;
  flex-direction: column;
  gap: ${({ theme }) => theme.space5};
`;

const Title = styled.h1`
  font: ${({ theme }) => theme.typeDisplay2};
  letter-spacing: ${({ theme }) => theme.trackingDisplay};
  color: ${({ theme }) => theme.textHeading};
  overflow-wrap: anywhere;
`;

const Facts = styled.div`
  display: flex;
  align-items: center;
  gap: ${({ theme }) => theme.space4};
  flex-wrap: wrap;
`;

const Fact = styled.span<{ $accent?: boolean }>`
  display: inline-flex;
  align-items: center;
  /* For the stack mark and its label. The other pills hold a single string, and the address
     pill's second child is the visually hidden span, which is absolutely positioned and so is
     not a flex item at all — no gap appears where there is nothing to separate. */
  gap: ${({ theme }) => theme.space2};
  padding: ${({ theme }) => `${theme.space3} ${theme.space4}`};
  border: 1px solid
    ${({ theme, $accent }) => ($accent === true ? theme.accentQuiet : theme.borderCardHoverColor)};
  border-radius: ${({ theme }) => theme.radiusChip};
  font: ${({ theme }) => theme.typeMonoSm};
  font-feature-settings: ${({ theme }) => theme.featureMono};
  letter-spacing: ${({ theme }) => theme.trackingMono};
  text-transform: uppercase;
  color: ${({ theme, $accent }) => ($accent === true ? theme.accent : theme.textMeta)};
  white-space: nowrap;
`;

/* Where the nickname came from, on the element it affects. The degraded panel above says ENS is
   unreachable once; this says which name is the consequence, so a reader looking at the heading
   does not have to carry the panel in their head. */
const FromRoster = styled.span`
  font: ${({ theme }) => theme.typeMonoSm};
  letter-spacing: ${({ theme }) => theme.trackingMono};
  text-transform: uppercase;
  color: ${({ theme }) => theme.stateWork};
`;

/* An external link in the pill row: same ink, same weight, no pill around it. Used for both
   the Arbiscan link and the agent juror's own account, because they are the same object — a
   link out of this dashboard, marked as one. */
const Outbound = styled.a`
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

/* The one string in this row whose capitals are the fact.
 *
 * Everything else here is uppercased by the mono label convention and loses nothing by it: the
 * ENS name and the address are case-insensitive identifiers, and their text content — the thing
 * a reader copies — is untouched by a transform. A handle is display text whose capitals are
 * chosen, the same distinction the roster already draws between a nickname that routes and a
 * name that renders, so uppercasing it would be showing a spelling nobody uses.
 *
 * Only a browser says so. `text-transform` does not touch text content, so the DOM, the
 * accessible name and every assertion over either are identical with the transform and without
 * it — the test beside this one passes on the uppercased version. It was found by looking.
 *
 * There is a second reason not to shout it, and it is the one hidden.ts records: some screen
 * readers announce uppercased text letter by letter. */
const Handle = styled(Outbound)`
  text-transform: none;
`;

const Description = styled.p`
  max-width: 68ch;
  font: ${({ theme }) => theme.typeBodyLg};
  color: ${({ theme }) => theme.textBody};
  text-wrap: pretty;
`;

/* A section and not a `main`: `View` already wraps every view's children in one, and nesting a
   second gives the page two landmarks of the same name. */
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

  /* Same rule, same reason as the footnote in Footnotes.tsx: a link inside body prose cannot be
     marked by colour alone, and the accent against this paragraph's ink is the same 1.22:1 that
     failed there.

     axe did not name this one, and reported this route as zero violations — which was silence
     rather than a pass. It had put link-in-text-block in its *incomplete* list, unable to resolve
     the background behind this paragraph and so declining to judge, and a default audit prints
     violations. Found by reading every route for the shape instead. Ticket 28. */
  a {
    text-decoration: underline;
    text-underline-offset: 2px;
  }
`;

/** `0x7a3f…c412`. The href beside it carries the whole of it, and so does the tooltip. */
function shortAddress(address: string): string {
  return `${address.slice(0, 6)}…${address.slice(-4)}`;
}

/**
 * The core subgraph's half, at most once — the same worst-first shape the other two views use.
 *
 * Five of this dashboard's reads come from one Goldsky deployment, so an outage there takes all
 * five and listing them separately would report one source as five faults. The ordering is by
 * what each costs *this* page: the disputes and the draws cost every figure on it, the payouts
 * cost two of the six on the card, and ticket 23's comparison court costs where the band on the
 * latency plot begins.
 */
function coreFailureOf(
  nickname: string,
  { disputes, performance }: { disputes: DisputesView; performance: CourtPerformanceView },
): FailedRead | null {
  const measured = performance.performance;

  if (disputes.error !== null) {
    return failureOf(
      disputes.error,
      SOURCES.core,
      "The court's disputes could not be read, so what is below is whatever was already held rather than the court as it stands.",
    );
  }

  // Not a network failure and it must not be worded as one: every endpoint answered, and what
  // came back was something this dashboard could not believe.
  if (performance.failure !== null) {
    return {
      source: SOURCES.core,
      status: performance.failure.code,
      what: `The court's own record could not be read as a matrix: ${performance.failure.message}. Every endpoint answered; what came back was not something this page could measure.`,
    };
  }

  if (performance.error !== null) {
    return failureOf(
      performance.error,
      SOURCES.core,
      `The draws could not be read, so nothing on this page is a measurement of ${nickname}'s on this load.`,
    );
  }

  if (performance.rewardsError !== null) {
    return failureOf(
      performance.rewardsError,
      SOURCES.core,
      "The court's payouts could not be read, so neither the cumulative ETH nor the net PNK figure is a measurement.",
    );
  }

  // Nothing failed and part of the record still could not be read: the disputes and the draws
  // are two queries polled separately, so a dispute created between them joins a fresh list to
  // draws that could not have mentioned it. On this page that is not a blank row but a missing
  // *entry* — the list below simply does not contain the dispute — which is why the sentence
  // says "unknown rather than no" instead of naming a cell.
  const unread = measured?.totals.unreadDisputes ?? [];
  if (unread.length > 0) {
    return {
      source: SOURCES.core,
      status: "Stale read",
      what: `${unread.length === 1 ? "Dispute" : "Disputes"} ${unread.join(", ")} ${unread.length === 1 ? "was" : "were"} created after the draws on this page were last read, so whether ${nickname} was drawn ${unread.length === 1 ? "in it" : "in them"} is unknown rather than no.`,
    };
  }

  // And the payout read that *succeeded* and came back short, which raises no error at all: a
  // reindexing Goldsky answers HTTP 200 with `[]`. Last, because the card already says "Not
  // read" where the two figures belong, so this is the second voice rather than the only one.
  if (measured?.rewards.short === true) {
    return {
      source: SOURCES.core,
      status: "Short read",
      what: `The court's payouts came back short — ${measured.rewards.paidDraws === 0 ? "none was returned at all" : `${measured.rewards.paidDraws} were returned`} for a court that has ruled on disputes with draws in them — so neither the cumulative ETH nor the net PNK figure is a measurement.`,
    };
  }

  // Last, as on the matrix view and in the same words, because it is the same band read by the
  // same query. The plot says it is missing in the band's own place, so this is the second voice.
  return comparisonFailureOf(performance.reference, performance.referenceError);
}

/**
 * Arbitrum's half, at most once, worded by what is actually on this page.
 *
 * One endpoint serves the commit scan and the parameter history both, so an outage takes both
 * and the worse one is the one named. The error outranks the shortfall count: they are the same
 * endpoint, and a banner listing one source twice reads as two things having gone wrong.
 */
function arbitrumFailureOf(performance: CourtPerformanceView): FailedRead | null {
  const coverage = performance.performance?.commitCoverage;
  const source = arbitrumSource();

  if (performance.commitError !== null) {
    return failureOf(
      performance.commitError,
      source,
      coverage?.read === true
        ? "The commitments could not be re-read from Arbitrum, so every commit latency here comes from an earlier read and none of them accounts for a commitment made since."
        : "The commitments could not be read from Arbitrum, so no commit latency here is a measurement.",
    );
  }

  // `read` gates this and not just the count: until the scan comes back every commitment is
  // unresolved, and a banner keyed on the count alone would announce that all of them failed on
  // every cold load, before they had.
  if (coverage?.read === true && coverage.expected > coverage.resolved) {
    return {
      source,
      status: "Short read",
      what: `${coverage.expected - coverage.resolved} of ${coverage.expected} commitments could not be found on Arbitrum, so those commit latencies are unknown.`,
    };
  }

  if (performance.parametersError !== null) {
    return failureOf(
      performance.parametersError,
      source,
      "The court's period durations could not be read from its own parameter history on Arbitrum, so no dispute here is marked as having run under earlier ones. Court 34 was reconfigured partway through this experiment, and which figures that affects is not shown on this load.",
    );
  }

  return null;
}

function failuresOf(
  nickname: string,
  {
    roster,
    disputes,
    performance,
  }: { roster: RosterView; disputes: DisputesView; performance: CourtPerformanceView },
): Failures {
  const titles = disputes.titles;
  const missingTitles =
    titles === undefined || titles.isLoading ? 0 : titles.expected - titles.resolved;

  return {
    blocking: present(
      coreFailureOf(nickname, { disputes, performance }),
      missingTitles > 0
        ? {
            source: SOURCES.templates,
            status: titles?.resolved === 0 ? "No templates" : "Short read",
            what: `${missingTitles} of ${titles?.expected} dispute subjects could not be read, so those disputes are identified by their ID alone.`,
          }
        : null,
      arbitrumFailureOf(performance),
    ),
    // This view shows a nickname and an avatar, so it falls back exactly as the roster index and
    // the matrix's column headers do, and has to say so in the same words. ENS is the one
    // documented exception and raises no banner: it costs a label and never a figure.
    degraded: [ensFallbackOf(roster)].filter((read) => read !== null),
    offline: disputes.isPaused || performance.isPaused,
    // The older of the two, because the page was last whole when the staler of them landed.
    // `null` if either has never landed: it has then never been complete.
    lastCompleteRead: olderOf(disputes.readAt, performance.readAt),
    retry: performance.retry,
  };
}

/**
 * The disputes this view was read from, and when — all `View`'s read stamp prints.
 *
 * The disputes this agent juror was drawn in, where there are any. Where there are none the claim
 * on the page is "never drawn", which is a statement about the *whole* court that was read — so
 * the range is the court's, because that is what the claim rests on.
 */
function provenanceOf({
  disputes,
  reading,
}: {
  disputes: DisputesView;
  reading: AgentJurorReading | null;
}): Provenance {
  const drawn = reading !== null && reading.draws.length > 0;
  return {
    read: drawn
      ? rangeOf(reading?.draws.map(({ row }) => row.dispute.id) ?? [])
      : rangeOf(disputes.disputes.map((dispute) => dispute.id)),
    readAt: disputes.readAt,
  };
}

/**
 * An address that names no agent juror rests on no read: a dispute range under it would be
 * provenance for a figure the reader cannot see.
 */
const NAMES_NOTHING: Provenance = { read: null, readAt: null };

export type AgentJurorPageProps = {
  roster: RosterView;
  disputes: DisputesView;
  performance: CourtPerformanceView;
};

export type AgentJurorViewProps = AgentJurorPageProps & {
  /** The path segment exactly as it was typed, for the breadcrumb and the wrong-address case. */
  pathNickname: string | undefined;
  /** Render time, in epoch milliseconds — the live flag counts elapsed time from it. */
  now: number;
};

/**
 * The route.
 *
 * Thin, and thinner than `DisputePage`: there is no read to start here, so all this does is
 * take the path segment and the clock. The clock arrives as a prop for the reason the seam
 * takes `drawsReadAt` as data — every derivation below stays testable without stubbing time.
 */
/**
 * The roster entry a path segment names, case-insensitively.
 *
 * Case is folded because the nicknames were capitalised after this route was live and linkable:
 * `/agent-jurors/blaise` is a link somebody may hold, and an exact match would answer it with
 * the "not an agent juror" panel below. Nicknames are distinct case-insensitively, which
 * `agent-jurors.test.ts` holds, so the fold cannot make two of them collide.
 *
 * One function because the view and the document title both resolve the segment, and a fold
 * applied to one and not the other is how the heading and the tab come to disagree.
 */
function entryNamedBy(entries: RosterView["entries"], pathNickname: string | undefined) {
  return entries.find(
    ({ agentJuror }) => pathSegmentOf(agentJuror).toLowerCase() === pathNickname?.toLowerCase(),
  );
}

export function AgentJurorPage(props: AgentJurorPageProps) {
  const { nickname } = useParams();
  // The roster's own spelling, not the path's, for the reason `DisputePage` titles with the raw
  // id: the tab should name what the page names. They part only on a lowercase legacy link, and
  // there the roster is right and the URL is merely old. An address naming nothing has no roster
  // spelling to use, and titles itself with the segment as typed.
  useDocumentTitle(
    entryNamedBy(props.roster.entries, nickname)?.agentJuror.nickname ?? nickname ?? "Agent juror",
  );
  return <AgentJurorView {...props} pathNickname={nickname} now={Date.now()} />;
}

export function AgentJurorView({
  roster,
  disputes,
  performance,
  pathNickname,
  now,
}: AgentJurorViewProps) {
  // The roster is this repository's own list and needs no read, so an address that names nothing
  // is decidable here and now. `/agent-jurors/nope` is not a 404 — the route table matched it —
  // and it is not a failed read either: it is an address that names nothing, and this view says
  // so itself.
  const entry = entryNamedBy(roster.entries, pathNickname);

  // **Before** any failure is composed, and that ordering is the whole of it.
  //
  // A page showing no figure cannot have lost one, so a banner over it describes something the
  // reader is not looking at — and worse than merely redundant here, because every sentence
  // `failuresOf` writes names the agent juror the address failed to name: `/agent-jurors/nope`
  // would be told "the draws could not be read, so nothing on this page is a measurement of
  // nope's". That is a banner about nothing on screen, and it is why `NotFoundPage` passes
  // no failures either. Ticket 13 tiers a failure by whether it costs a figure; here none does.
  if (entry === undefined) {
    return (
      <View provenance={NAMES_NOTHING}>
        <Breadcrumb to="/agent-jurors" parent="Agent jurors" current={pathNickname ?? "Unknown"} />
        <Missing>
          <MissingTitle>That is not an agent juror</MissingTitle>
          <MissingBody>
            {/* Off the roster's own length, never a literal: the roster gains entries, and a
                number written into this sentence would go on naming an older one on a public
                page with nothing to contradict it. */}
            This address does not name one of the {roster.entries.length} agent jurors in this
            experiment. They are listed by nickname at <Link to="/agent-jurors">Agent jurors</Link>,
            and the address of each is its nickname exactly as the roster holds it.
          </MissingBody>
        </Missing>
      </View>
    );
  }

  const { agentJuror, identity } = entry;
  const measured = performance.performance;
  const reading = measured === null ? null : buildAgentJurorReading(measured, agentJuror.nickname);

  const failures = failuresOf(agentJuror.nickname, { roster, disputes, performance });
  const provenance = provenanceOf({ disputes, reading });

  // `isResolving` as well as `isResolvedFromEns`: the second is false while the mainnet lookup
  // is still out *and* after it fails, so a mark keyed on it alone claims a failure for the
  // length of every cold load and then takes it back.
  const fallenBack = !roster.isResolving && !roster.isResolvedFromEns;
  const handleUrl = handleUrlOf(agentJuror);
  const ensName = ensNameOf(agentJuror);

  return (
    <View provenance={provenance} failures={failures}>
      {/* The roster nickname and never the one ENS resolves: the trail names what the route is
          keyed on, and a `name` record is rewritable from a wallet. The roster's spelling even
          on a lowercase link — `entryNamedBy` folded the case, and this shows what the page
          settled on rather than what was typed at it. */}
      <Breadcrumb to="/agent-jurors" parent="Agent jurors" current={agentJuror.nickname} />

      <Header>
        <Split>
          <Identified>
            <Portrait>
              {identity.avatarUrl ? (
                <Avatar src={identity.avatarUrl} alt="" loading="lazy" />
              ) : (
                <AvatarFallback aria-hidden="true" $fallenBack={fallenBack}>
                  {identity.nickname.slice(0, 2)}
                </AvatarFallback>
              )}
              <Names>
                {/* Displayed as ENS resolved it, so this heading and the matrix's column header
                    read the same. Keyed on the roster throughout regardless: the resolved name
                    is a display name, and a route keyed on one would be keyed on something an
                    operator can change from a wallet. */}
                <Title>{identity.nickname}</Title>
                <Facts>
                  {/* Beside the stack label, never instead of it, and aria-hidden: which stack
                      an agent juror runs is a fact about the roster, and the mark in front of it
                      may simply fail to draw. */}
                  <Fact $accent>
                    <StackIcon stack={agentJuror.stack} />
                    {stackLabelOf(agentJuror)}
                  </Fact>
                  {/* Left out, not guessed, where there is no subname: a name nobody registered
                      would send a reader to an ENS app to find nothing. */}
                  {ensName !== null && <Fact>{ensName}</Fact>}
                  {/* The short form is drawn; the whole address is said. It was reachable only
                      through a `title` tooltip, so the one identifier that distinguishes this
                      agent juror from any other was available to a mouse and to nothing else.
                      The abbreviation stays visible — the full 42 characters would take the
                      line — and the Arbiscan link beside it goes to the same address. */}
                  <Fact title={agentJuror.address}>
                    <span aria-hidden="true">{shortAddress(agentJuror.address)}</span>
                    <VisuallyHidden>Address {agentJuror.address}</VisuallyHidden>
                  </Fact>
                  <Outbound
                    href={`https://arbiscan.io/address/${agentJuror.address}`}
                    target="_blank"
                    rel="noopener noreferrer"
                  >
                    Arbiscan ↗
                  </Outbound>
                  {/* The agent juror's own account, where it has one — most have none, so the
                      absent case is the common one and draws nothing at all rather than an empty
                      slot. Not counted here, for the reason `ROSTER.length` is never a literal:
                      the roster grows and so does this subset of it. Deliberately *not* behind the justification interstitial that guards
                      every other outbound link on this dashboard: that interstitial exists
                      because justification prose is written by the agents themselves, so the
                      URLs in it are arbitrary and unreviewed, whereas this one is hard-coded in
                      this repository and reviewed in a pull request. Putting a warning in front
                      of content the repo itself controls teaches readers to click through
                      warnings.

                      The link beside it announces as "Arbiscan" and names where it goes; an
                      account name alone does not, and a links list is read out of context, so
                      "on X" is said and not drawn — the visible spelling is the whole reason
                      `Handle` exists. WCAG 2.4.4.

                      The space in front of that hidden half is a text node of the anchor and not
                      the first character inside `VisuallyHidden`, and the placement is the whole
                      of it: an accessible name is built from each child element's contribution
                      *trimmed*, so a space written inside is dropped and the name comes out
                      "@Grokleroson X" — the fix reading worse than the defect it fixes. A raw
                      text node keeps its space. Only the test can see the difference. */}
                  {handleUrl !== null && (
                    <Handle href={handleUrl} target="_blank" rel="noopener noreferrer">
                      {agentJuror.handle} <VisuallyHidden>on X</VisuallyHidden> ↗
                    </Handle>
                  )}
                  {/* Beside the stack and the name, never instead of them: which stack an agent
                      juror runs is a fact about the roster and is still true when ENS is down. */}
                  {fallenBack && <FromRoster>From roster</FromRoster>}
                </Facts>
              </Names>
            </Portrait>
            {agentJuror.description && <Description>{agentJuror.description}</Description>}
          </Identified>

          {/* Only where there is something to summarise. An agent juror the court has never
              drawn gets the empty state below instead, which carries the same six figures as
              three dashes, a real zero and two more dashes — and the sentence saying what a dash
              means. Two blocks of six would print each of them twice on the one page whose whole
              subject is that there is nothing to print. */}
          {measured !== null && reading !== null && reading.draws.length > 0 && (
            <AgentJurorSummary reading={reading} performance={measured} />
          )}
        </Split>
      </Header>

      {measured === null || reading === null ? (
        !performance.isLoading && (
          // Deliberately not "the draws could not be read": the record is also absent when the
          // dispute read failed and when the seam refused the payload it was given.
          //
          // `reading === null` over a *measured* court belongs here and not in the empty state
          // below, and the distinction is the one this page turns on. It means the seam's own
          // roster does not hold this nickname — a disagreement between two lists of agent
          // jurors that ought to be the same list, not a
          // fact about the court's random selection — and drawing it as "never drawn" would
          // state a defect in this dashboard as a finding about an agent juror.
          <Notice $tone="rose" role="status">
            The court's record could not be built from what was read, so nothing on this page is a
            measurement of {agentJuror.nickname}. Whether it has been drawn, how quickly it acted
            and what it has been paid are all unknown on this load rather than absent.
          </Notice>
        )
      ) : reading.draws.length === 0 ? (
        <AgentJurorEmpty reading={reading} performance={measured} />
      ) : (
        <>
          <AgentJurorLatency
            nickname={agentJuror.nickname}
            own={reading.marginals.revealLatency}
            court={measured.totals.revealLatency}
            changedWindows={reading.marginals.changedWindows}
            current={measured.parameters.current}
            comparison={comparisonOf(performance.reference, performance.referenceError)}
          />
          <AgentJurorDraws
            nickname={agentJuror.nickname}
            draws={reading.draws}
            scanned={measured.commitCoverage.read}
            // The clock reaches a flag here and never the seam, which reads none: `MatrixRow` is
            // built by a pure function, and `now` is threaded from the view for exactly that.
            flagContext={{ current: measured.parameters.current, now }}
            titleFor={(dispute: Dispute) => disputes.templateFor?.(dispute)?.title ?? null}
            unreadDisputes={measured.totals.unreadDisputes}
          />
        </>
      )}
    </View>
  );
}
