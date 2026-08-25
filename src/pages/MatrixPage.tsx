import styled from "styled-components";
import { Notice } from "../chrome/Failure";
import { affects, type Failures, olderOf, present } from "../chrome/failures";
import { Hero } from "../chrome/Hero";
import type { Provenance } from "../chrome/provenance";
import { rangeOf } from "../chrome/provenance";
import { StatTiles } from "../chrome/StatTiles";
import { View } from "../chrome/View";
import { DisputeList } from "../disputes/DisputeList";
import type { DisputesView } from "../disputes/useDisputes";
import { arbitrumSource } from "../performance/arbitrum";
import { DisputeCards } from "../performance/DisputeCards";
import { LatencyStrip } from "../performance/LatencyStrip";
import { formatWindowSeconds } from "../performance/latency";
import { Matrix } from "../performance/Matrix";
import type { CourtPerformanceView } from "../performance/useCourtPerformance";
import { type FailedRead, failureOf, SOURCES } from "../read-failure";
import { ensFallbackOf } from "../roster/ens-fallback";
import type { RosterView } from "../roster/useRoster";
import { narrow, useIsNarrow } from "../styles/breakpoints";

/**
 * The landing view: the hero, what the court amounts to, and the matrix itself.
 *
 * Built against `canvas/Main.dc.html`, which lays out exactly this order — nav, hero and
 * tiles, the latency strip, then the grid. The roster does not appear on that artboard and no
 * longer appears here either: the six are the matrix's column headers, and they have an index
 * of their own at `/agent-jurors` for a reader who wants them without the grid.
 *
 * This view derives nothing. Every figure above the matrix comes from `performance.totals`,
 * which the seam computed, for the same reason the cells do.
 */

/* The system's card: a lighter ink than the page, a hairline, and an inset top highlight
   instead of a drop shadow. Solid rather than dashed — the design system draws an absence of
   data as a quiet card, not as a placeholder outline. */
const Caveat = styled.section`
  display: flex;
  flex-direction: column;
  gap: ${({ theme }) => theme.space5};
  padding: ${({ theme }) => theme.cardPadLg};
  border: ${({ theme }) => theme.borderHairline};
  border-radius: ${({ theme }) => theme.radiusCard};
  background-color: ${({ theme }) => theme.surfaceCard};
  box-shadow: ${({ theme }) => theme.shadowCard};

  /* The card's own padding sits inside the page's, so on a narrow screen the two
     together were eating close to a third of the width. At the breakpoint the whole layout
     reduces at, since ticket 16: this was a 600px literal that pre-dated breakpoints.ts, and a
     second number here is a second breakpoint the day either of them moves. No backticks in
     this comment — one would close the styled template and break the file far below. */
  ${narrow} {
    padding: ${({ theme }) => `${theme.space8} ${theme.space7}`};
  }
`;

const CaveatTitle = styled.h2`
  font: ${({ theme }) => theme.typeTitle1};
  letter-spacing: ${({ theme }) => theme.trackingTitle};
  color: ${({ theme }) => theme.textHeading};
`;

const CaveatBody = styled.p`
  max-width: 68ch;
  color: ${({ theme }) => theme.textBody};
`;

export type MatrixPageProps = {
  roster: RosterView;
  disputes: DisputesView;
  performance: CourtPerformanceView;
};

/**
 * What is wrong with the core subgraph's half of this page — at most one thing, in this order.
 *
 * One entry, structurally, because one fault reaches this view through several channels: a failed
 * dispute read propagates into `performance.error`, a payload the seam refused arrives as both
 * `failure` and a flattened `error`, and a draw read that is merely old leaves rows the model
 * marks unread. Listed separately they would read as three things having gone wrong, and a reader
 * counting sources in a banner is trying to work out how bad it is.
 *
 * The precedence is worst-first, and each case is genuinely different to a reader: what to go and
 * check, and whether anything on the page can be quoted at all.
 *
 * `costsTiles` is the half `affects` cannot work out for itself. That function is per **source**,
 * which was the right grain while every core-subgraph failure cost the figures above the matrix —
 * and ticket 10 added the first that does not: the payouts feed two rows of each column header
 * and nothing else, so a failed payout read leaves the dispute count, the draw count and the
 * median reveal entirely whole. Labelling them "Partial" anyway is ticket 13's own first-cut
 * mistake at a finer grain, and `CLAUDE.md` is blunt about the cost: a caveat a reader checks and
 * finds baseless is one that teaches them to stop checking.
 */
