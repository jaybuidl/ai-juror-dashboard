import styled from "styled-components";
import { DisputeList, type DisputeListView } from "./disputes/DisputeList";
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

const Footer = styled.footer`
  padding-top: ${({ theme }) => theme.space8};
  border-top: ${({ theme }) => theme.borderHairline};
  font: ${({ theme }) => theme.typeBodySm};
  color: ${({ theme }) => theme.textMeta};
`;

export function Dashboard({ roster, disputes }: { roster: RosterView; disputes: DisputeListView }) {
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
        {/* The page now shows who the agent jurors are and which disputes the court has
              held, which is exactly the point at which it could start to read as a
              result. Both are records, not measurements, and on a public page that may
              be cited it has to say so itself rather than leave an absence to be
              interpreted. This text narrows as each measurement lands — it claimed no
              dispute had been read until ticket 03 read them. */}
        <EmptyState role="status">
          <EmptyStateTitle>Nothing measured yet</EmptyStateTitle>
          <EmptyStateBody>
            Below are two records, and no measurement: who the six agent jurors are, and which
            disputes court 34 has held. No draw, latency or coherence figure has been read, so none
            appears — an agent juror shown here is not thereby reported as fast, slow, coherent or
            incoherent, and no dispute is reported as anything beyond its own state. Nothing on this
            page should be taken as a result.
          </EmptyStateBody>
        </EmptyState>

        <Roster {...roster} />

        <DisputeList {...disputes} />
      </Main>

      <Footer>
        Read-only. This dashboard observes and reports; it never votes, stakes, holds a key, or
        connects a wallet.
      </Footer>
    </Page>
  );
}
