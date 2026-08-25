import { Link } from "react-router";
import styled from "styled-components";
import { Hero } from "../chrome/Hero";
import type { Provenance } from "../chrome/provenance";
import { rangeOf } from "../chrome/provenance";
import { StatTiles } from "../chrome/StatTiles";
import { View } from "../chrome/View";
import { DisputeList } from "../disputes/DisputeList";
import type { DisputesView } from "../disputes/useDisputes";
import { LatencyStrip } from "../performance/LatencyStrip";
import { Matrix } from "../performance/Matrix";
import type { CourtPerformanceView } from "../performance/useCourtPerformance";
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

/* The plain notice a partial read gets until ticket 13 replaces it with the designed failure
   state. Amber, because the page is degraded rather than broken: the record is still there. */
const Notice = styled.p`
  max-width: 68ch;
  padding: ${({ theme }) => `${theme.space5} ${theme.space6}`};
  border: 1px solid ${({ theme }) => theme.lineAmber};
  border-radius: ${({ theme }) => theme.radiusTile};
  background-color: ${({ theme }) => theme.washAmber};
  font: ${({ theme }) => theme.typeBodySm};
  color: ${({ theme }) => theme.textBody};
`;

/**
 * The footnote under the matrix.
 *
 * Court 34's period durations changed between disputes 151 and 152, which is a fact about
 * every figure above it, and the account of what that means belongs on the method page rather
 * than in a footnote that would have to be written twice. Ticket 08 writes that section; until
 * it does, the section says so rather than being an empty anchor to arrive at.
 */
const Footnote = styled.p`
  max-width: 90ch;
  font: ${({ theme }) => theme.typeBodySm};
  /* It names two dispute ids, and the shorthand above resets the tabular figures. */
  font-feature-settings: ${({ theme }) => theme.featureNumeric};
  color: ${({ theme }) => theme.textMeta};

  a {
    color: ${({ theme }) => theme.accent};
  }
`;

export type MatrixPageProps = {
  roster: RosterView;
  disputes: DisputesView;
  performance: CourtPerformanceView;
};

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

  caveats.push(
    "The comparison band on the latency strip is illustrative and measures no court; it is the only thing above that did not come from a read.",
  );
  caveats.push(
    "Per-agent-juror summaries, rewards and the court's historical period durations have not been read at all.",
  );

  // Announced here and nowhere else on this view, which is why it belongs in the footer at all.
  // A shortfall in the log scan is stated above the grid, where the figures it affects are, and
  // repeating it here would make the footer a second voice for one failure. This is the other
  // state: the scan has not come back, so every commit slot reads a dash and the page would
  // otherwise be claiming a third measure while showing a column of nothing. It is provenance
  // about a read still in flight, not a failure — the wording has to keep that difference.
  if (measured !== null && !measured.commitCoverage.read) {
    caveats.push(
      "The commitments are still being read from Arbitrum, which is a separate and slower source than the subgraph, so no commit latency is shown yet.",
    );
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

  return (
    <View provenance={provenanceOf(props)}>
      <Hero />
      <StatTiles totals={measured?.totals ?? null} />
      <LatencyStrip latency={measured?.totals.revealLatency ?? null} />

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
              own period, so the reveal figure is not the time since the commit. It measures nothing
              else yet: per-agent-juror summaries and rewards have not been read, and no figure here
              is a fraction of a period's window. Coherence is asserted only where the court has
              ruled, a blank cell means an agent juror was not drawn rather than that it failed to
              act, and a dispute decided by a panel of one is marked wherever it is counted.
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
            <Notice role="status">
              The court could not be re-read, so this matrix may be incomplete or out of date.
              Nothing here should be taken as the full record.
            </Notice>
          )}
          <Matrix performance={measured} roster={roster} slotsFor={disputes.slotsFor} />
          <Footnote>
            Court 34's period durations changed between disputes 151 and 152, so a figure above
            cannot be read as a fraction of the window it ran in.{" "}
            <Link to="/method#window">What that means for these figures</Link>.
          </Footnote>
        </>
      ) : (
        <>
          {!performance.isLoading && (
            // Deliberately not "the draws could not be read": the matrix is also absent when
            // the dispute read failed, and when the seam rejected the payload it was given.
            <Notice role="status">
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