type CoreFailure = {
  read: FailedRead;
  /** Whether this failure is one the stat tiles and the latency strip are short because of. */
  costsTiles: boolean;
};

/** `failureOf`'s nullable answer, tagged as one the figures above the matrix depend on. */
function costingTiles(read: FailedRead | null): CoreFailure | null {
  return read === null ? null : { read, costsTiles: true };
}

function coreFailureOf({
  disputes,
  performance,
}: Pick<MatrixPageProps, "disputes" | "performance">): CoreFailure | null {
  const measured = performance.performance;

  if (disputes.error !== null) {
    return costingTiles(
      failureOf(
        disputes.error,
        SOURCES.core,
        "The court's disputes could not be read, so what is below is whatever was already held rather than the court as it stands.",
      ),
    );
  }

  // Not a network failure, and it must not be worded as one: every endpoint answered, and what
  // came back was something this dashboard could not believe. Wording it as an outage would send
  // a reader to check a service that is up. The code and the offending draw are the whole content
  // of that distinction, and until ticket 13 `useCourtPerformance` flattened both into a sentence
  // because nothing above it could show more.
  if (performance.failure !== null) {
    return {
      read: {
        source: SOURCES.core,
        status: performance.failure.code,
        what: `The court's own record could not be read as a matrix: ${performance.failure.message}. Every endpoint answered; what came back was not something this page could measure.`,
      },
      costsTiles: true,
    };
  }

  if (performance.error !== null) {
    return costingTiles(
      failureOf(
        performance.error,
        SOURCES.core,
        measured === null
          ? "The draws could not be read, so no latency and no coherence on this page was measured on this load."
          : "The draws could not be re-read, so the matrix below joins the disputes just read to an earlier read of the draws.",
      ),
    );
  }

  // Ticket 10's payouts, read from this same deployment — so an outage takes all four reads and
  // listing them separately would report one source as four faults. It ranks below every branch
  // above because it costs the least of them: two of the six figures in each column header,
  // where those cost the matrix itself.
  //
  // It ranks **above** the stale read below, though, and that ordering is load-bearing rather
  // than aesthetic. This is the only entry here with no second voice: a failed payout read
  // leaves both slots showing a pending dash, which is exactly what a column that was never
  // drawn shows, so the banner is the only place it can be said. The stale read has two of its
  // own — every affected row carries a `?` flag and draws its cells as Unknown. Ranked the other
  // way round, a page with both would say nothing at all about the payouts: the banner would be
  // occupied and the footer's own sentence is suppressed the moment there is an error to
  // suppress it. That is "a read that fails is said exactly twice" coming out as zero.
  if (performance.rewardsError !== null) {
    const read = failureOf(
      performance.rewardsError,
      SOURCES.core,
      // "below" and not "in the column headers below": the card layout has no column headers, and
      // a banner naming furniture the reader cannot see is the fault ticket 16's review caught in
      // the commit-shortfall notice. The short-read sentence further down was already neutral.
      "The court's payouts could not be read, so no cumulative ETH or PNK figure below is a measurement.",
    );
    return read === null ? null : { read, costsTiles: false };
  }

  // The case with no error anywhere, and the reason this function exists rather than a list of
  // independent checks. Both reads can *succeed* at different moments — react-query holds the
  // draws for a minute — so a dispute created between them joins a fresh list to draws that could
  // not have mentioned it. Nothing failed, and part of this page still could not be read, which is
  // exactly what the banner says. Without this the rows go Unknown and the tiles say "Partial"
  // while the top of the page stays silent.
  const unread = measured?.totals.unreadDisputes ?? [];
  if (unread.length > 0) {
    return {
      read: {
        source: SOURCES.core,
        status: "Stale read",
        what: `${unread.length === 1 ? "Dispute" : "Disputes"} ${unread.join(", ")} ${unread.length === 1 ? "was" : "were"} created after the draws on this page were last read, so ${unread.length === 1 ? "its" : "their"} draws are unknown rather than absent.`,
      },
      costsTiles: true,
    };
  }

  // And the payout read that *succeeded* and came back short, which raises no error at all: a
  // reindexing Goldsky answers HTTP 200 with `[]`. Last, because it costs the same two figures
  // as the failure above and, unlike it, the column headers already say "Not read" where those
  // figures belong — so this is the second voice rather than the only one.
  //
  // That second voice is the desktop's. Below the breakpoint there are no column headers and no
  // payout figure at all, so on a phone this banner is the only voice *and* it reports the loss
  // of something the reader was never shown. Ticket 13's rule tiers a failure by whether it costs
  // a figure, and on this layout it costs none. Left as it stands rather than re-tiered inside a
  // merge: it is a design call, and ticket 11 is where these two figures get a phone home.
  if (measured?.rewards.short === true) {
    return {
      read: {
        source: SOURCES.core,
        status: "Short read",
        what: `The court's payouts came back short — ${measured.rewards.paidDraws === 0 ? "none was returned at all" : `${measured.rewards.paidDraws} were returned`} for a court that has ruled on disputes with draws in them — so no cumulative ETH or PNK figure below is a measurement.`,
      },
      costsTiles: false,
    };
  }

  return null;
}

