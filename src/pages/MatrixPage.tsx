import styled from "styled-components";
import { comparisonFailureOf } from "../chrome/comparison";
import { Notice } from "../chrome/Failure";
import { affects, type Failures, olderOf, present } from "../chrome/failures";
import { Hero } from "../chrome/Hero";
import { StatTiles } from "../chrome/StatTiles";
import { useDocumentTitle } from "../chrome/title";
import { View } from "../chrome/View";
import { DisputeList } from "../disputes/DisputeList";
import type { DisputesView } from "../disputes/useDisputes";
import { arbitrumSource } from "../performance/arbitrum";
import { CourtAnnouncer } from "../performance/CourtAnnouncer";
import { DisputeCards } from "../performance/DisputeCards";
import { Matrix } from "../performance/Matrix";
import { comparisonOf } from "../performance/reference";
import { TimeToAppealStrip } from "../performance/TimeToAppealStrip";
import type { CourtPerformanceView } from "../performance/useCourtPerformance";
import { type FailedRead, failureOf, SOURCES } from "../read-failure";
import { ensFallbackOf } from "../roster/ens-fallback";
import type { RosterView } from "../roster/useRoster";
import { narrow, useIsNarrow } from "../styles/breakpoints";

/**
 * The landing view: the hero, what the court amounts to, and the matrix itself.
 *
 * Built against `canvas/Main.dc.html`, which lays out exactly this order — nav, hero and
 * tiles, the strip, then the grid. The artboard's strip plots reveal latency; this one plots
 * time to appeal in the same form, by the maintainer's ruling of 2026-09-24. The roster does not
 * appear on that artboard and no longer appears here either: the agent jurors are the matrix's column headers, and they have an index
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
 * median time to appeal entirely whole. Labelling them "Partial" anyway is ticket 13's own first-cut
 * mistake at a finer grain, and `CLAUDE.md` is blunt about the cost: a caveat a reader checks and
 * finds baseless is one that teaches them to stop checking.
 */
