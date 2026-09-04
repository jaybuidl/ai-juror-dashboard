import { Link, useParams } from "react-router";
import styled from "styled-components";
import { Breadcrumb } from "../chrome/Breadcrumb";
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
import { formatWindowSeconds } from "../performance/latency";
import type { CourtPerformance } from "../performance/performance";
import { ORDINARY_COURT_PROSE } from "../performance/strip";
import type { CourtPerformanceView } from "../performance/useCourtPerformance";
import { type FailedRead, failureOf, SOURCES } from "../read-failure";
import { ensNameOf } from "../roster/agent-jurors";
import { ensFallbackOf } from "../roster/ens-fallback";
import type { RosterView } from "../roster/useRoster";
import { narrow } from "../styles/breakpoints";
import { VisuallyHidden } from "../styles/hidden";

/**
 * One agent juror on its own: what it runs, what it has done, and what it has been paid.
 *
 * Built against `canvas/Juror.dc.html` — identity and stat card at `:53-83`, the latency
 * profile at `:86-110`, the drawn-in table at `:113-134` — and `canvas/JurorEmpty.dc.html` for
 * the one agent juror the court has never drawn.
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
 * Four of this dashboard's reads come from one Goldsky deployment, so an outage there takes all
 * four and listing them separately would report one source as four faults. The ordering is by
 * what each costs *this* page: the disputes and the draws cost every figure on it, the payouts
 * cost two of the six on the card.
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

  return null;
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

/** What this view says its figures rest on. Composed here, printed by `View`. */
function provenanceOf({
  nickname,
  roster,
  disputes,
  performance,
  reading,
}: {
  nickname: string;
  roster: RosterView;
  disputes: DisputesView;
  performance: CourtPerformanceView;
  reading: AgentJurorReading | null;
}): Provenance {
  const caveats: string[] = [];
  const measured = performance.performance;
  const drawn = reading !== null && reading.draws.length > 0;

  if (disputes.error !== null) {
    caveats.push(
      "The court could not be re-read on this load, so what is above may be out of date.",
    );
  } else if (measured !== null && performance.error !== null) {
    caveats.push(
      "The draws could not be re-read on this load, so the disputes listed above are the ones an earlier read found this agent juror in, and a dispute newer than that read is absent rather than one it was not drawn in.",
    );
  }

  const titles = disputes.titles;
  if (titles !== undefined && !titles.isLoading && titles.resolved < titles.expected) {
    caveats.push(
      `${titles.expected - titles.resolved} of ${titles.expected} dispute titles did not come back from the template subgraph, so those disputes are identified by their ID alone.`,
    );
  }

  // `isResolving` as well as `isResolvedFromEns`: the flag is false while the mainnet lookup is
  // still out, so a footer keyed on the second alone asserts a failure that has not happened for
  // the length of every cold load and then retracts it.
  if (!roster.isResolving && !roster.isResolvedFromEns) {
    caveats.push(
      "ENS could not be reached, so the nickname above is the one held in this repository and no avatar is shown.",
    );
  }

  // Everything below qualifies something measured from this agent juror's own draws — every
  // entry but the first a figure, and the first the one piece of decoration drawn beside them —
  // so none of it is sayable about an agent juror that has none: a caveat about a median that
  // does not exist reads as a caveat about the whole page. `canvas/JurorEmpty.dc.html` is the
  // state, and its own card carries the only sentence it needs — a dash means no draws to
  // measure.
  if (drawn && reading !== null) {
    const { marginals } = reading;

    // The one thing on this page that is not a read, said in the one place this page says such
    // things — the same rule and the same words as the matrix view's, because it is the same
    // band on a plot sharing the same axis, and two pages disagreeing about what it stands for
    // is the prose fork `CLAUDE.md` records over and over.
    //
    // Gated on the plot being on the screen and not merely on the agent juror having draws:
    // `AgentJurorLatency` shows a sentence instead of a picture where none of those draws has
    // revealed, and a footer naming a band nobody can see sends a reader looking for it.
    if (marginals.revealLatency !== null) {
      caveats.push(
        `The comparison band on the latency plot is illustrative and measures no court: it marks the ${ORDINARY_COURT_PROSE} an ordinary Kleros court takes at minimum over a single-round dispute, before any appeal, which makes it longer still. It is the only thing above that did not come from a read.`,
      );
    }

    const lone = marginals.coherence.lonePanelDisputes;
    if (lone.length > 0) {
      caveats.push(
        `${lone.length === 1 ? "Dispute" : "Disputes"} ${lone.join(", ")} ${lone.length === 1 ? "was" : "were"} decided by a panel of one, where coherence is tautological. Counted above, and marked wherever counted.`,
      );
    }

    // This column's own window changes and not the court's. A marker on a median is a claim
    // about the draws behind that median, and this agent juror may never have been drawn under
    // the earlier configuration at all — `agentJurorMarginalsOf` slices them for exactly this.
    for (const change of marginals.changedWindows) {
      caveats.push(
        `${change.disputes.length === 1 ? "Dispute" : "Disputes"} ${change.disputes.join(", ")} ran under a commit window of ${formatWindowSeconds(change.windows.commitSeconds)} and a vote window of ${formatWindowSeconds(change.windows.voteSeconds)}, which the court has since changed. Counted above, and marked wherever counted.`,
      );
    }

    // The disputes the marker's *absence* would otherwise pass off as a match, narrowed to the
    // ones this agent juror was actually drawn in — a selection of which disclosure applies,
    // not a second count. Gated on `current`, because while the history is unread every dispute
    // is unplaced and the caveat further down already says so in the right words.
    const unplaced = reading.draws
      .filter(({ row }) => row.windows === null)
      .map(({ row }) => row.dispute.id);
    if (measured !== null && measured.parameters.current !== null && unplaced.length > 0) {
      caveats.push(
        `The parameter history read on this load does not reach back far enough to place ${unplaced.length === 1 ? "dispute" : "disputes"} ${unplaced.join(", ")}, so ${unplaced.length === 1 ? "its figures are" : "their figures are"} unmarked for want of anything to compare against rather than for having matched the court's current windows.`,
      );
    }

    // What the two sums are *over*, which is the one thing a reader cannot see from the figures.
    // A shift is written when the court **executes** a dispute, a later transaction than ruling
    // it, so a dispute counted in the coherence figure may legitimately contribute nothing to
    // these two. A lag, not a shortfall — stated in the affirmative for that reason, and gated
    // on `short` because a read that came back short has no business saying what it covers.
    const rewards = marginals.rewards;
    if (measured?.rewards.read === true && !measured.rewards.short) {
      const paid = rewards?.paidDraws ?? 0;
      caveats.push(
        `Cumulative ETH and net PNK are summed over the ${paid} of this agent juror's ${marginals.draws} draws the court has executed and paid out. A dispute it has ruled but not yet executed is counted in the coherence figure and in neither reward figure, so those two lag the rest of this page rather than disagreeing with it.`,
      );
    }

    // Said only when it is true. Court 34 has a WETH fee token registered and has never paid in
    // it; if it ever does, this agent juror will have earned something no ETH figure here
    // carries, and reading as though it earned less is the failure this page cannot afford.
    const feeTokenDraws = rewards?.feeTokenDraws ?? 0;
    if (feeTokenDraws > 0) {
      caveats.push(
        `${feeTokenDraws} of this agent juror's ${feeTokenDraws === 1 ? "draws was" : "draws were"} paid in a fee token rather than in ETH, and no figure above carries that value. The ETH shown for it is therefore less than what it was paid.`,
      );
    }

    // The in-flight half only. The failed half is the banner's, and saying it twice would make
    // one outage two voices — ticket 13's rule.
    if (measured !== null && !measured.rewards.read && performance.rewardsError === null) {
      caveats.push(
        "The court's payouts are still being read, so no cumulative ETH or PNK figure is shown yet.",
      );
    }

    if (measured !== null && !measured.commitCoverage.read && performance.commitError === null) {
      caveats.push(
        "The commitments are still being read from Arbitrum, which is a separate and slower source than the subgraph, so no commit latency is shown yet.",
      );
    }

    if (measured !== null && measured.parameters.current === null) {
      if (!measured.parameters.read) {
        if (performance.parametersError === null) {
          caveats.push(
            "The court's period durations are still being read from its own parameter history on Arbitrum, so nothing above is yet marked as having run under earlier ones.",
          );
        }
      } else {
        caveats.push(
          "Arbitrum returned no parameter history for court 34, which cannot be right for a court that has held disputes — so this read came back short. Nothing above is marked as having run under earlier period durations, and that is an unread state rather than a finding.",
        );
      }
    }
  }

  return {
    measures: measuresOf(nickname, measured, drawn),
    // The disputes this agent juror was drawn in, where there are any. Where there are none the
    // claim on the page is "never drawn", which is a statement about the *whole* court that was
    // read — so the range is the court's, because that is what the claim rests on.
    read: drawn
      ? rangeOf(reading?.draws.map(({ row }) => row.dispute.id) ?? [])
      : rangeOf(disputes.disputes.map((dispute) => dispute.id)),
    readAt: disputes.readAt,
    caveats,
    identifiesAgentJurors: true,
  };
}

