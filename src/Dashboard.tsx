import styled from "styled-components";
import { DisputeList, type DisputeListView } from "./disputes/DisputeList";
import { Roster } from "./roster/Roster";
import type { RosterView } from "./roster/useRoster";

const Page = styled.div`
  display: flex;
  flex-direction: column;
  gap: 48px;
  min-height: 100dvh;
  margin: 0 auto;
  padding: 48px 24px 32px;
  max-width: 1120px;

  @media (max-width: 600px) {
    gap: 32px;
    padding: 32px 16px 24px;
  }
`;

const Header = styled.header`
  display: flex;
  flex-direction: column;
  gap: 8px;
`;

const Title = styled.h1`
  margin: 0;
  font-size: clamp(1.75rem, 1.2rem + 2.2vw, 2.75rem);
  font-weight: 600;
  line-height: 1.15;
  letter-spacing: -0.02em;
  color: ${({ theme }) => theme.primaryText};
`;

const Tagline = styled.p`
  margin: 0;
  max-width: 62ch;
  color: ${({ theme }) => theme.secondaryText};
`;

const Main = styled.main`
  display: flex;
  flex: 1;
  flex-direction: column;
  gap: 40px;
`;

const EmptyState = styled.section`
  display: flex;
  flex-direction: column;
  gap: 12px;
  padding: 40px 32px;
  border: 1px dashed ${({ theme }) => theme.stroke};
  border-radius: 12px;
  background-color: ${({ theme }) => theme.whiteBackground};

  /* The card's own padding sits inside the page's, so on a narrow screen the two
     together were eating close to a third of the width. */
  @media (max-width: 600px) {
    padding: 24px 20px;
  }
`;

const EmptyStateTitle = styled.h2`
  margin: 0;
  font-size: 1.25rem;
  font-weight: 600;
  color: ${({ theme }) => theme.lavenderPurple};
`;

const EmptyStateBody = styled.p`
  margin: 0;
  max-width: 68ch;
  color: ${({ theme }) => theme.secondaryText};
`;

const Footer = styled.footer`
  padding-top: 24px;
  border-top: 1px solid ${({ theme }) => theme.stroke};
  font-size: 0.875rem;
  color: ${({ theme }) => theme.secondaryText};
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
