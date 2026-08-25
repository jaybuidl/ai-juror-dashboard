import styled from "styled-components";
import { DisputeList, type DisputeListView } from "./disputes/DisputeList";
import { Matrix } from "./performance/Matrix";
import type { CourtPerformanceView } from "./performance/useCourtPerformance";
import { Roster } from "./roster/Roster";
import type { RosterView } from "./roster/useRoster";

const Page = styled.div`
  display: flex;
  flex-direction: column;
  gap: ${({ theme }) => theme.space11};
  min-height: 100dvh;
  margin: 0 auto;
  padding: ${({ theme }) => `${theme.space11} ${theme.gutter} ${theme.space9}`};
  max-width: ${({ theme }) => theme.container};

  @media (max-width: 600px) {
    gap: ${({ theme }) => theme.space9};
    padding: ${({ theme }) => `${theme.space9} ${theme.gutter} ${theme.space8}`};
  }
`;

const Header = styled.header`
  display: flex;
  flex-direction: column;
  gap: ${({ theme }) => theme.space5};
`;

const Title = styled.h1`
  font: ${({ theme }) => theme.typeDisplay2};
  letter-spacing: ${({ theme }) => theme.trackingDisplay};
  color: ${({ theme }) => theme.textHeading};
`;

const Tagline = styled.p`
  max-width: 62ch;
  font: ${({ theme }) => theme.typeBodyLg};
  color: ${({ theme }) => theme.textBody};
`;

const Main = styled.main`
  display: flex;
  flex: 1;
  flex-direction: column;
  gap: ${({ theme }) => theme.space10};
`;

/* The system's card: a lighter ink than the page, a hairline, and an inset top highlight
   instead of a drop shadow. Solid rather than dashed — the design system draws an absence of
   data as a quiet card, not as a placeholder outline. */
const EmptyState = styled.section`
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

const EmptyStateTitle = styled.h2`
  font: ${({ theme }) => theme.typeTitle1};
  letter-spacing: ${({ theme }) => theme.trackingTitle};
  color: ${({ theme }) => theme.textHeading};
`;

const EmptyStateBody = styled.p`
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

const Footer = styled.footer`
  padding-top: ${({ theme }) => theme.space8};
  border-top: ${({ theme }) => theme.borderHairline};
  font: ${({ theme }) => theme.typeBodySm};
  color: ${({ theme }) => theme.textMeta};
`;

export function Dashboard({
  roster,
  disputes,
  performance,
}: {
  roster: RosterView;
  disputes: DisputeListView;
  performance: CourtPerformanceView;
}) {
  const measured = performance.performance;

  return (
    <Page>
      <Header>
        <Title>AI Juror Dashboard</Title>
        <Tagline>
          How fast six AI agent jurors act, and how often they vote with the final ruling, in Kleros
          v2 court 34 on Arbitrum One.
        </Tagline>
      </Header>

      <Main>
        {/* This text narrows as each measurement lands: it claimed no dispute had been
              read until ticket 03 read them, and it claimed nothing was measured until
              ticket 05 measured two things. What it must keep doing is say what has *not*
              been read, on a public page that may be cited — an absence a reader has to
              infer is one they will infer wrongly.

              Which is also why it has two forms. Describing cells and coherence above a
              page that is showing neither, because the read failed, would be the same
              mistake in the other direction. */}
        <EmptyState role="status">
          {measured ? (
            <>
              <EmptyStateTitle>Two measures, and what is missing from them</EmptyStateTitle>
              <EmptyStateBody>
                This page measures how long each agent juror took to reveal its vote, and whether
                that vote matched the dispute's final ruling. It measures nothing else yet: commit
                latency, per-agent-juror summaries and rewards have not been read, and no figure
                here is a fraction of a period's window. Coherence is asserted only where the court
                has ruled, a blank cell means an agent juror was not drawn rather than that it
                failed to act, and a dispute decided by a panel of one is marked wherever it is
                counted.
              </EmptyStateBody>
            </>
          ) : (
            <>
              <EmptyStateTitle>Nothing measured on this load</EmptyStateTitle>
              <EmptyStateBody>
                This page measures how long each agent juror took to reveal its vote and whether
                that vote matched the dispute's final ruling — but not on this load: what it needed
                could not be read, and it shows what it did read rather than a matrix built from
                part of it. Nothing below is a latency, a coherence or a draw.
              </EmptyStateBody>
            </>
          )}
        </EmptyState>

        <Roster {...roster} />

        {measured ? (
          <>
            {/* The matrix is built from rows already held while a refetch fails, which is the
                right behaviour — and it must say so, or a court read an hour ago renders as the
                complete record. Ticket 13 replaces this with the designed failure state. */}
            {disputes.error !== null && (
              <Notice role="status">
                The court could not be re-read, so this matrix may be incomplete or out of date.
                Nothing here should be taken as the full record.
              </Notice>
            )}
            <Matrix performance={measured} roster={roster} slotsFor={disputes.slotsFor} />
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
      </Main>

      <Footer>
        Read-only. This dashboard observes and reports; it never votes, stakes, holds a key, or
        connects a wallet.
      </Footer>
    </Page>
  );
}
