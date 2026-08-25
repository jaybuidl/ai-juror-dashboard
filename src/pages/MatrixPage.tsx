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
import { LatencyStrip } from "../performance/LatencyStrip";
import { formatWindowSeconds } from "../performance/latency";
import { Matrix } from "../performance/Matrix";
import type { CourtPerformanceView } from "../performance/useCourtPerformance";
import { type FailedRead, failureOf, SOURCES } from "../read-failure";
import { ensFallbackOf } from "../roster/ens-fallback";
import type { RosterView } from "../roster/useRoster";

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
     together were eating close to a third of the width. */
  @media (max-width: 600px) {
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
 */
function coreFailureOf({
  disputes,
  performance,
}: Pick<MatrixPageProps, "disputes" | "performance">): FailedRead | null {
  const measured = performance.performance;

  if (disputes.error !== null) {
    return failureOf(
      disputes.error,
      SOURCES.core,
      "The court's disputes could not be read, so what is below is whatever was already held rather than the court as it stands.",
    );
  }

  // Not a network failure, and it must not be worded as one: every endpoint answered, and what
  // came back was something this dashboard could not believe. Wording it as an outage would send
  // a reader to check a service that is up. The code and the offending draw are the whole content
  // of that distinction, and until ticket 13 `useCourtPerformance` flattened both into a sentence
  // because nothing above it could show more.
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
      measured === null
        ? "The draws could not be read, so no latency and no coherence on this page was measured on this load."
        : "The draws could not be re-read, so the matrix below joins the disputes just read to an earlier read of the draws.",
    );
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
      source: SOURCES.core,
      status: "Stale read",
      what: `${unread.length === 1 ? "Dispute" : "Disputes"} ${unread.join(", ")} ${unread.length === 1 ? "was" : "were"} created after the draws on this page were last read, so ${unread.length === 1 ? "its" : "their"} draws are unknown rather than absent.`,
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

  if (performance.commitError !== null) {
    return failureOf(
      performance.commitError,
      SOURCES.arbitrum,
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
      source: SOURCES.arbitrum,
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
      SOURCES.arbitrum,
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
function failuresOf({ roster, disputes, performance }: MatrixPageProps): Failures {
  const titles = disputes.titles;
  const missingTitles =
    titles === undefined || titles.isLoading ? 0 : titles.expected - titles.resolved;

  return {
    blocking: present(
      coreFailureOf({ disputes, performance }),
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
function provenanceOf({ roster, disputes, performance }: MatrixPageProps): Provenance {
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

  caveats.push(
    "The comparison band on the latency strip is illustrative and measures no court; it is the only thing above that did not come from a read.",
  );
  // Narrowed by ticket 06, which read the summaries: what each agent juror's column header now
  // states is the same three measures aggregated down that column, over the same draws. Rewards
  // are the half that is still unread, and naming the whole list would claim an absence that has
  // stopped being one — the failure this sentence exists to prevent, in reverse.
  caveats.push("Cumulative ETH and PNK rewards per agent juror have not been read at all.");

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
  const failures = failuresOf(props);
  // Asked of the core subgraph specifically, because that is the only source the tiles and the
  // strip read: disputes, draws, votes and reveal latency all come from it, and none of them
  // touches the template subgraph or Arbitrum. Labelling them partial over a missing title would
  // be a caveat that is simply false — and a reader who checks one and finds it baseless stops
  // checking the ones that are not.
  const partial = affects(failures, SOURCES.core);

  return (
    <View provenance={provenanceOf(props)} failures={failures}>
      <Hero />
      <StatTiles
        totals={measured?.totals ?? null}
        current={measured?.parameters.current ?? null}
        partial={partial}
      />
      <LatencyStrip latency={measured?.totals.revealLatency ?? null} partial={partial} />

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
              own period, so the reveal figure is not the time since the commit. Each column header
              summarises that agent juror's own draws in the same three measures. It measures
              nothing else yet: cumulative ETH and PNK rewards have not been read, and no figure
              here is a fraction of a period's window. Coherence is asserted only where the court
              has ruled, a blank cell means an agent juror was not drawn rather than that it failed
              to act, and a dispute decided by a panel of one is marked wherever it is counted.
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
              The court could not be re-read, so this matrix may be incomplete or out of date.
              Nothing here should be taken as the full record.
            </Notice>
          )}
          {/* The window footnote moved inside the matrix with ticket 08, where the artboard
              puts it and where the ‡ footnote already was: it is now read from the court's own
              parameter history rather than written from what was true when ticket 15 landed. */}
          <Matrix performance={measured} roster={roster} slotsFor={disputes.slotsFor} />
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