/**
 * What is wrong with the commit half — at most one thing, worded by what is actually on screen.
 *
 * Two states, and the wording has to keep them apart because the difference is whether the commit
 * column below can be quoted. react-query keeps the commitments it already holds when a refetch
 * fails — the key does not change across one — so an Arbitrum outage very often arrives over a
 * full column of real, earlier-read figures. Announcing "no commit latency below is a measurement"
 * there is false about every one of them, and it is the likely case rather than the exotic one:
 * `CLAUDE.md` records that arb1 rate-limits per call and surfaces it as an `UnknownRpcError`.
 *
 * The error outranks the shortfall count when both are present. They are the same endpoint, and a
 * banner listing one source twice reads as two things having gone wrong; the count is still stated
 * in full beside the grid, which is the "twice" the criterion asks for.
 */
function arbitrumFailureOf(performance: CourtPerformanceView): FailedRead | null {
  const measured = performance.performance;
  const coverage = measured?.commitCoverage;
  // Once, for all three branches: they are the same endpoint, and the name is derived from the
  // URL in use rather than being a constant. See `arbitrumSource`.
  const source = arbitrumSource();

  if (performance.commitError !== null) {
    return failureOf(
      performance.commitError,
      source,
      coverage?.read === true
        ? "The commitments could not be re-read from Arbitrum, so every commit latency below comes from an earlier read and none of them accounts for a commitment made since."
        : "The commitments could not be read from Arbitrum, so no commit latency below is a measurement.",
    );
  }

  // `read` gates this and not just the count, for the reason ticket 07 found by review: until the
  // scan comes back every commitment is unresolved, and a banner keyed on the count alone would
  // announce that all 56 failed on every cold load, before they had.
  if (coverage?.read === true && coverage.expected > coverage.resolved) {
    return {
      source: source,
      status: "Short read",
      what: `${coverage.expected - coverage.resolved} of ${coverage.expected} commitments could not be found on Arbitrum, so those commit latencies are unknown.`,
    };
  }

  // Last, and only when the two above are silent: ticket 08's parameter history is read from the
  // same endpoint, so an outage usually takes both and listing them separately would report one
  // source as two faults. It ranks below them because it costs no figure — what a reader loses is
  // the note saying which figures are not comparable with which, which is why the sentence says
  // that rather than naming a measurement.
  if (performance.parametersError !== null) {
    return failureOf(
      performance.parametersError,
      source,
      "The court's period durations could not be read from its own parameter history on Arbitrum, so no dispute below is marked as having run under earlier ones. Court 34 was reconfigured partway through this experiment, and which rows that affects is not shown on this load.",
    );
  }

  return null;
}

