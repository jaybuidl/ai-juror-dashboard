import styled, { ThemeProvider } from "styled-components";
import { GlobalStyle } from "./styles/global";
import { theme } from "./styles/theme";

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
  flex: 1;
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

export function App() {
  return (
    <ThemeProvider theme={theme}>
      <GlobalStyle />
      <Page>
        <Header>
          <Title>AI Juror Dashboard</Title>
          <Tagline>
            How fast six AI agent jurors act, and how often they vote with the final ruling, in
            Kleros v2 court 34 on Arbitrum One.
          </Tagline>
        </Header>

        <Main>
          {/* The deployment is public from this ticket onward, so the shell has to say
              outright that it holds no measurements. A public page whose numbers may be
              cited must never let an unbuilt state read as an empty result. */}
          <EmptyState role="status">
            <EmptyStateTitle>Nothing measured yet</EmptyStateTitle>
            <EmptyStateBody>
              This is the deployed shell. The data layer is not built, so no dispute, draw, latency
              or coherence figure appears below — not because none were found, but because none have
              been read. Nothing on this page should be taken as a result.
            </EmptyStateBody>
          </EmptyState>
        </Main>

        <Footer>
          Read-only. This dashboard observes and reports; it never votes, stakes, holds a key, or
          connects a wallet.
        </Footer>
      </Page>
    </ThemeProvider>
  );
}