/**
 * What on this page is the measured record.
 *
 * An agent juror the court has never drawn *has* one — its absence from every panel, read from
 * the court's own draws, which is baskerville's whole entry in this experiment. That is not the
 * same claim as `NAMES_NOTHING` below, and telling the two apart is what this view exists to get
 * right one level down as well: a blank is a fact about the court, and an absence is not.
 */
function measuresOf(nickname: string, measured: CourtPerformance | null, drawn: boolean): string {
  if (!drawn) {
    return `Nothing on this page is a measurement of ${nickname}: the court has drawn it in none of the disputes read, so there is nothing it has done to measure. That it has not been drawn is the measured record, read from the court's own draws.`;
  }

  return measured?.commitCoverage.read
    ? `Commit latency, reveal latency and coherence are the measured record here: how long ${nickname} took to commit after each commit period opened, how long it took to reveal after each vote period opened, and whether that vote matched the dispute's final ruling. Each latency is measured from its own period. Cumulative ETH and net PNK are what the court has paid out for those draws, and are context beside the measures rather than a dimension anything is ranked on.`
    : `Reveal latency and coherence are the measured record here: how long ${nickname} took to reveal after each vote period opened, and whether that vote matched the dispute's final ruling. Cumulative ETH and net PNK are what the court has paid out for those draws, and are context beside the measures rather than a dimension anything is ranked on.`;
}