/**
 * What could not be read on this view, in the two tiers ticket 13 defines.
 *
 * The rule, from the ticket and from `Errors.dc.html`'s own rule panel: a failure that changes a
 * number is loud, a failure that changes only a label is quiet, and ENS is the single documented
 * exception. That puts the core subgraph, the template subgraph and Arbitrum in `blocking` and
 * the mainnet endpoint in `degraded`.
 *
 * The template subgraph is the one worth arguing about, and it is loud here because the ticket
 * and the canvas both say so outright — the ticket names ENS as "the one documented exception",
 * and the canvas's rule panel draws a rose dot against "DRT subgraph". By the first criterion
 * alone a missing title changes only a label and would be quiet; a row a reader cannot identify
 * on a page that may be cited is the case those two are making. Recorded in the ticket's
 * Comments rather than settled silently here.
 *
 * Composed alongside `provenanceOf` and deliberately not merged with it. The footer says what
 * the figures rest on; this says what is missing from them. A reader who meets the same sentence
 * twice stops reading either, which is why `MatrixPage.test.tsx` pins that the footer never
 * becomes a second alarm.
 */
function failuresOf(
  { roster, disputes, performance }: MatrixPageProps,
  core: CoreFailure | null,
): Failures {
  const titles = disputes.titles;
  const missingTitles =
    titles === undefined || titles.isLoading ? 0 : titles.expected - titles.resolved;

  return {
    blocking: present(
      core?.read ?? null,
      missingTitles > 0
        ? {
            source: SOURCES.templates,
            status: titles?.resolved === 0 ? "No templates" : "Short read",
            what: `${missingTitles} of ${titles?.expected} dispute subjects could not be read, so those rows are identified by their dispute ID alone.`,
          }
        : null,
      arbitrumFailureOf(performance),
    ),
    // The matrix's column headers carry the same six nicknames and the same six avatars the
    // roster does, so this view falls back exactly as `/agent-jurors` does and has to say so in
    // the same words. Before ticket 13 it said nothing: the panel lived inside `Roster`, and
    // ticket 15 had moved the roster to its own route.
    degraded: [ensFallbackOf(roster)].filter((read) => read !== null),
    offline: disputes.isPaused || performance.isPaused,
    // The *older* of the two reads, not the dispute read alone. This page is built from two
    // queries that can succeed at different moments, so it was last whole when the staler of
    // them landed — and the case the banner exists for is exactly the one where they differ. A
    // fresh dispute re-read beside a failed draw re-read would otherwise date an incomplete page
    // to a minute ago, which is the reassurance a citing reader must not be given. `null` if
    // either has never landed: the page has then never been complete, and the banner says so.
    lastCompleteRead: olderOf(disputes.readAt, performance.readAt),
    retry: performance.retry,
  };
}

