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

function coreFailureOf(
  { disputes, performance }: Pick<MatrixPageProps, "disputes" | "performance">,
  { strip }: { strip: boolean },
): CoreFailure | null {
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
  // above because it costs the least of them: the two reward sums in each column header,
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
  // forty disputes the column header drops the two sums, so they leave this page exactly as they
  // leave the phone — and they are reachable exactly as they are from the phone, on the agent
  // juror view, which has one density and prints every figure. What both readers lose is
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
  // all the same, because since that ticket the band *is* a figure, the one the time to appeal
  // is compared against. The band's own place on the plot says it is missing, which makes the
  // banner the second voice and not the only one.
  //
  // Only where the strip is drawn. On a phone there is no strip, and since ADR-0010 removed the
  // agent juror view's latency plot there is no band anywhere else either, so a failure of this
  // read costs a phone reader nothing and a banner about it would describe nothing on screen.
  if (!strip) return null;
  const comparison = comparisonFailureOf(performance.reference, performance.referenceError);
  return comparison === null ? null : { read: comparison, costsTiles: false };
}

/**
 * What could not be read on this view, in the two tiers ticket 13 defines.
 *
 * The rule, from the ticket and from `Errors.dc.html`'s own rule panel: a failure that changes a
 * number is loud, a failure that changes only a label is quiet, and ENS is the single documented
 * exception. That puts the core subgraph and the template subgraph in `blocking` and the mainnet
 * endpoint in `degraded`. Arbitrum was loud here too until nothing on this page read from it.
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
      // Nothing from Arbitrum, though this page used to raise both of its reads. The parameter
      // history fed only the † row marker, removed on 2026-09-24; the commit scan fed the cells'
      // commit figures, removed by ADR-0011. A banner about either would describe nothing on
      // screen. The agent juror view still raises the scan, and the dispute view the history.
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
  // Below the breakpoint the matrix is not rendered at all — not scaled, not scrolled sideways,
  // not transposed into a narrower grid. `DisputeCards` replaces it, and only one of the two is
  // ever in the DOM: a `display: none` table is still 168 cells of it on the device least able
  // to afford them, and still there in a page a reader saves or prints.
  const isNarrow = useIsNarrow();
  const core = coreFailureOf(props, { strip: !isNarrow });
  const failures = failuresOf(props, core);
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
          comparison band is a reading of another court since ticket 23, and a phone does not
          see it anywhere: the agent juror view's plot that also drew it went with ADR-0010.

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
            This page measures how long the court took to bring each dispute to appeal, and whether
            each agent juror voted with the dispute's final ruling — but not on this load: what it
            needed could not be read, and it shows what it did read rather than a matrix built from
            part of it. Nothing below is a latency, a coherence or a draw.
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