/**
 * What the footer says over an address that names no agent juror.
 *
 * Its own constant rather than a branch of `provenanceOf`, because that function's every input
 * is about a read and this page rests on none: there is no agent juror for the court to have
 * failed to draw, so a dispute range under it would be provenance for a figure the reader cannot
 * see, and the sentence written for the never-drawn case above would report a reading of the
 * court about something the court has never heard of. Found by opening the page; nothing else
 * could have found it, because every test asserted what the page shows and this was a sentence
 * about what it does not.
 *
 * `identifiesAgentJurors` stays true: the body names the six and links to them, and the line is
 * a standing statement about how this dashboard identifies them rather than about a figure.
 */
const NAMES_NOTHING: Provenance = {
  measures:
    "Nothing on this page is a measurement. This address does not name an agent juror, so there is nothing here that was measured from one.",
  read: null,
  readAt: null,
  caveats: [],
  identifiesAgentJurors: true,
};

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
export function AgentJurorPage(props: AgentJurorPageProps) {
  const { nickname } = useParams();
  // The roster nickname from the path, for the reason DisputePage titles with the raw id.
  useDocumentTitle(nickname ?? "Agent juror");
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
  const entry = roster.entries.find(({ agentJuror }) => agentJuror.nickname === pathNickname);

  // **Before** any failure is composed, and that ordering is the whole of it.
  //
  // A page showing no figure cannot have lost one, so a banner over it describes something the
  // reader is not looking at — and worse than merely redundant here, because every sentence
  // `failuresOf` writes names the agent juror the address failed to name: `/agent-jurors/nope`
  // would be told "the draws could not be read, so nothing on this page is a measurement of
  // nope's". That is the footer's own defect one layer up, and it is why `NotFoundPage` passes
  // no failures either. Ticket 13 tiers a failure by whether it costs a figure; here none does.
  if (entry === undefined) {
    return (
      <View provenance={NAMES_NOTHING}>
        <Breadcrumb to="/agent-jurors" parent="Agent jurors" current={pathNickname ?? "Unknown"} />
        <Missing>
          <MissingTitle>That is not an agent juror</MissingTitle>
          <MissingBody>
            This address does not name one of the six agent jurors in this experiment. They are
            listed by nickname at <Link to="/agent-jurors">Agent jurors</Link>, and the address of
            each is its nickname exactly as the roster holds it.
          </MissingBody>
        </Missing>
      </View>
    );
  }

  const { agentJuror, identity } = entry;
  const measured = performance.performance;
  const reading = measured === null ? null : buildAgentJurorReading(measured, agentJuror.nickname);

  const failures = failuresOf(agentJuror.nickname, { roster, disputes, performance });
  const provenance = provenanceOf({
    nickname: agentJuror.nickname,
    roster,
    disputes,
    performance,
    reading,
  });

  // `isResolving` as well as `isResolvedFromEns`: the second is false while the mainnet lookup
  // is still out *and* after it fails, so a mark keyed on it alone claims a failure for the
  // length of every cold load and then takes it back.
  const fallenBack = !roster.isResolving && !roster.isResolvedFromEns;

  return (
    <View provenance={provenance} failures={failures}>
      {/* The roster nickname and never the one ENS resolves: `blaise` carries a `name` record
          reading "Blaise", and the trail has to name what the route is keyed on. */}
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
                  <Fact $accent>{agentJuror.stack.label}</Fact>
                  <Fact>{ensNameOf(agentJuror)}</Fact>
                  {/* The short form is drawn; the whole address is said. It was reachable only
                      through a `title` tooltip, so the one identifier that distinguishes this
                      agent juror from any other was available to a mouse and to nothing else.
                      The abbreviation stays visible — the full 42 characters would take the
                      line — and the Arbiscan link beside it goes to the same address. */}
                  <Fact title={agentJuror.address}>
                    <span aria-hidden="true">{shortAddress(agentJuror.address)}</span>
                    <VisuallyHidden>Address {agentJuror.address}</VisuallyHidden>
                  </Fact>
                  <OnChain
                    href={`https://arbiscan.io/address/${agentJuror.address}`}
                    target="_blank"
                    rel="noopener noreferrer"
                  >
                    Arbiscan ↗
                  </OnChain>
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
          // roster does not hold this nickname — a disagreement between two lists of six, not a
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