type CoreFailure = {
  read: FailedRead;
  /** Whether this failure is one the stat tiles and the strip are short because of. */
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
  // where those cost the matrix itself. It costs less still on the two renderings that carry
  // neither of those figures — the phone's card list and, since ticket 17, the compact density —
  // so the ordering holds a fortiori rather than needing a case of its own.
  //
  // It ranks **above** the stale read below, though, and that ordering is load-bearing rather
  // than aesthetic. This is the only entry here with no second voice: a failed payout read
  // leaves both slots showing a pending dash, which is exactly what a column that was never
  // drawn shows, so the banner is the only place it can be said. The stale read has two of its
  // own — every affected row carries a `?` flag and draws its cells as Unknown. Ranked the other
  // way round, a page with both would say nothing at all about the payouts: the banner would be
  // occupied and nothing else on the page names the payouts' failure. That is "a read that fails
  // is said exactly twice" coming out as zero.
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
  // That second voice is the *comfortable* desktop's, and only that one: it is the single
  // rendering of the three that still prints these two figures, so it is the only one whose
  // header can say "Not read" about them. Below the breakpoint there are no column headers and no
  // payout figure at all, so on a phone this banner is the only voice for it. Ticket 16 left the
  // tier open on those grounds — a failure that costs a figure nobody was shown. Ticket 11
  // settles it and the tier stands: the two sums now have a phone home on each agent juror's own
  // view, which renders them at every width, so a phone reader who follows a nickname from
  // `/agent-jurors` does lose a figure to this failure. It is one link away rather than on this
  // page, and a banner that went quiet would leave them to find that out by arriving.
  //
  // Ticket 17's compact density is the same case a second time and takes the same answer. Past
  // forty disputes the column header keeps three of its six figures, so these two leave this page
  // exactly as they leave the phone — and they are reachable exactly as they are from the phone,
  // on the agent juror view, which has one density and prints all six. What both readers lose is
  // the figure on *this* page, which is why the wording above says "below" rather than naming the
  // column headers: that half is ticket 16's, and it holds at either density.
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

  // Ticket 23's comparison court, read from this same deployment. Last because it costs the
  // least: where the comparison band begins, and no figure of court 34's. It is the loud tier
  // all the same, because since that ticket the band *is* a figure, the one the page's whole
  // speed comparison is drawn against. The band's own place on the plot says it is missing,
  // which makes the banner the second voice and not the only one. On a phone there is no strip on
  // this page, and it still stands for the reason the payouts' does: the agent juror view draws
  // the band at every width, one link away.
  const comparison = comparisonFailureOf(performance.reference, performance.referenceError);
  return comparison === null ? null : { read: comparison, costsTiles: false };
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
    // The matrix's column headers carry the same nicknames and the same avatars the roster does —
    // one of each per entry, counted off `ROSTER.length` and never written down — so this view
    // falls back exactly as `/agent-jurors` does and has to say so in the same words. Before ticket 13 it said nothing: the panel lived inside `Roster`, and
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

export function MatrixPage(props: MatrixPageProps) {
  // null: the matrix is what this dashboard is, not a section of it.
  useDocumentTitle(null);
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
  // strip read: disputes, draws, votes and time to appeal all come from it, and none of them
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
    // measure="grid" and not "wide": this is the one view whose content has a measurement of its
    // own — a 440px row header and a 148px column per agent juror — and at "wide" the page gave it
    // 1104px, so it scrolled sideways in its own box on every desktop. The width follows the
    // roster rather than a column count written down here, which is what stops this comment from
    // going stale the next time one joins. Unconditional because below the narrow breakpoint the
    // grid is not rendered at all and a max-width above the viewport costs the card list nothing.
    <View failures={failures} measure="grid">
      {/* First in the view and empty almost always. It says what moved between two reads of a
          court that re-reads itself every five seconds, so a reader who cannot see a cell change
          is told that one did. It never contains a figure — see the component. */}
      <CourtAnnouncer performance={measured ?? null} readAt={props.performance.readAt} />
      <Hero narrow={isNarrow} />
      <StatTiles totals={measured?.totals ?? null} partial={partial} narrow={isNarrow} />
      {/* Absent below the breakpoint, and no measured figure leaves the page with it: the
          strip's headline figure is the median time to appeal, which the tiles lead with. Its
          comparison band is a reading of another court since ticket 23, and the agent juror view
          draws the same band at every width, so the phone loses it here and not everywhere.

          The provenance footer that once said what the band rests on was removed with all its
          footer-only caveats (maintainer's ruling, 2026-09-24); /method describes the band. */}
      {!isNarrow && (
        <TimeToAppealStrip
          timeToAppeal={measured?.totals.timeToAppeal ?? null}
          comparison={comparisonOf(performance.reference, performance.referenceError)}
          partial={partial}
        />
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
      {/* Not a live region, and it was one until ticket 18. `role="status"` means "this is news",
          and it carries `aria-atomic` with it — so a hundred and twenty words of standing
          explanation were registered as a status message, announced on every load, and announced
          again in full whenever any branch inside flipped: the first read landing, the viewport
          crossing the narrow breakpoint, the court crossing into the compact density. A live
          region is for content that changes. This is furniture, and a reader who meets it as an
          interruption learns to talk over the regions that are not. */}
      {/* Only where nothing was measured. The card that stood here when the read *had* succeeded
          was titled "Three measures, and what is missing from them", and every one of its claims
          was the method page's said a second time — what the three measures are, that each latency
          is measured from its own period, that no figure is a fraction of a window, that coherence
          is asserted only where the court has ruled, that a blank means not drawn, that a lone
          panel is marked wherever counted, and that the two reward sums are context rather than a
          rank. Checked claim by claim against /method before it went, including the appeal-period
          case, which that page puts better than this card did: a majority read off a dispute with
          every vote in and no ruling would be a prediction.

          The window, off-roster and lone-panel accounts that stayed on this page as footnotes
          below the grid were removed on 2026-09-24 (maintainer's ruling); /method keeps them.

          This branch is not that card and does not go with it. A page that measured nothing must
          say so where the measurements would have been — a reader who is shown an empty matrix and
          no explanation concludes the court is empty. */}
      {measured === undefined || measured === null ? (
        <Caveat>
          <CaveatTitle>Nothing measured on this load</CaveatTitle>
          <CaveatBody>
            This page measures how long each agent juror took to commit its vote, how long it took
            to reveal it, and whether that vote matched the dispute's final ruling — but not on this
            load: what it needed could not be read, and it shows what it did read rather than a
            matrix built from part of it. Nothing below is a latency, a coherence or a draw.
          </CaveatBody>
        </Caveat>
      ) : null}

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