/** What this view says its figures rest on. Composed here, printed by `View`. */
function provenanceOf(
  { roster, disputes, performance }: MatrixPageProps,
  narrow: boolean,
): Provenance {
  const caveats: string[] = [];
  const measured = performance.performance;

  if (disputes.error !== null) {
    caveats.push(
      "The court could not be re-read on this load, so what is above may be out of date.",
    );
  } else if (performance.performance !== null && performance.error !== null) {
    // The half of a stale matrix that is easy to miss: the *disputes* were re-read and the
    // *draws* were not, so react-query joined a fresh list to draws it already held. A dispute
    // that arrived in that fresh list then has no draws at all, and a cell with no draw is
    // drawn as not drawn — an unread state rendering as a fact about the court. `else`,
    // because a failed dispute read already carries `performance.error` with it and would
    // otherwise say this twice.
    caveats.push(
      "The draws could not be re-read on this load. The matrix above joins the disputes just read to an earlier read of the draws, so a dispute newer than that read has no cells rather than no draws.",
    );
  }

  const titles = disputes.titles;
  if (titles !== undefined && !titles.isLoading && titles.resolved < titles.expected) {
    caveats.push(
      `${titles.expected - titles.resolved} of ${titles.expected} dispute titles did not come back from the template subgraph, so those rows are identified by their dispute ID alone.`,
    );
  }

  // `isResolving` as well as `isResolvedFromEns`: the flag is false while the mainnet lookup is
  // still out, and a footer that said ENS had failed for the length of every cold load would be
  // asserting a failure that has not happened and then retracting it.
  if (!roster.isResolving && !roster.isResolvedFromEns) {
    caveats.push(
      "ENS could not be reached, so every nickname above is the one held in this repository and no avatar is shown.",
    );
  }

  const lonePanels = performance.performance?.totals.lonePanelDisputes ?? [];
  if (lonePanels.length > 0) {
    caveats.push(
      `${lonePanels.length === 1 ? "Dispute" : "Disputes"} ${lonePanels.join(", ")} ${lonePanels.length === 1 ? "was" : "were"} decided by a panel of one, where coherence is tautological. Counted above, and marked wherever counted.`,
    );
  }

  // Every figure above is measured from a period, so any of them that ran under a window the
  // court has since changed has to disclose it here as well as on its row — the totals and the
  // latency strip are court-wide, and neither of them has a row to carry a marker on.
  for (const change of measured?.totals.changedWindows ?? []) {
    caveats.push(
      `${change.disputes.length === 1 ? "Dispute" : "Disputes"} ${change.disputes.join(", ")} ran under a commit window of ${formatWindowSeconds(change.windows.commitSeconds)} and a vote window of ${formatWindowSeconds(change.windows.voteSeconds)}, which the court has since changed. Counted above, and marked wherever counted.`,
    );
  }

  // And the disputes the history could not place, which the marker's *absence* would otherwise
  // pass off as a match. Gated on `current`, because while the history is unread every dispute
  // is unplaced and the caveat above already says so in the right words.
  const unplaced = measured?.totals.unplacedDisputes ?? [];
  if (measured !== null && measured.parameters.current !== null && unplaced.length > 0) {
    caveats.push(
      `The parameter history read on this load does not reach back far enough to place ${unplaced.length === 1 ? "dispute" : "disputes"} ${unplaced.join(", ")}, so ${unplaced.length === 1 ? "its figures are" : "their figures are"} unmarked for want of anything to compare against rather than for having matched the court's current windows.`,
    );
  }

  // Only where the strip is on the page. Below the breakpoint it is not, and a footer stating the
  // provenance of something the reader cannot see is worse than one that says nothing: this page
  // may be cited, and the sentence would send a reader looking for a band that is not there.
  //
  // Ticket 16 wrote that the strip was the only element this view drops whose absence changes
  // what the footer may claim. Merging ticket 10 made that false in the same commit that made it
  // matter: the card layout drops the column headers too, and ticket 10 had just put two figures
  // in them. So the same gate is on the three payout caveats below, for the same reason and not
  // a weaker one — the difference is only that the band was never a read and the payouts were.
  if (!narrow) {
    caveats.push(
      "The comparison band on the latency strip is illustrative and measures no court; it is the only thing above that did not come from a read.",
    );
  }
  // Retired by ticket 10, which read them. It said "Cumulative ETH and PNK rewards per agent
  // juror have not been read at all" — the last "not read" claim this view made about itself —
  // and leaving it above the figures would be the same falsehood in the other direction.
  //
  // What replaces it is not a second version of the same absence but the one thing a reader
  // cannot see from the figures: what they are summed over. A shift is written when the court
  // **executes** a dispute, which is a later transaction than ruling it, so a dispute counted in
  // the coherence figure one line above may legitimately contribute nothing to these two. That
  // is a lag and not a shortfall, which is why it is stated here in the affirmative rather than
  // counted as a read that came up short.
  //
  // Gated on `short` as well as on `read`, because a read that came back short has no business
  // saying what it covers: the banner owns that one, and the column headers say "Not read" where
  // the figures belong. And on `!narrow`, because "these two lag the rest of this page" names two
  // figures that are not on a phone at all.
  if (!narrow && measured?.rewards.read === true && !measured.rewards.short) {
    caveats.push(
      `Cumulative ETH and net PNK are summed over the ${measured.rewards.paidDraws} draws the court has executed and paid out. A dispute it has ruled but not yet executed is counted in the coherence figures above and in neither reward figure, so these two lag the rest of this page rather than disagreeing with it.`,
    );
  }

  // The half of that story the figures actively cannot express, said only when it is true. Court
  // 34 has a WETH fee token registered and has never paid in it; if it ever does, an agent juror
  // will have earned something no ETH figure here carries, and reading as though it earned less
  // is the failure this page cannot afford.
  // `!narrow` for the third time: this one says "the ETH shown for those agent jurors", and on a
  // phone none is shown. A reader sent looking for a figure that is not on the page is the fault
  // ticket 16's own review caught in the commit-shortfall notice.
  const feeTokenDraws = measured?.rewards.feeTokenDraws ?? 0;
  if (!narrow && feeTokenDraws > 0) {
    caveats.push(
      `${feeTokenDraws} ${feeTokenDraws === 1 ? "draw was" : "draws were"} paid in a fee token rather than in ETH, and no figure above carries that value. The ETH shown for those agent jurors is therefore less than what they were paid.`,
    );
  }

  // And the in-flight half, on the terms every other read here is stated on: the failed half is
  // the banner's, and saying it twice would make one outage two voices.
  // "…is shown yet" promises a figure that is coming. On a phone none is coming, because this
  // layout has nowhere to put one — so the promise is the misleading half rather than the wait.
  if (!narrow && measured !== null && !measured.rewards.read && performance.rewardsError === null) {
    caveats.push(
      "The court's payouts are still being read, so no cumulative ETH or PNK figure is shown yet.",
    );
  }

  // Announced here and nowhere else on this view, which is why it belongs in the footer at all.
  // A shortfall in the log scan is stated above the grid, where the figures it affects are, and
  // repeating it here would make the footer a second voice for one failure. This is the other
  // state: the scan has not come back, so every commit slot reads a dash and the page would
  // otherwise be claiming a third measure while showing a column of nothing.
  //
  // Two states and not one. `commitCoverage.read` is false while Arbitrum is being asked *and*
  // after it refused, so wording keyed on that flag alone would say "still being read" about a
  // read that gave up — the trap `CLAUDE.md` records against `RosterView`, where a caveat that
  // comes and goes teaches a reader to ignore caveats. The error is the other half.
  //
  // Only the in-flight half reaches the footer. Ticket 08 wrote both halves here because the
  // footer was then the only place either could be said; ticket 13's banner now owns the
  // failure, and the footer stating it too would make one outage three voices — banner, the
  // slots beside the figures, and this. That is the repetition ticket 15 left a test for, and
  // a reader who meets the same sentence twice stops reading either.
  if (measured !== null && !measured.commitCoverage.read && performance.commitError === null) {
    caveats.push(
      "The commitments are still being read from Arbitrum, which is a separate and slower source than the subgraph, so no commit latency is shown yet.",
    );
  }

  // The same pair for the court's own parameter history, and the same reason for splitting it.
  // What is missing when this read is out is not a figure but the note saying which figures
  // are not comparable with which — an absence a reader would otherwise take for its opposite.
  //
  // Keyed on `current` rather than on `read`, which makes it three states and not two. A scan
  // that comes back *empty* is `read: true` with no configuration in it, and a court that has
  // certainly been configured at least once returning none of them is a read that came back
  // short — the shape `CLAUDE.md` warns about for every read by id, in its chain form. Keying
  // on `read` alone would leave that one case saying nothing at all.
  if (measured !== null && measured.parameters.current === null) {
    // In flight only, for the reason the commit caveat above is: the failed half is the
    // banner's. The short-read case below is not a failure — every endpoint answered — so it
    // has no banner to be repeated from and stays here.
    if (!measured.parameters.read) {
      if (performance.parametersError === null) {
        caveats.push(
          "The court's period durations are still being read from its own parameter history on Arbitrum, so no dispute above is yet marked as having run under earlier ones.",
        );
      }
    } else {
      caveats.push(
        "Arbitrum returned no parameter history for court 34, which cannot be right for a court that has held disputes — so this read came back short. No dispute above is marked as having run under earlier period durations, and that is an unread state rather than a finding.",
      );
    }
  }

  return {
    // What the record is depends on what came back: naming commit latency as measured while the
    // log scan is still out would describe a column the reader cannot see.
    measures: measured?.commitCoverage.read
      ? "Commit latency, reveal latency and coherence are the measured record here: how long each agent juror took to commit after the commit period opened, how long it took to reveal after the vote period opened, and whether that vote matched the dispute's final ruling. Each latency is measured from its own period."
      : "Reveal latency and coherence are the measured record here: how long each agent juror took to reveal after the vote period opened, and whether that vote matched the dispute's final ruling.",
    read: rangeOf(disputes.disputes.map((dispute) => dispute.id)),
    readAt: disputes.readAt,
    caveats,
    identifiesAgentJurors: true,
  };
}

export function MatrixPage(props: MatrixPageProps) {
  const { roster, disputes, performance } = props;
  const measured = performance.performance;
  const core = coreFailureOf(props);
  const failures = failuresOf(props, core);
  // Below the breakpoint the matrix is not rendered at all — not scaled, not scrolled sideways,
  // not transposed into a narrower grid. `DisputeCards` replaces it, and only one of the two is
  // ever in the DOM: a `display: none` table is still 168 cells of it on the device least able
  // to afford them, and still there in a page a reader saves or prints.
  const isNarrow = useIsNarrow();
  // Asked of the core subgraph specifically, because that is the only source the tiles and the
  // strip read: disputes, draws, votes and reveal latency all come from it, and none of them
  // touches the template subgraph or Arbitrum. Labelling them partial over a missing title would
  // be a caveat that is simply false — and a reader who checks one and finds it baseless stops
  // checking the ones that are not.
  //
  // `costsTiles` narrows it once more, because ticket 10 added the first core-subgraph failure
  // that leaves these figures whole: the payouts feed two rows of each column header and
  // nothing above the matrix at all. `affects` is per source and cannot tell two of one
  // deployment's queries apart, so the exception is made here, where what the tiles are figures
  // of is actually known. Offline still counts against everything — nothing is being read.
  const partial =
    failures.offline || (affects(failures, SOURCES.core) && core?.costsTiles === true);

  return (
    <View provenance={provenanceOf(props, isNarrow)} failures={failures}>
      <Hero narrow={isNarrow} />
      <StatTiles
        totals={measured?.totals ?? null}
        current={measured?.parameters.current ?? null}
        partial={partial}
        narrow={isNarrow}
      />
      {/* Absent below the breakpoint, and no measured figure leaves the page with it: the
          strip's headline figure is the median reveal, which the tiles now lead with, and its
          comparison band is illustrative by its own caption rather than a reading of any
          court. The caveat naming that band goes with it — see `provenanceOf`. */}
      {!isNarrow && (
        <LatencyStrip latency={measured?.totals.revealLatency ?? null} partial={partial} />
      )}

      {/* This text narrows as each measurement lands: it claimed no dispute had been
            read until ticket 03 read them, and it claimed nothing was measured until
            ticket 05 measured two things. What it must keep doing is say what has *not*
            been read, on a public page that may be cited — an absence a reader has to
            infer is one they will infer wrongly. Ticket 15 replaced the chrome around it
            and deliberately did not replace this.

            Which is also why it has two forms. Describing cells and coherence above a
            page that is showing neither, because the read failed, would be the same
            mistake in the other direction. */}
      <Caveat role="status">
        {measured ? (
          <>
            <CaveatTitle>Three measures, and what is missing from them</CaveatTitle>
            <CaveatBody>
              This page measures how long each agent juror took to commit its vote after the commit
              period opened, how long it took to reveal that vote after the vote period opened, and
              whether the vote matched the dispute's final ruling. Each latency is measured from its
              own period, so the reveal figure is not the time since the commit.{" "}
              {/* The column headers are the grid's furniture and the phone's card list has none —
                  and a blank is a cell there and a slot here. Ticket 16's whole point was that the
                  two layouts must not say different things about one court; a caveat card
                  describing furniture the reader cannot see is that fault in the other
                  direction.

                  The reward clause rides the desktop branch alone, for the same reason and not a
                  different one. Ticket 10 put cumulative ETH and net PNK in the column header, and
                  this layout drops that header whole, along with the four marginals beside them —
                  so naming the two sums here would credit the phone with figures it does not
                  carry. Saying instead that they have not been read would be ticket 10's retired
                  falsehood in reverse: they were read, and a desktop reader is looking at them.
                  Neither claim is available, so the phone makes none. */}
              {isNarrow
                ? "Each card summarises one dispute, and each slot along its foot one agent juror's draw."
                : "Each column header summarises that agent juror's own draws in the same three measures, and states what that column has been paid: cumulative ETH and net PNK, which are context beside the measures rather than a fourth dimension anyone is ranked on."}{" "}
              No figure here is a fraction of a period's window. Coherence is asserted only where
              the court has ruled, a blank {isNarrow ? "slot" : "cell"} means an agent juror was not
              drawn rather than that it failed to act, and a dispute decided by a panel of one is
              marked wherever it is counted.
            </CaveatBody>
          </>
        ) : (
          <>
            <CaveatTitle>Nothing measured on this load</CaveatTitle>
            <CaveatBody>
              This page measures how long each agent juror took to commit its vote, how long it took
              to reveal it, and whether that vote matched the dispute's final ruling — but not on
              this load: what it needed could not be read, and it shows what it did read rather than
              a matrix built from part of it. Nothing below is a latency, a coherence or a draw.
            </CaveatBody>
          </>
        )}
      </Caveat>

      {measured ? (
        <>
          {/* The matrix is built from rows already held while a refetch fails, which is the
              right behaviour — and it must say so, or a court read an hour ago renders as the
              complete record. Ticket 13 replaces this with the designed failure state.

              `performance.error` as well as `disputes.error`: either read can be the stale half,
              and a matrix whose draws are an hour older than its disputes is exactly as
              misleading as one whose disputes are stale — more so, because the rows look
              current and the cells are the ones that are missing. */}
          {(disputes.error !== null || performance.error !== null) && (
            // Rose, not the amber it was: this is a read that cost figures, and the banner above
            // says so in the same colour. The two are the ticket's "twice" — once at the top of
            // the page, once where the missing figures are.
            <Notice $tone="rose" role="status">
              The court could not be re-read, so{" "}
              {isNarrow ? "these cards may be" : "this matrix may be"} incomplete or out of date.
              Nothing here should be taken as the full record.
            </Notice>
          )}
          {/* The window footnote moved inside the matrix with ticket 08, where the artboard
              puts it and where the ‡ footnote already was: it is now read from the court's own
              parameter history rather than written from what was true when ticket 15 landed. */}
          {isNarrow ? (
            <DisputeCards performance={measured} roster={roster} slotsFor={disputes.slotsFor} />
          ) : (
            <Matrix performance={measured} roster={roster} slotsFor={disputes.slotsFor} />
          )}
        </>
      ) : (
        <>
          {!performance.isLoading && (
            // Deliberately not "the draws could not be read": the matrix is also absent when
            // the dispute read failed, and when the seam rejected the payload it was given.
            <Notice $tone="rose" role="status">
              The matrix could not be built from what was read, so it is not shown. Below is the
              record of which disputes the court has held — no latency, coherence or draw has been
              measured from it.
            </Notice>
          )}
          <DisputeList {...disputes} />
        </>
      )}
    </View>
  );
}
